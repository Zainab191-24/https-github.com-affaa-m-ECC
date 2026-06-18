---
name: ecc-plan
description: Create comprehensive implementation plans for features, refactoring, and architectural changes. Use the plan subagent for complex work.
origin: ECC
---

# /plan — Implementation Planning

## When to Activate

- Starting a new feature
- Complex refactoring
- Architectural changes
- Any multi-step implementation task

## Delegation

For complex plans, delegate to the `plan` subagent:

```
Use plan agent to create an implementation plan for: [task description]
```

The `plan` agent runs in isolated context, focuses purely on planning without executing code.

## Planning Process

### 1. Requirements Analysis
- Understand the feature request completely
- Ask clarifying questions if needed
- Identify success criteria
- List assumptions and constraints

### 2. Architecture Review
- Analyze existing codebase structure
- Identify affected components
- Review similar implementations
- Consider reusable patterns

### 3. Step Breakdown
Create detailed steps with:
- Clear, specific actions
- File paths and locations
- Dependencies between steps
- Estimated complexity
- Potential risks

### 4. Implementation Order
- Prioritize by dependencies
- Group related changes
- Minimize context switching
- Enable incremental testing

## Output Format

```markdown
# Implementation Plan: [Feature Name]

## Overview
1-2 sentence summary of what this plan accomplishes.

## Requirements
- [Requirement 1]
- [Requirement 2]

## Files to Modify
| File | Change | Reason |
|------|--------|--------|
| `src/feature.ts` | Add new module | Core implementation |
| `tests/feature.test.ts` | Add tests | TDD coverage |

## Implementation Steps
1. [Step 1 with specific file and action]
2. [Step 2 with specific file and action]
3. [Step 3 ...]

## Testing Strategy
- Unit tests for [component]
- Integration tests for [flow]
- E2E tests for [critical path]

## Risks & Mitigation
| Risk | Impact | Mitigation |
|------|--------|------------|
| [Risk 1] | High | [How to handle] |

## Verification Checklist
- [ ] All tests pass
- [ ] 80%+ coverage
- [ ] Security review completed
- [ ] Documentation updated
```

## Post-Planning

After creating the plan:
1. Present it to the user for approval
2. Break into incremental commits
3. Execute step by step
4. Verify each step before proceeding
