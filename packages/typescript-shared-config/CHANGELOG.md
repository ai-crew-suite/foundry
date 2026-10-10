# @ai-crew-suite/typescript-shared-config

## 0.0.4

### Patch Changes

- 376d4a7: Switch the `node` preset from NodeNext to bundler module resolution

  The `node` preset forced `module: NodeNext` and `moduleResolution: NodeNext`,
  which broke every bundler-compiled consumer (@vercel/ncc, esbuild, rollup,
  backstage-cli): ncc sets `module: esnext` internally (TS5110), and NodeNext
  demands explicit `.js` extensions on relative imports (TS2835), forcing each
  consumer to carry a local `module: esnext`/`moduleResolution: bundler`
  override. The preset now matches the repository's own `tsconfig.base.json`
  and the `web` preset with `module: ESNext`/`moduleResolution: Bundler`.

- Change tsconfig preset to module: ESNext / moduleResolution: Bundler

## 0.0.3

### Patch Changes

- Remove outDir and rootDir from base typescript shared config

## 0.0.2

### Patch Changes

- Initial release of shared enterprise configuration profiles and plugins.
