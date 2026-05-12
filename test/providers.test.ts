import { describe, it, expect } from 'vitest'
import { getProviders, getProvider, getConfigDirsForFilenames } from '../src/providers.js'

describe('providers', () => {
  it('returns all providers', () => {
    const providers = getProviders()
    expect(providers.length).toBeGreaterThanOrEqual(7)
  })

  it('finds provider by id', () => {
    const claude = getProvider('claude')
    expect(claude).toBeDefined()
    expect(claude!.displayName).toBe('Claude Code')
    expect(claude!.repoFileName).toBe('CLAUDE.md')
  })

  it('maps filenames to config dirs', () => {
    const dirs = getConfigDirsForFilenames(['CLAUDE.md', 'AGENTS.md', 'GEMINI.md'])
    expect(dirs).toContain('.claude')
    expect(dirs).toContain('.codex')
    expect(dirs).toContain('.gemini')
  })

  it('skips nested paths', () => {
    const dirs = getConfigDirsForFilenames(['.github/copilot-instructions.md'])
    expect(dirs).not.toContain('.github')
  })

  it('deduplicates config dirs', () => {
    const dirs = getConfigDirsForFilenames(['AGENTS.md', 'AGENTS.md'])
    const unique = new Set(dirs)
    expect(dirs.length).toBe(unique.size)
  })
})
