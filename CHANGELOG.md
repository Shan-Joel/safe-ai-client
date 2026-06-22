# Changelog

All notable changes to this project are documented here. This project adheres to
[Semantic Versioning](https://semver.org/).

## [0.1.1] - 2026-06-22

### Documentation

- Add a Trademarks & Affiliation disclaimer (independent/unofficial project; provider
  names used only for interoperability).
- Document v0.1.0 limitations (per-process memory storage, approximate concurrency,
  streaming requires an estimate, estimated pricing).
- Set repository/author metadata.

## [0.1.0] - 2026-06-22

### Added

- `createGuard` factory with provider-agnostic `run()` wrapper.
- Sliding-window and token-bucket rate limiters (per-minute / per-day).
- Cost engine with overridable, dated pricing snapshot (OpenAI + Anthropic).
- Budget engine: daily/monthly USD caps, pre-flight blocking, warning thresholds.
- Usage tracker and `getUsage()` snapshots; per-key (per-user/tenant) buckets.
- `guardedFetch` convenience wrapper with automatic usage parsing.
- Pluggable `Storage` interface with built-in memory adapter.
- Six observability hooks; typed errors (`RateLimitError`, `BudgetExceededError`).
- Dual ESM + CJS build, edge-runtime safe, zero runtime dependencies.
