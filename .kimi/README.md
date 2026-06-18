# ECC for Kimi Code CLI

> Kimi Code CLI plugin support for ECC (Enhanced Cognitive Controller).

## Overview

This directory contains Kimi Code CLI-specific configuration and tools for ECC:

- **`kimi.plugin.json`** (root) — Plugin manifest for Kimi Code CLI
- **`.kimi/install-hooks.mjs`** — Script to install ECC hooks into `~/.kimi-code/config.toml`
- **`.kimi/MIGRATION.md`** — Guide for migrating from Claude Code to Kimi Code CLI

## Installation

### Option 1: Install from Repository (Recommended for Development)

```bash
# Clone ECC
git clone https://github.com/affaan-m/ECC.git
cd ECC

# Install plugin into Kimi Code CLI
kimi plugin install .

# Or install from a ZIP
kimi plugin install https://github.com/affaan-m/ECC/archive/refs/heads/main.zip

# Start a new session
kimi /new
```

### Option 2: Install Hooks (Optional but Recommended)

ECC hooks provide automatic checks, notifications, and governance:

```bash
node .kimi/install-hooks.mjs
```

This installs hooks into `~/.kimi-code/config.toml`:

- **Session Start**: Load ECC context initialization
- **PreToolUse (Bash)**: Dangerous command detection, quality checks
- **PostToolUse (Edit)**: Auto-format, console.log warnings
- **Stop**: Session summary for continuous learning
- **PreCompact**: Save state before context compaction

### Option 3: Install Rules to Project

For project-level rules (applied to current project only):

```bash
# Append ECC rules to AGENTS.md (preserves existing content)
echo -e "\n\n# ECC Rules\n" >> AGENTS.md
cat rules/common/coding-style.md rules/common/testing.md rules/common/security.md >> AGENTS.md

# Add language-specific rules
cat rules/typescript/*.md >> AGENTS.md
```

## Usage

After installation, start Kimi Code CLI:

```bash
kimi
```

ECC skills are available via `/skill:` commands:

| Skill | Purpose |
|-------|---------|
| `/skill:ecc-plan` | Create implementation plans |
| `/skill:ecc-code-review` | Review code for quality and security |
| `/skill:ecc-security-scan` | Run security review |
| `/skill:ecc-build-fix` | Fix build and type errors |
| `/skill:tdd-workflow` | Test-driven development |
| `/skill:security-review` | Security checklist |
| `/skill:verification-loop` | Continuous verification |
| `/skill:frontend-patterns` | React/Next.js patterns |
| `/skill:backend-patterns` | API/database patterns |
| `/skill:e2e-testing` | Playwright E2E patterns |

### Agent Delegation

Kimi Code CLI has three built-in subagents. ECC maps its agent workflows to them:

| ECC Agent | Kimi Subagent | Use For |
|-----------|--------------|---------|
| planner | `plan` | Implementation planning, architecture |
| code-reviewer | `coder` | Code review (read-only) |
| security-reviewer | `coder` | Security analysis |
| build-error-resolver | `coder` | Fix build/type errors |
| tdd-guide | `coder` | TDD workflow |
| e2e-runner | `coder` | E2E testing |
| docs-lookup | `explore` | Codebase exploration |

Example:
```
Use plan agent to design the authentication system
Use explore agent to find all files related to user management
Use coder agent to review my recent changes
```

## Hook Runtime Controls

Control hook behavior with environment variables:

```bash
# Hook strictness profile (default: standard)
export ECC_HOOK_PROFILE=standard

# Disable specific hooks
export ECC_DISABLED_HOOKS="pre:bash:tmux-reminder,post:edit:typecheck"

# Cap SessionStart additional context (default: 8000 chars)
export ECC_SESSION_START_MAX_CHARS=4000

# Disable SessionStart context entirely
export ECC_SESSION_START_CONTEXT=off
```

## Configuration Files

| File | Location | Purpose |
|------|----------|---------|
| `kimi.plugin.json` | Plugin root | Manifest (skills, sessionStart, MCP) |
| `config.toml` | `~/.kimi-code/` | User hooks configuration |
| `AGENTS.md` | Project root | Project-level rules |

## Updating

```bash
# Reload plugin (after updates)
kimi /plugins reload ecc

# Or remove and reinstall
kimi /plugins remove ecc
kimi plugin install .
```

## Troubleshooting

### Plugin Not Loading

1. Verify `kimi.plugin.json` exists in the repository root
2. Check JSON syntax: `cat kimi.plugin.json | python -m json.tool`
3. Ensure `skills/` directory exists with valid `SKILL.md` files
4. Start a new session after installing: `kimi /new`

### Hooks Not Working

1. Check `~/.kimi-code/config.toml` has `[[hooks]]` entries
2. Verify hook scripts exist and are executable
3. Check hook exit codes (0 = pass, 2 = block)
4. Review Kimi CLI logs for hook errors

### Skills Not Found

1. Run `/plugins` to verify ECC is installed
2. Check that `kimi.plugin.json` has correct `skills` path
3. Ensure `SKILL.md` files have valid YAML frontmatter

## Differences from Claude Code

| Feature | Claude Code | Kimi Code CLI |
|---------|-------------|---------------|
| Plugin install | `/plugin install ecc@ecc` | `/plugins` → Marketplace / Local |
| Hooks | `hooks.json` in plugin | `config.toml [[hooks]]` |
| Agents | Custom markdown files | Built-in `coder`/`explore`/`plan` |
| Commands | `commands/*.md` | Not supported (use Skills) |
| Rules | `~/.claude/rules/` | `AGENTS.md` or sessionStart skill |
| Marketplace | Self-hosted | Official + Local |

## Feature Parity

| ECC Feature | Kimi CLI Status |
|-------------|-----------------|
| 251 Skills | ✅ Full parity (SKILL.md compatible) |
| 63 Agents | ⚠️ Mapped to 3 built-in subagents + skills |
| 79 Commands | ⚠️ Converted to Skills |
| Hooks | ✅ Full parity (via config.toml) |
| Rules | ✅ Full parity (via sessionStart + AGENTS.md) |
| MCP Servers | ✅ Full parity |
| Session Start Context | ✅ Full parity |
| Continuous Learning | ✅ Supported |

## License

MIT — Same as ECC core.
