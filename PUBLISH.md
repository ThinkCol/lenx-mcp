# Publishing `@fastaai/lenx-mcp`

A step-by-step guide to versioning, building, and publishing this MCP server to npm.

## Overview

This document covers the full publish workflow for `@fastaai/lenx-mcp`. Follow it in order: pre-flight checks → version bump → publish → verify. Anyone with npm publish access to the `fastaai` org should read this before shipping.

The project uses `package.json` scripts that are tool-agnostic — `yarn test`, `yarn build`, etc. all work out of the box.

---

## 1. Pre-Publish Checklist

Run through every step before publishing:

| Step | Command | What to look for |
|------|---------|-----------------|
| **Logged in?** | `npm whoami` | Should print `fastaai`. If it errors, run `npm login` (or set `NPM_TOKEN`). |
| **Tests pass** | `yarn test` | Vitest suite. All green. |
| **Clean build** | `yarn build` | TypeScript compiles, postbuild runs. Zero errors. |
| **Inspect tarball** | `yarn pack && tar --list -f *.tgz` | Only `dist/`, `README.md`, and `package.json`. |

> `yarn pack` is idempotent and does not publish anything. It is the safest way to preview exactly what will ship.

---

## 2. Version Bumping

This package follows [semantic versioning](https://semver.org/):

| Bump | When | Example (`0.0.1` →) |
|------|------|---------------------|
| **patch** | Bug fixes, no API changes | `0.0.2` |
| **minor** | New features, backwards-compatible | `0.1.0` |
| **major** | Breaking changes | `1.0.0` |

### Required: `yarn version`

This is the **one correct way** to bump versions. Do not edit `package.json` manually.

```sh
yarn version --new-version 0.0.3   # patch
yarn version --new-version 0.1.0   # minor
yarn version --new-version 1.0.0   # major
```

> **Yarn v2+ note:** If you upgrade to Yarn v2+ (Berry), the flags change to `yarn version patch`, `yarn version minor`, `yarn version major`. On Yarn v1 (1.22.22), use `--new-version` as shown above.

### What it does under the hood

`yarn version` performs three actions automatically:
1. Edits the `version` field in `package.json`
2. Creates a git commit with the version as the message
3. Creates a git tag named `v<version>` (e.g., `v0.0.3`)

### ⚠️ Important: `yarn version` vs `npm version`

`yarn version` has a key difference from `npm version`:

- By default, `yarn version` opens an **interactive editor** (like `git commit`) instead of doing a non-interactive bump.
- Passing `--new-version` as shown above avoids the interactive editor on Yarn v1.
- If you want to **bump the version without creating a git tag** (e.g., to tag manually or in CI), use:
  ```sh
  yarn version --new-version 0.0.3 --no-git-tag-version
  ```

### Git tag convention

Tags use the `v` prefix: `v0.0.3`, `v1.2.3`. Push both the commit and tag together:

```sh
git push --follow-tags
```

> `--follow-tags` pushes the current branch plus any annotated tags reachable from it. This is safer than `git push --tags` (which pushes every local tag).

### Warnings

- **Do NOT edit `package.json` by hand.** You will miss the git tag and commits, and the CI/CD trigger (which matches `v*`) won't fire.
- **`yarn version` does NOT run lifecycle hooks** (like `preversion`/`version`/`postversion` scripts) the way `npm version` does. If you rely on those scripts, run them manually or switch to using `npm version` for the bump step only.

---

## 3. Publishing

### Dry-run first

Always preview before publishing:

```sh
npm publish --dry-run
```

This runs the full publish pipeline without actually sending anything to the registry.

### Actual publish

```sh
npm publish
```

- `npm publish` automatically runs `yarn build` before packaging via the `prepublishOnly` lifecycle hook defined in `package.json`. You do not need to build separately.
- If 2FA is enabled, npm prompts for a one-time password (OTP). Pass it inline for automation:
  ```sh
  npm publish --otp=123456
  ```
- Scoped packages default to private. `package.json` sets `"publishConfig": { "access": "public" }` so this works out of the box.

### Automation tokens

For CI, use an npm automation token (set as `NPM_TOKEN` in repo secrets). npm respects the `NPM_TOKEN` environment variable. Automation tokens bypass 2FA. Example in CI section below.

---

## 4. CI/CD (GitHub Actions)

Add `.github/workflows/publish.yml`:

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

This triggers on any tag matching `v*` (exactly what `yarn version` creates) and publishes using an npm automation token. Automation tokens bypass 2FA, so no `--otp` is needed.

> **Yarn v2+ note:** If you upgrade CI to Yarn v2+, use `yarn npm publish` instead of `npm publish`.

---

## 5. Versioned npx Usage

Users pin a specific version:

```sh
npx @fastaai/lenx-mcp                # resolves to @latest
npx @fastaai/lenx-mcp@0.0.2          # specific version
npx @fastaai/lenx-mcp@latest         # explicit latest tag
npx @fastaai/lenx-mcp@beta           # beta dist-tag
```

---

## 6. dist-tags

Tags are aliases for version numbers. The `latest` tag is what `npx @fastaai/lenx-mcp` resolves to by default.

### Common conventions

| Tag | Purpose |
|-----|---------|
| `latest` | Stable release (default) |
| `beta` | Pre-release for testing |
| `next` | Upcoming major/feature branch |

### Managing tags

npm uses the `npm dist-tag` subcommand:

```sh
npm dist-tag ls @fastaai/lenx-mcp                     # list all tags
npm dist-tag add @fastaai/lenx-mcp@0.2.0-beta.1 beta  # set beta tag
npm dist-tag rm @fastaai/lenx-mcp beta                 # remove beta tag
```

> **Yarn v2+ note:** If you upgrade to Yarn v2+, the commands change to `yarn npm tag list`, `yarn npm tag add`, and `yarn npm tag remove`.

When you run `npm publish`, the `latest` tag is updated automatically. Publish without affecting `latest` using `--tag`:

```sh
npm publish --tag beta
```

---

## 7. Troubleshooting

| Error | Likely cause | Fix |
|-------|-------------|-----|
| `ENEEDAUTH` | Not logged in | `npm login` (or set `NPM_TOKEN`) |
| `E403` | Scope is private or package name taken | Check `publishConfig.access` is `"public"`. Verify the name isn't already owned on npm. |
| `E404` | Not logged in or org doesn't exist | Run `npm whoami` to check. Run `npm login` to authenticate. |
| `EPUBLISHCONFLICT` | Version already published | Bump the version — `yarn version --new-version X.Y.Z` and try again. |
| `dist/` missing from tarball | `files` field misconfigured | Run `yarn pack` to check. Verify `files` in `package.json` includes `"dist/"`. |

### Unpublishing

You can unpublish within **72 hours** of publishing:

```sh
npm unpublish @fastaai/lenx-mcp@0.1.0
```

> **Yarn v2+ note:** Use `yarn npm unpublish` instead.

After 72 hours, deprecate instead:

```sh
npm deprecate @fastaai/lenx-mcp@0.1.0 "Critical bug — upgrade to 0.2.0"
```

> **Yarn v2+ note:** Use `yarn npm deprecate` instead.

### Verifying tarball contents

```sh
yarn pack
tar --list -f *.tgz
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

> Note: `package.json` is always included by npm regardless of the `files` whitelist. This is normal — npm needs it for dependency resolution.

---

## 8. Step-by-Step Walkthrough

Three complete end-to-end sequences. Copy-paste these in order and you're done.

### Patch (e.g. 0.0.2 → 0.0.3)

```sh
# 1. Verify auth
npm whoami

# 2. Run tests
yarn test

# 3. Build
yarn build

# 4. Preview tarball
yarn pack && tar --list -f *.tgz

# 5. Bump version (creates git commit + tag)
yarn version --new-version 0.0.3

# 6. Dry-run publish
npm publish --dry-run

# 7. Publish
npm publish

# 8. Push commit and tag
git push --follow-tags
```

### Minor (e.g. 0.0.2 → 0.1.0)

```sh
# 1. Verify auth
npm whoami

# 2. Run tests
yarn test

# 3. Build
yarn build

# 4. Preview tarball
yarn pack && tar --list -f *.tgz

# 5. Bump version (creates git commit + tag)
yarn version --new-version 0.1.0

# 6. Dry-run publish
npm publish --dry-run

# 7. Publish
npm publish

# 8. Push commit and tag
git push --follow-tags
```

### Major (e.g. 0.0.2 → 1.0.0)

```sh
# 1. Verify auth
npm whoami

# 2. Run tests
yarn test

# 3. Build
yarn build

# 4. Preview tarball
yarn pack && tar --list -f *.tgz

# 5. Bump version (creates git commit + tag)
yarn version --new-version 1.0.0

# 6. Dry-run publish
npm publish --dry-run

# 7. Publish
npm publish

# 8. Push commit and tag
git push --follow-tags
```

---

## 9. Quick Reference Cheatsheet

```sh
# ── Login & Auth ────────────────────────────────────────
npm whoami
npm login

# ── Verify ──────────────────────────────────────────────
yarn test
yarn build
yarn pack && tar --list -f *.tgz

# ── Version bump (creates git tag automatically) ───────
yarn version --new-version 0.0.3   # patch
yarn version --new-version 0.1.0   # minor
yarn version --new-version 1.0.0   # major
# Or without git tag:
# yarn version --new-version 0.0.3 --no-git-tag-version
git push --follow-tags

# ── Publish ─────────────────────────────────────────────
npm publish --dry-run                    # preview only
npm publish                              # (runs build via prepublishOnly)
npm publish --otp=123456                 # inline OTP
npm publish --tag beta                   # publish as beta (not latest)

# ── dist-tags ───────────────────────────────────────────
npm dist-tag ls @fastaai/lenx-mcp
npm dist-tag add @fastaai/lenx-mcp@0.2.0-beta.1 beta
npm dist-tag rm @fastaai/lenx-mcp beta

# ── npx usage (users) ───────────────────────────────────
npx @fastaai/lenx-mcp
npx @fastaai/lenx-mcp@0.1.0
npx @fastaai/lenx-mcp@latest

# ── Troubleshooting ─────────────────────────────────────
npm view @fastaai/lenx-mcp                 # check latest version
npm unpublish @fastaai/lenx-mcp@0.1.0      # only within 72h
npm deprecate @fastaai/lenx-mcp@0.1.0 msg  # after 72h
```
