import type { ToolProvider } from './types.js'

const PROVIDERS: ToolProvider[] = [
  {
    id: 'claude',
    displayName: 'Claude Code',
    repoFileName: 'CLAUDE.md',
    globalFileName: 'CLAUDE.md',
    configDir: '.claude',
    skillsDir: '.claude/skills',
    agentsDir: '.claude/agents',
    detectPaths: ['~/.claude', '~/.claude/CLAUDE.md'],
    detectCommands: ['claude'],
    supportsAgentsMd: false,
  },
  {
    id: 'codex',
    displayName: 'Codex CLI',
    repoFileName: 'AGENTS.md',
    globalFileName: 'AGENTS.md',
    configDir: '.codex',
    skillsDir: '.codex/skills',
    agentsDir: '.codex/agents',
    detectPaths: ['~/.codex'],
    detectCommands: ['codex', 'codex-cli'],
    supportsAgentsMd: true,
  },
  {
    id: 'opencode',
    displayName: 'OpenCode',
    repoFileName: 'AGENTS.md',
    globalFileName: 'AGENTS.md',
    configDir: '.claude',
    skillsDir: '.claude/skills',
    agentsDir: '.claude/agents',
    detectPaths: ['~/.claude'],
    detectCommands: ['opencode'],
    supportsAgentsMd: true,
  },
  {
    id: 'gemini',
    displayName: 'Gemini CLI',
    repoFileName: 'GEMINI.md',
    globalFileName: 'GEMINI.md',
    configDir: '.gemini',
    skillsDir: '.gemini/skills',
    agentsDir: '.gemini/agents',
    detectPaths: ['~/.gemini'],
    detectCommands: ['gemini', 'gemini-cli'],
    supportsAgentsMd: false,
  },
  {
    id: 'cursor',
    displayName: 'Cursor',
    repoFileName: '.cursorrules',
    globalFileName: '.cursorrules',
    configDir: '.cursor',
    skillsDir: '.cursor/rules',
    detectPaths: ['~/.cursor'],
    detectCommands: ['cursor'],
    supportsAgentsMd: false,
  },
  {
    id: 'windsurf',
    displayName: 'Windsurf',
    repoFileName: '.windsurfrules',
    globalFileName: '.windsurfrules',
    configDir: '.windsurf',
    detectPaths: ['~/.windsurf'],
    detectCommands: ['windsurf'],
    supportsAgentsMd: false,
  },
  {
    id: 'copilot',
    displayName: 'GitHub Copilot',
    repoFileName: '.github/copilot-instructions.md',
    configDir: '.github',
    detectPaths: ['~/.github'],
    detectCommands: ['github-copilot-cli', 'gh'],
    supportsAgentsMd: false,
  },
  {
    id: 'aider',
    displayName: 'Aider',
    repoFileName: 'CONVENTIONS.md',
    configDir: '.aider',
    detectPaths: ['~/.aider'],
    detectCommands: ['aider'],
    supportsAgentsMd: false,
  },
]

export function getProviders(): ToolProvider[] {
  return PROVIDERS.slice()
}

export function getProvider(id: string): ToolProvider | undefined {
  return PROVIDERS.find((p) => p.id === id)
}

export function getConfigDirsForFilenames(filenames: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const f of filenames) {
    if (f.includes('/')) {continue}
    for (const p of PROVIDERS) {
      if (p.repoFileName === f && p.configDir && !seen.has(p.configDir)) {
        seen.add(p.configDir)
        result.push(p.configDir)
      }
    }
  }
  return result
}
