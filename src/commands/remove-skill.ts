import fs from 'node:fs/promises'
import path from 'node:path'
import YAML from 'yaml'
import { logger } from '../logger.js'
import { discoverConfig } from '../config.js'
import { exists } from '../utils/fs.js'

export async function runRemoveSkill(skillName: string): Promise<void> {
  const projectConfig = await discoverConfig()
  if (!projectConfig) {
    logger.error('No .agents-ln.yaml found. Run `agents-ln init` first.')
    process.exit(1)
  }

  const { config, configPath, configDir } = projectConfig

  if (!config.skills?.[skillName]) {
    logger.error(`Skill '${skillName}' is not registered in .agents-ln.yaml`)
    process.exit(1)
  }

  const skillDir = path.join(configDir, '_agents', 'skills', skillName)

  if (await exists(skillDir)) {
    await fs.rm(skillDir, { recursive: true, force: true })
    logger.action('remove', skillDir)
  } else {
    logger.warning(`Skill directory not found at ${skillDir}, removing from config only`)
  }

  await removeConfigSkill(configPath, skillName)
  logger.ok(`Skill '${skillName}' removed`)
}

async function removeConfigSkill(configPath: string, skillName: string): Promise<void> {
  const raw = await fs.readFile(configPath, 'utf-8')
  const parsed = YAML.parse(raw) as Record<string, unknown>

  if (parsed.skills && typeof parsed.skills === 'object' && !Array.isArray(parsed.skills)) {
    delete (parsed.skills as Record<string, unknown>)[skillName]

    if (Object.keys(parsed.skills).length === 0) {
      delete parsed.skills
    }
  }

  await fs.writeFile(configPath, YAML.stringify(parsed), 'utf-8')
}
