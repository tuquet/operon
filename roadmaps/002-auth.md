---
id: ROADMAP-002
title: Auth, Session & Permission Boundary
status: draft
created: 2026-11-20
updated: 2026-11-20
depends_on: [ROADMAP-001]
---

# ROADMAP-002: Auth, Session & Permission Boundary

Execution sequence for user identity, JWT validation, RLS, and offline session caching between the host UI, auth provider, and local daemon.

## Phases

1. **Phase 1 — Session & JWT Contract:**
   - Define how `console` obtains/refreshes user JWTs and passes them to `opn daemon (:8765)`.
2. **Phase 2 — RLS & Offline Boundary:**
   - Enforce Supabase RLS membership checks and define cached-session behavior when offline.
