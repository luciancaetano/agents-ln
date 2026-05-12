import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'

export async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

export function existsSync(p: string): boolean {
  try {
    fsSync.accessSync(p)
    return true
  } catch {
    return false
  }
}

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true })
}

export async function isSymlink(p: string): Promise<boolean> {
  try {
    const stat = await fs.lstat(p)
    return stat.isSymbolicLink()
  } catch {
    return false
  }
}

export async function isRegularFile(p: string): Promise<boolean> {
  try {
    const stat = await fs.stat(p)
    return stat.isFile()
  } catch {
    return false
  }
}

export async function isEmptyFile(p: string): Promise<boolean> {
  try {
    const stat = await fs.stat(p)
    return stat.isFile() && stat.size === 0
  } catch {
    return false
  }
}

export async function readLinkSafe(p: string): Promise<string | null> {
  try {
    return await fs.readlink(p)
  } catch {
    return null
  }
}

export async function remove(p: string): Promise<void> {
  try {
    await fs.unlink(p)
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {throw err}
  }
}

export async function ensureParentDir(p: string): Promise<void> {
  const dir = path.dirname(p)
  await ensureDir(dir)
}
