# agents-ln

**Unify AI coding agent instructions across every tool — with symlinks.**

`agents-ln` lets you maintain a **single canonical instruction file** (`_AGENTS.md`) and automatically creates provider-compatible symlinks for all your AI coding tools. Edit one file, every tool sees the same content.

No templates. No generators. No daemons. Just symlinks.

---

## The Problem

Every AI coding tool expects a different file at the project root:

| Tool | File |
|------|------|
| Claude Code | `CLAUDE.md` |
| Codex CLI / OpenCode / Hermes Agent | `AGENTS.md` |
| Gemini CLI | `GEMINI.md` |
| Cursor | `.cursorrules` |
| Windsurf | `.windsurfrules` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Aider | `CONVENTIONS.md` |

Without `agents-ln`, you maintain N copies. With `agents-ln`, you maintain one.

---

## Install

```bash
npm install -g agents-ln
```

Requires Node.js >= 18.

---

## Quick Start

```bash
# 1. Create your canonical instruction file
echo "# Project instructions for AI agents" > _AGENTS.md

# 2. Initialize project config
agents-ln init

# 3. Create symlinks for all supported tools
agents-ln sync
```

That's it. Now `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.cursorrules`, `.windsurfrules`, `.github/copilot-instructions.md`, and `CONVENTIONS.md` all point to `_AGENTS.md`.

---

## Commands

### `agents-ln init`

Create a project-level `.agents-ln.yaml` config file.

```bash
agents-ln init
agents-ln init --source _AGENTS.md
agents-ln init --force          # overwrite existing config
```

Warns if no `.git` directory is detected.

---

### `agents-ln sync`

The core command. Reads config, validates the source file, and creates/fixes symlinks for every link target.

```bash
agents-ln sync
agents-ln sync --dry-run        # preview without changes
agents-ln sync --force          # replace conflicting files
agents-ln sync --backup         # back up conflicting files (*.bak)
agents-ln sync --quiet          # suppress info output
agents-ln sync --verbose        # debug-level logging
```

Safety guarantees:

| State | Default behavior |
|-------|-----------------|
| Link missing | Create it |
| Link correct | Skip (idempotent) |
| Points to wrong target | Error — use `--force` to replace |
| Regular file in the way | Error with size + date — use `--force` or `--backup` |
| Broken symlink | Remove and recreate |
| Source is a symlink | Error — use `--force` to allow |

---

### `agents-ln check`

Validate all configured symlinks. Exits non-zero if problems exist.

```bash
agents-ln check
```

Output:
```
✓ /repo/CLAUDE.md  ok
✗ /repo/GEMINI.md  symlink missing (run agents-ln sync)
```

---

### `agents-ln clean`

Remove symlinks managed by the current config. Never deletes the source file.

```bash
agents-ln clean
agents-ln clean --dry-run
```

Skips:
- Symlinks pointing to a different source (with a warning)
- Regular files (with a warning)
- Missing paths

---

### `agents-ln doctor`

Run comprehensive environment diagnostics.

```bash
agents-ln doctor
```

Checks:
- Operating system
- Symlink creation and resolution
- Binary location in PATH
- Config directory existence and writability
- Config file validity
- Source file existence
- Provider detection

Outputs `✓`/`⚠`/`✗` indicators for each check.

---

## Configuration

### Project Config (`.agents-ln.yaml`)

```yaml
source: _AGENTS.md
links:
  - CLAUDE.md
  - AGENTS.md
  - GEMINI.md
  - .cursorrules
  - .windsurfrules
  - .github/copilot-instructions.md
  - CONVENTIONS.md
```

### Global Config (`~/.config/agents-ln/config.yaml`)

Same format. Project config always takes priority.

If neither exists, running `agents-ln sync` auto-creates a global config with defaults and prints onboarding instructions.

### Config Discovery Priority

```
project/.agents-ln.yaml        # 1. Check project root
~/.config/agents-ln/config.yaml # 2. Fall back to global
→ auto-create with defaults     # 3. Create global if neither exists
```

### Path Resolution

All paths in config follow this pipeline:

1. `~` is expanded to the user's home directory
2. Relative paths are resolved against the config file's directory
3. Paths are normalized (duplicate separators, `..`, `.` removed)
4. Symlink targets are always relative (never absolute)

