import fs from 'node:fs/promises'
import path from 'node:path'
import pc from 'picocolors'
import { discoverConfig } from '../config.js'
import { exists } from '../utils/fs.js'

export async function runListSkills(): Promise<void> {
  const projectConfig = await discoverConfig()
  if (!projectConfig) {
    process.stderr.write(pc.red('[error]') + ' No .agents-ln.yaml found. Run `agents-ln init` first.\n')
    process.exit(1)
  }

  const { config, configDir } = projectConfig
  const skillsDir = path.join(configDir, '_agents', 'skills')

  const registered = config.skills ?? {}

  // collect names from both config and disk
  const names = new Set<string>(Object.keys(registered))

  if (await exists(skillsDir)) {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true })
    for (const e of entries) {
      if (e.isDirectory()) {names.add(e.name)}
    }
  }

  if (names.size === 0) {
    process.stdout.write(pc.dim('No skills installed. Use `agents-ln add skill <url> <name>` to add one.\n'))
    return
  }

  const rows: Array<{ name: string; source: string; onDisk: boolean; inConfig: boolean }> = []

  for (const name of [...names].sort()) {
    const entry = registered[name]
    const skillPath = path.join(skillsDir, name)
    const onDisk = await exists(skillPath)
    rows.push({
      name,
      source: entry?.source ?? pc.dim('—'),
      onDisk,
      inConfig: Boolean(entry),
    })
  }

  const nameWidth = Math.max(4, ...rows.map(r => r.name.length))
  const sourceWidth = Math.max(6, ...rows.map(r => stripAnsi(r.source).length))

  const header =
    pc.bold('Name'.padEnd(nameWidth)) +
    '  ' +
    pc.bold('Source'.padEnd(sourceWidth)) +
    '  ' +
    pc.bold('Status')

  process.stdout.write('\n' + header + '\n')
  process.stdout.write(pc.dim('─'.repeat(nameWidth + sourceWidth + 14)) + '\n')

  for (const row of rows) {
    const status = statusLabel(row.inConfig, row.onDisk)
    process.stdout.write(
      pc.cyan(row.name.padEnd(nameWidth)) +
        '  ' +
        row.source.padEnd(sourceWidth + (row.source.length - stripAnsi(row.source).length)) +
        '  ' +
        status +
        '\n',
    )
  }

  process.stdout.write('\n')
}

function statusLabel(inConfig: boolean, onDisk: boolean): string {
  if (inConfig && onDisk) {return pc.green('ok')}
  if (inConfig && !onDisk) {return pc.yellow('missing on disk')}
  return pc.dim('unregistered')
}

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '')
}
