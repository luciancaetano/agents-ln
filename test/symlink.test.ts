import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { checkLink, fixLink, removeLink, summarizeResults } from '../src/symlink.js'
import { Sandbox } from './helpers/sandbox.js'

describe('checkLink', () => {
  const sandbox = new Sandbox()
  let sourcePath: string

  beforeEach(async () => {
    await sandbox.create()
    sourcePath = await sandbox.write('_AGENTS.md', '# Agents config')
  })

  afterEach(async () => {
    await sandbox.destroy()
  })

  it('returns MISSING when link does not exist', async () => {
    const status = await checkLink(sandbox.path('CLAUDE.md'), sourcePath)
    expect(status).toBe('MISSING')
  })

  it('returns OK when link points to correct source', async () => {
    await sandbox.symlink('_AGENTS.md', 'CLAUDE.md')
    const status = await checkLink(sandbox.path('CLAUDE.md'), sourcePath)
    expect(status).toBe('OK')
  })

  it('returns WRONG_TARGET when link points elsewhere', async () => {
    await sandbox.write('other.md', '# Other')
    await sandbox.symlink('other.md', 'CLAUDE.md')
    const status = await checkLink(sandbox.path('CLAUDE.md'), sourcePath)
    expect(status).toBe('WRONG_TARGET')
  })

  it('returns NOT_SYMLINK when path is a regular file', async () => {
    await sandbox.write('CLAUDE.md', '# Claude config')
    const status = await checkLink(sandbox.path('CLAUDE.md'), sourcePath)
    expect(status).toBe('NOT_SYMLINK')
  })

  it('returns WRONG_TARGET when symlink target is missing', async () => {
    await sandbox.symlink('nonexistent.md', 'CLAUDE.md')
    const status = await checkLink(sandbox.path('CLAUDE.md'), sandbox.path('_AGENTS.md'))
    expect(status).toBe('WRONG_TARGET')
  })
})

describe('fixLink', () => {
  const sandbox = new Sandbox()
  let sourcePath: string

  beforeEach(async () => {
    await sandbox.create()
    sourcePath = await sandbox.write('_AGENTS.md', '# Agents config')
  })

  afterEach(async () => {
    await sandbox.destroy()
  })

  it('creates missing symlink', async () => {
    const linkPath = sandbox.path('CLAUDE.md')
    const result = await fixLink(linkPath, sourcePath)
    expect(result.action).toBe('create')
    expect(result.status).toBe('MISSING')
    expect(await sandbox.isSymlink('CLAUDE.md')).toBe(true)
    expect(await sandbox.readlink('CLAUDE.md')).toBe('./_AGENTS.md')
  })

  it('skips correct symlink', async () => {
    await sandbox.symlink('_AGENTS.md', 'CLAUDE.md')
    const result = await fixLink(sandbox.path('CLAUDE.md'), sourcePath)
    expect(result.action).toBe('skip')
    expect(result.status).toBe('OK')
  })

  it('rejects wrong-target symlink (broken target)', async () => {
    await sandbox.symlink('nonexistent.md', 'CLAUDE.md')
    const result = await fixLink(sandbox.path('CLAUDE.md'), sandbox.path('_AGENTS.md'))
    expect(result.action).toBe('error')
    expect(result.status).toBe('WRONG_TARGET')
  })

  it('replaces wrong target with force', async () => {
    await sandbox.write('other.md', '# Other')
    await sandbox.symlink('other.md', 'CLAUDE.md')
    const result = await fixLink(sandbox.path('CLAUDE.md'), sourcePath, { force: true })
    expect(result.action).toBe('fix')
    expect(result.status).toBe('WRONG_TARGET')
    expect(await sandbox.readlink('CLAUDE.md')).toBe('./_AGENTS.md')
  })

  it('errors on wrong target without force', async () => {
    await sandbox.write('other.md', '# Other')
    await sandbox.symlink('other.md', 'CLAUDE.md')
    const result = await fixLink(sandbox.path('CLAUDE.md'), sourcePath)
    expect(result.action).toBe('error')
    expect(result.status).toBe('WRONG_TARGET')
  })

  it('replaces regular file with force', async () => {
    await sandbox.write('CLAUDE.md', '# Claude config')
    const result = await fixLink(sandbox.path('CLAUDE.md'), sourcePath, { force: true })
    expect(result.action).toBe('replace')
    expect(result.status).toBe('NOT_SYMLINK')
    expect(await sandbox.isSymlink('CLAUDE.md')).toBe(true)
  })

  it('errors on regular file without force or backup', async () => {
    await sandbox.write('CLAUDE.md', '# Claude config')
    const result = await fixLink(sandbox.path('CLAUDE.md'), sourcePath)
    expect(result.action).toBe('error')
    expect(result.status).toBe('NOT_SYMLINK')
  })
})

describe('removeLink', () => {
  const sandbox = new Sandbox()
  let sourcePath: string

  beforeEach(async () => {
    await sandbox.create()
    sourcePath = await sandbox.write('_AGENTS.md', '# Agents config')
  })

  afterEach(async () => {
    await sandbox.destroy()
  })

  it('removes correct symlink', async () => {
    await sandbox.symlink('_AGENTS.md', 'CLAUDE.md')
    const result = await removeLink(sandbox.path('CLAUDE.md'), sourcePath)
    expect(result.action).toBe('remove')
    expect(await sandbox.exists('CLAUDE.md')).toBe(false)
  })

  it('skips missing link', async () => {
    const result = await removeLink(sandbox.path('CLAUDE.md'), sourcePath)
    expect(result.action).toBe('skip')
  })

  it('skips wrong target symlink', async () => {
    await sandbox.write('other.md', '# Other')
    await sandbox.symlink('other.md', 'CLAUDE.md')
    const result = await removeLink(sandbox.path('CLAUDE.md'), sourcePath)
    expect(result.action).toBe('skip')
    expect(await sandbox.exists('CLAUDE.md')).toBe(true)
  })

  it('skips regular file', async () => {
    await sandbox.write('CLAUDE.md', '# Claude')
    const result = await removeLink(sandbox.path('CLAUDE.md'), sourcePath)
    expect(result.action).toBe('skip')
    expect(await sandbox.exists('CLAUDE.md')).toBe(true)
  })
})

describe('summarizeResults', () => {
  it('aggregates all actions', () => {
    const results = [
      { linkPath: '/a', status: 'MISSING' as const, action: 'create' as const },
      { linkPath: '/b', status: 'OK' as const, action: 'skip' as const },
      { linkPath: '/c', status: 'BROKEN' as const, action: 'fix_broken' as const },
      { linkPath: '/d', status: 'NOT_SYMLINK' as const, action: 'replace' as const },
      { linkPath: '/e', status: 'WRONG_TARGET' as const, action: 'fix' as const },
      { linkPath: '/f', status: 'NOT_SYMLINK' as const, action: 'error' as const, error: 'conflict' },
    ]
    const summary = summarizeResults(results)
    expect(summary.created).toBe(1)
    expect(summary.skipped).toBe(1)
    expect(summary.fixed).toBe(2)
    expect(summary.replaced).toBe(1)
    expect(summary.errors).toBe(1)
    expect(summary.total).toBe(6)
  })
})
