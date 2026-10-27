//! Enterprise Constants for Dedicated Browser & Sandboxing Subsystem

/// Default Chrome DevTools Protocol (CDP) port for automation debugging
pub const DEFAULT_CDP_PORT: u16 = 9222;

/// Canonical SSOT directory name under user home
pub const DEFAULT_SSOT_DIR_NAME: &str = ".operon";

/// Pillar subdirectory name
pub const PILLAR_DIR_BROWSER: &str = "browser";

/// Configuration filename
pub const CONFIG_FILE_BROWSER_JSON: &str = "browser.json";

/// Subdirectories under ~/.operon/browser/
pub const DIR_RUNTIMES: &str = "runtimes";
pub const DIR_PROFILES: &str = "profiles";
pub const DIR_EXTENSIONS: &str = "extensions";
pub const DIR_STEALTH: &str = "stealth";

/// Environment variable overrides
pub const ENV_CHROME_NO_SANDBOX: &str = "CHROME_NO_SANDBOX";
pub const ENV_EXTENSION_PATH: &str = "EXTENSION_PATH";
pub const ENV_DATA_DIR: &str = "DATA_DIR";
pub const ENV_BROWSER_HOST: &str = "BROWSER_HOST";
pub const ENV_BROWSER_PORT: &str = "BROWSER_PORT";

/// Pinned stable Long-Term-Support (LTS) release of official Open-Source Chromium
pub const PINNED_CHROMIUM_REVISION: &str = "1148";
pub const PINNED_CHROMIUM_VERSION: &str = "131.0.6778.33";

/// Pinned stable Long-Term-Support (LTS) release of C++ Antidetect Chromium
pub const PINNED_STEALTH_CHROMIUM_VERSION: &str = "148.0.7778.215";

/// Default profile name
pub const DEFAULT_PROFILE_NAME: &str = "default";
