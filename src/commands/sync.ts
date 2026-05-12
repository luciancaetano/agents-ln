import fs from 'node:fs/promises'
import path from 'node:path'
import { logger } from '../logger.js'
import { loadOrCreateConfig, resolveConfigPaths } from '../config.js'
import { fixLink, summarizeResults, reportSummary } from '../symlink.js'
import { exists, isSymlink } from '../utils/fs.js'
import { getConfigDirsForFilenames } from '../providers.js'
import type { CliOptions, ProjectConfig } from '../types.js'

export async function runSync(opts: CliOptions = {}): Promise<void> {
  if (opts.quiet) {logger.quiet = true}
  if (opts.verbose) {logger.verbose = true}

  const projectConfig: ProjectConfig = await loadOrCreateConfig()
  const resolved = resolveConfigPaths(projectConfig)

  logger.info(`Config: ${projectConfig.configPath}`)
  logger.info(`Source: ${resolved.source}`)

  if (!(await exists(resolved.source))) {
    logger.error(`Source file does not exist: ${resolved.source}`)
    process.exit(1)
  }

  const sourceIsSymlink = await isSymlink(resolved.source)
  if (sourceIsSymlink && !opts.force) {
    logger.error(`Source is a symlink: ${resolved.source}. Use --force to allow symlink source.`)
    process.exit(1)
  }

  const sourceStat = await fs.stat(resolved.source)
  if (!sourceStat.isFile()) {
    logger.error(`Source is not a regular file: ${resolved.source}`)
    process.exit(1)
  }

  const results = []

  const dirSource = path.resolve(projectConfig.configDir, '_agents')
  const rawLinks = projectConfig.config.links
  const configDirs = getConfigDirsForFilenames(rawLinks)

  if (configDirs.length > 0 && (await exists(dirSource))) {
    logger.info(`Directory links (${configDirs.length}):`)

    for (const dir of configDirs) {
      const linkPath = path.resolve(projectConfig.configDir, dir)

      // Skip real directories — replacing them is destructive and almost certainly wrong
      try {
        const st = await fs.lstat(linkPath)
        if (st.isDirectory()) {
          logger.warning(`skip ${dir} — real directory exists (remove it manually to enable directory linking)`)
          results.push({ linkPath, status: 'NOT_SYMLINK', action: 'skip' })
          continue
        }
      } catch {
        // doesn't exist — fall through to fixLink
      }

      const result = await fixLink(linkPath, dirSource, opts)
      results.push(result)

      const verb = actionVerb(result.action)
      if (verb) {
        logger.action(verb, linkPath)
      }
    }

    logger.info('')
  }

  logger.info(`File links (${resolved.links.length}):`)

  for (const linkPath of resolved.links) {
    const result = await fixLink(linkPath, resolved.source, opts)
    results.push(result)

    const verb = actionVerb(result.action)
    if (verb) {
      logger.action(verb, linkPath)
    }
  }

  logger.info('')
  const summary = summarizeResults(results)
  reportSummary(summary, 'sync')

  if (summary.errors > 0) {
    process.exit(1)
  }
}

function actionVerb(action: string): string {
  switch (action) {
    case 'create': return 'create'
    case 'skip': return 'skip'
    case 'fix': return 'fix'
    case 'replace': return 'replace'
    case 'fix_broken': return 'fix'
    case 'remove': return 'remove'
    default: return ''
  }
}
