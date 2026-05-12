import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { backupFile } from '../src/backup.js'
import { Sandbox } from './helpers/sandbox.js'

describe('backupFile', () => {
  const sandbox = new Sandbox()

  beforeEach(async () => {
    await sandbox.create()
  })

  afterEach(async () => {
    await sandbox.destroy()
  })

  it('backs up non-empty file to .bak', async () => {
    await sandbox.write('CLAUDE.md', '# Claude config')
    const result = await backupFile(sandbox.path('CLAUDE.md'))
    expect(result.backedUp).toBe(true)
    expect(result.backupPath).toMatch(/\.bak$/)
    expect(await sandbox.exists('CLAUDE.md')).toBe(false)
  })

  it('creates timestamped .bak when .bak already exists', async () => {
    await sandbox.write('CLAUDE.md', '# Claude config')
    await sandbox.write('CLAUDE.md.bak', '# Old backup')
    const result = await backupFile(sandbox.path('CLAUDE.md'))
    expect(result.backedUp).toBe(true)
    expect(result.backupPath).toMatch(/CLAUDE\.md\.\d{8}-\d{6}\.bak$/)
  })

  it('removes empty file without backup', async () => {
    await sandbox.write('CLAUDE.md', '')
    const result = await backupFile(sandbox.path('CLAUDE.md'))
    expect(result.backedUp).toBe(false)
    expect(result.reason).toBe('empty')
    expect(await sandbox.exists('CLAUDE.md')).toBe(false)
  })

  it('returns false for non-existent file', async () => {
    const result = await backupFile(sandbox.path('nonexistent.md'))
    expect(result.backedUp).toBe(false)
  })

  it('returns false for symlinks', async () => {
    await sandbox.write('_AGENTS.md', '# source')
    await sandbox.symlink('_AGENTS.md', 'CLAUDE.md')
    const result = await backupFile(sandbox.path('CLAUDE.md'))
    expect(result.backedUp).toBe(false)
    expect(result.reason).toBe('symlink')
  })
})
