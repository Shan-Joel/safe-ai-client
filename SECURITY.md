# Security Policy

## Reporting a vulnerability

Please report security issues privately by opening a
[GitHub security advisory](https://github.com/Shan-Joel/safe-ai-client/security/advisories/new)
or emailing the maintainers. Do not open public issues for vulnerabilities.
We aim to acknowledge reports within 72 hours.

## Design guarantees

safe-ai-client is built to be safe by construction:

- **No credential handling.** The library never reads, stores, transmits, or logs
  API keys or secrets. You provide the `execute()` function and own all credentials.
- **No telemetry.** The library makes no network calls of its own and sends no data anywhere.
- **No code execution.** No `eval`, no dynamic `require`/`import` of user input.
- **Prototype-pollution safe.** Storage keys reject `__proto__` / `constructor` / `prototype`.
- **Deterministic.** Enforcement logic uses only the injected clock; no hidden randomness.
- **Observer isolation.** A throwing hook can never alter enforcement or break a request.

## Supported versions

The latest minor release receives security fixes.
