# Glossary

Every spec, API, schema, and UI label in the Operon project must use these standard domain terms ([`GLOSSARY.json`](../GLOSSARY.json)).

| Term | Definition | Forbidden Aliases |
| :--- | :--- | :--- |
| **`workspace`** | Primary isolation boundary for accounts, data, and resources. | `tenant` |
| **`kernel`** | Host runtime bridge exposing shared reactive context (`workspace`, session, daemon API) to micro-apps. | — |
| **`host shell`** | Top-level application frame hosting navigation, layouts, and micro-app modules. | — |
| **`micro-app`** | Independently developed feature module consuming host capabilities via `kernel`. | — |
| **`daemon`** | Device-local background service (`opn`, `:8765`) managing local execution, SQLite state, browser sessions, and schedules. | `local-bridge`, `Fleet Bridge`, `Desktop Bridge`, `fleet`, `Sandbox Fleet` |
| **`browser profile`** | Saved antidetect browser configuration (fingerprint, proxy, extensions, data directory, `local` or `cloud` source). | `cloud fleet`, `fleet profiles` |
| **`browser session`** | Live running browser process bound to a `browser profile`. | — |
| **`browser driver`** | Versioned Chromium engine binary (`fingerprint-chromium`) installed in Driver Store and used to run a `browser session`. | — |
| **`device`** | Enrolled host machine running an `operon` `daemon` paired with Cloud. | `device fleet`, `worker fleet`, `cloud fleet` |
| **`task`** | Executable automation unit assigned to a `browser profile` and backed by SQLite. | — |
| **`schedule`** | Trigger plan defining when a `browser profile` runs assigned `task`s. | — |

> Build tooling (`pnpm workspace`, `Cargo workspace`) uses `workspace`; domain scoping also uses `workspace` uniformly across schemas, APIs, and UI.
