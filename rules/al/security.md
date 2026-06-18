---
paths:
  - "**/*.al"
  - "**/app.json"
---
# AL Security

> This file extends [common/security.md](../common/security.md) with AL (Business Central) specific content.

## Secret Management

Never store API keys, tokens, or passwords as plain `Text`. Use `SecretText` and Isolated Storage:

```al
IsolatedStorage.Set('MyApiKey', NewSecretValue, DataScope::Module);
```

## Permissions

- Declare a permission set per app; do not rely on `SUPER`
- Check object-level permissions before direct database access from custom logic that bypasses standard pages

## HTTP Calls

- Use `HttpClient`/`HttpRequestMessage`, never raw socket access
- Validate and sanitize any externally sourced data before writing it to a table
