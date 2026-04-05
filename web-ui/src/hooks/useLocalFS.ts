/**
 * useLocalFS — File System Access API hook
 *
 * When the PWA is installed on a remote device, this lets the AI
 * create/read/write files and folders on THAT device's filesystem,
 * not on the server.
 */
import { create } from 'zustand'

interface FSState {
  /** The root directory handle picked by the user */
  dirHandle: FileSystemDirectoryHandle | null
  /** Whether we have an active local workspace */
  isActive: boolean
  /** Human-readable workspace name */
  workspaceName: string | null
  /** Pick a workspace directory */
  pickDirectory: () => Promise<boolean>
  /** Close the workspace */
  closeWorkspace: () => void
  /** Execute a file tool locally */
  executeTool: (name: string, input: Record<string, any>) => Promise<{ output: string; isError: boolean }>
}

export const useLocalFSStore = create<FSState>((set, get) => ({
  dirHandle: null,
  isActive: false,
  workspaceName: null,

  pickDirectory: async () => {
    try {
      // @ts-ignore — showDirectoryPicker is not in all TS libs
      const handle: FileSystemDirectoryHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
      })
      set({ dirHandle: handle, isActive: true, workspaceName: handle.name })

      // Persist handle in IndexedDB so it survives page reloads
      try {
        const db = await openIDB()
        const tx = db.transaction('handles', 'readwrite')
        tx.objectStore('handles').put(handle, 'workspace')
        await new Promise((r) => (tx.oncomplete = r))
      } catch {}

      return true
    } catch {
      return false
    }
  },

  closeWorkspace: () => {
    set({ dirHandle: null, isActive: false, workspaceName: null })
    openIDB().then((db) => {
      const tx = db.transaction('handles', 'readwrite')
      tx.objectStore('handles').delete('workspace')
    }).catch(() => {})
  },

  executeTool: async (name, input) => {
    const { dirHandle } = get()
    if (!dirHandle) return { output: 'No workspace directory selected', isError: true }

    try {
      switch (name) {
        case 'read_file':
          return await readFile(dirHandle, input.path)
        case 'write_file':
          return await writeFile(dirHandle, input.path, input.content || '')
        case 'delete_file':
          return await deleteFile(dirHandle, input.path)
        case 'list_dir':
          return await listDir(dirHandle, input.path || '.', input.recursive || false, input.max_files)
        case 'search_files':
          return await searchFiles(dirHandle, input.pattern, input.path || '.', input.extension)
        case 'run_command':
          return { output: 'Shell commands cannot run on remote devices. File operations work normally.', isError: true }
        default:
          return { output: `Unknown tool: ${name}`, isError: true }
      }
    } catch (e: any) {
      return { output: e.message || String(e), isError: true }
    }
  },
}))

// ── Restore persisted handle on load ─────────────────────────────────────

export async function restoreWorkspace() {
  try {
    const db = await openIDB()
    const tx = db.transaction('handles', 'readonly')
    const req = tx.objectStore('handles').get('workspace')
    const handle = await new Promise<FileSystemDirectoryHandle | undefined>((resolve) => {
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(undefined)
    })
    if (handle) {
      // Verify we still have permission
      const perm = await (handle as any).queryPermission({ mode: 'readwrite' })
      if (perm === 'granted') {
        useLocalFSStore.setState({ dirHandle: handle, isActive: true, workspaceName: handle.name })
      }
    }
  } catch {}
}

// ── IndexedDB for handle persistence ─────────────────────────────────────

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('goddessclaw-fs', 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore('handles')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// ── File operations using File System Access API ─────────────────────────

async function resolvePath(root: FileSystemDirectoryHandle, path: string): Promise<{ dir: FileSystemDirectoryHandle; name: string }> {
  // Normalize path
  const clean = path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '')
  const parts = clean.split('/').filter(Boolean)
  const fileName = parts.pop()!

  let current = root
  for (const part of parts) {
    current = await current.getDirectoryHandle(part, { create: false })
  }
  return { dir: current, name: fileName }
}

async function resolvePathCreate(root: FileSystemDirectoryHandle, path: string): Promise<{ dir: FileSystemDirectoryHandle; name: string }> {
  const clean = path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '')
  const parts = clean.split('/').filter(Boolean)
  const fileName = parts.pop()!

  let current = root
  for (const part of parts) {
    current = await current.getDirectoryHandle(part, { create: true })
  }
  return { dir: current, name: fileName }
}

