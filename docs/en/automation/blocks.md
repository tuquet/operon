# Block Coverage & Automa Parity

Operon executes workflows authored on the **Automa canvas**, so the workflow document is the
single source of truth. This page records exactly which Automa blocks the engine implements,
and what happens when a document uses one it does not.

## The rule: *declared ⇒ satisfied*

A canvas can author any block. If the engine silently skipped a block it does not implement,
the canvas would be **fake authoring** and a run would look successful while doing nothing.
So:

* a block the engine does not implement makes the workflow **fail** — at publish-time
  (`automation.validate_workflow_graph`), at resolve-time (`workflow.schema.json` + block
  coverage in the CLI) and at run-time (the engine's default branch);
* blocks that exist only to organise the canvas (`blocks-group`, `note`) are skipped
  **explicitly** — Automa gives them no runtime handler either.

## Implemented blocks

`active-tab` · `attribute-value` · `block-package` · `close-tab` · `conditions` · `contains` ·
`cookie` · `custom-data` · `delay` · `delete` · `element-exists` · `element-scroll` · `empty` ·
`eq` · `event-click` · `execute-workflow` · `export-data` · `forms` · `forward-page` ·
`get-all` · `get-text` · `go-back` · `google-sheets` · `gt` · `gte` · `hover-element` ·
`increase-variable` · `insert-data` · `javascript-code` · `loop-breakpoint` · `loop-data` ·
`loop-elements` · `lt` · `lte` · `ne` · `new-tab` · `numbers` · `press-key` · `reload-tab` ·
`repeat-task` · `set` · `take-screenshot` · `trigger` · `turnstile` · `variable` · `webhook` ·
`while-loop`

Canvas-only (no runtime behaviour, skipped): `blocks-group` · `note`

Not implemented (rejected loudly): `google-drive`, `ai-workflow`, `element-change`,
`create-element`, `delete-element`, `edit-element`, `sort-data`, `slice-variable`,
`workflow-state`, `handle-download`, `save-assets`, …

All five starter workflows Automa ships now pass schema **and** block coverage — see
`cli/fixtures/automa-export-*.json` and the `every_real_automa_export_is_runnable` test.

## Document shape

Both shapes are accepted:

| Shape | Produced by | Notes |
| --- | --- | --- |
| `drawflow.nodes` / `drawflow.edges` | the Automa canvas (export) | the canonical form; verbatim exports are regression-tested under `cli/fixtures/automa-export-*.json` |
| `nodes` / `edges` | OperonAPI/CLI authors | flat shorthand, same node objects |

Also honoured from the document root: `id`, `name`, `table` / `dataColumns`, `globalData` /
`global_data`, `settings` (`onError`, `blockDelay`, `restartTimes`, `saveLog`, `debugMode`),
`trigger`, `isDisabled`, `includedWorkflows`.

## `export-data`

Automa hands the bytes to the browser download API. Headless has no such surface, so the
artefact is written to disk and the **path is returned** as the block output:

* directory: `TQ_EXPORT_DIR`, default `~/.operon/automation/exports`
* `type`: `csv` (BOM when `addBOMHeader`, delimiter from `csvDelimiter`), `json` (pretty), `plain-text`
* `onConflict`: `uniquify` (default — appends `-1`, `-2`, …) or `overwrite`
* CSV header order follows the declared `table` columns first, then any extra keys
* `dataToExport`: `data-columns` (the workflow table), `variable`, or `google-sheets`
  (the rows collected under a `google-sheets` block's `refKey`)

## `execute-workflow`

Sub-workflows are resolved from `includedWorkflows` in the same document (that is how Automa
packs referenced workflows into an export). A run stores its results like Automa does:

```
\{\{workflow.<executeId|workflowId-subN>.variables.<name>\}\}
\{\{workflow.<key>.table\}\}
```

`insertAllVars` merges the sub-workflow's variables back into the parent. A sub-workflow that
executes its own parent, or nesting deeper than 10 levels, is refused.

## Data tables

`insert-data` writes values at a **per-column row cursor** (`WorkflowWorker.addDataToColumn`),
which is what makes several columns inserted by one block land in the same row. Values are
coerced by the declared column type exactly like Automa's `convertData`: `integer` keeps digits
only (`"ℹ301 extra"` -> `301`), `boolean` is JS truthiness, `string` stringifies, `any` and
unknown types (`number`, `json`, `date`) pass through untouched.

## `google-sheets`

Automa talks to Google with the browser extension's own identity. A headless worker has no
browser session, so Operonuses a **service account** stored in the Secret Store — the
credential never enters the workflow document, the job payload or the logs.

Setup (once):

1. Google Cloud -> enable **Google Sheets API** (and **Drive API** if you want to list files)
2. Create a service account, create a **JSON key**
3. **Share the spreadsheet with the service-account email** (`…@<project>.iam.gserviceaccount.com`) as **Editor**
   — without this every call answers `403 The caller does not have permission`
4. Store the key:

   ```bash
   opn secret set google_service_account @/path/key.json
   opn secret list                       # google_service_account -> ********
   grep -c private_key ~/.operon/system/secrets.json   # must be 0
   ```

Actions mirror Automa's `handlerGoogleSheets.js`, driven by the block's own `data`:

| `type` | Behaviour |
| --- | --- |
| `get` | reads the range into `\{\{googleSheets.<refKey>\}\}` |
| `getRange` | reads a range; `assignVariable` -> `variableName`, `saveData` -> `dataColumn` |
| `append` | appends the workflow data table as rows (`USER_ENTERED`, `INSERT_ROWS`) |
| `update` | overwrites the range with the workflow data table |
| `clear` | clears the range |
| `create` | creates a spreadsheet — **not usable with a plain service account** (Google gives SAs no Drive storage quota -> `403`); create the sheet yourself and share it |
| `add-sheet` | adds a tab to an existing spreadsheet |

Auth: an RS256 JWT (RFC 7523) is exchanged at `token_uri` for an access token, cached in memory
until ~1 minute before expiry. Google errors are mapped to the real cause (`403` -> share the
sheet, `404` -> wrong id/range, `400` -> bad A1 notation) instead of a raw payload.
