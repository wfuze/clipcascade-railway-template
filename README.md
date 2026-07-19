# Deploy and Host ClipCascade with Railway

> [!CAUTION]
> Open the generated domain and immediately change the default `admin` / `admin123` credentials using **Change Password**.

[![Deploy on Railway](https://railway.com/button.svg)](RAILWAY_TEMPLATE_URL)

[ClipCascade](https://github.com/Sathvik-Rao/ClipCascade) automatically synchronises text, images, and files between Windows, macOS, Linux, and Android devices. It supports authentication, multiple users, client-side end-to-end encryption, a web dashboard, and self-hosting.

This repository maintains the community Railway template, validation suite, and launch evidence. Railway deploys the official upstream image directly; this repository is not an application fork or wrapper image.

## About Hosting ClipCascade

The template deploys one public Docker service backed by ClipCascade's embedded encrypted H2 database. Railway supplies HTTPS, a generated domain, health-gated deployments, and a persistent volume. No PostgreSQL, Redis, custom build, or additional service is required.

| Setting | Value |
|---|---|
| Docker image | `sathvikrao/clipcascade:0.7.0` |
| Public target port | `8080` |
| Healthcheck | `/health` |
| Persistent volume | `/database` |
| Database | Embedded encrypted H2 |
| Default mode | Peer-to-server (`CC_P2P_ENABLED=false`) |
| Public signup | Disabled |

The overall ClipCascade project release and the server image use different version numbers. This template pins server image `0.7.0`, which is the version used by the upstream Docker Compose file.

## First Deployment

1. Deploy the template and wait for the `ClipCascade` service to become healthy.
2. Open the generated `*.up.railway.app` domain.
3. Sign in with `admin` / `admin123`.
4. Select **Change Password** immediately and use a unique password.
5. Install ClipCascade clients from the [official releases](https://github.com/Sathvik-Rao/ClipCascade/releases).
6. Configure every client with the Railway HTTPS domain, the same account, and matching end-to-end encryption settings.

End-to-end encryption is performed by the clients. The generated `CC_SERVER_DB_PASSWORD` separately encrypts the embedded H2 database and must remain unchanged for the lifetime of the `/database` volume.

### Custom Domains

`CC_ALLOWED_ORIGINS` initially allows the generated Railway domain. If you add a custom domain, replace the variable with its exact origin, including `https://`, and redeploy. ClipCascade accepts one configured WebSocket origin; a comma-separated list is not supported by the current server.

## Common Use Cases

- Keep text snippets synchronized across personal computers and Android devices.
- Transfer screenshots and small files without routing clipboard content through a hosted SaaS account.
- Provide isolated clipboard sync accounts for a small team.
- Run a private clipboard service alongside an existing Railway stack.

## Dependencies for ClipCascade Hosting

- Official [`sathvikrao/clipcascade`](https://hub.docker.com/r/sathvikrao/clipcascade) image.
- One Railway persistent volume mounted at `/database`.
- Official ClipCascade client applications for operating-system clipboard integration.

## Verification

The automated suite starts the exact upstream image with the template configuration and verifies:

- Image tag/digest integrity.
- Health, login, signup-disabled behavior, configured mode, and message-size endpoints.
- Immediate administrator password rotation and rejection of the old password.
- Accepted and rejected WebSocket origins.
- STOMP relay of text, image, and file payloads between two authenticated sessions.
- Database and changed credentials surviving a container replacement on the same volume.

Run it locally with Docker and Node.js 22:

```bash
npm ci
npx playwright install chromium
npm run test:image
```

Live Railway and native-client certification steps are documented in [docs/release-checklist.md](docs/release-checklist.md).

## Maintenance and Support

Updates are deliberately pinned. A new server image is adopted only after the digest record, automated suite, live Railway deployment, and native-client checks all pass. Existing Railway projects do not update automatically.

This is a community-maintained template published by WFuze. It is not an official ClipCascade integration and does not imply affiliation with its maintainer. For ClipCascade application issues, use the [upstream issue tracker](https://github.com/Sathvik-Rao/ClipCascade/issues). For template-specific issues, use this repository.

ClipCascade and its logo are the property of their respective owner and are used here for identification and attribution.

