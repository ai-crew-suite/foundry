# GitHub Actions Issues to Verify

## Secrets & Permissions

- `secrets.NPM_AUTH_TOKEN` needed for publishing to npm
- `secrets.WORKFLOW_GITHUB_TOKEN` needed for automated dependency PRs
- `secrets.SLACK_WEBHOOK_URL` for notifications (optional but configured)

## Changeset Workflow

- The `.changeset` directory was empty - you'll need to add changeset files (`yarn changeset`) for versioning to work
- The publish workflow depends on Changesets detecting version bumps
