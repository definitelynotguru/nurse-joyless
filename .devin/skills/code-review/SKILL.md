# Code Review Skill

When invoked, apply a systematic, checklist-driven code review focused on correctness, maintainability, and performance.

## Review Axes

Check every code change across these three axes. Do not stop at the first issue found.

### 1. Correctness ("Does it actually work?")

- **Null safety**: Can any pointer/reference be null/undefined when dereferenced?
- **Bounds checking**: Are arrays, buffers, or strings accessed within valid limits?
- **Error handling**: Are all error paths handled? Are errors silently swallowed?
- **Race conditions**: Shared mutable state across threads, async boundaries, or callbacks?
- **Resource leaks**: Files, sockets, DB connections, memory — are they closed/released on all paths?
- **Off-by-one**: Loop bounds, slice indices, pagination math.
- **Type safety**: Implicit casts, dynamic typing risks, `any`/`interface{}` abuse.
- **Logic invariants**: Assumptions documented? Can they be violated by future callers?
- **Idempotency**: Is the operation safe to retry? What happens on duplicate execution?

### 2. Maintainability ("Can someone else understand and change this?")

- **Naming**: Do names reveal intent, not just mechanism?
- **Magic numbers/strings**: Are literals extracted to named constants?
- **Function size**: Does any function do more than one thing? Can it be decomposed?
- **Control flow**: Deep nesting (>3 levels)? Early returns used to flatten?
- **Comments**: Explain *why*, not *what*. Are they current or lying?
- **Dead code**: Unused imports, variables, functions, commented-out blocks.
- **Coupling**: Does this change create hidden dependencies between distant modules?
- **API contracts**: Are function preconditions, postconditions, and invariants documented?

### 3. Efficiency ("Is this unnecessarily slow or heavy?")

- **Algorithmic complexity**: Nested loops over large collections? Quadratic where linear would suffice?
- **Redundant work**: Recomputing values inside loops? Duplicate DB queries?
- **Memory**: Unnecessary allocations, large intermediate copies, closure captures of big objects?
- **I/O**: Blocking calls in async contexts? Unbatched DB operations?
- **Caching**: Is expensive work cached? Is the cache invalidation correct?
- **Lazy evaluation**: Are heavy objects created eagerly when lazily would suffice?

## Language-Specific Red Flags

### JavaScript/TypeScript
- `==` instead of `===` (type coercion bugs).
- `await` inside loops (serializes async work).
- `JSON.parse` without try/catch.
- `any` types that mask real bugs.
- Missing `break` or `return` in switch cases.

### Python
- Mutable default arguments (`def f(x=[])`).
- Bare `except:` catching KeyboardInterrupt and SystemExit.
- `os.system` or `subprocess.call` with shell=True and user input.
- `is` vs `==` for value comparison.

### Rust
- `.unwrap()` / `.expect()` on user input or I/O.
- `unsafe` blocks without a documented safety invariant.
- Clone-heavy patterns where references or `Cow` would work.

### Go
- `err` not checked before using a value.
- `defer` inside a loop (stack growth, deferred until loop exit).
- Goroutine leaks from unbounded spawning.

### Shell
- Unquoted variables (`$VAR` instead of `"$VAR"`).
- `rm -rf` with user input.
- Missing `set -euo pipefail` in scripts.

## Response Format

When asked to review code:
1. State the review scope (files / functions / PR).
2. Run the three axes checklist.
3. Report findings grouped by axis.
4. For each finding:
   - File and line number.
   - Severity: blocker / warning / suggestion / nit.
   - Explanation (why it's wrong, not just "it's bad").
   - Suggested fix or refactor.
5. End with a summary: total issues by severity and a one-sentence verdict ("LGTM with nits" / "Needs work on error handling" / "Do not merge: critical race condition").
