import fs from 'node:fs/promises'
import path from 'node:path'
import { logger } from './logger.js'
import { backupFile } from './backup.js'
import { relativeSymlinkTarget, formatFileInfo } from './utils/path.js'
import { ensureParentDir, readLinkSafe, remove } from './utils/fs.js'
import type { SymlinkStatus, LinkResult, SyncSummary, CliOptions } from './types.js'

export async function checkLink(linkPath: string, expectedTarget: string): Promise<SymlinkStatus> {
  const resolvedExpected = path.resolve(expectedTarget)

  try {
    const stat = await fs.lstat(linkPath)

    if (stat.isSymbolicLink()) {
      const actualRaw = await fs.readlink(linkPath)
      const actualResolved = path.resolve(path.dirname(linkPath), actualRaw)

      if (actualResolved === resolvedExpected) {
        return 'OK'
      }
      return 'WRONG_TARGET'
    }

    return 'NOT_SYMLINK'
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT') {return 'MISSING'}
    return 'BROKEN'
  }
}

export async function createLink(linkPath: string, sourcePath: string): Promise<void> {
  const absoluteSource = path.resolve(sourcePath)
  const relative = relativeSymlinkTarget(linkPath, absoluteSource)
  await ensureParentDir(linkPath)

  await fs.symlink(relative, linkPath)
}

export async function fixLink(
  linkPath: string,
  sourcePath: string,
  opts: CliOptions = {},
): Promise<LinkResult> {
  const absoluteSource = path.resolve(sourcePath)
  const status = await checkLink(linkPath, absoluteSource)

  if (opts.dryRun) {
    return dryRunAction(linkPath, status)
  }

  switch (status) {
    case 'MISSING': {
      await createLink(linkPath, absoluteSource)
      return { linkPath, status, action: 'create' }
    }

    case 'OK': {
      return { linkPath, status, action: 'skip' }
    }

    case 'WRONG_TARGET': {
      if (opts.force) {
        await remove(linkPath)
        await createLink(linkPath, absoluteSource)
        return { linkPath, status, action: 'fix' }
      }
      const actualRaw = await readLinkSafe(linkPath)
      const msg = `${linkPath} points to ${actualRaw} instead of ${relativeSymlinkTarget(linkPath, absoluteSource)}`
      logger.error(`${msg}. Use --force to replace.`)
      return { linkPath, status, action: 'error', error: msg }
    }

    case 'NOT_SYMLINK': {
      const conflictInfo = await getConflictInfo(linkPath)

      if (opts.backup) {
        const result = await backupFile(linkPath)
        if (result.backedUp || result.reason === 'empty') {
          await createLink(linkPath, absoluteSource)
          return { linkPath, status, action: 'replace' }
        }
        const msg = `Failed to back up ${linkPath}`
        logger.error(msg)
        return { linkPath, status, action: 'error', error: msg }
      }

      if (opts.force) {
        await remove(linkPath)
        await createLink(linkPath, absoluteSource)
        return { linkPath, status, action: 'replace' }
      }

      const msg = `${linkPath} exists (${conflictInfo}). Options:\n         cat ${linkPath}\n         agents-ln sync --backup\n         agents-ln sync --force`
      logger.error(msg)
      return { linkPath, status, action: 'error', error: msg }
    }

    case 'BROKEN': {
      await remove(linkPath)
      await createLink(linkPath, absoluteSource)
      return { linkPath, status, action: 'fix_broken' }
    }

    default:
      return { linkPath, status, action: 'error', error: 'Unknown status: ' + String(status) }
  }
}

