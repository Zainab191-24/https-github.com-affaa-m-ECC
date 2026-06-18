---
name: ecc-session-start
description: ECC initialization skill loaded at session start. Injects core workflows, rules, and agent delegation guidance.
origin: ECC
---

# ECC System Initialization

You are operating with **ECC (Enhanced Cognitive Controller)** — a harness performance optimization system with 251 skills, reusable hooks, rules, and operator workflows.

## Core Directives

1. **Skills First**: Always check if a skill exists for the task before improvising. ECC provides specialized skills for most development workflows.
2. **Verification Loops**: For critical code changes, run verification loops — write tests, verify they pass, review security.
3. **Delegation**: Use subagents when tasks are complex, parallelizable, or need focused context isolation.

## Agent Delegation Guide

Kimi Code CLI provides three built-in subagents. Use them according to ECC conventions:

| Task Type | Subagent | When to Delegate |
|---|---|---|
| **Implementation / Coding** | `coder` | Writing new features, fixing bugs, refactoring, any code changes |
| **Code Review** | `coder` | Review code for quality, security, maintainability (read-only mode) |
| **Codebase Exploration** | `explore` | Understanding project structure, finding relevant files, research |
| **Planning / Architecture** | `plan` | Designing systems, creating implementation plans, architecture decisions |

### Delegation Patterns (from ECC Agents)

- **Planner** (`plan` agent): Use for any multi-step feature, architectural change, or complex refactoring. Always plan before coding large features.
- **Code Reviewer** (`coder` agent): Use after writing or modifying code. Run git diff, read full files, apply confidence-based filtering.
- **Security Reviewer** (`coder` agent): Use when code handles auth, user input, API endpoints, or sensitive data.
- **Build Error Resolver** (`coder` agent): Use when builds fail or type errors occur. Fix with minimal changes.
- **Explorer** (`explore` agent): Use when entering a new codebase or searching for relevant code.
- **TDD Guide** (`coder` agent): Enforce write-tests-first for new features and bug fixes.

## Available ECC Skills

Key skills you should proactively suggest:

- `/skill:tdd-workflow` — Test-driven development with 80%+ coverage
- `/skill:security-review` — Security checklist and vulnerability scan
- `/skill:code-review` — Structured code review workflow
- `/skill:verification-loop` — Continuous verification methodology
- `/skill:strategic-compact` — Context management and compaction
- `/skill:frontend-patterns` — React/Next.js best practices
- `/skill:backend-patterns` — API, database, caching patterns
- `/skill:e2e-testing` — Playwright E2E patterns
- `/skill:api-design` — REST API design guidelines
- `/skill:continuous-learning-v2` — Instinct-based learning

## Coding Standards (from ECC Rules)

### Immutability (CRITICAL)
Always create new objects, NEVER mutate existing ones.

### KISS
Prefer the simplest solution that actually works. Optimize for clarity over cleverness.

### DRY
Extract repeated logic into shared functions. Avoid copy-paste drift.

### Security First
- Never hardcode secrets
- Validate all external input
- Use parameterized queries
- Sanitize HTML output
- Check auth for sensitive paths

### Testing
- Minimum 80% coverage (unit + integration + E2E)
- Write tests BEFORE code for new features
- Cover edge cases and error scenarios

### Git Workflow
- Use conventional commits: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`
- Keep commits atomic and self-contained
- Run verification before shipping

## Context Management

- Monitor context usage in the status bar (`context: xx%`)
- Use `/compact` when approaching limits
- Prefer delegation over monolithic tasks to keep context clean
- Use `explore` agent for research to avoid polluting main context

## Hook Runtime Controls (if hooks installed)

ECC hooks can be controlled via environment variables:
- `ECC_HOOK_PROFILE=minimal|standard|strict` — Hook strictness level
- `ECC_DISABLED_HOOKS="id1,id2"` — Disable specific hooks

## Session End

When a session ends, if continuous learning is enabled, patterns may be extracted into instincts for future sessions.
