import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { resolveConfigPaths } from '../src/config.js'
import type { ProjectConfig } from '../src/types.js'
import { Sandbox } from './helpers/sandbox.js'

describe('resolveConfigPaths', () => {
  const sandbox = new Sandbox()

  beforeEach(async () => {
    await sandbox.create()
  })

  afterEach(async () => {
    await sandbox.destroy()
  })

  it('resolves relative paths against config dir', () => {
    const projectConfig: ProjectConfig = {
      configPath: sandbox.path('.agents-ln.yaml'),
      configDir: sandbox.root,
      config: {
        source: '_AGENTS.md',
        links: ['CLAUDE.md', 'GEMINI.md', '.github/copilot-instructions.md'],
      },
    }

    const resolved = resolveConfigPaths(projectConfig)
    expect(resolved.source).toBe(sandbox.path('_AGENTS.md'))
    expect(resolved.links[0]).toBe(sandbox.path('CLAUDE.md'))
    expect(resolved.links[1]).toBe(sandbox.path('GEMINI.md'))
    expect(resolved.links[2]).toBe(sandbox.path('.github/copilot-instructions.md'))
  })
})
