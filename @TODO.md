# Todos for the Foundry Repo

## `crew-cli`

- Need to fix the sync command. It's using Backstage `sync` which adds a root `dist-types` folder. That breaks Turborepo's rule about having to stick inside each directory.
