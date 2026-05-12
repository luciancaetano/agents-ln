import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import YAML from 'yaml'
import { z } from 'zod'
import { logger } from './logger.js'
import { resolveAgainstDir } from './utils/path.js'
import { exists } from './utils/fs.js'
import type { AgentsLnConfig, ProjectConfig } from './types.js'

const ConfigSchema = z.object({
  source: z.string().min(1, 'source must not be empty'),
  links: z.array(z.string().min(1)).min(1, 'links must not be empty'),
  providers: z.record(z.object({ enabled: z.boolean() })).optional(),
})

export const CONFIG_FILENAME = '.agents-ln.yaml'

function globalConfigDir(): string {
  return path.join(os.homedir(), '.config', 'agents-ln')
}

function globalConfigPath(): string {
  return path.join(globalConfigDir(), 'config.yaml')
}

function defaultConfig(): AgentsLnConfig {
  return {
    source: '_AGENTS.md',
    links: [
      'CLAUDE.md',
      'AGENTS.md',
      'GEMINI.md',
      '.cursorrules',
      '.windsurfrules',
      '.github/copilot-instructions.md',
      'CONVENTIONS.md',
    ],
  }
}

export async function discoverConfig(startDir?: string): Promise<ProjectConfig | null> {
  const cwd = startDir ?? process.cwd()

  const projectPath = path.join(cwd, CONFIG_FILENAME)
  if (await exists(projectPath)) {
    const raw = await fs.readFile(projectPath, 'utf-8')
    const parsed = YAML.parse(raw)
    const config = ConfigSchema.parse(parsed)
    return {
      configPath: projectPath,
      configDir: cwd,
      config,
    }
  }

  const globalPath = globalConfigPath()
  if (await exists(globalPath)) {
    const raw = await fs.readFile(globalPath, 'utf-8')
    const parsed = YAML.parse(raw)
    const config = ConfigSchema.parse(parsed)
    return {
      configPath: globalPath,
      configDir: path.dirname(globalPath),
      config,
    }
  }

  return null
}

export async function autoCreateGlobalConfig(): Promise<ProjectConfig> {
  const dir = globalConfigDir()
  const configPath = globalConfigPath()

  await fs.mkdir(dir, { recursive: true })

  const config = defaultConfig()
  const yaml = YAML.stringify({
    source: config.source,
    links: config.links,
  })

  await fs.writeFile(configPath, yaml, 'utf-8')
  logger.info(`Created global config: ${configPath}`)

  return {
    configPath,
    configDir: path.dirname(configPath),
    config,
  }
}

export async function loadOrCreateConfig(startDir?: string): Promise<ProjectConfig> {
  const existing = await discoverConfig(startDir)
  if (existing) {return existing}

  logger.info('No config found — auto-creating global config.')
  logger.info(`Edit ${globalConfigPath()} and run sync again.`)
  return autoCreateGlobalConfig()
}

export function resolveConfigPaths(projectConfig: ProjectConfig): {
  source: string
  links: string[]
} {
  const { config, configDir } = projectConfig
  return {
    source: resolveAgainstDir(config.source, configDir),
    links: config.links.map((l) => resolveAgainstDir(l, configDir)),
  }
}

export async function writeProjectConfig(
  dir: string,
  config: AgentsLnConfig,
  force = false,
): Promise<string> {
  const configPath = path.join(dir, CONFIG_FILENAME)

  if (!force && await exists(configPath)) {
    throw new Error(`${configPath} already exists (use --force to overwrite)`)
  }

  const yaml = YAML.stringify({
    source: config.source,
    links: config.links,
  })

  await fs.writeFile(configPath, yaml, 'utf-8')
  return configPath
}

export async function configExistsIn(dir: string): Promise<boolean> {
  return exists(path.join(dir, CONFIG_FILENAME))
}
