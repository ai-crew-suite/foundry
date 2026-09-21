# TODOs for Infra

1. We should add interceptors to yarn commands like we did in `actions` repo for `add`, so that we just use `yarn test` or `yarn test --package packageName` and it just works, and avoids `yarn turbo run --filter=repoName`

2. We should make `yarn add depName` or `yarn add -D depName` just work, and it does everything automatically with `.yarnrc.yml` named catalogs and adding it to the right repo if we use the `--package` flag. Also delete a dependency command.

3. We should make sure it works regardless of what the CWD is, so the command can be used when in a package directory.

4. Update our `.yarnrc.yml` files and `renovate.json` files to named catalogs for all dependencies.
