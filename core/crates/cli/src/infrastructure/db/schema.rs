use rusqlite::{Connection, Result};

pub fn init_db(conn: &Connection) -> Result<()> {
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;

    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            data TEXT NOT NULL, -- JSON
            options TEXT, -- JSON
            status TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id TEXT NOT NULL,
            type TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
        );
        
        CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
        CREATE INDEX IF NOT EXISTS idx_logs_job_id ON logs(job_id);

        CREATE TABLE IF NOT EXISTS browsers (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL DEFAULT 'local-default',
            name TEXT NOT NULL,
            group_name TEXT DEFAULT 'default',
            tags TEXT DEFAULT '[]',
            user_agent TEXT,
            timezone TEXT,
            proxy TEXT,
            browser_type TEXT DEFAULT 'Chromium',
            extensions TEXT DEFAULT '["automation"]',
            fingerprint_config TEXT DEFAULT '{}',
            startup_flags TEXT DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS system_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        "#,
    )?;

    // Rip-and-replace: the legacy Automa-style storage layer is removed — credentials live in the
    // encrypted Secret Store (SPEC-secret-store), variables/secrets in Cloud, data tables in Cloud PostgREST.
    let _ = conn.execute("DROP TABLE IF EXISTS storage_credentials", []);
    let _ = conn.execute("DROP TABLE IF EXISTS storage_table_rows", []);
    let _ = conn.execute("DROP TABLE IF EXISTS storage_tables", []);
    let _ = conn.execute("DROP TABLE IF EXISTS storage_variables", []);
    let _ = conn.execute("DROP TABLE IF EXISTS workflows", []);

    // Safe & Idempotent Schema Migration (Edge Case 6.1):
    // Ensure all canonical columns exist on 'browsers' table for pre-existing databases
    let mut stmt = conn.prepare("PRAGMA table_info(browsers)")?;
    let columns = stmt
        .query_map([], |row| row.get::<_, String>(1))?
        .filter_map(Result::ok)
        .collect::<Vec<String>>();

    // Canonicalize pre-existing workspace_id column to tenant_id without losing rows
    let has_workspace_col = columns.iter().any(|c| c == "workspace_id");
    let has_tenant_col = columns.iter().any(|c| c == "tenant_id");
    if has_workspace_col && !has_tenant_col {
        let _ = conn.execute("DROP INDEX IF EXISTS idx_browsers_workspace", []);
        conn.execute(
            "ALTER TABLE browsers RENAME COLUMN workspace_id TO tenant_id",
            [],
        )?;
    }

    let mut stmt_after = conn.prepare("PRAGMA table_info(browsers)")?;
    let current_cols = stmt_after
        .query_map([], |row| row.get::<_, String>(1))?
        .filter_map(Result::ok)
        .collect::<Vec<String>>();

    let browser_migrations = [
        (
            "tenant_id",
            "ALTER TABLE browsers ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'local-default'",
        ),
        (
            "group_name",
            "ALTER TABLE browsers ADD COLUMN group_name TEXT DEFAULT 'default'",
        ),
        (
            "tags",
            "ALTER TABLE browsers ADD COLUMN tags TEXT DEFAULT '[]'",
        ),
        (
            "extensions",
            "ALTER TABLE browsers ADD COLUMN extensions TEXT DEFAULT '[\"automation\"]'",
        ),
        (
            "fingerprint_config",
            "ALTER TABLE browsers ADD COLUMN fingerprint_config TEXT DEFAULT '{}'",
        ),
        (
            "startup_flags",
            "ALTER TABLE browsers ADD COLUMN startup_flags TEXT DEFAULT '[]'",
        ),
    ];

    for (col, ddl) in browser_migrations {
        if !current_cols.iter().any(|c| c == col) {
            conn.execute(ddl, [])?;
        }
    }

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_browsers_tenant ON browsers(tenant_id)",
        [],
    )?;

    Ok(())
}
