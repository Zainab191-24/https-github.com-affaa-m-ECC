---
paths:
  - "**/*.al"
  - "**/app.json"
---
# AL Testing

> This file extends [common/testing.md](../common/testing.md) with AL (Business Central) specific content.

## Framework

Use the **AL Test Toolkit** with `[Test]`-attributed procedures inside a `Subtype = Test` codeunit.

## Naming and Structure

Follow GIVEN-WHEN-THEN in the procedure body and name the test for the behavior under test:

```al
[Test]
procedure PostingSalesOrderUpdatesCustomerLedger()
begin
    // [GIVEN] a released sales order
    // [WHEN] the order is posted
    // [THEN] a customer ledger entry exists with the matching amount
end;
```

## Isolation

- Each test creates its own data; do not depend on data left by another test
- Use `LibraryRandom`/`Library*` helper codeunits for setup instead of hardcoded master data

## Local/CI Execution

There is no lightweight local AL test runner. Use **BcContainerHelper** (PowerShell) to spin up a container and run tests, or run via the AL Test Tool in VS Code. Document the container command rather than assuming a bare `al test` CLI exists.

## Reference

See skill: `al-testing` for Test Toolkit setup and container-based execution.
