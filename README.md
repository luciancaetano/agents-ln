<div align="center">

# agents-ln

### One instruction file. Every AI coding agent reads it.

[![npm version](https://img.shields.io/npm/v/agents-ln.svg)](https://www.npmjs.com/package/agents-ln)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

Claude Code reads `CLAUDE.md`. Cursor reads `.cursorrules`. Gemini CLI wants `GEMINI.md`. If you use more than one agent, you're either copy-pasting instructions or letting them drift.

`agents-ln` keeps a single `_AGENTS.md` and symlinks it to wherever each agent looks.

## Install

```bash
npm install -g agents-ln
```

Requires Node.js ≥ 18.

> **What it touches:** symlinks in your project root + `~/.config/agents-ln/config.yaml` on first run. No network calls, no hooks, no daemons.  
> **Undo:** `agents-ln clean` removes all managed symlinks. `npm uninstall -g agents-ln` removes the tool.

---

## Quickstart

```bash
echo "# Project instructions" > _AGENTS.md
agents-ln init    # pick which agents to enable
agents-ln sync    # create symlinks
```

```
→ created  CLAUDE.md                          → _AGENTS.md
→ created  AGENTS.md                          → _AGENTS.md
→ created  GEMINI.md                          → _AGENTS.md
→ created  .cursorrules                       → _AGENTS.md
→ created  .windsurfrules                     → _AGENTS.md
→ created  CONVENTIONS.md                     → _AGENTS.md
→ created  .github/copilot-instructions.md    → ../_AGENTS.md
```

Edit `_AGENTS.md` once. Every agent picks it up.

---

## Supported Agents

| Agent | File | Config dir |
|-------|------|------------|
| Claude Code | `CLAUDE.md` | `.claude/` |
| Codex CLI | `AGENTS.md` | `.codex/` |
| OpenCode | `AGENTS.md` | `.opencode/` |
| Hermes | `AGENTS.md` | `.hermes/` |
| Gemini CLI | `GEMINI.md` | `.gemini/` |
| Cursor | `.cursorrules` | `.cursor/` |
| Windsurf | `.windsurfrules` | `.windsurf/` |
| GitHub Copilot | `.github/copilot-instructions.md` | `.github/` |
| Aider | `CONVENTIONS.md` | `.aider/` |

Custom paths: add any file to the `links` array in `.agents-ln.yaml`.

---

## Commands

| Command | What it does |
|---------|-------------|
| `agents-ln init` | Create `.agents-ln.yaml`, pick agents interactively |
| `agents-ln sync` | Create or fix all configured symlinks |
| `agents-ln check` | Validate symlinks, exit non-zero if broken |
| `agents-ln clean` | Remove managed symlinks (never deletes `_AGENTS.md`) |
| `agents-ln doctor` | Diagnose environment, config, and provider detection |
| `agents-ln add skill <url> <name>` | Install a skill from a GitHub repo into `_agents/skills/` |

Common flags for `sync`: `--dry-run`, `--force`, `--backup`, `--quiet`, `--verbose`.

<details>
<summary><b>Shared config directories</b> — link <code>.claude/</code>, <code>.cursor/</code>, etc. to one place</summary>

Add a `_agents/` directory to your project and `sync` also links each agent's config dir to it:

```
project/
├── _agents/            ← one shared config directory
│   ├── skills/
│   └── agents/
├── .claude ───────────→ ./_agents/
├── .cursor ───────────→ ./_agents/
├── .opencode ─────────→ ./_agents/
└── .gemini ───────────→ ./_agents/
```

Skills, snippets, and per-provider config are shared across all agents automatically.

</details>

<details>
<summary><b>Configuration reference</b></summary>

**Project config** (`.agents-ln.yaml`):

```yaml
source: _AGENTS.md
links:
  - CLAUDE.md
  - AGENTS.md
  - GEMINI.md
  - .cursorrules
  - .github/copilot-instructions.md

skills:
  my-skill:
    name: my-skill
    source: https://github.com/user/repo
```

**Global fallback:** `~/.config/agents-ln/config.yaml` — same format, auto-created with defaults on first sync.

Discovery order: project config → global config → auto-create.

</details>

<details>
<summary><b>Sync behavior</b> — how conflicts are handled</summary>

| State | Default |
|-------|---------|
| Link missing | Create it |
| Link correct | Skip (idempotent) |
| Points to wrong target | Error — use `--force` |
| Regular file in the way | Error with size + date — use `--force` or `--backup` |
| Broken symlink | Remove and recreate |

All symlinks are **relative** — portable across machines, contributors, and CI.

</details>

---

## Development

```bash
git clone https://github.com/luciancaetano/agents-ln && cd agents-ln
npm install
npm run dev -- sync --dry-run
npm test
npm run build
```

To add a new provider, edit `src/agents_list.ts` — it's the only file that needs to change.

---

## License

MIT
