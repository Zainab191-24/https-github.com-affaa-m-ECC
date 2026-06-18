---
description: Enforce TDD workflow for AL (Business Central) using the Test Toolkit. Write GIVEN-WHEN-THEN test codeunits first, then implement.
---

# AL TDD Command

This command enforces test-driven development methodology for AL code using the Business Central Test Toolkit.

## What This Command Does

1. **Define Object Shape**: Scaffold the table/codeunit/interface signature first
2. **Write Test Codeunit**: Create `[Test]` procedures using GIVEN-WHEN-THEN (RED)
3. **Confirm RED**: Verify the test fails for the right reason via the AL Test Tool or a container run
4. **Implement Code**: Write minimal extension code to pass (GREEN)
5. **Refactor**: Improve while keeping tests green
6. **Verify**: Re-run via AL Test Tool / BcContainerHelper

## When to Use

Use `/al-test` when:
- Implementing new AL business logic
- Adding test coverage to an existing extension
- Fixing a bug (write a failing test first)
- Building anything that posts documents, calculates amounts, or branches on user input

## TDD Cycle

```
RED      → Write a failing [Test] procedure (GIVEN-WHEN-THEN)
GREEN    → Implement minimal extension code to pass
REFACTOR → Improve code, tests stay green
REPEAT   → Next behavior
```

There is no bare `al test` CLI — RED and GREEN must be confirmed via the **AL Test Tool** in VS Code against a sandbox, or a **BcContainerHelper** `Run-TestsInBcContainer` run. Do not report a phase as passed without one of these actually being executed.

## Example Session

```text
User: /al-test I need loyalty discount calculation for Gold-tier customers

Agent:
# TDD Session: Loyalty Discount Calculator

## Step 1: Define Interface

```al
interface "Loyalty Discount Calculator"
{
    procedure CalculateDiscount(CustomerNo: Code[20]; Amount: Decimal): Decimal;
}
```

## Step 2: Write Test (RED)

```al
codeunit 50100 "Loyalty Discount Tests"
{
    Subtype = Test;

    [Test]
    procedure CalculatingDiscountForGoldCustomerAppliesTenPercent()
    var
        Customer: Record Customer;
        Calculator: Codeunit "Gold Discount Calc";
        Discount: Decimal;
    begin
        // [GIVEN] a Gold tier customer
        LibrarySales.CreateCustomer(Customer);
        Customer.Validate("Loyalty Tier", Customer."Loyalty Tier"::Gold);
        Customer.Modify(true);

        // [WHEN] calculating discount on amount 1000
        Discount := Calculator.CalculateDiscount(Customer."No.", 1000);

        // [THEN] a 10% discount is returned
        Assert.AreEqual(100, Discount, 'Gold tier should apply 10% discount');
    end;
}
```

Run via AL Test Tool — confirms FAIL because "Gold Discount Calc" doesn't exist yet.

## Step 3: Implement (GREEN)

```al
codeunit 50101 "Gold Discount Calc" implements "Loyalty Discount Calculator"
{
    procedure CalculateDiscount(CustomerNo: Code[20]; Amount: Decimal): Decimal
    begin
        exit(Amount * 0.1);
    end;
}
```

Run via AL Test Tool — confirms PASS.

## TDD Complete!
```

## Test Patterns

### GIVEN-WHEN-THEN Structure
```al
[Test]
procedure DescribesTheBehaviorUnderTest()
begin
    // [GIVEN] preconditions via Library* helpers
    // [WHEN] the action under test runs
    // [THEN] assert the observable outcome
end;
```

### Confirm/RunModal Handlers
```al
[ConfirmHandler]
procedure ConfirmHandler(Question: Text[1024]; var Reply: Boolean)
begin
    Reply := true;
end;
```

## Coverage Targets

| Code Type | Target |
|-----------|--------|
| Posting routines, amount calculations | 100% |
| Public procedures/interfaces | 90%+ |
| General extension code | 80%+ |

## TDD Best Practices

**DO:**
- Write the `[Test]` procedure FIRST
- Use `Library*` codeunits for setup, never hardcoded demo data
- Name tests after the behavior, not the method called
- Confirm RED via the AL Test Tool or a container run before implementing

**DON'T:**
- Implement before the test exists
- Depend on data left by another test
- Let a `Confirm`/`RunModal` dialog hang the test without a handler
- Claim a phase passed without actually running it

## Related Commands

- `/al-build` - Fix compilation/analyzer errors
- `/al-review` - Review code after implementation

## Related

- Skill: `skills/al-testing/`
- Skill: `skills/tdd-workflow/`