export async function removeLink(
  linkPath: string,
  sourcePath: string,
  opts: CliOptions = {},
): Promise<LinkResult> {
  const absoluteSource = path.resolve(sourcePath)
  const status = await checkLink(linkPath, absoluteSource)

  if (opts.dryRun) {
    switch (status) {
      case 'OK':
      case 'BROKEN':
        return { linkPath, status, action: 'remove' }
      case 'MISSING':
        return { linkPath, status, action: 'skip' }
      case 'WRONG_TARGET':
        logger.warning(`${linkPath} is a symlink to a different source — skipping`)
        return { linkPath, status, action: 'skip', error: 'not ours' }
      case 'NOT_SYMLINK':
        logger.warning(`${linkPath} is a regular file — skipping`)
        return { linkPath, status, action: 'skip', error: 'not a symlink' }
      default:
        return { linkPath, status, action: 'error' }
    }
  }

  switch (status) {
    case 'OK': {
      await remove(linkPath)
      return { linkPath, status, action: 'remove' }
    }
    case 'BROKEN': {
      await remove(linkPath)
      return { linkPath, status, action: 'remove' }
    }
    case 'MISSING': {
      return { linkPath, status, action: 'skip' }
    }
    case 'WRONG_TARGET': {
      logger.warning(`${linkPath} is a symlink to a different source — skipping`)
      return { linkPath, status, action: 'skip', error: 'not ours' }
    }
    case 'NOT_SYMLINK': {
      logger.warning(`${linkPath} is a regular file — skipping`)
      return { linkPath, status, action: 'skip', error: 'not a symlink' }
    }
    default:
      return { linkPath, status, action: 'error' }
  }
}

export function summarizeResults(results: LinkResult[]): SyncSummary {
  const summary: SyncSummary = {
    total: results.length,
    created: 0,
    skipped: 0,
    fixed: 0,
    replaced: 0,
    errors: 0,
    removed: 0,
  }

  for (const r of results) {
    switch (r.action) {
      case 'create': summary.created++; break
      case 'skip': summary.skipped++; break
      case 'fix': summary.fixed++; break
      case 'fix_broken': summary.fixed++; break
      case 'replace': summary.replaced++; break
      case 'remove': summary.removed++; break
      case 'error': summary.errors++; break
    }
  }

  return summary
}

function dryRunAction(linkPath: string, status: SymlinkStatus): LinkResult {
  switch (status) {
    case 'MISSING':
      logger.info(`[dry-run] Would create symlink: ${linkPath}`)
      return { linkPath, status, action: 'create' }
    case 'OK':
      logger.info(`[dry-run] Would skip: ${linkPath} (already correct)`)
      return { linkPath, status, action: 'skip' }
    case 'WRONG_TARGET':
      logger.info(`[dry-run] Would fix wrong symlink: ${linkPath}`)
      return { linkPath, status, action: 'fix' }
    case 'NOT_SYMLINK':
      logger.info(`[dry-run] Would replace regular file: ${linkPath}`)
      return { linkPath, status, action: 'replace' }
    case 'BROKEN':
      logger.info(`[dry-run] Would fix broken symlink: ${linkPath}`)
      return { linkPath, status, action: 'fix_broken' }
    default:
      return { linkPath, status, action: 'error' }
  }
}

async function getConflictInfo(linkPath: string): Promise<string> {
  try {
    const stat = await fs.stat(linkPath)
    return formatFileInfo(stat.size, stat.mtime)
  } catch {
    return 'unknown'
  }
}

export function reportSummary(summary: SyncSummary, command: string): void {
  const parts: string[] = []
  if (summary.created > 0) {parts.push(`${summary.created} created`)}
  if (summary.skipped > 0) {parts.push(`${summary.skipped} skipped`)}
  if (summary.fixed > 0) {parts.push(`${summary.fixed} fixed`)}
  if (summary.replaced > 0) {parts.push(`${summary.replaced} replaced`)}
  if (summary.removed > 0) {parts.push(`${summary.removed} removed`)}
  if (summary.errors > 0) {parts.push(`${summary.errors} errors`)}

  const line = parts.length > 0 ? parts.join(', ') : 'no changes'
  logger.info(`${command}: ${line} (${summary.total} total)`)
}
