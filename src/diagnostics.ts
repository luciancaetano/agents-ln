import pc from 'picocolors'
import { logger } from './logger.js'
import type { LinkResult } from './types.js'

export function printStatusTable(results: LinkResult[]): void {
  const rows: string[] = []

  for (const r of results) {
    const icon = statusIcon(r.status)
    const action = actionLabel(r.action)
    const error = r.error ? ` — ${r.error}` : ''
    rows.push(`  ${icon} ${r.linkPath}  ${pc.dim(action)}${error}`)
  }

  if (rows.length > 0) {
    logger.info('')
    logger.info('Status:')
    rows.forEach((r) => logger.info(r))
  }
}

export function printCheckSummary(results: LinkResult[]): void {
  const problems = results.filter((r) => r.status !== 'OK')

  if (problems.length === 0) {
    logger.ok('All links are correctly configured')
    return
  }

  logger.info('')
  logger.info(`Found ${problems.length} problem(s):`)
  for (const r of problems) {
    const icon = statusIcon(r.status)
    const suggestion = suggestionFor(r.status)
    logger.error(`${icon} ${r.linkPath} — ${suggestion}`)
  }
}

function statusIcon(status: string): string {
  switch (status) {
    case 'OK': return pc.green('✓')
    case 'MISSING': return pc.yellow('✗')
    case 'WRONG_TARGET': return pc.yellow('⚠')
    case 'NOT_SYMLINK': return pc.red('✗')
    case 'BROKEN': return pc.red('⚠')
    default: return pc.dim('?')
  }
}

function actionLabel(action: string): string {
  switch (action) {
    case 'create': return 'created'
    case 'skip': return 'ok'
    case 'fix': return 'fixed'
    case 'replace': return 'replaced'
    case 'fix_broken': return 'recreated'
    case 'remove': return 'removed'
    case 'error': return 'error'
    default: return action
  }
}

function suggestionFor(status: string): string {
  switch (status) {
    case 'MISSING': return 'symlink missing (run agents-ln sync)'
    case 'WRONG_TARGET': return 'points to wrong target (use --force to fix)'
    case 'NOT_SYMLINK': return 'is a regular file (use --force or --backup)'
    case 'BROKEN': return 'broken symlink (will be fixed by sync)'
    default: return 'unknown issue'
  }
}
