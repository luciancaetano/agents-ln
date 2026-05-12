<div align="center">

# agents-ln

### Every AI coding agent reads a different file. Edit one, your others go stale.

[![npm version](https://img.shields.io/npm/v/agents-ln.svg)](https://www.npmjs.com/package/agents-ln)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Install](#install) · [Quick Start](#quick-start) · [Commands](#commands) · [Providers](#supported-providers) · [Config](#configuration)

</div>

---

> [!IMPORTANT]
> **What it touches:** Creates symlinks in your project root and, on first run, a global config at `~/.config/agents-ln/config.yaml`. No network calls. No shell hooks. No daemons.
>
> **Disable instantly:** `agents-ln clean` removes all managed symlinks. Your canonical `_AGENTS.md` is never deleted.
>
> **Uninstall:** `npm uninstall -g agents-ln` then `agents-ln clean` in any project that used it.

## Install

```bash
npm install -g agents-ln
```

Requires Node.js >= 18.

---

## The Problem

Claude Code expects `CLAUDE.md`. Cursor expects `.cursorrules`. Gemini CLI expects `GEMINI.md`. GitHub Copilot expects `.github/copilot-instructions.md`.

If you use more than one, you're either copy-pasting or letting them drift.

`agents-ln` solves this with the oldest UNIX trick: one canonical file, symlinks for the rest.

---

## See It Work

```
$ agents-ln init
✔ Wrote .agents-ln.yaml

$ agents-ln sync
→ created  CLAUDE.md                          → _AGENTS.md
→ created  AGENTS.md                          → _AGENTS.md
→ created  GEMINI.md                          → _AGENTS.md
→ created  .cursorrules                       → _AGENTS.md
→ created  .windsurfrules                     → _AGENTS.md
→ created  CONVENTIONS.md                     → _AGENTS.md
→ created  .github/copilot-instructions.md    → ../_AGENTS.md
```

Edit `_AGENTS.md`. Every tool sees the same content — no copies, no drift.

---

## Quick Start

```bash
# 1. Create your canonical instruction file
echo "# Project instructions for AI agents" > _AGENTS.md

# 2. Initialize config
agents-ln init

# 3. Create symlinks
agents-ln sync
```

Verify at any time:

```bash
agents-ln check
```

---

## Supported Providers

| Provider | Instruction File | Config Dir |
|----------|-----------------|------------|
| Claude Code | `CLAUDE.md` | `.claude/` |
| Codex CLI | `AGENTS.md` | `.codex/` |
| OpenCode | `AGENTS.md` | `.opencode/` |
| Hermes Agent | `AGENTS.md` | `.hermes/` |
| Gemini CLI | `GEMINI.md` | `.gemini/` |
| Cursor | `.cursorrules` | `.cursor/` |
| Windsurf | `.windsurfrules` | `.windsurf/` |
| GitHub Copilot | `.github/copilot-instructions.md` | `.github/` |
| Aider | `CONVENTIONS.md` | `.aider/` |

Add any custom path by editing the `links` array in `.agents-ln.yaml`.

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

The core command. Reads config, validates the source file, and creates or fixes symlinks for every link target.

```bash
agents-ln sync
agents-ln sync --dry-run        # preview without changes
agents-ln sync --force          # replace conflicting files
agents-ln sync --backup         # back up conflicting files (*.bak)
agents-ln sync --quiet          # suppress info output
agents-ln sync --verbose        # debug-level logging
```

<details>
<summary><b>Symlink state machine</b> — how sync handles each case</summary>

| State | Default behavior |
|-------|-----------------|
| Link missing | Create it |
| Link correct | Skip (idempotent) |
| Points to wrong target | Error — use `--force` to replace |
| Regular file in the way | Error with size + date — use `--force` or `--backup` |
| Broken symlink | Remove and recreate |
| Source is a symlink | Error — use `--force` to allow |

</details>

---

### `agents-ln check`

Validate all configured symlinks. Exits non-zero if problems exist.

```bash
agents-ln check
```

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

Skips symlinks pointing to a different source, regular files, and missing paths — all with warnings.

---

### `agents-ln doctor`

Run environment diagnostics: OS, symlink capability, PATH, config validity, source file, detected providers.

```bash
agents-ln doctor
```

Outputs `✓` / `⚠` / `✗` for each check.

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

Same format. Project config takes priority. Auto-created with defaults on first `agents-ln sync` if neither config exists.

<details>
<summary><b>Config discovery and path resolution</b></summary>

**Discovery priority:**

```
project/.agents-ln.yaml           # 1. Project root
~/.config/agents-ln/config.yaml   # 2. Global fallback
→ auto-create with defaults        # 3. Created if neither exists
```

**Path resolution pipeline:**

1. `~` expanded to home directory
2. Relative paths resolved against the config file's directory
3. Paths normalized (duplicate separators, `..`, `.` removed)
4. Symlink targets always written as relative paths

</details>

---

## How It Works

```
_repo/
├── _AGENTS.md              ← you edit this
├── CLAUDE.md ─────────────→ ./_AGENTS.md
├── AGENTS.md ─────────────→ ./_AGENTS.md
├── GEMINI.md ─────────────→ ./_AGENTS.md
├── .cursorrules ──────────→ ./_AGENTS.md
├── .windsurfrules ────────→ ./_AGENTS.md
├── CONVENTIONS.md ────────→ ./_AGENTS.md
└── .github/
    └── copilot-instructions.md → ../_AGENTS.md
```

All symlinks are **relative** — portable across machines, contributors, and CI.

<details>
<summary><b>Directory linking with <code>_agents/</code></b></summary>

When `_agents/` exists in your project, `sync` also creates directory symlinks for each provider's config dir:

```
_repo/
├── _agents/            ← shared agent config directory
│   ├── skills/
│   └── agents/
├── .claude ───────────→ ./_agents/
├── .opencode ─────────→ ./_agents/
└── .gemini ───────────→ ./_agents/
```

If a provider config dir already exists as a real directory, its contents are migrated into `_agents/` non-destructively (no overwrites), the original is removed, and the symlink is created.

</details>

<details>
<summary><b>Architecture</b></summary>

```
src/
├── agents_list.ts     Master list of all provider definitions
├── providers.ts       Utility functions over agents_list
├── config.ts          Config discovery, loading, Zod validation
├── symlink.ts         Symlink state machine (MISSING/OK/WRONG/...)
├── backup.ts          Safe file backup with timestamp fallback
├── doctor.ts          Environment diagnostics runner
├── diagnostics.ts     Individual diagnostic checks
├── logger.ts          Structured output with quiet/verbose modes
├── ui.ts              Interactive prompts (clack)
├── commands/          One module per CLI command
└── utils/             Cross-platform path + fs utilities
```

To add a new provider, edit `src/agents_list.ts` — it's the only file that needs to change.

</details>

---

## Safety

- **Never overwrites files silently** — conflicting files trigger errors with size, date, and actionable guidance
- **All symlinks are relative** — absolute paths break when repos are moved or shared
- **Dry-run everywhere** — preview any command before making changes
- **Backup mode** — conflicting files renamed to `.bak` (timestamped fallback if `.bak` already exists)
- **Empty files removed with warning** — not backed up
- **`clean` only removes its own symlinks** — unrelated files and foreign symlinks untouched
- **Source never deleted** — `clean` removes managed symlinks, never `_AGENTS.md`

---

## Development

```bash
git clone https://github.com/luciancaetano/agents-ln && cd agents-ln
npm install

npm run dev -- sync --dry-run    # run from source
npm run typecheck
npm test
npm run build
```

---

## License

MIT
