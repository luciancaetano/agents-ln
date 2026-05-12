import fs from 'node:fs/promises'
import { logger } from './logger.js'
import { timestamp } from './utils/path.js'

export interface BackupResult {
  backedUp: boolean
  backupPath?: string
  reason?: string
}

export async function backupFile(filePath: string): Promise<BackupResult> {
  let lstat;
  try {
    lstat = await fs.lstat(filePath)
  } catch {
    return { backedUp: false }
  }

  if (lstat.isSymbolicLink()) {
    return { backedUp: false, reason: 'symlink' }
  }

  if (!lstat.isFile()) {
    return { backedUp: false }
  }

  const stat = lstat

  if (stat.size === 0) {
    await fs.unlink(filePath)
    logger.warning(`Removed empty file ${filePath}`)
    return { backedUp: false, reason: 'empty' }
  }

  const bakPath = filePath + '.bak'
  let targetPath = bakPath

  try {
    await fs.access(bakPath)
    targetPath = filePath + '.' + timestamp() + '.bak'
  } catch {
  }

  await fs.rename(filePath, targetPath)
  logger.info(`Backed up ${filePath} → ${targetPath}`)
  return { backedUp: true, backupPath: targetPath }
}
