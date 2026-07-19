# Launch Evidence

Status: Railway publication in progress

| Item | Result |
|---|---|
| Companion repository | Pending publication |
| Pinned server image | `sathvikrao/clipcascade:0.7.0` |
| Expected image digest | `sha256:0f7aadec03af6b22a157466ade3ed1730dfd3b390d2989e55c0180e1d12d736f` |
| Local image and persistence suite | Passed on 2026-07-19 |
| Railway validation project | Pending |
| Unpublished template deployment | Pending |
| Native macOS/Android test | Pending |
| Public marketplace listing | Pending |
| Clean marketplace deployment | Pending |

Only sanitized pass/fail results and public URLs belong in this document.

## Local Certification

The disposable verifier resolved the pinned multi-architecture image to the expected digest, started it with the exact template variables, rotated the default administrator password, rejected the old password, enforced the configured WebSocket origin, relayed text/image/file STOMP payloads, replaced the container, and repeated the suite against the same `/database` volume using the rotated password.
