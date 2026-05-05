# Security Review Skill

When invoked, apply systematic security analysis to any code, configuration, or design being discussed.

## Principles

- Prefer defense-in-depth: never rely on a single control.
- Assume input is hostile until proven otherwise.
- Security fixes must address root cause, not just symptoms.
- Default-deny is safer than default-allow.

## STRIDE Checklist

For every code change or system design, explicitly check each category:

### Spoofing (Authentication)
- Are user identities verified before sensitive actions?
- Is there any path that bypasses auth (e.g., debug flags, test endpoints)?
- Are tokens/session IDs properly validated and bound to the user?
- Is there credential stuffing / brute-force protection?

### Tampering (Integrity)
- Are inputs validated before use (length, type, range, format)?
- Is data integrity verified (checksums, HMACs, signatures)?
- Can an attacker modify data in transit or at rest?
- Are configuration files, build artifacts, or dependencies tamper-checked?

### Repudiation (Non-repudiation / Audit)
- Are security-relevant events logged with sufficient context?
- Can an attacker delete or modify their own audit trail?
- Are logs shipped to an immutable store?

### Information Disclosure (Confidentiality)
- Are secrets (tokens, keys, passwords) hardcoded or committed?
- Is sensitive data logged, cached, or returned in error messages?
- Are access controls enforced at every layer (API, DB, filesystem)?
- Is there any verbose error output that leaks internal paths or structures?

### Denial of Service (Availability)
- Are there unbounded loops, recursion, or allocations from user input?
- Are rate limits enforced on expensive operations?
- Can an attacker exhaust file descriptors, memory, or disk?
- Are timeouts set on all network and DB operations?

### Elevation of Privilege (Authorization)
- Are permissions checked on every request, not just at login?
- Is there any IDOR (Insecure Direct Object Reference) vulnerability?
- Can lower-privilege roles access admin endpoints by guessing IDs?
- Is access control centralized and consistently enforced?

## Top 10 Code Patterns to Flag

1. **SQL/NoSQL Injection** — String concatenation into queries, unsanitized `$where`, `eval` of query objects.
2. **Command Injection** — `exec`, `system`, `spawn` with unsanitized user input.
3. **Path Traversal** — User input used in filesystem paths without normalization and sandboxing.
4. **SSRF** — User-supplied URLs fetched by the server, especially to internal services.
5. **XSS** — Unescaped user output rendered in HTML, JS, CSS, or URLs.
6. **CSRF** — State-changing requests without anti-CSRF tokens or SameSite cookies.
7. **Insecure Deserialization** — Deserializing untrusted data (pickle, Java ObjectInputStream, PHP `unserialize`).
8. **Broken Auth** — Weak passwords, missing MFA, predictable session tokens, JWT without signature check.
9. **Secrets in Code** — API keys, DB credentials, private keys committed or logged.
10. **Unsafe Dependencies** — Known CVEs in `package.json`, `requirements.txt`, `Cargo.toml`, etc.

## Response Format

When asked to review code for security:
1. Run the STRIDE checklist.
2. Run the Top 10 pattern scan.
3. Report findings as:
   - **CRITICAL**: Immediate exploitation risk (RCE, auth bypass, data leak).
   - **HIGH**: Serious flaw, requires fixing before merge.
   - **MEDIUM**: Defense gap, should be fixed.
   - **LOW**: Hygiene issue or defense-in-depth opportunity.
4. For each finding, provide:
   - The exact code line / file.
   - Why it's a problem (with a concrete attack scenario if possible).
   - A fix or mitigation.
