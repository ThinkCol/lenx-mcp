# Publishing `@fastaai/lenx-mcp`

A step-by-step guide to versioning, building, and publishing this MCP server to npm.

## Overview

This document covers the full publish workflow for `@fastaai/lenx-mcp`. Follow it in order: pre-flight checks → version bump → publish → verify. Anyone with npm publish access to the `fastaai` org should read this before shipping.

---

## 1. Pre-Publish Checklist

Run through every step before publishing:

| Step | Command | What to look for |
|------|---------|-----------------|
| **Logged in?** | `npm whoami` | Should print `fastaai`. If it errors, run `npm login`. |
| **Tests pass** | `npm test` | Vitest suite. All green. |
| **Clean build** | `npm run build` | TypeScript compiles, postbuild runs. Zero errors. |
| **Inspect tarball** | `npm pack && tar --list -f *.tgz` | Only `dist/`, `README.md`, and `package.json`. |

> `npm pack` is idempotent and does not publish anything. It is the safest way to preview exactly what will ship.

---

## 2. Version Bumping

This package follows [semantic versioning](https://semver.org/):

| Bump | When | Example (`0.0.1` →) |
|------|------|---------------------|
| **patch** | Bug fixes, no API changes | `0.0.2` |
| **minor** | New features, backwards-compatible | `0.1.0` |
| **major** | Breaking changes | `1.0.0` |

### Required: `npm version`

This is the **one correct way** to bump versions. Do not edit `package.json` manually.

```sh
npm version patch   # 0.0.1 → 0.0.2
npm version minor   # 0.0.1 → 0.1.0
npm version major   # 1.0.0 → 2.0.0
```

### What it does under the hood

`npm version` performs three actions automatically:
1. Edits the `version` field in `package.json`
2. Creates a git commit with the version as the message
3. Creates a git tag named `v<version>` (e.g., `v0.0.2`)

### Git tag convention

Tags use the `v` prefix: `v0.0.2`, `v1.2.3`. This is the standard npm convention. Push both the commit and tag together:

```sh
git push --follow-tags
```

> `--follow-tags` pushes the current branch plus any annotated tags reachable from it. This is safer than `git push --tags` (which pushes every local tag).

### Warnings

- **Do NOT edit `package.json` by hand.** You will miss the git tag and commits, and the CI/CD trigger (which matches `v*`) won't fire.
- **Do NOT use `yarn version`.** It uses a different tag format and doesn't trigger the npm lifecycle hooks correctly. Stick with `npm version`.

---

## 3. Publishing

### Dry-run first

Always preview before publishing:

```sh
npm publish --dry-run
```

This runs the full publish pipeline (including `prepublishOnly`) without actually sending anything to the registry.

### Actual publish

```sh
npm publish
```

- The `prepublishOnly` hook automatically runs `npm run build` before packaging. You do not need to build separately.
- If 2FA is enabled, npm prompts for a one-time password (OTP) interactively. Pass it inline for automation:
  ```sh
  npm publish --otp=123456
  ```
- Scoped packages default to private. `package.json` sets `"publishConfig": { "access": "public" }` so this works out of the box.

### Automation tokens

For CI, use an npm automation token (set as `NPM_TOKEN` in repo secrets). Automation tokens bypass 2FA. Example in CI section below.

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

This triggers on any tag matching `v*` (exactly what `npm version` creates) and publishes using an npm automation token. Automation tokens bypass 2FA, so no `--otp` is needed.

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

```sh
npm dist-tag ls @fastaai/lenx-mcp                     # list all tags
npm dist-tag add @fastaai/lenx-mcp@0.2.0-beta.1 beta  # set beta tag
npm dist-tag rm @fastaai/lenx-mcp beta                # remove beta tag
```

When you run `npm publish`, the `latest` tag is updated automatically. Publish without affecting `latest` using `--tag`:

```sh
npm publish --tag beta
```

---

## 7. Troubleshooting

| Error | Likely cause | Fix |
|-------|-------------|-----|
| `ENEEDAUTH` | Not logged in | `npm login` |
| `E403` | Scope is private or package name taken | Check `publishConfig.access` is `"public"`. Verify the name isn't already owned on npm. |
| `E404` | Package not found (install-side) | Double-check spelling. Run `npm view @fastaai/lenx-mcp` to verify it exists. |
| `EPUBLISHCONFLICT` | Version already published | Bump the version — `npm version patch` and try again. |
| `dist/` missing from tarball | `files` field misconfigured | Run `npm pack --dry-run` to check. Verify `files` in `package.json` includes `"dist/"`. |

### Unpublishing

You can unpublish within **72 hours** of publishing:

```sh
npm unpublish @fastaai/lenx-mcp@0.1.0
```

After 72 hours, deprecate instead:

```sh
npm deprecate @fastaai/lenx-mcp@0.1.0 "Critical bug — upgrade to 0.2.0"
```

### Verifying tarball contents

```sh
npm pack
tar --list -f fastaai-lenx-mcp-*.tgz
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

## 8. Quick Reference Cheatsheet

```sh
# ── Login & Auth ────────────────────────────────────────
npm whoami
npm login

# ── Verify ──────────────────────────────────────────────
npm test
npm run build
npm pack && tar --list -f fastaai-lenx-mcp-*.tgz

# ── Version bump (creates git tag automatically) ───────
npm version patch   # 0.0.1 → 0.0.2
npm version minor   # 0.0.1 → 0.1.0
npm version major   # 0.0.1 → 1.0.0
git push --follow-tags

# ── Publish ─────────────────────────────────────────────
npm publish --dry-run                      # preview only
npm publish                                # interactive OTP
npm publish --otp=123456                   # inline OTP
npm publish --tag beta                     # publish as beta (not latest)

# ── dist-tags ───────────────────────────────────────────
npm dist-tag ls @fastaai/lenx-mcp
npm dist-tag add @fastaai/lenx-mcp@0.2.0-beta.1 beta
npm dist-tag rm @fastaai/lenx-mcp beta

# ── npx usage (users) ───────────────────────────────────
npx @fastaai/lenx-mcp
npx @fastaai/lenx-mcp@0.1.0
npx @fastaai/lenx-mcp@latest

# ── Troubleshooting ─────────────────────────────────────
npm view @fastaai/lenx-mcp                  # check latest version
npm unpublish @fastaai/lenx-mcp@0.1.0       # only within 72h
npm deprecate @fastaai/lenx-mcp@0.1.0 msg   # after 72h
```
