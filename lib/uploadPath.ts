import path from 'path'
import { UPLOAD_KINDS } from './uploadUrl'

const ALLOWED_KINDS = new Set<string>(UPLOAD_KINDS)

export function uploadsRoot(): string {
  return path.join(process.cwd(), 'public/uploads')
}

/**
 * Resolves kind+filename to an absolute path inside public/uploads, or null
 * if the kind is unknown or the filename would escape that directory.
 */
export function resolveUploadFile(kind: string, filename: string): string | null {
  if (!ALLOWED_KINDS.has(kind)) return null
  if (!filename || filename === '.' || filename === '..' || filename.includes('\0')) return null
  if (filename.includes('/') || filename.includes('\\')) return null
  if (path.basename(filename) !== filename) return null

  const root = path.resolve(uploadsRoot(), kind)
  const resolved = path.resolve(root, filename)
  if (resolved !== root && !resolved.startsWith(root + path.sep)) return null
  if (resolved === root) return null
  return resolved
}
