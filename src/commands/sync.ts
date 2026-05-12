import fs from 'node:fs/promises'
import path from 'node:path'
import { logger } from '../logger.js'
import { loadOrCreateConfig, resolveConfigPaths } from '../config.js'
import { fixLink, createLink, summarizeResults, reportSummary } from '../symlink.js'
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
  const configDirs = projectConfig.config.dirs ?? getConfigDirsForFilenames(rawLinks)

  if (configDirs.length > 0 && (await exists(dirSource))) {
    logger.info(`Directory links (${configDirs.length}):`)

    for (const dir of configDirs) {
      const linkPath = path.resolve(projectConfig.configDir, dir)

      // Migrate existing real directories into _agents, then symlink
      try {
        const st = await fs.lstat(linkPath)
        if (st.isDirectory()) {
          if (opts.dryRun) {
            logger.info(`[dry-run] Would migrate ${dir}/ → _agents/ and create symlink`)
            results.push({ linkPath, status: 'NOT_SYMLINK' as const, action: 'replace' as const })
          } else {
            logger.info(`Migrating ${dir}/ → _agents/`)
            await migrateDir(linkPath, dirSource)
            await fs.rm(linkPath, { recursive: true, force: true })
            await createLink(linkPath, dirSource)
            logger.action('replace', linkPath)
            results.push({ linkPath, status: 'NOT_SYMLINK' as const, action: 'replace' as const })
          }
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

async function migrateDir(src: string, dest: string): Promise<void> {
  const entries = await fs.readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      await fs.mkdir(destPath, { recursive: true })
      await migrateDir(srcPath, destPath)
    } else {
      // Don't overwrite files/symlinks already in _agents
      try {
        await fs.lstat(destPath)
      } catch {
        if (entry.isSymbolicLink()) {
          const target = await fs.readlink(srcPath)
          await fs.symlink(target, destPath)
        } else {
          await fs.copyFile(srcPath, destPath)
        }
      }
    }
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
