import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Folder,
  FileText,
  ChevronRight,
  ChevronDown,
  Search,
  RefreshCw,
  FolderOpen,
  X,
  FileCode,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import type { FileTreeItem } from '@/types'

interface FileExplorerProps {
  isMobile?: boolean
}

// Mock data - in real app this would come from the backend
const MOCK_FILE_TREE: FileTreeItem[] = [
  {
    name: 'src',
    path: '/src',
    type: 'directory',
    children: [
      {
        name: 'components',
        path: '/src/components',
        type: 'directory',
        children: [
          { name: 'Sidebar.tsx', path: '/src/components/Sidebar.tsx', type: 'file' },
          { name: 'ChatArea.tsx', path: '/src/components/ChatArea.tsx', type: 'file' },
          { name: 'MessageList.tsx', path: '/src/components/MessageList.tsx', type: 'file' },
        ],
      },
      {
        name: 'stores',
        path: '/src/stores',
        type: 'directory',
        children: [
          { name: 'chatStore.ts', path: '/src/stores/chatStore.ts', type: 'file' },
        ],
      },
      { name: 'App.tsx', path: '/src/App.tsx', type: 'file' },
      { name: 'main.tsx', path: '/src/main.tsx', type: 'file' },
    ],
  },
  {
    name: 'public',
    path: '/public',
    type: 'directory',
    children: [
      { name: 'index.html', path: '/public/index.html', type: 'file' },
    ],
  },
  { name: 'package.json', path: '/package.json', type: 'file' },
  { name: 'tsconfig.json', path: '/tsconfig.json', type: 'file' },
  { name: 'README.md', path: '/README.md', type: 'file' },
]

export function FileExplorer({ isMobile }: FileExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(['/src', '/src/components', '/src/stores'])
  )

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(path)) {
        newSet.delete(path)
      } else {
        newSet.add(path)
      }
      return newSet
    })
  }

  const filteredTree = searchQuery
    ? flattenAndFilter(MOCK_FILE_TREE, searchQuery)
    : MOCK_FILE_TREE

  return (
    <div className={cn(
      "h-full flex flex-col",
      isMobile ? "bg-slate-950" : "bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-r border-amber-500/20"
    )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between px-4 py-3 border-b",
        isMobile ? "border-slate-800" : "border-amber-500/20"
      )}
      >
        <div className="flex items-center gap-2"
        >
          <FolderOpen className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-sm text-slate-200">Files</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-lg text-slate-500 hover:text-amber-300 hover:bg-slate-800/50 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {isMobile && (
            <button
              onClick={() => {}}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-slate-800"
      >
        <div className="relative"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-xl border border-slate-700/50 bg-slate-900/50 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/30 focus:border-amber-500/30 transition-all"
          />
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto py-2"
      >
        <FileTree
          items={filteredTree}
          expandedFolders={expandedFolders}
          onToggleFolder={toggleFolder}
          level={0}
        />
      </div>
    </div>
  )
}

interface FileTreeProps {
  items: FileTreeItem[]
  expandedFolders: Set<string>
  onToggleFolder: (path: string) => void
  level: number
}

function FileTree({ items, expandedFolders, onToggleFolder, level }: FileTreeProps) {
  return (
    <>
      {items.map((item) => (
        <FileTreeNode
          key={item.path}
          item={item}
          isExpanded={expandedFolders.has(item.path)}
          onToggle={() => onToggleFolder(item.path)}
          level={level}
        >
          {item.children && expandedFolders.has(item.path) && (
            <FileTree
              items={item.children}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              level={level + 1}
            />
          )}
        </FileTreeNode>
      ))}
    </>
  )
}

interface FileTreeNodeProps {
  item: FileTreeItem
  isExpanded: boolean
  onToggle: () => void
  level: number
  children?: React.ReactNode
}

function FileTreeNode({ item, isExpanded, onToggle, level, children }: FileTreeNodeProps) {
  const isDirectory = item.type === 'directory'
  const paddingLeft = level * 12 + 12

  const getFileIcon = (name: string) => {
    if (name.endsWith('.tsx') || name.endsWith('.ts')) {
      return <FileCode className="w-4 h-4 flex-shrink-0 text-blue-400" />
    }
    if (name.endsWith('.json')) {
      return <FileCode className="w-4 h-4 flex-shrink-0 text-green-400" />
    }
    if (name.endsWith('.md')) {
      return <FileText className="w-4 h-4 flex-shrink-0 text-purple-400" />
    }
    return <FileText className="w-4 h-4 flex-shrink-0 text-slate-500" />
  }

  return (
    <div>
      <motion.button
        whileHover={{ backgroundColor: 'rgba(251, 191, 36, 0.05)' }}
        onClick={isDirectory ? onToggle : undefined}
        style={{ paddingLeft }}
        className={cn(
          "w-full flex items-center gap-1.5 py-1.5 pr-3 text-sm transition-all rounded-lg mx-1",
          isDirectory ? "cursor-pointer" : "cursor-default"
        )}
      >
        {isDirectory ? (
          <>
            <span className={cn(
              "transition-colors",
              isExpanded ? "text-amber-400" : "text-slate-500"
            )}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </span>
            <Folder className={cn(
              "w-4 h-4 flex-shrink-0",
              isExpanded ? "text-amber-400" : "text-slate-500"
            )} />
          </>
        ) : (
          <>
            <span className="w-3.5" />
            {getFileIcon(item.name)}
          </>
        )}
        <span className={cn(
          "truncate",
          isDirectory
            ? "font-medium text-slate-300"
            : "text-slate-400 hover:text-slate-200"
        )}
        >
          {item.name}
        </span>
      </motion.button>

      <AnimatePresence>
        {children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function flattenAndFilter(items: FileTreeItem[], query: string): FileTreeItem[] {
  const result: FileTreeItem[] = []
  const lowerQuery = query.toLowerCase()

  function search(items: FileTreeItem[]) {
    for (const item of items) {
      if (item.name.toLowerCase().includes(lowerQuery)) {
        result.push(item)
      }
      if (item.children) {
        search(item.children)
      }
    }
  }

  search(items)
  return result
}
