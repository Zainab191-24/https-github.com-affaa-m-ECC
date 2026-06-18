# Migration Guide: Claude Code → Kimi Code CLI

This guide helps you migrate from Claude Code with ECC to Kimi Code CLI with ECC.

## Overview

Kimi Code CLI is a Node.js-based AI coding agent that supports plugins, hooks, skills, and subagents. ECC is fully compatible with Kimi Code CLI with some format differences.

## Key Differences

| Feature | Claude Code | Kimi Code CLI | Notes |
|---------|-------------|---------------|-------|
| Plugin Config | `.claude-plugin/plugin.json` | `kimi.plugin.json` | Different manifest format |
| Hooks | `hooks.json` (3 phases) | `config.toml [[hooks]]` | TOML format, same events |
| Agents | 63 custom markdown files | 3 built-in subagents (`coder`/`explore`/`plan`) | Mapped via skills |
| Commands | `commands/*.md` | **Not supported** | Converted to Skills |
| Rules | `~/.claude/rules/` | `AGENTS.md` + `sessionStart.skill` | Consolidated or injected |
| Skills | `skills/*/SKILL.md` | `skills/*/SKILL.md` | **Full parity** |
| MCP | Full support | Full support | **Full parity** |
| Installation | `/plugin install ecc@ecc` | `/plugins` or `kimi plugin install` | Different UX |

## Hook Event Mapping

| Claude Code Hook | Kimi CLI Hook Event | Blockable? |
|------------------|---------------------|------------|
| `PreToolUse` | `PreToolUse` | ✅ Yes |
| `PostToolUse` | `PostToolUse` | — No (observation) |
| `Stop` | `Stop` | ✅ Yes |
| `SessionStart` | `SessionStart` | — No (observation) |
| `SessionEnd` | `SessionEnd` | — No (observation) |
| `UserPromptSubmit` | `UserPromptSubmit` | ✅ Yes |
| `SubagentStart` | `SubagentStart` | — No (observation) |
| `SubagentStop` | `SubagentStop` | — No (observation) |
| `PreCompact` | `PreCompact` | — No (observation) |
| `PostCompact` | `PostCompact` | — No (observation) |
| `Notification` | `Notification` | — No (observation) |

### Hook Response Differences

**Claude Code:**
```json
{
  "PreToolUse": [{
    "matcher": "Bash",
    "hooks": [{
      "type": "command",
      "command": "node check-danger.js"
    }]
  }]
}
```

**Kimi Code CLI (`~/.kimi-code/config.toml`):**
```toml
[[hooks]]
event = "PreToolUse"
matcher = "Bash"
command = "node check-danger.js"
timeout = 5
```

Kimi CLI passes event data via **stdin** as JSON, and uses **exit codes**:
- `0` = Pass (stdout appended to context)
- `2` = Block (stderr shown as block reason)
- Other = Pass (fail-open)

## Agent Mapping

ECC's 63 agents map to Kimi CLI's 3 subagents + skills:

| ECC Agent | Kimi Subagent | Skill Replacement |
|-----------|--------------|-------------------|
| `planner` | `plan` | `/skill:ecc-plan` |
| `architect` | `plan` | `/skill:ecc-plan` + architecture context |
| `code-reviewer` | `coder` | `/skill:ecc-code-review` |
| `security-reviewer` | `coder` | `/skill:ecc-security-scan` |
| `build-error-resolver` | `coder` | `/skill:ecc-build-fix` |
| `tdd-guide` | `coder` | `/skill:tdd-workflow` |
| `e2e-runner` | `coder` | `/skill:e2e-testing` |
| `doc-updater` | `coder` | `/skill:update-docs` |
| `refactor-cleaner` | `coder` | `/skill:refactor-clean` |
| `go-reviewer` | `coder` | `/skill:go-review` |
| `go-build-resolver` | `coder` | `/skill:go-build` |
| `database-reviewer` | `coder` | `/skill:database-reviewer` |
| `python-reviewer` | `coder` | `/skill:python-review` |
| `rust-reviewer` | `coder` | `/skill:rust-review` |
| `java-reviewer` | `coder` | `/skill:java-review` |
| `cpp-reviewer` | `coder` | `/skill:cpp-review` |
| `docs-lookup` | `explore` | `/skill:docs-lookup` |
| `loop-operator` | `coder` | `/skill:autonomous-loops` |
| `harness-optimizer` | `coder` | `/skill:harness-optimizer` |

## Command → Skill Mapping

ECC's slash commands are converted to skills in Kimi CLI:

