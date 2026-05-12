import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { exists } from './utils/fs.js'
import { discoverConfig } from './config.js'
import { getProviders } from './providers.js'
import { expandHome } from './utils/path.js'
import type { DoctorResult } from './types.js'
import pc from 'picocolors'

function ok(msg: string): DoctorResult {
  return { category: 'env', status: 'ok', message: msg }
}
function warn(msg: string): DoctorResult {
  return { category: 'env', status: 'warning', message: msg }
}
function err(msg: string): DoctorResult {
  return { category: 'env', status: 'error', message: msg }
}

export async function runDoctor(): Promise<DoctorResult[]> {
  const results: DoctorResult[] = []

  // OS check
  const platform = process.platform
  results.push(ok(`Platform: ${platform}`))
  if (platform === 'win32') {
    results.push(warn('Windows detected — symlink creation may require admin privileges or developer mode'))
  }

  // Symlink support
  results.push(...await testSymlinkSupport())

  // PATH check
  results.push(...checkPath())

  // Config dirs
  results.push(...await checkConfigDirs())

  // Project config
  results.push(...await checkProjectConfig())

  // Provider detection
  results.push(...await checkProviders())

  return results
}

async function testSymlinkSupport(): Promise<DoctorResult[]> {
  const results: DoctorResult[] = []
  const tmpDir = path.join(os.tmpdir(), 'agents-ln-doctor-' + Date.now())

  try {
    await fs.mkdir(tmpDir, { recursive: true })
    const targetFile = path.join(tmpDir, 'target.txt')
    const linkFile = path.join(tmpDir, 'link.txt')

    await fs.writeFile(targetFile, 'test', 'utf-8')
    await fs.symlink('target.txt', linkFile)

    const readTarget = await fs.readlink(linkFile)
    if (readTarget === 'target.txt') {
      results.push(ok('Symlink creation and resolution working'))
    } else {
      results.push(warn(`Symlink read returned unexpected target: ${readTarget}`))
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    results.push(err(`Symlink creation failed: ${msg}`))
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }

  return results
}

function checkPath(): DoctorResult[] {
  const results: DoctorResult[] = []
  const binPath = new URL(import.meta.url).pathname
  results.push(ok(`Binary: ${binPath}`))

  const pathEnv = process.env.PATH ?? ''
  const isInPath = pathEnv.split(path.delimiter).some((p) =>
    binPath.startsWith(p),
  )

  if (isInPath) {
    results.push(ok('Binary is in PATH'))
  } else {
    results.push(warn('Binary may not be in PATH'))
  }

  return results
}

async function checkConfigDirs(): Promise<DoctorResult[]> {
  const results: DoctorResult[] = []
  const configDir = path.join(os.homedir(), '.config', 'agents-ln')

  if (await exists(configDir)) {
    results.push(ok(`Config directory exists: ${configDir}`))
    try {
      await fs.access(configDir, fs.constants.W_OK)
      results.push(ok('Config directory is writable'))
    } catch {
      results.push(warn('Config directory is not writable'))
    }
  } else {
    results.push(ok(`Config directory does not exist (will be created on first use): ${configDir}`))
  }

  return results
}

async function checkProjectConfig(): Promise<DoctorResult[]> {
  const results: DoctorResult[] = []
  const config = await discoverConfig()

  if (config) {
    results.push(ok(`Config found: ${config.configPath}`))
    results.push(ok(`Source: ${config.config.source}`))
    results.push(ok(`Links: ${config.config.links.join(', ')}`))

    const sourcePath = path.resolve(config.configDir, config.config.source)
    if (await exists(sourcePath)) {
      results.push(ok(`Source file exists: ${sourcePath}`))
    } else {
      results.push(warn(`Source file not found: ${sourcePath}`))
    }
  } else {
    results.push(ok('No config found (run agents-ln init or agents-ln sync)'))
  }

  return results
}

async function checkProviders(): Promise<DoctorResult[]> {
  const results: DoctorResult[] = []
  const providers = getProviders()

  for (const provider of providers) {
    let detected = false
    let method = ''

    if (provider.detectPaths) {
      for (const detectPath of provider.detectPaths) {
        const resolved = expandHome(detectPath)
        if (await exists(resolved)) {
          detected = true
          method = `path: ${resolved}`
          break
        }
      }
    }

    if (!detected && provider.detectCommands) {
      for (const cmd of provider.detectCommands) {
        const cmdPath = findInPath(cmd)
        if (cmdPath) {
          detected = true
          method = `command: ${cmdPath}`
          break
        }
      }
    }

    if (detected) {
      results.push(ok(`${provider.displayName}: detected (${method})`))
    } else {
      results.push(ok(`${provider.displayName}: not detected`))
    }
  }

  return results
}

function findInPath(cmd: string): string | null {
  const pathEnv = process.env.PATH ?? ''
  const ext = process.platform === 'win32' ? '.exe' : ''

  for (const dir of pathEnv.split(path.delimiter)) {
    const fullPath = path.join(dir, cmd + ext)
    try {
      fsSync.accessSync(fullPath, fsSync.constants.X_OK)
      return fullPath
    } catch {
    }
  }
  return null
}

export function printDoctorResults(results: DoctorResult[]): void {
  let hasError = false
  let hasWarning = false

  for (const result of results) {
    const icon = result.status === 'ok'
      ? pc.green('✓')
      : result.status === 'warning'
        ? pc.yellow('⚠')
        : pc.red('✗')
    console.error(`${icon} ${result.message}`)
    if (result.status === 'error') {hasError = true}
    if (result.status === 'warning') {hasWarning = true}
  }

  console.error('')
  if (hasError) {
    console.error(pc.red('✗ Issues found that need to be resolved'))
  } else if (hasWarning) {
    console.error(pc.yellow('⚠ Warnings found (non-blocking)'))
  } else {
    console.error(pc.green('✓ All checks passed'))
  }
}
