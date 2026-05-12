import { AGENTS } from './agents_list.js'
import type { ToolProvider } from './types.js'

export function getProviders(): ToolProvider[] {
  return AGENTS.slice()
}

export function getProvider(id: string): ToolProvider | undefined {
  return AGENTS.find((p) => p.id === id)
}

export function getConfigDirsForFilenames(filenames: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const f of filenames) {
    if (f.includes('/')) {continue}
    for (const p of AGENTS) {
      if (p.repoFileName === f && p.configDir && !seen.has(p.configDir)) {
        seen.add(p.configDir)
        result.push(p.configDir)
      }
    }
  }
  return result
}
