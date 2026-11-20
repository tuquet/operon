fn main() {
    #[cfg(windows)]
    {
        // Don't compile Windows resource if explicitly skipped (e.g. when embedded in Tauri)
        // or when built as a dependency of another package (avoids duplicate VERSION resource CVT1100).
        let is_primary = std::env::var("CARGO_PRIMARY_PACKAGE")
            .map(|v| v == "true")
            .unwrap_or(false);
        let skip_winres = std::env::var("OPERON_SKIP_WINRES").is_ok();

        if is_primary && !skip_winres {
            let mut res = winres::WindowsResource::new();
            res.set_icon("icon.ico");
            res.set("ProductName", "Master CLI");
            res.set(
                "FileDescription",
                "- Autonomous Browser Automation & Distributed Mesh Runtime",
            );
            res.set("CompanyName", "Operon");
            res.set("LegalCopyright", "Copyright (c) 2026 Operon. MIT License.");
            res.set("ProductVersion", "1.2.0.0");
            res.set("FileVersion", "1.2.0.0");
            if let Err(e) = res.compile() {
                eprintln!("Warning: Failed to compile windows resource: {}", e);
            }
        }
    }
}
