---
description: Fix AL compilation and analyzer diagnostics, and app.json dependency/ID range issues incrementally. Invokes the al-build-resolver agent for minimal, surgical fixes.
---

# AL Build and Fix

This command invokes the **al-build-resolver** agent to incrementally fix AL compilation errors and analyzer diagnostics with minimal changes.

## What This Command Does

1. **Collect Diagnostics**: Read AL0xxx errors/analyzer warnings the user pastes from VS Code or CI
2. **Parse Errors**: Group by file and sort by severity
3. **Fix Incrementally**: One diagnostic at a time
4. **Check app.json**: Validate `idRanges`, `dependencies`, and version constraints when relevant
5. **Report Summary**: Show what was fixed and what remains

## When to Use

Use `/al-build` when:
- `alc`/VS Code reports compilation errors
- An analyzer (CodeCop, UICop, PerTenantExtensionCop, AppSourceCop, LinterCop) reports a violation
- `app.json` dependency or `idRanges` mismatches block a build
- After pulling changes that break the extension build

## No Local CLI Assumption

There is no standalone `alc` executable outside the AL Language VS Code extension or a Business Central container. This command works from diagnostics you provide (Problems panel, build output, or CI logs) — it does not assume a bare CLI command exists. If BcContainerHelper is available, `Compile-AppInBcContainer` can be used to reproduce the build.

## Example Session

```text
User: /al-build
AL0118: object 'Loyalty Tier' does not exist in src/Customer Card.PageExt.al:24

Agent:
# AL Build Resolution

## Diagnostic 1: Missing Object Reference

File: src/Customer Card.PageExt.al:24
Error: AL0118 - object 'Loyalty Tier' does not exist

Cause: app.json is missing a dependency on the extension that defines this enum.

Fix:
```json
"dependencies": [
  {
    "id": "...",
    "name": "Loyalty Management",
    "publisher": "...",
    "version": "1.0.0.0"
  }
]
```

Ask the user to re-download symbols and recompile, then report remaining diagnostics.
```

## Common Diagnostics Fixed

| Error | Typical Fix |
|-------|-------------|
| `AL0118` object does not exist | Add missing dependency or fix object reference |
| `AL0185` member does not exist | Fix typo or check base-app version compatibility |
| Symbol reference errors | Regenerate/download symbols |
| `idRanges` violation | Move object ID inside the declared range |
| AppSourceCop affix violation | Apply the registered affix consistently |
| `PerTenantExtensionCop` violation | Replace direct access with an event subscriber/extension |

## Fix Strategy

1. **Compilation errors first** — code must compile
2. **Analyzer violations second** — CodeCop/UICop/AppSourceCop/PerTenantExtensionCop
3. **One diagnostic at a time** — verify each change
4. **Minimal changes** — don't refactor, just fix
5. **Flag `idRanges` changes** — these are often externally allocated; never widen silently

## Stop Conditions

The agent will stop and report if:
- Same diagnostic persists after 3 attempts
- Fix requires an unapproved `idRanges`/dependency change
- Diagnostic indicates a missing base-app feature requiring architectural change

## Related Commands

- `/al-test` - Run tests after build succeeds
- `/al-review` - Review code quality after fixing

## Related

- Agent: `agents/al-build-resolver.md`
- Skill: `skills/al-patterns/`
