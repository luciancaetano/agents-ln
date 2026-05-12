import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import YAML from 'yaml'
import { resolveConfigPaths, writeProjectConfig, discoverConfig } from '../src/config.js'
import type { ProjectConfig } from '../src/types.js'
import { Sandbox } from './helpers/sandbox.js'

describe('resolveConfigPaths', () => {
  const sandbox = new Sandbox()

  beforeEach(async () => { await sandbox.create() })
  afterEach(async () => { await sandbox.destroy() })

  it('resolves relative paths against config dir', () => {
    const projectConfig: ProjectConfig = {
      configPath: sandbox.path('.agents-ln.yaml'),
      configDir: sandbox.root,
      config: {
        source: '_AGENTS.md',
        links: ['CLAUDE.md', 'GEMINI.md', '.github/copilot-instructions.md'],
      },
    }

    const resolved = resolveConfigPaths(projectConfig)
    expect(resolved.source).toBe(sandbox.path('_AGENTS.md'))
    expect(resolved.links[0]).toBe(sandbox.path('CLAUDE.md'))
    expect(resolved.links[1]).toBe(sandbox.path('GEMINI.md'))
    expect(resolved.links[2]).toBe(sandbox.path('.github/copilot-instructions.md'))
  })
})

describe('writeProjectConfig', () => {
  const sandbox = new Sandbox()

  beforeEach(async () => { await sandbox.create() })
  afterEach(async () => { await sandbox.destroy() })

  it('writes a minimal config', async () => {
    await writeProjectConfig(sandbox.root, { source: '_AGENTS.md', links: ['CLAUDE.md'] })
    const parsed = YAML.parse(await sandbox.read('.agents-ln.yaml'))
    expect(parsed.source).toBe('_AGENTS.md')
    expect(parsed.links).toEqual(['CLAUDE.md'])
  })

  it('includes skills when provided', async () => {
    await writeProjectConfig(sandbox.root, {
      source: '_AGENTS.md',
      links: ['CLAUDE.md'],
      skills: { readme: { name: 'readme', source: 'https://example.com' } },
    })
    const parsed = YAML.parse(await sandbox.read('.agents-ln.yaml'))
    expect(parsed.skills?.readme).toMatchObject({ name: 'readme', source: 'https://example.com' })
  })

  it('throws when config already exists without force', async () => {
    await writeProjectConfig(sandbox.root, { source: '_AGENTS.md', links: ['CLAUDE.md'] })
    await expect(
      writeProjectConfig(sandbox.root, { source: '_AGENTS.md', links: ['CLAUDE.md'] })
    ).rejects.toThrow('already exists')
  })

  it('overwrites when force is true', async () => {
    await writeProjectConfig(sandbox.root, { source: '_AGENTS.md', links: ['CLAUDE.md'] })
    await writeProjectConfig(sandbox.root, { source: '_AGENTS.md', links: ['AGENTS.md'] }, true)
    const parsed = YAML.parse(await sandbox.read('.agents-ln.yaml'))
    expect(parsed.links).toEqual(['AGENTS.md'])
  })
})

describe('discoverConfig', () => {
  const sandbox = new Sandbox()

  beforeEach(async () => { await sandbox.create() })
  afterEach(async () => { await sandbox.destroy() })

  it('loads project config from startDir', async () => {
    await sandbox.write('.agents-ln.yaml', YAML.stringify({
      source: '_AGENTS.md',
      links: ['CLAUDE.md'],
    }))
    const result = await discoverConfig(sandbox.root)
    expect(result).not.toBeNull()
    expect(result!.configPath).toBe(sandbox.path('.agents-ln.yaml'))
    expect(result!.config.source).toBe('_AGENTS.md')
  })

  it('loads project config with skills', async () => {
    await sandbox.write('.agents-ln.yaml', YAML.stringify({
      source: '_AGENTS.md',
      links: ['CLAUDE.md'],
      skills: { readme: { name: 'readme', source: 'https://example.com' } },
    }))
    const result = await discoverConfig(sandbox.root)
    expect(result).not.toBeNull()
    expect(result!.config.skills?.readme).toMatchObject({ name: 'readme' })
  })

  it('prefers project config over global fallback', async () => {
    await sandbox.write('.agents-ln.yaml', YAML.stringify({
      source: 'project-source.md',
      links: ['CLAUDE.md'],
    }))
    const result = await discoverConfig(sandbox.root)
    expect(result!.config.source).toBe('project-source.md')
    expect(result!.configDir).toBe(sandbox.root)
  })
})