async function readFile(root: FileSystemDirectoryHandle, path: string): Promise<{ output: string; isError: boolean }> {
  try {
    const { dir, name } = await resolvePath(root, path)
    const fileHandle = await dir.getFileHandle(name)
    const file = await fileHandle.getFile()
    const text = await file.text()
    return { output: text, isError: false }
  } catch (e: any) {
    return { output: `Error reading ${path}: ${e.message}`, isError: true }
  }
}

async function writeFile(root: FileSystemDirectoryHandle, path: string, content: string): Promise<{ output: string; isError: boolean }> {
  try {
    const { dir, name } = await resolvePathCreate(root, path)
    const fileHandle = await dir.getFileHandle(name, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(content)
    await writable.close()
    return { output: `Written ${content.length} bytes to ${path}`, isError: false }
  } catch (e: any) {
    return { output: `Error writing ${path}: ${e.message}`, isError: true }
  }
}

async function deleteFile(root: FileSystemDirectoryHandle, path: string): Promise<{ output: string; isError: boolean }> {
  try {
    const clean = path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '')
    const parts = clean.split('/').filter(Boolean)
    const name = parts.pop()!

    let current = root
    for (const part of parts) {
      current = await current.getDirectoryHandle(part)
    }
    await current.removeEntry(name, { recursive: true })
    return { output: `Deleted ${path}`, isError: false }
  } catch (e: any) {
    return { output: `Error deleting ${path}: ${e.message}`, isError: true }
  }
}

async function listDir(
  root: FileSystemDirectoryHandle,
  path: string,
  recursive: boolean,
  maxFiles?: number
): Promise<{ output: string; isError: boolean }> {
  try {
    let target = root
    if (path && path !== '.') {
      const parts = path.replace(/\\/g, '/').replace(/^\.\//, '').split('/').filter(Boolean)
      for (const part of parts) {
        target = await target.getDirectoryHandle(part)
      }
    }

    let result = ''
    let count = 0
    const limit = maxFiles || 100

    async function walk(dir: FileSystemDirectoryHandle, indent: string, depth: number) {
      if (count >= limit) return
      for await (const [name, handle] of (dir as any).entries()) {
        if (count >= limit) break
        if (name.startsWith('.') || name === 'node_modules' || name === '__pycache__') continue
        if (handle.kind === 'directory') {
          result += `${indent}${name}/\n`
          if (recursive && depth < 4) {
            await walk(handle, indent + '  ', depth + 1)
          }
        } else {
          const file = await handle.getFile()
          result += `${indent}${name} (${file.size}B)\n`
          count++
        }
      }
    }

    await walk(target, '', 0)
    if (count >= limit) result += '\n... (truncated)\n'
    return { output: result || '(empty directory)', isError: false }
  } catch (e: any) {
    return { output: `Error listing ${path}: ${e.message}`, isError: true }
  }
}

async function searchFiles(
  root: FileSystemDirectoryHandle,
  pattern: string,
  path: string,
  extension?: string
): Promise<{ output: string; isError: boolean }> {
  try {
    let target = root
    if (path && path !== '.') {
      const parts = path.replace(/\\/g, '/').replace(/^\.\//, '').split('/').filter(Boolean)
      for (const part of parts) {
        target = await target.getDirectoryHandle(part)
      }
    }

    let results = ''
    let count = 0
    const lowerPattern = pattern.toLowerCase()

    async function walk(dir: FileSystemDirectoryHandle, dirPath: string, depth: number) {
      if (count > 200 || depth > 6) return
      for await (const [name, handle] of (dir as any).entries()) {
        if (count > 200) break
        if (name.startsWith('.') || name === 'node_modules' || name === 'target') continue
        const fullPath = dirPath ? `${dirPath}/${name}` : name
        if (handle.kind === 'directory') {
          await walk(handle, fullPath, depth + 1)
        } else {
          if (extension && !name.endsWith(`.${extension}`)) continue
          try {
            const file = await handle.getFile()
            if (file.size > 1_000_000) continue // skip large files
            const text = await file.text()
            const lines = text.split('\n')
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].toLowerCase().includes(lowerPattern)) {
                results += `${fullPath}:${i + 1}: ${lines[i].trim()}\n`
                count++
                if (count > 200) return
              }
            }
          } catch {}
        }
      }
    }

    await walk(target, '', 0)
    return { output: results || `No matches found for '${pattern}'`, isError: false }
  } catch (e: any) {
    return { output: `Error searching: ${e.message}`, isError: true }
  }
}
