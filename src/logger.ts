import pc from 'picocolors'

export type LogLevel = 'info' | 'ok' | 'create' | 'skip' | 'replace' | 'fix' | 'warning' | 'error' | 'debug'

const PREFIXES: Record<LogLevel, string> = {
  info: pc.blue('[info]'),
  ok: pc.green('[ok]'),
  create: pc.green('[create]'),
  skip: pc.dim('[skip]'),
  replace: pc.yellow('[replace]'),
  fix: pc.cyan('[fix]'),
  warning: pc.yellow('[warning]'),
  error: pc.red('[error]'),
  debug: pc.dim('[debug]'),
}

const STDOUT_LEVELS = new Set<LogLevel>(['info', 'ok', 'create', 'skip', 'replace', 'fix', 'debug'])
const STDERR_LEVELS = new Set<LogLevel>(['warning', 'error'])

export class Logger {
  private _quiet = false
  private _verbose = false

  set quiet(v: boolean) { this._quiet = v }
  set verbose(v: boolean) { this._verbose = v }

  private emit(level: LogLevel, message: string): void {
    if (level === 'debug' && !this._verbose) {return}

    const prefix = PREFIXES[level] ?? ''
    const line = `${prefix} ${message}\n`

    if (STDERR_LEVELS.has(level)) {
      process.stderr.write(line)
    } else if (!this._quiet || level === 'error') {
      process.stdout.write(line)
    }
  }

  info(msg: string) { this.emit('info', msg) }
  ok(msg: string) { this.emit('ok', msg) }
  create(msg: string) { this.emit('create', msg) }
  skip(msg: string) { this.emit('skip', msg) }
  replace(msg: string) { this.emit('replace', msg) }
  fix(msg: string) { this.emit('fix', msg) }
  warning(msg: string) { this.emit('warning', msg) }
  error(msg: string) { this.emit('error', msg) }
  debug(msg: string) { this.emit('debug', msg) }

  action(verb: string, path: string): void {
    const level = verb as LogLevel
    if (STDOUT_LEVELS.has(level) || level === 'warning' || level === 'error') {
      this.emit(level, path)
    } else {
      this.info(`${verb} ${path}`)
    }
  }
}

export const logger = new Logger()
