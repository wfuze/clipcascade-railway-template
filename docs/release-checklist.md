# ClipCascade Railway Template Release Checklist

Never record the generated H2 password, rotated administrator password, session cookies, Railway tokens, or raw variable output in evidence.

## Repository Gate

- [ ] `npm ci` completes from the committed lockfile.
- [ ] `npx playwright install chromium` completes.
- [ ] `npm run test:image` passes twice against the same temporary database volume.
- [ ] The resolved `0.7.0` image digest matches `template-spec.json`.
- [ ] GitHub Actions passes on the release commit.

## Railway Draft Gate

- [ ] The publishing workspace displays `WFuze` and the listing states that it is community maintained.
- [ ] A clean deployment creates exactly one `ClipCascade` service.
- [ ] The source is `sathvikrao/clipcascade:0.7.0` with image auto-updates disabled.
- [ ] Public HTTP networking targets port `8080` and provides an HTTPS Railway domain.
- [ ] One volume is attached at `/database`.
- [ ] The healthcheck path is `/health` and the deployment becomes healthy.
- [ ] Every variable matches `template-spec.json`; the H2 secret is generated as two parts separated by one space.
- [ ] `CLIPCASCADE_BASE_URL=https://<domain> npm test` passes without printing secrets.
- [ ] Default login works, the password is changed immediately, the old password is rejected, and the new password works.
- [ ] A service restart and redeployment preserve the changed password and application state.

## Native Client Gate

- [ ] Install the official macOS ARM and Android clients for the current project release.
- [ ] Configure both with the Railway URL, rotated credentials, and identical encryption settings.
- [ ] Unicode text synchronizes in both directions.
- [ ] A PNG synchronizes and remains viewable/pasteable.
- [ ] A uniquely named file downloads and matches the source SHA-256 checksum.
- [ ] After at least 20 minutes, synchronization still works or automatically recovers.
- [ ] After a Railway restart, both clients reconnect and complete another text roundtrip.

## Marketplace Gate

- [ ] Publish in category `Other` with the README overview and upstream logo.
- [ ] Replace `RAILWAY_TEMPLATE_URL` in `README.md` with the issued public template URL.
- [ ] Railway marketplace search returns `ClipCascade`.
- [ ] Deploy the public listing into a second clean project.
- [ ] Repeat the graph, health, authentication, WebSocket, and persistence checks.
- [ ] Record sanitized results in `docs/launch-evidence.md`.
- [ ] Remove the disposable marketplace-acceptance project after evidence is captured.