---

## How It Works

```
_repo/
├── _AGENTS.md              ← you edit this (canonical source)
├── CLAUDE.md ─────────────→ symlink → ./_AGENTS.md
├── AGENTS.md ─────────────→ symlink → ./_AGENTS.md
├── GEMINI.md ─────────────→ symlink → ./_AGENTS.md
├── .cursorrules ──────────→ symlink → ./_AGENTS.md
├── .windsurfrules ────────→ symlink → ./_AGENTS.md
├── CONVENTIONS.md ────────→ symlink → ./_AGENTS.md
└── .github/
    └── copilot-instructions.md → symlink → ../_AGENTS.md
```

All symlinks are **relative** — the structure is portable across machines, team members, and CI environments.

---

## Canonical Directory Structure

For projects that include agent skill files, config directories, or agent definitions:

```
_AGENTS.md              ← canonical instruction file
_agents/
  skills/               ← reusable skill definitions
  agents/               ← agent-specific configurations
```

`agents-ln` creates provider-specific symlinks that map each tool's expected paths to this structure.

---

## Supported Providers

| Provider | File | Config Dir | Skills | Agents |
|----------|------|------------|--------|--------|
| Claude Code | `CLAUDE.md` | `.claude/` | `.claude/skills/` | `.claude/agents/` |
| Codex CLI | `AGENTS.md` | `.codex/` | `.codex/skills/` | `.codex/agents/` |
| OpenCode | `AGENTS.md` | `.claude/` | `.claude/skills/` | `.claude/agents/` |
| Gemini CLI | `GEMINI.md` | `.gemini/` | `.gemini/skills/` | `.gemini/agents/` |
| Cursor | `.cursorrules` | `.cursor/` | `.cursor/rules/` | N/A |
| Windsurf | `.windsurfrules` | `.windsurf/` | N/A | N/A |
| GitHub Copilot | `.github/copilot-instructions.md` | `.github/` | N/A | N/A |
| Aider | `CONVENTIONS.md` | `.aider/` | N/A | N/A |

Add custom providers by editing `.agents-ln.yaml` directly — the `links` array accepts any path.

---

## Safety

`agents-ln` prioritizes safety above all else:

- **Never overwrites files silently** — conflicting files trigger errors with size, modification date, and actionable guidance (`cat`, `--backup`, `--force`)
- **All symlinks are relative** — absolute paths would break when repos are moved or shared
- **Dry-run mode** everywhere — preview any command before making changes
- **Backup mode** — conflicting files are renamed to `.bak` (with timestamp fallback if `.bak` already exists)
- **Empty files** — removed with a warning, not backed up (they're almost certainly accidental)
- **Clean only removes its own symlinks** — unrelated files and symlinks from other sources are left untouched
- **Source is never deleted** — `agents-ln clean` only removes managed symlinks, never the canonical source file

---

## Development

```bash
# Clone and install
git clone <repo> && cd agents-ln
npm install

# Run in development
npm run dev -- sync --dry-run

# Type check
npm run typecheck

# Test
npm test
npm run test:watch

# Build
npm run build
```

---

## Design

Built with seven design principles in order of priority:

1. **Safety** — never destroy user data, never overwrite without consent
2. **Compatibility** — relative symlinks work everywhere, on every OS, in every CI
3. **Idempotency** — running `sync` 100 times produces the same result as running it once
4. **Extensibility** — provider registry, not hardcoded logic
5. **Portability** — relative paths only, cross-platform from day one
6. **Developer Experience** — clear errors, helpful guidance, progressive disclosure
7. **Enterprise Ready** — typed, tested, documented, modular

### Architecture

```
src/
├── providers.ts       Provider registry (add new tools here)
├── config.ts          Config discovery, loading, validation
├── symlink.ts         Symlink state machine (MISSING/OK/WRONG/...)
├── backup.ts          Safe file backup with timestamp fallback
├── scanner.ts         Git repo walker with worktree support
├── doctor.ts          Environment diagnostics
├── logger.ts          Structured output with quiet/verbose modes
├── commands/          One module per CLI command
└── utils/             Cross-platform path + fs utilities
```

---

## License

MIT
