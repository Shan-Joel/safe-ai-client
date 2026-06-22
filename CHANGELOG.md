# Changelog

All notable changes to this project are documented here. This project adheres to
[Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-06-22

### Changed (provider-neutral)

- Made the package fully provider-neutral: removed all specific provider/model names
  from the README, keywords, examples, and source. Provider and model identifiers are
  now caller-chosen labels.
- **No provider prices ship anymore.** `builtInPricing` now contains a single
  illustrative placeholder; supply your own rates via `createGuard({ pricing })`. A
  request with no configured price records cost `0` and `estimated: true`.

### Migration

- If you relied on built-in pricing (e.g. real model rates), pass a `pricing` map with
  your own per-1k rates. The provider/model strings you pass to `run()` just need to
  match the keys in `pricing`.

## [0.1.1] - 2026-06-22

### Documentation

- Add a Trademarks & Affiliation disclaimer (independent, unofficial project; not
  affiliated with any provider or platform).
- Document early-release limitations (per-process memory storage, approximate
  concurrency, streaming requires an estimate, estimated cost).
- Set repository/author metadata.

## [0.1.0] - 2026-06-22

### Added

- `createGuard` factory with provider-agnostic `run()` wrapper.
- Sliding-window and token-bucket rate limiters (per-minute / per-day).
- Cost engine with an overridable pricing map.
- Budget engine: daily/monthly USD caps, pre-flight blocking, warning thresholds.
- Usage tracker and `getUsage()` snapshots; per-key (per-user/tenant) buckets.
- `guardedFetch` convenience wrapper with automatic usage parsing.
- Pluggable `Storage` interface with built-in memory adapter.
- Six observability hooks; typed errors (`RateLimitError`, `BudgetExceededError`).
- Dual ESM + CJS build, edge-runtime safe, zero runtime dependencies.
