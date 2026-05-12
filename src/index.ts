#!/usr/bin/env node

import { Command } from 'commander'
import { logger } from './logger.js'
import { runInit } from './commands/init.js'
import { runSync } from './commands/sync.js'
import { runCheck } from './commands/check.js'
import { runClean } from './commands/clean.js'
import { runDoctor } from './commands/doctor.js'
import type { CliOptions } from './types.js'

const pkg = { version: '0.1.0', description: 'Unify AI coding agent instruction files using symbolic links' }

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

program.parse(process.argv)
