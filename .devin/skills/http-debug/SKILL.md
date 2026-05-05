# HTTP Debug Skill

When invoked, apply systematic HTTP interception and traffic analysis to debug network issues, API failures, or verify HTTP behavior.

## Principles

- Reproduce before diagnosing. Never guess what the wire looks like.
- Start at Layer 7 (application), then work down (TLS, TCP, DNS).
- Compare expected vs actual: method, path, headers, body, timing, status.
- Isolate variables: one change per test.

## Debugging Flow

### Phase 1: Reproduce
1. Identify the failing request: URL, method, headers, body.
2. Reproduce it with the simplest possible tool (`curl`, `httpie`, or a minimal script).
3. If it works in `curl` but fails in code, the bug is in the client library, not the server.
4. If it fails in `curl` too, the bug is server-side or network-layer.

### Phase 2: Capture

Use the right tool for the environment:

- **CLI / local scripts**: `mitmproxy`, `mitmdump`, `curl -v`, `httpie --print=HBhb`
- **Browser**: DevTools Network tab, copy as `curl`
- **Node.js services**: `NODE_DEBUG=http,https,net,tls` env var, or `undici` interceptor
- **Containers / k8s**: `tcpdump` inside pod, or service mesh sidecar logs
- **Production (read-only)**: Request/response logs, distributed tracing (OpenTelemetry, Jaeger)

### Phase 3: Inspect

For every captured request, verify these fields against expectations:

| Field | What to check |
|---|---|
| Method | Is it GET/POST/PUT/DELETE/PATCH as expected? |
| URL | Is the path correct? Are query params present and encoded? |
| Host header | Does it match the TLS SNI and the server vhost config? |
| Content-Type | Does the server expect `application/json` but the client sends `text/plain`? |
| Content-Length | Does it match the actual body size? Chunked encoding used correctly? |
| Authorization | Is the token present, not expired, scoped correctly? |
| Body | Is JSON well-formed? Are required fields present? Schema valid? |
| Status code | Is it in the expected range? Is a 404 actually a 403 in disguise? |
| Response body | Does it contain error details the client is ignoring? |
| Timing | DNS, TLS handshake, TTFB, transfer. Where is the time spent? |
| Redirects | Is the client following redirects? Is there a redirect loop? |

### Phase 4: Diagnose Common Patterns

| Symptom | Likely Cause | How to Confirm |
|---|---|---|
| Connection refused | Wrong port, service down, firewall | `telnet host port`, `ss -tlnp` |
| DNS resolution failure | Bad resolver, stale cache | `dig +trace`, `nslookup`, `/etc/resolv.conf` |
| TLS handshake failure | Wrong cert, SNI mismatch, expired CA | `openssl s_client -connect host:port -servername host` |
| 400 Bad Request | Malformed request body or headers | Compare raw bytes to a known-good request |
| 401 Unauthorized | Missing/expired token, wrong scheme | Decode JWT, check `Authorization` header exactly |
| 403 Forbidden | Valid auth, but insufficient permissions | Check RBAC, scopes, resource ownership |
| 404 vs 405 | Wrong URL vs wrong method | `curl -X OPTIONS` to list allowed methods |
| 429 Too Many Requests | Rate limit hit | Check `Retry-After`, implement backoff + jitter |
| 500 Internal Server Error | Server bug, unhandled exception | Server logs, stack traces, reproduce locally |
| Slow TTFB | DB query, upstream latency, blocking code | Trace the server-side call graph |
| Hanging / timeout | Missing `Content-Length`, half-open connection | Check TCP FIN/RST, chunked encoding |

## Response Format

When asked to debug an HTTP issue:
1. Ask for (or construct) the exact failing request.
2. Recommend the simplest reproduction command.
3. If possible, run it and capture actual output.
4. Inspect every field from the Inspect table.
5. Pinpoint the mismatch.
6. Propose a fix or the next experiment to isolate further.
