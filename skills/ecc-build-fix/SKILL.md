---
name: ecc-build-fix
description: Fix build and compilation errors with minimal changes. Use when builds fail or type errors occur.
origin: ECC
---

# /build-fix — Build Error Resolution

## When to Activate

- Build fails (TypeScript, Webpack, Vite, etc.)
- Type errors appear
- Compilation errors
- Lint errors that block CI

## Delegation

For complex build issues, delegate to the `coder` subagent:

```
Use coder agent to fix build errors
```

## Resolution Process

### 1. Identify the Error
- Read the full error message
- Identify the file and line number
- Understand the error type (type mismatch, missing import, syntax, etc.)

### 2. Gather Context
- Read the affected file and surrounding code
- Check recent changes that might have caused it
- Look at related files (imports, dependencies)

### 3. Apply Minimal Fix
- Fix only what's needed to resolve the error
- Don't refactor unrelated code
- Prefer type fixes over `any` annotations
- If adding `any` is unavoidable, add a TODO comment

### 4. Verify
- Run the build again
- Run relevant tests
- Check that the fix doesn't introduce new issues

## Common Fixes

### TypeScript
- Missing import → Add import statement
- Type mismatch → Fix the type or the value
- `any` creeping in → Add proper types
- Generic inference failure → Explicit generic parameters

### Build Tools
- Missing dependency → `npm install` the package
- Config error → Fix config file (webpack, vite, tsconfig)
- Path alias not resolved → Check tsconfig paths / alias config

### Lint
- Unused variable → Remove or prefix with `_`
- Formatting → Run formatter (`prettier --write`)
- Rule violation → Fix code or justify with eslint-disable comment

## Principles

- **Minimal changes**: Fix only the error, don't refactor
- **Root cause**: Fix the cause, not just the symptom
- **Type safety**: Avoid `any`; prefer proper types
- **Verify**: Always run build/tests after fixing

## Output Format

```markdown
## Build Fix Summary

### Errors Found
1. `[Error message]` in `file.ts:line`
   - **Cause**: [Root cause]
   - **Fix**: [What was changed]

### Changes Made
- `file1.ts`: [Description of change]
- `file2.ts`: [Description of change]

### Verification
- [ ] Build passes
- [ ] Tests pass
- [ ] No new errors introduced
```
