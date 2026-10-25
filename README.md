# Hendy Tools Platform & App Downloader

Hendy Tools is a React 19 + Vite single-page app. The primary production target is a Cloudflare Worker that serves both the compiled frontend and the edge API.

## Primary application URL

**https://hendy-tool-releas.ngogiaidy56.workers.dev/**

Useful checks after successful deployment:

- UI: `/`
- Health: `/healthz`
- API metadata: `/api/v1/meta`
- Release catalog: `/api/v1/releases`
- Update check: `/api/v1/update-check?platform=windows&clientBuild=0`
- Release manifest: `/api/v1/public/manifest.json`
- Domain overview: `/api/v1/domains`
- Edge telemetry: `/api/v1/telemetry`

## GitHub Actions deployment to Cloudflare Workers & Pages

The GitHub Actions workflow `.github/workflows/deploy-cloudflare.yml` is the production deployment path. It validates the source, builds both independent HTML applications, creates missing Cloudflare resources, provisions Access login, pushes runtime secrets to the Worker, deploys the storefront-only Pages build, and runs live smoke tests.

### One-time GitHub configuration

In **GitHub → Settings → Secrets and variables → Actions**, add:

| Name | Type | Purpose |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Secret | Scoped API token used by Wrangler and the provisioner |
| `CLOUDFLARE_ACCOUNT_ID` | Variable or Secret | 32-character Cloudflare Account ID |
| `CF_ACCESS_ADMIN_EMAILS` | Variable or Secret | Real admin email addresses, comma-separated |
| `RELEASE_PUBLISH_TOKEN` | Optional Secret | Stable CI publishing token; automatically generated if omitted |

The Cloudflare API token needs access to **Workers Scripts**, **R2 Storage**, **Pages**, **Access Applications/Policies**, and **Access Organizations/Identity Providers/Groups**. Use least-privilege permissions appropriate for creating/updating these resources. Do not paste API tokens into chat, commit them to Git, or expose them as Vite `VITE_*` variables.

### What deployment provisions

On each matching push to `main` (or manual **Run workflow**), the deployment workflow:

1. Installs dependencies and runs TypeScript checks, Worker/Access tests, Pages gateway tests, Vite production build and build-artifact assertions.
2. Creates R2 bucket `hendy-tool-releases` and Pages project `hendy-tool-releas` if absent. Existing Pages production/preview environment variables are merged rather than replaced.
3. Creates/reuses a Cloudflare Zero Trust organization and an email one-time-PIN identity provider. It creates or updates Access applications for `/admin*`, `/studio*`, `/admin.html` and `/api/v1/admin/*`, with policies restricted to `CF_ACCESS_ADMIN_EMAILS`.
4. Bootstraps Worker assets, provisions runtime identity, generates a temporary secrets file **outside the repository**, and deploys the final Worker. Cloudflare secret values are masked and never printed into logs.
5. Deploys only `dist/index.html` and public assets to Pages; `dist/admin.html` is removed before the Pages upload. Pages public API paths proxy to the primary Worker. Admin API paths at the separate Pages origin are explicitly denied.
6. Runs post-deploy smoke tests against the Worker health/readiness endpoints and Pages proxy. The workflow fails if the required runtime bindings are missing or the Admin route remains in setup-error state.

Non-secret runtime variables such as `ENVIRONMENT`, `APP_NAME`, `PUBLIC_BASE_URL` and Pages `BACKEND_ORIGIN` are declared in Wrangler/Pages configuration and reconciled by the provisioning script. Required Worker secret names are declared in `wrangler.toml`. The Access issuer, application audience tags and allow-list are linked into the Worker at deploy time. The CI publisher token is separate from interactive Admin login; the Admin API can authenticate through Access even when no repository publisher token exists.

**Use a single deployment controller.** If this Worker is already connected to Cloudflare **Workers Builds → Git integration**, disable its automatic production deploy after enabling the GitHub Actions workflow. Running both pipelines against the same Worker can cause deploy races and mismatched runtime secrets. The GitHub Actions workflow is now intended to own production deploys.

Useful links:

