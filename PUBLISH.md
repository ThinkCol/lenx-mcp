# Publishing `@fastaai/lenx-mcp`

A guide to versioning, building, and publishing this MCP server package to npm.

---

## 1. Pre-Publish Checklist

Before you publish, run through these steps:

- **Logged in?** — `npm whoami` should print `fastaai` (or your npm username). If it errors, run `npm login`.
- **Tests pass** — `npm test` runs the vitest suite. All green = go.
- **Build succeeds** — `npm run build` compiles TypeScript and runs the postbuild script. The `prepublishOnly` hook does this automatically on publish, but a manual check catches issues early.
- **Pack for inspection** — `npm pack` generates a `.tgz` file. Use `tar --list -f <file>.tgz` to verify only `dist/` and `README.md` are included. The `files` whitelist in `package.json` restricts contents to those directories — if something is missing, check there first.

> `npm pack` is idempotent and does not publish anything. It is the safest way to preview exactly what will ship.

---

## 2. Version Bumping

This package follows [semantic versioning](https://semver.org/):

| Bump | When | Example |
|------|------|---------|
| **patch** | Bug fixes, no API changes | `0.0.1` → `0.0.2` |
| **minor** | New features, backwards-compatible | `0.0.1` → `0.1.0` |
| **major** | Breaking changes | `1.0.0` → `2.0.0` |

### Methods

**npm** (recommended) — creates a git tag automatically:

```sh
npm version patch   # 0.0.1 → 0.0.2
npm version minor   # 0.0.1 → 0.1.0
npm version major   # 1.0.0 → 2.0.0
```

**yarn:**

```sh
yarn version --patch
yarn version --minor
yarn version --major
```

**Manual** — edit `version` in `package.json` directly, then commit and tag yourself:

```sh
git add package.json && git commit -m "v1.0.0" && git tag v1.0.0
```

### Git tags

`npm version` creates a `v<version>` git tag automatically. Push it with:

```sh
git push --tags
```

### Hardcoded version in `src/server.ts`

The MCP server name/version is also set in `src/server.ts:17`:

```ts
{ name: "lenx-mcp", version: "0.1.0" },
```

Currently this is out of sync with `package.json` (`0.0.1`). Consider either:
- Reading the version from `package.json` at build time (importing the JSON or injecting via a build step)
- Remembering to update both locations manually before each publish

This is a common source of confusion — fix it once and forget it.

---

## 3. Publishing

### npm publish

```sh
npm publish
```

- If 2FA is enabled on your account, npm prompts for a one-time password (OTP) interactively, or you can pass it inline: `npm publish --otp=123456`
- Scoped packages default to private. This package sets `"publishConfig": { "access": "public" }` so it works out of the box.
- The `prepublishOnly` hook runs `npm run build` automatically before packaging. You do not need to build separately.

### yarn publish

```sh
yarn publish
```

- yarn prompts interactively for the new version unless you specify `--new-version <version>`.
- Less common for CI pipelines, but works fine for manual publishes.

### CI/CD (GitHub Actions example)

Add a workflow (`.github/workflows/publish.yml`):

```yaml
name: Publish

on:
  push:
    tags: "v*"

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: "https://registry.npmjs.org"
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

This triggers on any tag matching `v*` and publishes with an npm automation token stored as `NPM_TOKEN` in the repo secrets. Automation tokens bypass 2FA.

---

## 4. Versioned npx Usage

Since `@fastaai/lenx-mcp` has a `bin` entry, users can run it directly via `npx`:

```sh
npx @fastaai/lenx-mcp              # resolves to @latest
npx @fastaai/lenx-mcp@0.1.0        # specific version
npx @fastaai/lenx-mcp@latest       # explicit latest tag
npx @fastaai/lenx-mcp@beta         # beta dist-tag
```

### dist-tags

Tags are aliases for version numbers. The `latest` tag is what `npx @fastaai/lenx-mcp` resolves to by default.

**Common tag conventions:**

| Tag | Purpose |
|-----|---------|
| `latest` | Stable release (default) |
| `beta` | Pre-release for testing |
| `next` | Upcoming major/feature branch |

**Managing tags:**

```sh
npm dist-tag ls @fastaai/lenx-mcp                   # list all tags
npm dist-tag add @fastaai/lenx-mcp@0.2.0-beta.1 beta # set beta tag
npm dist-tag rm @fastaai/lenx-mcp beta               # remove beta tag
```

When you run `npm publish`, the `latest` tag is updated automatically. Use `npm publish --tag beta` to publish without affecting `latest`.

---

## 5. Troubleshooting

| Error | Likely cause | Fix |
|-------|-------------|-----|
| `ENEEDAUTH` | Not logged in | `npm login` |
| `E403` | Scope is private or package name taken | Check `publishConfig.access` is `"public"`. Check if name is already owned on npm. |
| `E404` | Package not found (install-side) | Double-check the package name spelling. Run `npm view @fastaai/lenx-mcp` to verify it exists. |
| `EPUBLISHCONFLICT` | Version already published | Bump the version — `npm version patch` and try again. |
| `dist/` missing from tarball | `files` field misconfigured | Run `npm pack --dry-run` to check. Verify `files` in `package.json` includes `"dist/"`. |

### Unpublishing

You can unpublish a version within **72 hours** of publishing:

```sh
npm unpublish @fastaai/lenx-mcp@0.1.0
```

After that window, unpublishing is not possible (npm policy). Deprecate instead:

```sh
npm deprecate @fastaai/lenx-mcp@0.1.0 "Critical bug — upgrade to 0.1.1"
```

### Verifying tarball contents

```sh
npm pack
tar --list -f fastaai-lenx-mcp-0.0.1.tgz
```

Expected output (only `dist/` and `README.md`):

```
package/README.md
package/dist/index.js
package/dist/index.d.ts
package/dist/server.js
package/dist/client.js
package/package.json
...
```

> Note: `package.json` is always included by npm regardless of the `files` whitelist. This is normal and deliberate — npm needs it for dependency resolution.

---

## 6. Quick Reference Cheatsheet

```sh
# Login & Auth
npm whoami
npm login

# Verify
npm test
npm run build
npm pack && tar --list -f fastaai-lenx-mcp-*.tgz

# Version bump (creates git tag automatically)
npm version patch
npm version minor
npm version major

# Publish
npm publish                                # interactive OTP
npm publish --otp=123456                   # inline OTP
npm publish --tag beta                     # publish as beta (not latest)
npm publish --dry-run                      # dry run — no actual publish

# dist-tags
npm dist-tag ls @fastaai/lenx-mcp
npm dist-tag add @fastaai/lenx-mcp@0.1.0 beta
npm dist-tag rm @fastaai/lenx-mcp beta

# npx usage (users)
npx @fastaai/lenx-mcp
npx @fastaai/lenx-mcp@0.1.0
npx @fastaai/lenx-mcp@latest

# Troubleshooting
npm view @fastaai/lenx-mcp                 # check package exists & latest version
npm unpublish @fastaai/lenx-mcp@0.1.0      # only within 72h
npm deprecate @fastaai/lenx-mcp@0.1.0 msg  # after 72h
```
