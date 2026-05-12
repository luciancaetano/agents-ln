import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { execSync } from 'node:child_process'
import YAML from 'yaml'
import { runAddSkill } from '../src/commands/add-skill.js'
import { Sandbox } from './helpers/sandbox.js'

async function makeSkillRepo(skillName: string, files: Record<string, string> = {}): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'agents-ln-fakerepo-'))
  await fs.mkdir(path.join(dir, 'skills', skillName), { recursive: true })
  await fs.writeFile(path.join(dir, 'skills', skillName, 'SKILL.md'), `# ${skillName}`)
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, 'skills', skillName, rel)
    await fs.mkdir(path.dirname(full), { recursive: true })
    await fs.writeFile(full, content)
  }
  execSync('git init', { cwd: dir, stdio: 'pipe' })
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' })
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' })
  execSync('git add .', { cwd: dir, stdio: 'pipe' })
  execSync('git commit -m "init"', { cwd: dir, stdio: 'pipe' })
  return dir
}

describe('runAddSkill', () => {
  const sandbox = new Sandbox()
  let originalCwd: string
  let repoDir: string

  beforeEach(async () => {
    originalCwd = process.cwd()
    await sandbox.create()
    await sandbox.write('.agents-ln.yaml', YAML.stringify({
      source: '_AGENTS.md',
      links: ['CLAUDE.md'],
    }))
    process.chdir(sandbox.root)
  })

  afterEach(async () => {
    process.chdir(originalCwd)
    await sandbox.destroy()
    if (repoDir) {
      await fs.rm(repoDir, { recursive: true, force: true }).catch(() => undefined)
    }
  })

  it('installs skill files into _agents/skills/<name>', async () => {
    repoDir = await makeSkillRepo('readme', { 'prompt.md': '# Prompt' })

    await runAddSkill(repoDir, 'readme')

    expect(await sandbox.exists('_agents/skills/readme/SKILL.md')).toBe(true)
    expect(await sandbox.exists('_agents/skills/readme/prompt.md')).toBe(true)
  })

  it('registers the skill in .agents-ln.yaml', async () => {
    repoDir = await makeSkillRepo('readme')

    await runAddSkill(repoDir, 'readme')

    const parsed = YAML.parse(await sandbox.read('.agents-ln.yaml'))
    expect(parsed.skills?.readme).toMatchObject({ name: 'readme', source: repoDir })
  })

  it('overwrites an existing skill installation', async () => {
    repoDir = await makeSkillRepo('readme')
    await sandbox.mkdir('_agents/skills/readme')
    await sandbox.write('_agents/skills/readme/old.md', 'stale')

    await runAddSkill(repoDir, 'readme')

    expect(await sandbox.exists('_agents/skills/readme/old.md')).toBe(false)
    expect(await sandbox.exists('_agents/skills/readme/SKILL.md')).toBe(true)
  })

  it('exits when skill directory is not found in repo', async () => {
    repoDir = await makeSkillRepo('readme')

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code})`)
    })
    try {
      await expect(runAddSkill(repoDir, 'missing-skill')).rejects.toThrow('process.exit(1)')
    } finally {
      exitSpy.mockRestore()
    }
  })

  it('exits when no config file exists', async () => {
    process.chdir(originalCwd)
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code})`)
    })
    try {
      await expect(runAddSkill('https://example.com/repo', 'readme')).rejects.toThrow('process.exit(1)')
    } finally {
      exitSpy.mockRestore()
      process.chdir(sandbox.root)
    }
  })
})
