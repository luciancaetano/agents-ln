export interface ToolProvider {
  id: string
  displayName: string
  repoFileName: string
  globalFileName?: string
  configDir?: string
  skillsDir?: string
  agentsDir?: string
  detectPaths?: string[]
  detectCommands?: string[]
  supportsAgentsMd: boolean
}

export type SymlinkStatus = 'MISSING' | 'OK' | 'WRONG_TARGET' | 'NOT_SYMLINK' | 'BROKEN'

export type LinkAction =
  | 'create'
  | 'skip'
  | 'fix'
  | 'replace'
  | 'fix_broken'
  | 'remove'
  | 'error'

export interface LinkResult {
  linkPath: string
  status: SymlinkStatus
  action: LinkAction
  error?: string
}

export interface SyncSummary {
  total: number
  created: number
  skipped: number
  fixed: number
  replaced: number
  errors: number
  removed: number
}

export interface AgentsLnConfig {
  source: string
  links: string[]
  providers?: Record<string, { enabled: boolean }>
}

export interface ProjectConfig {
  configPath: string
  configDir: string
  config: AgentsLnConfig
}

export interface ToolDetection {
  provider: ToolProvider
  method: 'path' | 'command'
  matchPath?: string
}

export interface ScanResult {
  repoPath: string
  hasAgentsMd: boolean
  linksCreated: LinkResult[]
}

export interface DoctorResult {
  category: string
  status: 'ok' | 'warning' | 'error'
  message: string
}

export interface CliOptions {
  dryRun?: boolean
  force?: boolean
  backup?: boolean
  quiet?: boolean
  verbose?: boolean
}
