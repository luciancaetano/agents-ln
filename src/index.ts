#!/usr/bin/env node

import { Command } from 'commander'
import pc from 'picocolors'
import { logger } from './logger.js'
import { runInit } from './commands/init.js'
import { runSync } from './commands/sync.js'
import { runCheck } from './commands/check.js'
import { runClean } from './commands/clean.js'
import { runDoctor } from './commands/doctor.js'
import { runAddSkill } from './commands/add-skill.js'
import { runRemoveSkill } from './commands/remove-skill.js'
import type { CliOptions } from './types.js'

const pkg = { version: '0.2.5', description: 'Unify AI coding agent instruction files using symbolic links' }

function showMascot() {
  const v = pc.dim(`v${pkg.version}`)
  console.log('')
  console.log(pc.cyan('  ┌───────┐'))
  console.log(pc.cyan('  │ ◉   ◉ │') + `  agents-ln ${v}`)
  console.log(pc.cyan('  ├───────┤'))
  console.log(pc.cyan('  │  ─▲─  │') + '  ' + pc.dim('One instruction file. Every AI agent.'))
  console.log(pc.cyan('  └─┬───┬─┘'))
  console.log(pc.cyan('    ╨   ╨  '))
  console.log('')
  console.log(pc.dim('  Commands: ') + ['init', 'sync', 'check', 'clean', 'doctor', 'add skill', 'remove skill'].map(c => pc.bold(c)).join(pc.dim(' · ')))
  console.log(pc.dim("  Run 'agents-ln <command> --help' for usage."))
  console.log('')
}

const program = new Command()

program
  .name('agents-ln')
  .description(pkg.description)
  .version(pkg.version)
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.optsWithGlobals()
    if (opts.quiet) {logger.quiet = true}
    if (opts.verbose) {logger.verbose = true}
  })

// Global options
const globalOpts = (cmd: Command) => cmd
  .option('--dry-run', 'Show what would be done without making changes')
  .option('--force', 'Override safety checks and replace conflicting files')
  .option('--backup', 'Back up conflicting files before replacing')
  .option('--quiet', 'Suppress informational output')
  .option('--verbose', 'Enable debug-level logging')

// init
globalOpts(program
  .command('init')
  .description('Create a project .agents-ln.yaml config')
  .option('--source <path>', 'Source file path (default: _AGENTS.md)')
  .option('-y, --yes', 'Skip interactive prompt and link all agents')
  .action(async (opts) => {
    const cli: CliOptions = { dryRun: opts.dryRun, force: opts.force, quiet: opts.quiet }
    await runInit({ ...cli, source: opts.source, yes: opts.yes })
  }))

// sync
globalOpts(program
  .command('sync')
  .description('Synchronize symlinks to match config')
  .action(async (opts) => {
    const cli: CliOptions = { dryRun: opts.dryRun, force: opts.force, backup: opts.backup, quiet: opts.quiet, verbose: opts.verbose }
    await runSync(cli)
  }))

// check
globalOpts(program
  .command('check')
  .description('Validate all symlinks against config')
  .action(async () => {
    await runCheck()
  }))

// clean
globalOpts(program
  .command('clean')
  .description('Remove managed symlinks')
  .action(async (opts) => {
    await runClean({ dryRun: opts.dryRun })
  }))

// doctor
globalOpts(program
  .command('doctor')
  .description('Run environment diagnostics')
  .action(async () => {
    await runDoctor()
  }))

// add
const addCmd = program
  .command('add')
  .description('Add resources to the project')

addCmd
  .command('skill <url> <skillName>')
  .description('Install a skill from a remote repository into _agents/skills/')
  .action(async (url: string, skillName: string) => {
    await runAddSkill(url, skillName)
  })

// remove
const removeCmd = program
  .command('remove')
  .description('Remove resources from the project')

removeCmd
  .command('skill <skillName>')
  .description('Remove a skill from _agents/skills/ and unregister it from config')
  .action(async (skillName: string) => {
    await runRemoveSkill(skillName)
  })

if (process.argv.length <= 2) {
  showMascot()
  process.exit(0)
}

program.parse(process.argv)
