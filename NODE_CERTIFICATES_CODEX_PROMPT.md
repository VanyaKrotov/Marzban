# Marzban Node: ACME certificate management

Implement the node-side half of certificate management for this Marzban fork.

## Existing master contract

The master connects to the node over the existing mutually authenticated TLS
channel. Add this REST endpoint:

`POST /certificates/issue`

The request JSON includes the existing `session_id` field and:

```json
{
  "domain": "node.example.com",
  "email": "admin@example.com",
  "staging": false,
  "force": false
}
```

The authenticated session must be validated exactly like `/start`, `/restart`,
and other privileged node endpoints. Never expose this endpoint without the
existing client-certificate and session checks.

For compatibility with legacy RPyC nodes, also expose:

```python
issue_certificate(domain, email=None, staging=False, force=False)
```

Both transports must call one shared certificate service.

## ACME behavior

1. Validate and normalize `domain`; reject shell metacharacters, paths,
   wildcard names, IP addresses, and malformed DNS names.
2. Issue or renew a Let's Encrypt certificate using `acme.sh`.
3. Use HTTP-01 standalone mode. Detect/report when TCP port 80 is occupied or
   unreachable. Do not silently stop unrelated services.
4. Use the Let's Encrypt staging directory when `staging=true`.
5. Reuse an existing valid certificate unless `force=true` or renewal is due.
6. Store each domain independently under a persistent node data directory,
   outside temporary/container layers. Use restrictive permissions:
   directories `0700`, private keys `0600`.
7. Invoke subprocesses with argument arrays and `shell=False`. Add a bounded
   timeout, capture stderr, and return sanitized errors without private-key
   contents.
8. Make writes atomic and serialize concurrent operations for the same domain.
9. Parse the resulting certificate locally and verify that:
   - it contains the requested DNS SAN;
   - it is currently valid;
   - the private key matches the leaf certificate.

## Success response

Return HTTP 200:

```json
{
  "domain": "node.example.com",
  "certificate": "-----BEGIN CERTIFICATE-----\n...full chain...\n",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n",
  "expires_at": "2026-09-06T10:00:00Z"
}
```

`certificate` must be the full chain and `private_key` must be PEM. The master
stores both and injects selected certificates into Xray configs on subsequent
node start/restart calls. Do not log or cache private-key contents in responses,
tracebacks, command lines, or debug logs.

## Errors

Use FastAPI `HTTPException` with useful 4xx errors for invalid input and 5xx
errors for ACME/tool failures. Keep the existing node API response shape:

```json
{"detail": "human-readable error"}
```

## Packaging and tests

- Add `acme.sh` installation/runtime requirements to the node Docker image and
  installation scripts used by this fork.
- Persist the certificate directory in Docker Compose/volume configuration.
- Add tests for auth rejection, domain validation, successful issue, forced
  renewal, reuse of a valid certificate, ACME failure, timeout, concurrent
  requests, file permissions, and key/certificate mismatch.
- Mock ACME execution in unit tests; add an opt-in integration test against the
  Let's Encrypt staging environment.
- Preserve all current `/start`, `/restart`, log streaming, and Xray lifecycle
  behavior.
