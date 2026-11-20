---
id: SPEC-002
title: Auth, Session & Permission Boundary
status: draft
created: 2026-11-20
updated: 2026-11-20
depends_on: [SPEC-001]
---

# SPEC-002: Auth, Session & Permission Boundary

## Goal
Define how user identity, JWTs, cloud RLS, and local daemon auth work together, including offline mode.

## Rules (Draft)
- **Host UI ↔ Auth Provider:** Host obtains and refreshes user JWTs; `useKernel()` exposes current user/session state.
- **Host UI ↔ Local Daemon:** Host passes the active session/token to the local daemon (`:8765`) for authenticated local operations.
- **Cloud RLS:** All cloud Postgres tables enforce `tenant_id` membership via RLS using the verified JWT.
- **Offline Mode:** Local daemon caches the last valid session/tenant binding so local execution continues when offline, and re-validates on reconnect.
