---
description: Comprehensive AL (Business Central) code review for extension-model safety, event subscriber correctness, and permissions. Invokes the al-reviewer agent.
---

# AL Code Review

This command invokes the **al-reviewer** agent for comprehensive AL-specific code review.

## What This Command Does

1. **Identify AL Changes**: Find modified `.al` files and `app.json` via `git diff`
2. **Determine Target**: Read `app.json` to tell AppSource from PTE (affects affix rules)
3. **Extension Safety Review**: Check for base-app modification, event subscriber misuse
4. **Security Review**: Check for hardcoded secrets, missing permission sets
5. **Generate Report**: Categorize issues by severity

## When to Use

Use `/al-review` when:
- After writing or modifying AL code
- Before committing AL changes
- Reviewing pull requests with AL code
- Onboarding to a new Business Central extension codebase

## Review Categories

### CRITICAL (Must Fix)
- Base application object modification
- Hardcoded credentials instead of SecretText/Isolated Storage
- Missing permission set for new objects
- Unvalidated external (HTTP) input written to a table

### HIGH (Should Fix)
- `SetLoadFields`/`Reset()` called on a `var Record` event subscriber parameter
- Outer boolean result not reflecting an inner `Confirm`/`RunModal` decision
- `SingleInstance` reentrancy guard with no time-based expiry
- Missing AppSource affix (AppSource target only — NOTE-level for PTE)

### MEDIUM (Consider)
- Large procedures, deep nesting
- Boolean flag chains instead of interface/enum extensibility
- FlowFields used inside loops
- Object/file naming not matching `ObjectName.ObjectType.al`

## Analyzer Context

There is no standalone `alc` CLI outside VS Code or a container. This review works from the diff and any analyzer diagnostics (CodeCop, UICop, PerTenantExtensionCop, AppSourceCop, LinterCop) the user pastes in — it does not invent a local compile step.

## Example Usage

```text
User: /al-review

Agent:
# AL Code Review Report

## Files Reviewed
- src/Customer Card.PageExt.al (modified)
- src/Sales-Post.Subscribers.al (modified)

## Issues Found

[HIGH] var Record Mutation in Subscriber
File: src/Sales-Post.Subscribers.al:18
Issue: SetLoadFields called on the var Record parameter
```al
[EventSubscriber(ObjectType::Codeunit, Codeunit::"Sales-Post", 'OnBeforePostSalesDoc', '', false, false)]
local procedure OnBeforePostSalesDoc(var SalesHeader: Record "Sales Header")
begin
    SalesHeader.SetLoadFields("No.", "Sell-to Customer No."); // mutates caller's record
end;
```
Fix: Copy to a local variable before changing load behavior.

## Summary
- CRITICAL: 0
- HIGH: 1
- MEDIUM: 0

Recommendation: WARNING: Fix before merge
```

## Approval Criteria

| Status | Condition |
|--------|-----------|
| PASS: Approve | No CRITICAL or HIGH issues |
| WARNING: Warning | Only MEDIUM issues (merge with caution) |
| FAIL: Block | CRITICAL or HIGH issues found |

## Integration with Other Commands

- Use `/al-test` first to ensure tests pass
- Use `/al-build` if compilation/analyzer errors occur
- Use `/al-review` before committing
- Use `/code-review` for non-AL specific concerns

## Related

- Agent: `agents/al-reviewer.md`
- Skills: `skills/al-patterns/`, `skills/al-testing/`
