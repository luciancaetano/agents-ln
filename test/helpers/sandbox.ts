import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

export class Sandbox {
  readonly root: string

  constructor() {
    this.root = path.join(os.tmpdir(), `agents-ln-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  }

  async create(): Promise<void> {
    await fs.mkdir(this.root, { recursive: true })
  }

  async destroy(): Promise<void> {
    await fs.rm(this.root, { recursive: true, force: true })
  }

  async write(relativePath: string, content: string): Promise<string> {
    const fullPath = path.join(this.root, relativePath)
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.writeFile(fullPath, content, 'utf-8')
    return fullPath
  }

  async mkdir(relativePath: string): Promise<string> {
    const fullPath = path.join(this.root, relativePath)
    await fs.mkdir(fullPath, { recursive: true })
    return fullPath
  }

  async symlink(target: string, link: string): Promise<string> {
    const linkPath = path.join(this.root, link)
    await fs.mkdir(path.dirname(linkPath), { recursive: true })
    await fs.symlink(target, linkPath)
    return linkPath
  }

  async read(relativePath: string): Promise<string> {
    return fs.readFile(path.join(this.root, relativePath), 'utf-8')
  }

  async exists(relativePath: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.root, relativePath))
      return true
    } catch {
      return false
    }
  }

  async isSymlink(relativePath: string): Promise<boolean> {
    try {
      const stat = await fs.lstat(path.join(this.root, relativePath))
      return stat.isSymbolicLink()
    } catch {
      return false
    }
  }

  async readlink(relativePath: string): Promise<string> {
    return fs.readlink(path.join(this.root, relativePath))
  }

  path(relativePath: string): string {
    return path.join(this.root, relativePath)
  }
}
