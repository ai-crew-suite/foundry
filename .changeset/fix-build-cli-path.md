---
"@ai-crew-suite/crew-cli": patch
---

Fix `crew build` and `crew format` failing with `MODULE_NOT_FOUND`; make `crew test:unit` extensible

- `crew build` resolved the main CLI binary four directory levels up from the
  built command module (`dist/bin/commands/build/lib`), producing the
  nonexistent `dist/crew.js`. It now resolves three levels up to the actual
  `bin` entrypoint, `dist/bin/crew.js`.
- `crew format` hardcoded the Prettier v2 CLI path (`bin-prettier.js`), which
  no longer exists in Prettier v3 (`bin/prettier.cjs`). It now resolves the
  CLI entry from the installed Prettier's own `package.json` `bin` field.
- `crew test:unit` now prefers a local `vitest.config.*` in the target package
  (or an explicit `--config` flag) and only falls back to the shared crew-cli
  config, so packages need no boilerplate config unless they customize. The
  shared Vitest config is also exposed as a `createCrewVitestConfig(overrides)`
  factory on the package's programmatic API for consumers to extend.
