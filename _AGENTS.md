# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build       # compile src/ → dist/ via tsup (ESM, minified, with .d.ts)
npm run dev         # run from source via tsx (no build needed)
npm test            # run all tests with vitest
npx vitest run test/providers.test.ts  # run a single test file
npm run typecheck   # tsc --noEmit
npm run lint        # eslint src/ test/
npm run lint:fix    # eslint with auto-fix
```

The CLI binary (`agents-ln`) points to `dist/index.js`. Always rebuild (`npm run build`) before testing the CLI manually with `node ./dist/index.js`.

## Architecture

The tool maintains a single canonical instruction file (`_AGENTS.md`) and creates provider-specific symlinks (`CLAUDE.md`, `AGENTS.md`, etc.) pointing to it. Config lives in `.agents-ln.yaml` at the project root, or falls back to `~/.config/agents-ln/config.yaml`.

### Adding a new agent provider

Edit **`src/agents_list.ts`** — this is the only file that needs to change. Add an entry to the `AGENTS` array with `id`, `displayName`, `repoFileName`, `configDir`, `detectPaths`, `detectCommands`, and `supportsAgentsMd`. `providers.ts` and `init.ts` consume it automatically.

### Key files

| File | Responsibility |
|------|---------------|
| `src/agents_list.ts` | Master list of all supported agent providers |
| `src/providers.ts` | Utility functions over `agents_list` (`getProviders`, `getProvider`, `getConfigDirsForFilenames`) |
| `src/types.ts` | All shared TypeScript interfaces (`ToolProvider`, `LinkResult`, `AgentsLnConfig`, etc.) |
| `src/symlink.ts` | Core symlink operations: `checkLink` → `SymlinkStatus`, `fixLink`, `removeLink` |
| `src/config.ts` | Config discovery (project → global fallback), Zod validation, `resolveConfigPaths` |
| `src/commands/sync.ts` | Main sync loop: directory links (`_agents/` → configDirs), then file links |
| `src/commands/init.ts` | Interactive agent selection; one item per agent, shared filenames are deduplicated into the links list |
| `src/logger.ts` | Typed logger with stdout/stderr split; `logger.action(verb, path)` dispatches by log level |

### Symlink status machine

`checkLink` returns one of: `MISSING | OK | WRONG_TARGET | NOT_SYMLINK | BROKEN`. `fixLink` acts on that status — errors on `WRONG_TARGET`/`NOT_SYMLINK` unless `--force` or `--backup` are passed.

### Directory linking (`_agents/`)

When `_agents/` exists in the project, `sync` also creates directory symlinks: `.claude → _agents`, `.opencode → _agents`, etc., for each configDir derived from the configured file links. If a configDir already exists as a real directory, its contents are **migrated** into `_agents/` non-destructively (no overwrites), the original directory is removed, and the symlink is created.

### Config resolution

`loadOrCreateConfig` searches for `.agents-ln.yaml` in `cwd`, then falls back to `~/.config/agents-ln/config.yaml` (auto-created with defaults if missing). All paths in config are resolved relative to the directory containing the config file via `resolveConfigPaths`.
