import { logger } from '../logger.js'
import { discoverConfig, resolveConfigPaths } from '../config.js'
import { checkLink } from '../symlink.js'
import { exists } from '../utils/fs.js'
import { printStatusTable, printCheckSummary } from '../diagnostics.js'
import type { LinkResult } from '../types.js'

export async function runCheck(): Promise<void> {
  const projectConfig = await discoverConfig()

  if (!projectConfig) {
    logger.error('No config found. Run `agents-ln init` or `agents-ln sync` first.')
    process.exit(1)
  }

  const resolved = resolveConfigPaths(projectConfig)
  logger.info(`Config: ${projectConfig.configPath}`)
  logger.info(`Source: ${resolved.source}`)

  if (!(await exists(resolved.source))) {
    logger.error(`Source file does not exist: ${resolved.source}`)
    process.exit(1)
  }

  const results: LinkResult[] = []
  let hasProblems = false

  for (const linkPath of resolved.links) {
    const status = await checkLink(linkPath, resolved.source)
    results.push({ linkPath, status, action: status === 'OK' ? 'skip' : 'error' })
    if (status !== 'OK') {hasProblems = true}
  }

  printStatusTable(results)
  printCheckSummary(results)

  if (hasProblems) {
    process.exit(1)
  }
}
