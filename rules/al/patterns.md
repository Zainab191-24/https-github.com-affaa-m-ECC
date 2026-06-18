---
paths:
  - "**/*.al"
  - "**/app.json"
---
# AL Patterns

> This file extends [common/patterns.md](../common/patterns.md) with AL (Business Central) specific content.

## Event-Driven Extensibility

Subscribe to published events instead of modifying base objects:

```al
[EventSubscriber(ObjectType::Codeunit, Codeunit::"Sales-Post", 'OnBeforePostSalesDoc', '', false, false)]
local procedure OnBeforePostSalesDoc(var SalesHeader: Record "Sales Header")
begin
end;
```

## Never Call SetLoadFields or Reset() on var Event Subscriber Parameters

A `var Record` subscriber parameter is the caller's live record. Calling `SetLoadFields` or `Reset()` on it mutates the caller's filter/field-load state for every subsequent subscriber and the caller itself. Copy to a local variable first if you need to change load behavior.

## Propagate User Decisions via Boolean Return Chain

When an inner loop shows a `Confirm`/`RunModal` dialog, the outer "completed successfully" result must reflect the user's choice. Thread a boolean through the call chain rather than assuming success once the loop exits.

## SingleInstance Guard: Time-Based Expiry for Stuck Flags

A `SingleInstance` codeunit used as a reentrancy guard can get stuck `true` if the guarded code errors out before clearing it. Pair the flag with a timestamp and expire it after a bounded window rather than trusting the boolean alone forever.

## Interfaces and Enums

Prefer `interface` + `enum` extensibility over a chain of boolean flags when behavior must vary by implementation — new enum values are addable by other extensions without modifying your code.

## Reference

See skill: `al-patterns` for comprehensive AL idioms including table/page extensions, isolated storage, and feature-removal scope analysis.
