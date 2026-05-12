import { logger } from '../logger.js'
import { discoverConfig, resolveConfigPaths } from '../config.js'
import { removeLink, summarizeResults, reportSummary } from '../symlink.js'
import type { CliOptions } from '../types.js'

export interface CleanOptions extends CliOptions {
  dryRun?: boolean
}

export async function runClean(opts: CleanOptions = {}): Promise<void> {
  const projectConfig = await discoverConfig()

  if (!projectConfig) {
    logger.info('No config found — nothing to clean')
    return
  }

  const resolved = resolveConfigPaths(projectConfig)
  logger.info(`Config: ${projectConfig.configPath}`)
  logger.info(`Source: ${resolved.source}`)

  const results = []
  for (const linkPath of resolved.links) {
    const result = await removeLink(linkPath, resolved.source, opts)
    results.push(result)

    if (result.action === 'remove') {
      logger.create(`Removed: ${linkPath}`)
    }
  }

  logger.info('')
  const summary = summarizeResults(results)
  reportSummary(summary, 'clean')

  if (summary.errors > 0) {
    process.exit(1)
  }
}
