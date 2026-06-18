---
name: al-patterns
description: Idiomatic AL patterns for Microsoft Dynamics 365 Business Central — event-driven extensibility, table/page extensions, interfaces, enums, and safe event subscriber handling.
metadata:
  origin: ECC
---

# AL (Business Central) Development Patterns

Idiomatic AL patterns for building extensions that survive base-app upgrades without modification.

## When to Activate

- Writing new AL extensions (PTE or AppSource)
- Reviewing AL code
- Refactoring existing AL extensions
- Designing event subscribers, table/page extensions, or permission sets

## Core Principles

### 1. Never Modify Base Application Objects

Extend via `tableextension`, `pageextension`, `enumextension`, and event subscribers. Direct modification of base objects is not upgrade-safe and is rejected by `PerTenantExtensionCop`/`AppSourceCop`.

```al
tableextension 50100 "Customer Ext" extends Customer
{
    fields
    {
        field(50100; "Loyalty Tier"; Enum "Loyalty Tier")
        {
            DataClassification = CustomerContent;
        }
    }
}
```

### 2. Event-Driven Extensibility

Subscribe to published integration events instead of patching the call chain.

```al
[EventSubscriber(ObjectType::Codeunit, Codeunit::"Sales-Post", 'OnBeforePostSalesDoc', '', false, false)]
local procedure OnBeforePostSalesDoc(var SalesHeader: Record "Sales Header")
begin
    ValidateLoyaltyTier(SalesHeader."Sell-to Customer No.");
end;
```

If no suitable event exists, raise a feature request or publish your own integration event rather than reaching for unsupported workarounds.

## Never Call SetLoadFields or Reset() on var Event Subscriber Parameters

A `var Record` subscriber parameter is the **caller's live record** — every other subscriber on the same event, and the caller itself, sees the same instance. Calling `SetLoadFields` or `Reset()` on it changes load behavior and filters for everyone downstream.

```al
// Bad: mutates the caller's record state for every other subscriber
[EventSubscriber(ObjectType::Table, Database::Customer, 'OnAfterValidateEvent', 'Name', false, false)]
local procedure OnAfterValidateName(var Rec: Record Customer)
begin
    Rec.SetLoadFields("No.", Name); // corrupts caller's field-load set
end;

// Good: copy to a local variable first if you need different load behavior
local procedure CheckCustomerName(CustomerNo: Code[20])
var
    LocalCustomer: Record Customer;
begin
    LocalCustomer.SetLoadFields("No.", Name);
    LocalCustomer.Get(CustomerNo);
end;
```

## Propagate User Decisions via Boolean Return Chain

When an inner loop shows a `Confirm` or `RunModal` dialog, the outer "completed successfully" result must reflect what the user actually chose — not just whether the loop finished iterating.

```al
// Bad: ignores user's "No" on the confirm, reports success anyway
procedure ProcessAllLines(var Lines: Record "Sales Line"): Boolean
begin
    if Lines.FindSet() then
        repeat
            if Confirm('Process line %1?', false, Lines."Line No.") then
                ProcessLine(Lines);
        until Lines.Next() = 0;
    exit(true); // wrong: doesn't know whether anything was actually processed/declined
end;

// Good: thread the decision through the return value
procedure ProcessAllLines(var Lines: Record "Sales Line"): Boolean
var
    AllConfirmed: Boolean;
begin
    AllConfirmed := true;
    if Lines.FindSet() then
        repeat
            if Confirm('Process line %1?', false, Lines."Line No.") then
                ProcessLine(Lines)
            else
                AllConfirmed := false;
        until Lines.Next() = 0;
    exit(AllConfirmed);
end;
```

## SingleInstance Guard: Time-Based Expiry for Stuck Flags

A `SingleInstance` codeunit used as a reentrancy guard can get stuck `true` forever if the guarded code errors before clearing it. Pair the boolean with a timestamp and expire it after a bounded window.

