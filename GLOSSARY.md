# Glossary (SSOT)

Every spec, API, schema, and UI label in the Operon ecosystem must use these standard domain terms ([ADR-0003](./adr/0003-tenant-term.md)).

| Term | Definition |
| --- | --- |
| **`tenant`** | Primary isolation boundary for accounts, data, and resources. |
| **`kernel`** | Host runtime bridge exposing shared reactive context (`tenant`, session) to micro-apps. |
| **`host shell`** | Top-level application frame hosting navigation, slots, and micro-apps. |
| **`micro-app`** | Independently developed feature module consuming host capabilities via `kernel`. |
| **`daemon`** | Local background service managing device-local execution and resources. |
| **`browser profile`** | Saved antidetect browser configuration (fingerprint, proxy, extensions, data directory). |
| **`browser session`** | Live running browser process bound to a profile. |

> Exception: `workspace` is reserved strictly for build tooling (package managers, Cargo) and third-party product names.