- [GitHub deployment workflow](.github/workflows/deploy-cloudflare.yml)
- [Verify workflow](.github/workflows/verify-store-admin.yml)
- [Build and publish web release](.github/workflows/build-and-publish-release.yml)
- [Cloudflare Workers CI/CD documentation](https://developers.cloudflare.com/workers/ci-cd/)
- [Cloudflare Access application paths](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/)
- [Cloudflare Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)

## Repository deployment files

- `src/worker.ts`: Worker request router for the frontend, health checks, API metadata, release listing, update checks, manifests and R2 artifact delivery.
- `wrangler.toml`: **canonical production Worker configuration** for the GitHub Actions deployment. This is the file used by `npm run deploy:worker`; Worker assets are read from `.worker-dist/`.
- `scripts/prepare-worker-assets.mjs`: prepares `.worker-dist/` from `dist/` and removes only the Pages `_redirects` catch-all rewrite, which Cloudflare Workers rejects as a redirect loop. The original `dist/` remains unchanged for Pages deployment.
- `wrangler.worker.toml`: compatibility copy of the Worker config for older manual commands. It also points to `.worker-dist/`; prefer the root `wrangler.toml` for Workers Builds.
- `wrangler.pages.toml`: reference settings for the optional separate Pages project. Pages project runtime variables should be set in that project's Dashboard when using Direct Upload.
- `functions/api/[[path]].ts`: optional Pages Functions API gateway. Set `BACKEND_ORIGIN=https://hendy-tool-releas.ngogiaidy56.workers.dev` in the Pages project's production environment if API paths should proxy to the Worker.
- `server.ts`: optional Express server for Node/Render. Cloudflare Workers does not run this file.
- `.github/workflows/deploy-cloudflare.yml`: GitHub Actions source of truth for runtime provisioning, Worker + Pages deployment and post-deploy smoke tests. It keeps Admin HTML on the Worker and the Pages deployment storefront-only.
- `scripts/provision-cloudflare-resources.mjs`: idempotently creates R2/Pages resources and links runtime variables without overwriting unrelated existing settings.
- `scripts/provision-cloudflare-access.mjs`: creates/reuses the Zero Trust organization, email OTP provider, path-specific Access applications and a temporary Worker secrets file. Values are never committed or printed.
- `scripts/smoke-test-cloudflare.mjs`: verifies live Worker readiness, R2 binding, Admin setup status and Pages proxy behavior after deploy.
- `wrangler.bootstrap.toml`: temporary first-deploy configuration without required-secret assertions. Normal production deployments use `wrangler.toml`, which declares required Access secrets.

## Local validation / manual deployment

Requires Node.js 22+. The `public/_redirects` rule is retained in `dist/` for Pages. Worker deployment creates a separate `.worker-dist/` without that Pages-only file, while Wrangler's `not_found_handling = "single-page-application"` provides Worker-side SPA fallback.

```bash
npm install
npm run lint
npm test
npm run build

# Deploy the primary Worker + UI + API:
npm run deploy:worker

# Check a previously configured Worker + Pages deployment:
npm run smoke:cloudflare
```

For local manual Worker deployment, authenticate with `npx wrangler@4 login` and run the resource/Access provisioning scripts before using the production `wrangler.toml`; required Access secrets must be present. Never commit generated `.runtime` or secrets files.

## Two separate interfaces and packaging/publishing

- **Storefront (public):** `/` lists only artifacts returned by the public R2 release catalog. It uses `index.html`, `src/main.tsx`, `src/App.tsx`, and `src/store.css`.
- **Admin / Developer Console (private):** `/admin` is a separately compiled application using `admin.html`, `src/admin-main.tsx`, `src/interface/admin/StudioWorkspace.tsx`, and `src/admin.css`. It has its own HTML entrypoint, React root, styling bundle and browser navigation; it does not switch views inside the storefront SPA.
- The Worker serves the dedicated Admin document only after validating a signed Cloudflare Access JWT. The GitHub provisioner creates the Access organization and path policies for the configured email allow-list; missing credentials still fail closed. Four application audience values are accepted and checked after signature/issuer/expiry verification. The Admin status API and admin manifest are also guarded.
- The console provides source ZIP import, SemVer metadata, browser ZIP packaging, SHA-256 calculation, artifact upload, release history, storefront branding/content controls and configuration status. It shows whether secrets are configured, never their values.
- Studio packaging produces a **source bundle ZIP**, `release-manifest.json`, and `checksums.sha256`; GitHub Actions can also build and package the actual web application into a distribution ZIP. Neither path pretends to compile native EXE/APK/IPA files or create code signatures. Native packages must be built and signed on an appropriate platform runner, then uploaded as artifacts.
- `RELEASE_PUBLISH_TOKEN` is a server-side Cloudflare Worker secret and is never sent to the browser. The deployment workflow generates it if the optional GitHub secret is absent. When manually publishing a web release, the publish workflow also synchronizes the chosen token to the Worker before making the API request.
- The GitHub runtime provisioner automatically generates/links `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD` (one audience per protected path) and `CF_ACCESS_ADMIN_EMAILS`, and uploads them as Worker secrets. The Access policy is restricted to the real emails supplied in GitHub Actions configuration. The Worker verifies the signed JWT issuer, one of the provisioned audiences, expiry, signature and email allow-list. Missing runtime configuration returns `503`, missing credentials return `401`, and an authenticated but unauthorized email returns `403`. See [Cloudflare JWT validation docs](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/).
- The direct upload endpoint currently accepts files up to 25 MB; larger binaries need a presigned/multipart upload service. Do not place `RELEASE_PUBLISH_TOKEN` in the repository, frontend bundle, or browser storage.

## Build and publish a real web release

Open GitHub Actions → **Build and publish Hendy web release** (`.github/workflows/build-and-publish-release.yml`) and enter a SemVer version and release notes. The workflow builds the production web app, packages actual `dist/` files into a ZIP with per-file SHA-256 manifest, and uploads the ZIP as an Actions artifact. Enable `publish_to_store` to upload it to the Worker API. Before publishing it generates a temporary token if necessary and synchronizes it to the Worker Secret via Wrangler; the token is never embedded in the UI. The direct upload API limit is 25 MB.

Interactive admins authenticate through the path-specific Cloudflare Access applications created by GitHub Actions. The provisioner configures the email one-time-PIN login method and a strict allow-list. The Worker re-verifies the JWT issuer, path-specific audience, expiry, signature and email allow-list, so access never depends on a client-side route check. CI publishes server-to-server through a separately scoped publisher secret; neither UI receives it.

## Release artifacts

The API intentionally reports release packages as unavailable until the real binary exists in R2. This repository does not contain proven signed production Windows installers or Android APKs. Upload a real artifact to the configured object key before advertising it as downloadable:

- `windows/3.2.0/HendyToolsPro-3.2.0-Setup.exe`
- `android/3.2.0/HendyToolsMobile-3.2.0.apk`

The manifest reports a checksum as verified only when a valid 64-character SHA-256 value is present in the object's R2 custom metadata under `sha256`. Build, sign, calculate the checksum, and upload the actual packages before release.
