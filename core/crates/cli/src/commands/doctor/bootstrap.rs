use serde_json::json;
use std::path::Path;

use crate::config::canonical_ssot_dir;
use crate::core::network::find_executable;
use crate::ui::{Card, badge_online, colors};

pub async fn bootstrap(force_browser: bool) -> Result<(), Box<dyn std::error::Error>> {
    println!();
    println!(
        "  {BOLD}{CYAN}TQ BOOTSTRAP{RESET} {MUTED}— Ecosystem Environment & Microservice Provisioning{RESET}",
        BOLD = colors::BOLD,
        CYAN = colors::CYAN,
        RESET = colors::RESET,
        MUTED = colors::MUTED,
    );
    println!();

    let root = canonical_ssot_dir();

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. Create Canonical SSOT Pillar Directories (~/.operon/)
    // ─────────────────────────────────────────────────────────────────────────────
    let dirs = [
        root.join("bin"),
        root.join(crate::constants::DIR_DATA),
        root.join(crate::constants::PILLAR_SYSTEM),
        root.join(crate::constants::PILLAR_AUTOMATION),
        root.join(crate::constants::PILLAR_BROWSER)
            .join(crate::constants::DIR_PROFILES),
        root.join(crate::constants::PILLAR_BROWSER)
            .join(crate::constants::DIR_RUNTIMES),
        root.join(crate::constants::PILLAR_BROWSER)
            .join(crate::constants::DIR_EXTENSIONS),
        root.join(crate::constants::PILLAR_GATEWAY).join("bin"),
        root.join(crate::constants::PILLAR_GATEWAY)
            .join(crate::constants::DIR_PIDS),
    ];

    for d in &dirs {
        std::fs::create_dir_all(d)?;
    }
    println!(
        "  {GREEN}✓{RESET} Initialized 5 canonical storage pillars under {}",
        root.display(),
        GREEN = colors::GREEN,
        RESET = colors::RESET,
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. Initialize Automation SQLite Database
    // ─────────────────────────────────────────────────────────────────────────────
    let data_dir = root.join(crate::constants::DIR_DATA);
    let _ = std::fs::create_dir_all(&data_dir);
    let db_path = data_dir.join(crate::constants::FILE_OPERON_SQLITE);
    let legacy_db_path = root
        .join(crate::constants::PILLAR_AUTOMATION)
        .join(crate::constants::FILE_LEGACY_AUTOMATION_SQLITE);
    if !db_path.exists() && legacy_db_path.exists() {
        let _ = std::fs::copy(&legacy_db_path, &db_path);
    }
    match crate::infrastructure::db::AutomationDb::new(&db_path) {
        Ok(_) => {
            println!(
                "  {GREEN}✓{RESET} SQLite database initialized: {}",
                db_path.display(),
                GREEN = colors::GREEN,
                RESET = colors::RESET,
            );
        }
        Err(e) => {
            println!(
                "  {AMBER}⚠{RESET} SQLite database notice: {}",
                e,
                AMBER = colors::AMBER,
                RESET = colors::RESET,
            );
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. Auto-register MCP Server for AI Agent IDEs (Antigravity / Gemini)
    // ─────────────────────────────────────────────────────────────────────────────
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".to_string());
    let gemini_config_dir = Path::new(&home).join(".gemini").join("config");
    let mcp_config_file = gemini_config_dir.join("mcp_config.json");

    if let Err(e) = std::fs::create_dir_all(&gemini_config_dir) {
        println!(
            "  {AMBER}⚠{RESET} Could not create ~/.gemini/config directory: {}",
            e,
            AMBER = colors::AMBER,
            RESET = colors::RESET,
        );
    } else {
        let mut config_val: serde_json::Value = if mcp_config_file.exists() {
            match std::fs::read_to_string(&mcp_config_file) {
                Ok(content) => {
                    serde_json::from_str(&content).unwrap_or_else(|_| json!({ "mcpServers": {} }))
                }
                Err(_) => json!({ "mcpServers": {} }),
            }
        } else {
            json!({ "mcpServers": {} })
        };

        if config_val.get("mcpServers").is_none() {
            config_val["mcpServers"] = json!({});
        }

        let cmd = if find_executable("opn").is_some() {
            "opn".to_string()
        } else {
            std::env::current_exe()
                .map(|p| p.display().to_string())
                .unwrap_or_else(|_| "opn".to_string())
        };

        let mcp_def = json!({
            "command": cmd,
            "args": ["mcp"]
        });

        // Register opn MCP server and remove legacy opn if present
        config_val["mcpServers"]["operon"] = mcp_def;
        if let Some(servers) = config_val
            .get_mut("mcpServers")
            .and_then(|v| v.as_object_mut())
        {
            servers.remove("operon");
        }

        if let Ok(pretty) = serde_json::to_string_pretty(&config_val) {
            if std::fs::write(&mcp_config_file, pretty).is_ok() {
                println!(
                    "  {GREEN}✓{RESET} Registered native opn MCP stdio server in ~/.gemini/config/mcp_config.json",
                    GREEN = colors::GREEN,
                    RESET = colors::RESET,
                );
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. Provision Antidetect Chromium (Golden LTS v148)
    // ─────────────────────────────────────────────────────────────────────────────
    let browser_status = crate::core::browser::resolver::get_runtime_status();
    if !browser_status.installed || force_browser {
        println!(
            "  {CYAN}↓{RESET} Downloading & provisioning Antidetect Chromium (Golden LTS v148)...",
            CYAN = colors::CYAN,
            RESET = colors::RESET,
        );
        match crate::core::browser::resolver::download_stealth_runtime(force_browser, Some("148"))
            .await
        {
            Ok(p) => {
                println!(
                    "  {GREEN}✓{RESET} Installed Antidetect Chromium: {}",
                    p,
                    GREEN = colors::GREEN,
                    RESET = colors::RESET,
                );
            }
            Err(e) => {
                println!(
                    "  {AMBER}⚠{RESET} Browser download deferred: {}",
                    e,
                    AMBER = colors::AMBER,
                    RESET = colors::RESET,
                );
            }
        }
    } else {
        println!(
            "  {GREEN}✓{RESET} Antidetect Chromium already provisioned: v{}",
            crate::core::browser::resolver::get_active_version(),
            GREEN = colors::GREEN,
            RESET = colors::RESET,
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 5. Summary Card
    // ─────────────────────────────────────────────────────────────────────────────
    println!();
    let mut card = Card::new("BOOTSTRAP COMPLETED");
    card.with_badge(badge_online("READY"));
    card.with_min_width(68);
    card.add_kv("SSOT Root", root.display().to_string());
    card.add_kv("SQLite Database", "operon.sqlite (Schema initialized)");
    card.add_kv(
        "MCP Agent Protocol",
        "opn stdio server registered (~/.gemini/config/mcp_config.json)",
    );
    let b_status = crate::core::browser::resolver::get_runtime_status();
    card.add_kv(
        "Browser Engine",
        if b_status.installed {
            "Golden LTS v148 (Antidetect Chromium)"
        } else {
            "Pending download (opn browser install)"
        },
    );
    card.with_footer(
        "Next: Run 'opn doctor' to inspect dependencies or 'opn status' for dashboard.",
    );
    card.print();
    println!();

    Ok(())
}
