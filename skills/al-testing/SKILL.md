---
name: al-testing
description: AL Test Toolkit patterns for Business Central — GIVEN-WHEN-THEN test codeunits, Library helpers, test isolation, and container-based test execution.
metadata:
  origin: ECC
---

# AL Testing Patterns

AL testing patterns for Business Central using the built-in Test Toolkit, following TDD methodology.

## When to Activate

- Writing new AL test codeunits
- Adding test coverage to existing AL extensions
- Following TDD workflow in an AL project
- Setting up CI test execution for a Business Central app

## TDD Workflow for AL

```
RED      → Write a failing [Test] procedure first
GREEN    → Write minimal extension code to pass it
REFACTOR → Improve code while keeping tests green
```

There is no bare `al test` CLI. RED/GREEN must be confirmed via the **AL Test Tool** in VS Code against a running sandbox, or via a container test run (see below). Do not claim a test passed without one of these being executed.

## Test Codeunit Structure

```al
codeunit 50100 "Loyalty Discount Tests"
{
    Subtype = Test;
    TestPermissions = Disabled;

    [Test]
    procedure CalculatingDiscountForGoldCustomerAppliesTenPercent()
    var
        Customer: Record Customer;
        Calculator: Codeunit "Loyalty Discount Mgt.";
        Discount: Decimal;
    begin
        // [GIVEN] a customer on the Gold loyalty tier
        LibrarySales.CreateCustomer(Customer);
        Customer.Validate("Loyalty Tier", Customer."Loyalty Tier"::Gold);
        Customer.Modify(true);

        // [WHEN] the discount is calculated for a 1000 amount
        Discount := Calculator.CalculateDiscount(Customer."No.", 1000);

        // [THEN] a 10% discount is returned
        Assert.AreEqual(100, Discount, 'Gold tier should apply 10% discount');
    end;
}
```

### Naming

Name the test procedure after the **behavior under test**, not the method called:

```al
// Bad
[Test]
procedure TestCalculateDiscount()

// Good
[Test]
procedure CalculatingDiscountForGoldCustomerAppliesTenPercent()
```

## Library Helpers, Not Hardcoded Master Data

Use `Library*` codeunits (`LibrarySales`, `LibraryInventory`, `LibraryRandom`, `LibraryERM`) to create test data. This keeps tests independent of pre-existing demo data and resilient to base-app changes.

```al
var
    LibrarySales: Codeunit "Library - Sales";
    LibraryRandom: Codeunit "Library - Random";

[Test]
procedure PostingSalesOrderCreatesCustomerLedgerEntry()
var
    Customer: Record Customer;
    SalesHeader: Record "Sales Header";
    SalesLine: Record "Sales Line";
begin
    // [GIVEN] a released sales order for a random quantity
    LibrarySales.CreateCustomer(Customer);
    LibrarySales.CreateSalesHeader(SalesHeader, SalesHeader."Document Type"::Order, Customer."No.");
    LibrarySales.CreateSalesLine(SalesLine, SalesHeader, SalesLine.Type::Item, '', LibraryRandom.RandIntInRange(1, 10));

    // [WHEN] the order is posted
    LibrarySales.PostSalesDocument(SalesHeader, true, true);

    // [THEN] a customer ledger entry exists
    Assert.RecordIsNotEmpty(GetCustLedgerEntries(Customer."No."));
end;
```

## Test Isolation

- Each `[Test]` procedure creates its own customer/item/document — never depend on data left by another test or by demo data
- Tests in Business Central run inside an implicit transaction that is rolled back after each test — do not rely on data persisting across test procedures
- Use `[TransactionModel(TransactionModel::AutoRollback)]` only when you explicitly need different rollback behavior than the default

## Handling UI During Tests

Pages opened via `RunModal`/`Confirm` during a test must be intercepted with a handler codeunit, or the test will hang waiting for input:

```al
[ConfirmHandler]
procedure ConfirmHandler(Question: Text[1024]; var Reply: Boolean)
begin
    Reply := true;
end;

[Test]
[HandlerFunctions('ConfirmHandler')]
procedure PostingWithConfirmationAccepted()
begin
    // test body — the Confirm() call inside the code under test
    // is now answered by ConfirmHandler instead of blocking
end;
```

## Local/CI Execution

There is no lightweight local AL test runner outside VS Code. Two supported paths:

1. **VS Code AL Test Tool** — run/debug individual `[Test]` procedures against a connected sandbox during development
2. **BcContainerHelper (PowerShell)** — spin up a Business Central container and run the full test suite for CI:

```powershell
Import-Module BcContainerHelper
Run-TestsInBcContainer -containerName bctest -credential $credential -extensionId $appId
```

`AL-Go for GitHub` wraps this into a ready-made CI workflow — prefer it over a hand-rolled pipeline for AppSource/PTE repos that need GitHub Actions.

## Reference

See skill: `al-patterns` for the extension model and event subscriber safety rules these tests exercise.
