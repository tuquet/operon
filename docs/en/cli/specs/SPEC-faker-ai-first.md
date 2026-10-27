# SPEC-faker-ai-first: AI-First Architecture & Expanded Commands for Faker

## 1. Objective
Transform `opn faker` from a human-first visual tool into an **AI-First synthetic identity runtime**. In the autonomous agent era, CLI tools are primarily consumed by LLMs, MCP sidecars, scripts, and automation pipelines. 

### Core Goals:
1. **JSON by Default**: All generation and query outputs default to pure, parseable JSON on stdout.
2. **Visual Presentation as Opt-in Flags**: `--card` (`-c`) and `--table` (`-t`) are flags for human interactive terminals rather than forcing ANSI escape codes onto machines.
3. **Direct Root Invocation**: `opn faker [OPTIONS]` directly generates personas without requiring the redundant `generate` subcommand.
4. **Expanded Command Catalog**: Expose latent provider capabilities currently hidden in `faker/src/`:
   - `opn faker nationalities` (aliases: `nats`, `locales`): Introspect supported countries, ID formats, and schemas.
   - `opn faker id` (aliases: `ssn`, `cccd`, `national-id`): Generate isolated, mathematically valid national IDs with checksums.
   - `opn faker config`: Retain full dual-syntax SSOT config inspector integration.
5. **Consistent Output Schema**: Always output `{"results": [...]}` in JSON mode across any count (`-n 1`, `-n 5`, etc.) to ensure deterministic parsing for LLMs and consumers.
6. **Backward Compatibility**: Existing scripts running `opn faker generate` or `opn faker card` continue to work without breaking changes.

---

## 2. Assumptions & Clarifications
1. **Machine-First stdout**: When running `opn faker`, stdout must be clean JSON suitable for piping (`opn faker | jq .name`). Diagnostic logs and status messages must not pollute stdout.
2. **Pretty vs Compact JSON**: If stdout is a TTY and no visual flag is passed, formatted (pretty) JSON is emitted. If stdout is piped or redirected, pretty JSON is also standard (or `--compact` flag can be supported).
3. **Consistent Array Schema**: Regardless of whether count `-n` is 1 or greater, JSON outputs matching RandomUser standard `{"results": [...]}` for schema consistency.
4. **SSOT Nationality**: Nationality defaults to `"US"` unless overridden by `--nat` or `~/.operon/faker/faker.json`.

---

## 3. Command Specifications

### 3.1 Direct Root & `generate` Invocation
```bash
# AI Agent / Default: outputs JSON directly
opn faker
opn faker -n 5
opn faker --nat VN --gender female

# Backward compatible subcommand:
opn faker generate -n 2

# Human visualization flags:
opn faker --card                    # Rich visual identity card
opn faker --table -n 10             # Rounded ANSI tabular overview
opn faker --csv -o users.csv        # RFC-compliant CSV export
opn faker -f card                   # Equivalent to --card
opn faker -f table                  # Equivalent to --table
```

### 3.2 `opn faker nationalities` (Introspection Catalog)
Enables AI agents and human users to discover supported national providers and schemas:
```bash
opn faker nationalities
opn faker nats --table
```

### 3.3 `opn faker id` (Isolated National ID Generator)
Fast generation of mathematically valid national IDs for form autofill, KYC testing, and AI workflows:
```bash
opn faker id                    # Defaults to configured default_nat (US SSN)
opn faker id --nat VN           # Generates Vietnamese CCCD
opn faker id --nat JP           # Generates Japanese My Number with checksum
opn faker id --raw              # Emits only the ID string (e.g. 038202019482)
```

### 3.4 `opn faker config` (Unified SSOT Inspector)
Retains full functionality created in the previous task:
```bash
opn faker config                # Options inspector table
opn faker config default_nat US # Typed set
opn faker config --edit         # Launch editor with $schema
```

---

## 4. Boundaries & Guardrails
- **Always do**: Default to clean JSON on standard stdout; keep exit codes standard; preserve backward compatibility.
- **Never do**: Print ANSI escape codes inside JSON output.

---

## 5. Success Criteria
1. `opn faker` outputs clean, valid JSON parseable by `jq` with no flags required.
2. `opn faker --card` displays the human-friendly single identity card.
3. `opn faker --table -n 5` displays the 5-row ANSI table.
4. `opn faker nationalities` returns the list of all supported countries and ID schemas in JSON.
5. `opn faker id --nat US --raw` outputs a valid US SSN string directly.
6. `opn faker -h` displays the full, comprehensive suite of commands and AI-first options.
7. All workspace tests (170+) pass cleanly.
