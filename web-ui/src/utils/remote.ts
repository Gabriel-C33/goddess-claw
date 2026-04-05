/** Returns true when the user is accessing from a remote device (not the server itself) */
export function isRemoteDevice(): boolean {
  const host = window.location.hostname
  return host !== 'localhost' && host !== '127.0.0.1' && host !== '0.0.0.0'
}

/** Returns true when the File System Access API is available */
export function hasFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}
