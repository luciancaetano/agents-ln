import { describe, it, expect } from 'vitest'
import { relativeSymlinkTarget, normalizePath, expandHome, resolveAgainstDir, formatFileInfo, timestamp } from '../src/utils/path.js'

describe('expandHome', () => {
  it('expands ~ to home directory', () => {
    const result = expandHome('~/foo')
    expect(result).toContain('/foo')
    expect(result).not.toContain('~')
  })

  it('handles plain ~', () => {
    const result = expandHome('~')
    expect(result).not.toBe('~')
  })

  it('does not modify absolute paths', () => {
    expect(expandHome('/foo/bar')).toBe('/foo/bar')
  })
})

describe('resolveAgainstDir', () => {
  it('resolves relative paths against config dir', () => {
    const result = resolveAgainstDir('foo.md', '/repo')
    expect(result).toBe('/repo/foo.md')
  })

  it('keeps absolute paths as-is', () => {
    const result = resolveAgainstDir('/abs/foo.md', '/repo')
    expect(result).toBe('/abs/foo.md')
  })
})

describe('relativeSymlinkTarget', () => {
  it('creates relative path going up a directory', () => {
    const result = relativeSymlinkTarget('/repo/.github/x.md', '/repo/AGENTS.md')
    expect(result).toBe('../AGENTS.md')
  })

  it('creates relative path in same directory', () => {
    const result = relativeSymlinkTarget('/repo/CLAUDE.md', '/repo/AGENTS.md')
    expect(result).toBe('./AGENTS.md')
  })

  it('handles nested targets', () => {
    const result = relativeSymlinkTarget('/repo/a/b/c.md', '/repo/x/y.md')
    expect(result).toBe('../../x/y.md')
  })
})

describe('normalizePath', () => {
  it('removes trailing slashes', () => {
    expect(normalizePath('/foo/bar/')).toBe('/foo/bar')
  })
})

describe('formatFileInfo', () => {
  it('formats file info', () => {
    const date = new Date('2026-01-02')
    const result = formatFileInfo(42, date)
    expect(result).toBe('42 bytes, modified 2026-01-02')
  })
})

describe('timestamp', () => {
  it('produces YYYYMMDD-HHmmss format', () => {
    const result = timestamp()
    expect(result).toMatch(/^\d{8}-\d{6}$/)
  })
})
