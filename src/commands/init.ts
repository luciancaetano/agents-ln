import fs from 'node:fs/promises'
import path from 'node:path'
import * as p from '@clack/prompts'
import pc from 'picocolors'
import { logger } from '../logger.js'
import { exists } from '../utils/fs.js'
import { writeProjectConfig, CONFIG_FILENAME } from '../config.js'
import { getProviders } from '../providers.js'
import { runSync } from './sync.js'
import type { AgentsLnConfig } from '../types.js'

export interface InitOptions {
  force?: boolean
  dryRun?: boolean
  source?: string
  yes?: boolean
}

export async function runInit(opts: InitOptions = {}): Promise<void> {
  const cwd = process.cwd()
  const source = opts.source ?? '_AGENTS.md'

  if (opts.dryRun) {
    const configPath = path.join(cwd, CONFIG_FILENAME)
    if (await exists(configPath)) {
      logger.info(`[dry-run] Would overwrite ${configPath}`)
    } else {
      logger.info(`[dry-run] Would create ${configPath}`)
    }
    logger.info('[dry-run] Would write default config')
    return
  }

  if (!opts.yes && !opts.force) {
    p.intro('agents-ln init')

    const providers = getProviders()
    const grouped = groupByFilename(providers)

    const detected = new Set<string>()
    for (const p of providers) {
      const home = await import('node:os').then((os) => os.homedir())
      for (const dp of p.detectPaths ?? []) {
        try {
          const resolved = dp.startsWith('~/') ? path.join(home, dp.slice(2)) : dp
          await fs.access(resolved)
          detected.add(p.id)
          break
        } catch {
        }
      }
      if (!detected.has(p.id)) {
        for (const cmd of p.detectCommands ?? []) {
          try {
            const found = await import('child_process').then((cp) =>
              new Promise<boolean>((resolve) => {
                cp.exec(`command -v ${cmd}`, (err, stdout) => {
                  resolve(!err && stdout.trim().length > 0)
                })
              }),
            )
            if (found) {
              detected.add(p.id)
              break
            }
          } catch {
          }
        }
      }
    }

    const choices = grouped.map((g) => ({
      value: g.filename,
      label: `${g.displayName}  ${pc.dim('→ ' + g.filename)}`,
      hint: g.ids.some((id) => detected.has(id)) ? 'detected' : undefined,
    }))

    const selected = await p.multiselect({
      message: 'Select AI agents to link:',
      options: choices,
      required: false,
    })

    p.outro('')

    if (p.isCancel(selected)) {
      p.cancel('Cancelled')
      process.exit(0)
    }

    const links = (selected).filter((f) => f !== source)

    if (links.length === 0) {
      logger.warning('No agents selected — nothing to configure')
      return
    }

    const config: AgentsLnConfig = { source, links }

    try {
      const configPath = await writeProjectConfig(cwd, config, false)
      logger.create(`Created project config: ${configPath}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error(msg)
      process.exit(1)
    }

    await ensureCanonicalStructure(cwd, source)
    logger.info('')
    await runSync({ quiet: true })
  } else {
    const config: AgentsLnConfig = {
      source,
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

    try {
      const configPath = await writeProjectConfig(cwd, config, opts.force)
      logger.create(`Created project config: ${configPath}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error(msg)
      process.exit(1)
    }

    await ensureCanonicalStructure(cwd, source)
    if (!opts.dryRun) {
      logger.info('')
      await runSync({ quiet: true })
    }
  }

  const gitDir = path.join(cwd, '.git')
  if (!(await exists(gitDir))) {
    logger.warning('.git directory not found — consider initializing a git repository')
  }
}

async function ensureCanonicalStructure(cwd: string, source: string): Promise<void> {
  const sourcePath = path.join(cwd, source)

  if (!(await exists(sourcePath))) {
    const template = `# AI Agent Instructions
#
# This is the canonical instruction file for AI coding agents.
# Edit this file. All provider-specific files (CLAUDE.md, AGENTS.md, etc.)
# are symlinks pointing here.
#
# Add your project context, coding conventions, and agent instructions below.
`
    await fs.writeFile(sourcePath, template, 'utf-8')
    logger.create(`Created canonical source: ${sourcePath}`)
  }

  const agentsDir = path.join(cwd, '_agents')
  if (!(await exists(agentsDir))) {
    await fs.mkdir(agentsDir, { recursive: true })
    logger.create(`Created directory: ${agentsDir}/`)
  }

  for (const sub of ['skills', 'agents']) {
    const subDir = path.join(agentsDir, sub)
    if (!(await exists(subDir))) {
      await fs.mkdir(subDir, { recursive: true })
      logger.create(`Created directory: ${subDir}/`)
    }
    const gitkeep = path.join(subDir, '.gitkeep')
    if (!(await exists(gitkeep))) {
      await fs.writeFile(gitkeep, '', 'utf-8')
    }
  }

  const gitkeep = path.join(agentsDir, '.gitkeep')
  if (!(await exists(gitkeep))) {
    await fs.writeFile(gitkeep, '', 'utf-8')
  }
}

function groupByFilename(providers: ReturnType<typeof getProviders>) {
  const map = new Map<string, { ids: string[]; displayNames: string[] }>()
  const order: string[] = []

  for (const p of providers) {
    const existing = map.get(p.repoFileName)
    if (existing) {
      existing.ids.push(p.id)
      existing.displayNames.push(p.displayName)
    } else {
      map.set(p.repoFileName, { ids: [p.id], displayNames: [p.displayName] })
      order.push(p.repoFileName)
    }
  }

  return order.map((f) => {
    const entry = map.get(f)!
    return { filename: f, ids: entry.ids, displayName: entry.displayNames.join(' / ') }
  })
}
