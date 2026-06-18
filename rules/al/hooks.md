---
paths:
  - "**/*.al"
  - "**/app.json"
---
# AL Hooks

> This file extends [common/hooks.md](../common/hooks.md) with AL (Business Central) specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **AL formatter**: Auto-format `.al` files after edit (VS Code AL extension `Alt+Shift+F` equivalent)
- **Analyzers**: Run CodeCop, UICop, PerTenantExtensionCop (or AppSourceCop) after editing `.al` files
- **LinterCop**: Run extended community linter if installed via `ruleset.json`

## Build Trigger

There is no standalone `alc` CLI available outside the AL Language extension or a container. Treat compile/analyzer diagnostics pasted by the user as the source of truth rather than assuming a local command exists.
