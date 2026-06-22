# Contributing

Thanks for helping improve safe-ai-client!

## Development

```bash
npm install
npm test          # run tests
npm run coverage  # tests + coverage gate
npm run lint      # eslint
npm run typecheck # tsc --noEmit
npm run build     # tsup dual ESM+CJS build
```

## Ground rules

- **Zero runtime dependencies** in `dependencies`. Tooling goes in `devDependencies`.
- **Edge-safe:** no `node:` built-in imports in `src/` (enforced by `tests/edge-safety.test.ts`).
- **TDD:** add a failing test first, then the implementation.
- Keep modules small and single-purpose. Follow existing patterns.
- Run `npm run lint && npm run typecheck && npm run coverage` before opening a PR.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/)
(`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