```al
codeunit 50100 "Import Guard" 
{
    SingleInstance = true;

    var
        IsRunning: Boolean;
        StartedAt: DateTime;
        GuardWindow: Duration;

    procedure TryEnter(): Boolean
    begin
        GuardWindow := 5 * 60 * 1000; // 5 minute guard window (ms)
        if IsRunning and (CurrentDateTime - StartedAt < GuardWindow) then
            exit(false); // genuinely still running

        IsRunning := true;
        StartedAt := CurrentDateTime;
        exit(true);
    end;

    procedure Release()
    begin
        IsRunning := false;
    end;
}
```

### 3. Interfaces and Enums Over Boolean Flags

Use `interface` + `enum` extensibility when behavior must vary by implementation — other extensions can add new enum values or interface implementations without touching your code.

```al
interface "Loyalty Discount Calculator"
{
    procedure CalculateDiscount(CustomerNo: Code[20]; Amount: Decimal): Decimal;
}

enum 50100 "Loyalty Tier" implements "Loyalty Discount Calculator"
{
    Extensible = true;

    value(0; Standard) { Implementation = "Loyalty Discount Calculator" = "Standard Discount Calc"; }
    value(1; Gold) { Implementation = "Loyalty Discount Calculator" = "Gold Discount Calc"; }
}
```

### 4. Isolated Storage and SecretText for Credentials

Never store API keys or tokens as plain `Text` on a table. See `rules/al/security.md` for the full pattern.

### 5. Feature-Removal Scope Analysis

Before removing a feature/keyword from an AL codebase, search across **all** files for the keyword — table fields, page actions, permission sets, and event subscribers frequently reference the same feature under different object types. A removal that only touches the obvious file leaves orphaned references that fail to compile or silently stop firing.

### 6. TryFunction for Recoverable Errors

Use a `[TryFunction]` when a caller needs to attempt an operation and branch on success/failure without an uncaught error tearing down the transaction:

```al
[TryFunction]
local procedure TryPostDocument(var SalesHeader: Record "Sales Header")
begin
    CODEUNIT.Run(CODEUNIT::"Sales-Post", SalesHeader);
end;

procedure PostWithFallback(var SalesHeader: Record "Sales Header")
begin
    if not TryPostDocument(SalesHeader) then
        LogPostingFailure(SalesHeader, GetLastErrorText());
end;
```

### 7. Readability: Avoid Redundant Syntax

Per community AL style guidance (alguidelines.dev), avoid syntax that adds no information:

```al
// Bad: redundant boolean comparison and unnecessary parentheses
if (IsActive = true) then

// Good
if IsActive then
```

## Performance

- Use `SetLoadFields` on your **own** local record variables before `FindSet`/`Get` to avoid loading unused columns
- Avoid FlowFields in tight loops — they trigger a calculation per record; use `CalcFields` in batch or denormalize when justified
- Prefer `SetRange`/`SetFilter` over post-filtering in AL code

## Quick Reference: AL Idioms

| Idiom | Description |
|-------|-------------|
| Extend, never modify | Use table/page extensions and events, not base object edits |
| `var` Record params are shared state | Never `SetLoadFields`/`Reset()` on a subscriber's `var Record` parameter |
| Boolean propagation | A loop's return value must reflect every inner decision, not just "it finished" |
| SingleInstance + timestamp | Pair reentrancy guards with an expiry window, not just a boolean |
| Interfaces over flags | New behavior should be addable via enum/interface, not nested `if` chains |

## External References

- [alguidelines.dev](https://alguidelines.dev/docs/) — community AL coding guideline catalog: design patterns (Façade, Command Queue, Event Bridge), readability rules, performance patterns
- [microsoft/BCQuality](https://github.com/microsoft/BCQuality) — knowledge base of specific CodeCop quirks and platform behavior for AI-assisted code review
- **Microsoft Learn MCP** (`https://learn.microsoft.com/api/mcp`) — query for current Business Central developer documentation when a pattern may have changed between releases

## Reference

See skill: `al-testing` for the AL Test Toolkit and GIVEN-WHEN-THEN test structure.
