# PostWhale

PostWhale is a native macOS API client for Triple Whale services. It auto-discovers services from your repos, loads OpenAPI specs, and lets you test endpoints across LOCAL, STAGING, and PRODUCTION.

## What it does

- Discovers services/endpoints from your local repositories
- Builds requests from OpenAPI definitions
- Switches environments in one click (LOCAL/STAGING/PRODUCTION)
- Supports global auth/headers across requests
- Lets you save and reuse requests per endpoint

## Install (macOS)

1. Open [GitHub Releases](https://github.com/billythewhale/postwhale/releases).
2. Pick the tag/version you want (example: `v1.2.0`).
3. If that release has app assets, download one:
   - Apple Silicon (M1/M2/M3/M4): `PostWhale-darwin-arm64.zip`
   - Intel Mac: `PostWhale-darwin-x64.zip`
4. If that release only has source-code ZIPs, build locally:
   ```bash
   npm install
   npm run build
   ```
5. Move `PostWhale.app` to `/Applications` (from the downloaded ZIP or `electron/out/...` after building).
6. First launch only: right-click `PostWhale.app` → **Open** → **Open**.

## Quick start

1. Launch PostWhale.
2. Click **Add Repository** and choose a local repo path.
3. Select a service and endpoint from the sidebar.
4. Choose an environment (LOCAL, STAGING, or PRODUCTION).
5. Configure the request and click **Send**.

## Questions

Hit me up on Slack: **@Billy D**
