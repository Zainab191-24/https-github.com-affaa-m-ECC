---
name: ecc-security-scan
description: Run comprehensive security review on code changes. Use when code handles auth, user input, APIs, or sensitive data.
origin: ECC
---

# /security-scan — Security Review

## When to Activate

- After writing code that handles user input
- After modifying authentication/authorization code
- After adding API endpoints
- After changes to data handling or storage
- Before shipping sensitive features
- As part of pre-commit verification

## Delegation

For comprehensive security reviews, delegate to the `coder` subagent:

```
Use coder agent to run security scan on: [files/changes]
```

## Security Checklist

### Authentication & Authorization
- [ ] Passwords are hashed (bcrypt/Argon2, not MD5/SHA1)
- [ ] JWT tokens have expiration and secure signing
- [ ] Session management is secure (httpOnly, secure, SameSite)
- [ ] RBAC/permissions are enforced at every access point
- [ ] No privilege escalation paths

### Input Validation
- [ ] All user input is validated (type, length, format, range)
- [ ] File uploads are restricted by type and size
- [ ] Path traversal is prevented
- [ ] Command injection is prevented
- [ ] SSRF protections are in place

### Data Protection
- [ ] No secrets in code (use env vars, secret managers)
- [ ] Sensitive data is encrypted at rest
- [ ] PII is handled according to compliance requirements
- [ ] Database credentials are not logged

### Output Encoding
- [ ] HTML output is escaped (XSS prevention)
- [ ] JSON is properly serialized
- [ ] Error messages don't leak stack traces or internals

### API Security
- [ ] Rate limiting is implemented
- [ ] CORS is properly configured
- [ ] CSRF tokens are used for state-changing operations
- [ ] API keys are not exposed in client-side code

### Dependencies
- [ ] No known vulnerabilities in dependencies (`npm audit`)
- [ ] Dependencies are pinned/locked
- [ ] Unused dependencies are removed

## OWASP Top 10 Coverage

| # | Risk | What to Check |
|---|------|---------------|
| 1 | Broken Access Control | Every endpoint checks permissions |
| 2 | Cryptographic Failures | Proper encryption, no weak algorithms |
| 3 | Injection | SQL, NoSQL, OS command, LDAP injection |
| 4 | Insecure Design | Business logic flaws, race conditions |
| 5 | Security Misconfiguration | Default configs, error messages, headers |
| 6 | Vulnerable Components | Outdated dependencies |
| 7 | Auth Failures | Weak passwords, session flaws |
| 8 | Data Integrity | CSRF, SSRF, deserialization |
| 9 | Logging Failures | Missing audit logs, log injection |
| 10 | SSRF | Server-side request forgery |

## Output Format

```markdown
## Security Scan: [Scope]

### Risk Summary
| Severity | Count |
|----------|-------|
| 🔴 Critical | N |
| 🟡 High | N |
| 🟢 Medium | N |
| ℹ️ Low | N |

### Findings
#### 🔴 Critical
1. **[Title]** (`file.ts:line`)
   - **Issue**: Description
   - **Fix**: Recommended fix
   - **Ref**: OWASP link or CWE ID

### Verification
- [ ] All critical/high issues fixed or accepted
- [ ] Tests added for security boundaries
- [ ] Security notes added to documentation
```

## Post-Scan

If critical issues are found:
1. Fix them immediately
2. Re-scan to verify
3. Document any accepted risks with justification
