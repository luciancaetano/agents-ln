import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import YAML from 'yaml'
import { runRemoveSkill } from '../src/commands/remove-skill.js'
import { Sandbox } from './helpers/sandbox.js'

const BASE_CONFIG = {
  source: '_AGENTS.md',
  links: ['CLAUDE.md'],
  skills: {
    readme: { name: 'readme', source: 'https://example.com/repo' },
  },
}

describe('runRemoveSkill', () => {
  const sandbox = new Sandbox()
  let originalCwd: string

  beforeEach(async () => {
    originalCwd = process.cwd()
    await sandbox.create()
    await sandbox.write('.agents-ln.yaml', YAML.stringify(BASE_CONFIG))
    process.chdir(sandbox.root)
  })

  afterEach(async () => {
    process.chdir(originalCwd)
    await sandbox.destroy()
  })

  it('removes the skill directory and config entry', async () => {
    await sandbox.mkdir('_agents/skills/readme')
    await sandbox.write('_agents/skills/readme/SKILL.md', '# readme skill')

    await runRemoveSkill('readme')

    expect(await sandbox.exists('_agents/skills/readme')).toBe(false)
    const parsed = YAML.parse(await sandbox.read('.agents-ln.yaml'))
    expect(parsed.skills).toBeUndefined()
  })

  it('removes config entry when skill directory is absent', async () => {
    await runRemoveSkill('readme')

    const parsed = YAML.parse(await sandbox.read('.agents-ln.yaml'))
    expect(parsed.skills).toBeUndefined()
  })

  it('preserves other skills when removing one', async () => {
    const config = {
      ...BASE_CONFIG,
      skills: {
        readme: { name: 'readme', source: 'https://example.com/repo' },
        other: { name: 'other', source: 'https://example.com/other' },
      },
    }
    await sandbox.write('.agents-ln.yaml', YAML.stringify(config))
    await sandbox.mkdir('_agents/skills/readme')
    await sandbox.write('_agents/skills/readme/SKILL.md', '# readme')

    await runRemoveSkill('readme')

    const parsed = YAML.parse(await sandbox.read('.agents-ln.yaml'))
    expect(parsed.skills?.readme).toBeUndefined()
    expect(parsed.skills?.other).toBeDefined()
    expect(parsed.skills?.other.source).toBe('https://example.com/other')
  })

  it('exits when skill is not registered', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code})`)
    })
    try {
      await expect(runRemoveSkill('nonexistent')).rejects.toThrow('process.exit(1)')
    } finally {
      exitSpy.mockRestore()
    }
  })

  it('exits when skill directory exists but is not in config', async () => {
    await sandbox.mkdir('_agents/skills/unlisted')
    await sandbox.write('_agents/skills/unlisted/SKILL.md', '# unlisted')

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code})`)
    })
    try {
      await expect(runRemoveSkill('unlisted')).rejects.toThrow('process.exit(1)')
      expect(await sandbox.exists('_agents/skills/unlisted')).toBe(true)
    } finally {
      exitSpy.mockRestore()
    }
  })
})
