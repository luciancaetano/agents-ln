import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import YAML from 'yaml'
import { logger } from '../logger.js'
import { discoverConfig } from '../config.js'
import { exists, ensureDir } from '../utils/fs.js'

export async function runAddSkill(url: string, skillName: string): Promise<void> {
  const projectConfig = await discoverConfig()
  if (!projectConfig) {
    logger.error('No .agents-ln.yaml found. Run `agents-ln init` first.')
    process.exit(1)
  }

  const tmpDir = path.join(os.tmpdir(), `agents-ln-${Date.now()}-${Math.random().toString(36).slice(2)}`)

  logger.info(`Cloning ${url} ...`)

  try {
    execFileSync('git', ['clone', '--depth', '1', url, tmpDir], { stdio: 'pipe' })
  } catch {
    logger.error(`Failed to clone repository: ${url}`)
    process.exit(1)
  }

  try {
    const skillSrc = path.join(tmpDir, 'skills', skillName)

    if (!(await exists(skillSrc))) {
      logger.error(`Skill '${skillName}' not found in repository (expected skills/${skillName}/)`)
      process.exit(1)
    }

    const srcStat = await fs.stat(skillSrc)
    if (!srcStat.isDirectory()) {
      logger.error(`skills/${skillName} is not a directory`)
      process.exit(1)
    }

    const agentsDir = path.resolve(projectConfig.configDir, '_agents')
    const skillsDir = path.join(agentsDir, 'skills')
    const skillDest = path.join(skillsDir, skillName)

    await ensureDir(skillsDir)

    if (await exists(skillDest)) {
      logger.warning(`Overwriting existing skill at ${skillDest}`)
      await fs.rm(skillDest, { recursive: true, force: true })
    }

    await fs.cp(skillSrc, skillDest, { recursive: true })
    logger.action('create', skillDest)

    await updateConfigSkills(projectConfig.configPath, skillName, url)

    logger.ok(`Skill '${skillName}' installed from ${url}`)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }
}

async function updateConfigSkills(configPath: string, skillName: string, source: string): Promise<void> {
  const raw = await fs.readFile(configPath, 'utf-8')
  const parsed = YAML.parse(raw) as Record<string, unknown>

  if (!parsed.skills || typeof parsed.skills !== 'object' || Array.isArray(parsed.skills)) {
    parsed.skills = {}
  }

  ;(parsed.skills as Record<string, unknown>)[skillName] = { name: skillName, source }

  await fs.writeFile(configPath, YAML.stringify(parsed), 'utf-8')
}
