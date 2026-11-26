---
id: AUTH-001
title: Auth, Session & Permission Boundary
status: draft
created: 2026-11-20
updated: 2026-11-20
depends_on: [KERNEL-001]
---

# AUTH-001: Auth, Session & Permission Boundary

## Goal
Define how user identity, JWTs, cloud RLS, and local daemon auth work together, including offline mode.

## Rules (Draft)
- **Host UI ↔ Auth Provider:** Host obtains and refreshes user JWTs; `useKernel()` exposes current user/session state.
- **Host UI ↔ Local Daemon:** Host passes the active session/token to the local daemon (`:8765`) for authenticated local operations.
- **Cloud RLS:** All cloud Postgres tables enforce `workspace_id` membership via RLS using the verified JWT.
- **Offline Mode:** Local daemon caches the last valid session/workspace binding so local execution continues when offline, and re-validates on reconnect.