| Claude Command | Kimi Skill | Notes |
|----------------|------------|-------|
| `/plan` | `/skill:ecc-plan` | Implementation planning |
| `/code-review` | `/skill:ecc-code-review` | Code review |
| `/security` | `/skill:ecc-security-scan` | Security scan |
| `/build-fix` | `/skill:ecc-build-fix` | Build error resolution |
| `/tdd` | `/skill:tdd-workflow` | TDD workflow |
| `/e2e` | `/skill:e2e-testing` | E2E testing |
| `/refactor-clean` | `/skill:refactor-clean` | Dead code removal |
| `/verify` | `/skill:verification-loop` | Verification loop |
| `/eval` | `/skill:eval-harness` | Evaluation harness |
| `/learn` | `/skill:continuous-learning-v2` | Extract patterns |
| `/checkpoint` | `/skill:checkpoint` | Save state |
| `/update-docs` | `/skill:update-docs` | Update docs |
| `/test-coverage` | `/skill:test-coverage` | Coverage analysis |
| `/go-review` | `/skill:go-review` | Go review |
| `/go-test` | `/skill:go-test` | Go TDD |
| `/go-build` | `/skill:go-build` | Go build fix |

## Migration Steps

### 1. Install Kimi Code CLI

```bash
# macOS / Linux
curl -fsSL https://code.kimi.com/kimi-code/install.sh | bash

# Windows
irm https://code.kimi.com/kimi-code/install.ps1 | iex
```

### 2. Install ECC Plugin

```bash
# Clone ECC
git clone https://github.com/affaan-m/ECC.git
cd ECC

# Install into Kimi CLI
kimi plugin install .

# Start new session
kimi /new
```

### 3. Install ECC Hooks (Optional)

```bash
node .kimi/install-hooks.mjs
```

This converts ECC's hook definitions into Kimi CLI's `config.toml` format.

### 4. Migrate Project Rules

If you have project-level rules in `.claude/rules/`:

```bash
# Copy to AGENTS.md
cat .claude/rules/common/*.md > AGENTS.md

# Add language-specific rules
cat .claude/rules/typescript/*.md >> AGENTS.md
```

### 5. Update Your Workflow

**Before (Claude Code):**
```
/plan "Add user authentication"
/code-review
```

**After (Kimi Code CLI):**
```
/skill:ecc-plan "Add user authentication"
/skill:ecc-code-review
```

**Before (Claude Code with agents):**
```
@planner Design the auth system
@code-reviewer Review my changes
```

**After (Kimi Code CLI with subagents):**
```
Use plan agent to design the auth system
Use coder agent to review my changes
```

### 6. Migrate Custom Hooks

If you have custom hooks in your project:

**Claude Code format (`hooks.json`):**
```json
{
  "PreToolUse": [{
    "matcher": "Edit",
    "hooks": [{"type": "command", "command": "prettier --write $file_path"}]
  }]
}
```

**Kimi CLI format (`~/.kimi-code/config.toml`):**
```toml
[[hooks]]
event = "PostToolUse"
matcher = "Edit"
command = "prettier --write $file_path"
timeout = 10
```

Note: Kimi CLI passes event data via stdin as JSON. Scripts need to read stdin:

```javascript
// kimi-hook.mjs
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  const payload = JSON.parse(input);
  // payload.hook_event_name, payload.tool_name, payload.tool_input, etc.
  
  if (shouldBlock(payload)) {
    console.error('Blocking reason');
    process.exit(2);
  }
  process.exit(0);
});
```

## Environment Variable Compatibility

| Variable | Claude Code | Kimi CLI | Notes |
|----------|-------------|----------|-------|
| `ECC_HOOK_PROFILE` | ✅ | ✅ | minimal/standard/strict |
| `ECC_DISABLED_HOOKS` | ✅ | ✅ | Comma-separated IDs |
| `ECC_SESSION_START_MAX_CHARS` | ✅ | ✅ | Context cap |
| `ECC_SESSION_START_CONTEXT` | ✅ | ✅ | `off` to disable |
| `ECC_CONTEXT_MONITOR_COST_WARNINGS` | ✅ | ✅ | Toggle cost warnings |
| `ECC_GOVERNANCE_CAPTURE` | ✅ | ✅ | Enable governance |

## Reverting to Claude Code

If you need to switch back:

1. Claude Code continues using its own config (`~/.claude/`)
2. The `kimi.plugin.json` and `.kimi/` directory don't interfere
3. Simply run `claude` instead of `kimi`

## Feature Parity Summary

| Feature | Claude Code | Kimi Code CLI | Status |
|---------|-------------|---------------|--------|
| Skills | 251 | 251 | **Full parity** |
| Agents | 63 custom | 3 built-in + skills | **Functional parity** |
| Commands | 79 | 0 (converted to skills) | **Functional parity** |
| Hooks | 3 phases | 13 events | **Full parity + more** |
| Rules | 8 rule packs | sessionStart + AGENTS.md | **Full parity** |
| MCP Servers | Full | Full | **Full parity** |
| Context mgmt | /compact | /compact | **Full parity** |
| Subagents | Custom | Built-in | **Kimi is simpler** |

## Feedback

For issues specific to:
- **Kimi Code CLI**: Report to [MoonshotAI/kimi-cli](https://github.com/MoonshotAI/kimi-cli)
- **ECC Configuration**: Report to [github.com/affaan-m/ECC](https://github.com/affaan-m/ECC)
