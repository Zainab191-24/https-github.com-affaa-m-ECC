---
paths:
  - "**/*.al"
  - "**/app.json"
---
# AL Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with AL (Business Central) specific content.

## Naming

- Objects: **PascalCase** (codeunit `"Sales-Post"`, table `"Sales Header"`)
- File naming: `ObjectName.ObjectType.al` (e.g. `Customer.TableExt.al`, `CustomerCard.PageExt.al`, `LoyaltyMgt.Codeunit.al`)
- Note: AL has **no** `codeunitextension` — codeunits cannot be extended; subscribe to events instead
- Variables: PascalCase for globals/parameters, no Hungarian prefixes

## Object ID Ranges

Declare ranges in `app.json` `idRanges`. Never hardcode an ID outside the declared range.

```json
"idRanges": [{ "from": 50100, "to": 50149 }]
```

## AppSource-Only Rules

Skip this section for Per-Tenant Extensions (PTE).

- **Mandatory affix**: every object name and exposed field/action must carry the registered AppSource affix (enforced by `AppSourceCop`)
- ID range must fall inside the range assigned via Partner Center, not an arbitrary local range
- No direct modification of base application objects — extend only

## Extension Model

- Never modify base application source — use table/page extensions, event subscribers, or interfaces
- One object per file, file name matches object name

## Reference

See skill: `al-patterns` for comprehensive AL idioms and the extension model.
