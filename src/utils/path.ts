import path from 'node:path'
import os from 'node:os'

export function expandHome(p: string): string {
  if (p === '~') {return os.homedir()}
  if (p.startsWith('~/')) {return path.join(os.homedir(), p.slice(2))}
  return p
}

export function resolveAgainstDir(p: string, configDir: string): string {
  const expanded = expandHome(p)
  if (path.isAbsolute(expanded)) {return path.normalize(expanded)}
  return path.resolve(configDir, expanded)
}

export function relativeSymlinkTarget(linkPath: string, absoluteSource: string): string {
  const linkDir = path.dirname(linkPath)
  const rel = path.relative(linkDir, absoluteSource)
  if (rel === '') {return '.'}
  if (!rel.startsWith('.' + path.sep) && !rel.startsWith('..')) {
    return '.' + path.sep + rel
  }
  return rel
}

export function normalizePath(p: string): string {
  return path.normalize(p).replace(/[\\/]+$/, '')
}

export function timestamp(): string {
  const now = new Date()
  const y = now.getFullYear()
  const M = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  return `${y}${M}${d}-${h}${m}${s}`
}

export function formatFileInfo(size: number, mtime: Date): string {
  const dateStr = mtime.toISOString().slice(0, 10)
  return `${size} bytes, modified ${dateStr}`
}
