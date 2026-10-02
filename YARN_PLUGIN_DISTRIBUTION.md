# Managing Yarn Plugins

Yarn plugins are written in TypeScript/JavaScript and utilize the `@yarnpkg/core` APIs.

- `plugin-backstage.cjs`: Used to resolve `backstage:^` dependency versions from `backstage.json` files.

## Step 1: Building a Plugin

Yarn provides a official template repository to bootstrap plugin development.

1. Clone the Yarn Plugin Template.
2. Write your logic using Yarn hooks (e.g., intercepting the dependency resolution setup) or by registering new commands using the `clipanion` command library built into Yarn.
3. Build the plugin. The build process compiles your code into a **single, self-contained `.cjs` file** (using tools like Webpack or esbuild) so it has zero external runtime dependencies.

## Step 2: Versioning and Maintenance

- **Semantic Versioning:** You maintain your plugin source code in its own separate Git repository. You version it like a standard package (using `package.json` versions).
- **Release Artifacts:** When you release a new version (e.g., `v1.2.0`), your CI/CD pipeline should build the single `.cjs` file and attach it as a **release asset** on GitHub or publish it to a registry.

## Step 3: Distribution

There are two main ways to distribute your plugin to your team or the public:

| Method | How Users Install It | Best For |
| --- | --- | --- |
| **URL-Based (GitHub Releases)** | `yarn plugin import https://github.com` | Internal company tools or private plugins. |
| **NPM Registry** | `yarn plugin import my-yarn-plugin-package` | Open-source public plugins. Yarn will look for a package on npm and extract the compiled `.cjs` bundle. |

Once a consumer runs the `yarn plugin import` command, Yarn updates their `.yarnrc.yml` file and downloads the `.cjs` file directly into their project's `.yarn/plugins/` directory.

## RenovateBot

Yarn Modern allows you to declare plugins using standard npm package names. Instead of pinning to a static `.cjs` path, you can specify your custom plugin like this in your **`.yarnrc.yml`**:

```yaml
plugins:
  - name: my-yarn-plugin-package
    spec: "my-yarn-plugin-package@^1.0.0"
```

1. **Renovate Support:** Renovate natively understands `.yarnrc.yml` plugin definitions that use the `spec` field.
2. **The Automation:** When you publish a new version of `my-yarn-plugin-package` to npm, Renovate will detect the version bump, update the `spec` string in your `.yarnrc.yml`, and trigger its artifact updater.
3. **Under the Hood:** During that update step, Yarn resolves the new version from npm, automatically downloads the new `.cjs` payload, and updates the local cached plugin file.

