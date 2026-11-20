//! Enterprise Constants for Distributed Execution Engine & Runner Daemon

/// Protocol identifiers
pub const PROTOCOL_AUTOMA_V1: &str = "operon.automation.v1";
pub const PROTOCOL_BROWSER_V1: &str = "operon.browser.v1";
pub const PROTOCOL_AGENT_V1: &str = "operon.agent.v1";
pub const PROTOCOL_AUTOMA_LEGACY: &str = "operon.automation.legacy";
pub const PROTOCOL_AGENT_LEGACY: &str = "operon.agent.legacy";

/// Protocol prefixes for handshake negotiation
pub const PROTOCOL_PREFIX_AUTOMA: &str = "operon.automation.";
pub const PROTOCOL_PREFIX_BROWSER: &str = "operon.browser.";
pub const PROTOCOL_PREFIX_AGENT: &str = "operon.agent.";

/// Default network ports
pub const DEFAULT_RUNNER_PORT: u16 = 8765;
pub const DEFAULT_LOCAL_DOCKER_SUPABASE_PORT: u16 = 54321;

/// Default central WebSocket control plane hub
pub const DEFAULT_WEBSOCKET_HUB: &str = "ws://127.0.0.1:8765/api/v1/runner/ws";

/// Default cloud endpoints
pub const DEFAULT_LOCAL_SUPABASE_URL: &str = "http://127.0.0.1:54321";
pub const DEFAULT_DEV_SUPABASE_URL: &str = "https://dswhacsoaxgpfnkaxnhz.supabase.co";

/// Default API keys for environments
pub const DEFAULT_LOCAL_ANON_KEY: &str = "placeholder-supabase-local-anon-key";
pub const DEFAULT_DEV_ANON_KEY: &str = "placeholder-supabase-dev-anon-key";

/// Canonical SSOT directory and filenames
pub const DEFAULT_SSOT_DIR_NAME: &str = ".operon";
pub const FILE_IDENTITY_JSON: &str = ".identity.json";
pub const FILE_ENVIRONMENTS_JSON: &str = "environments.json";

/// Target binary names
pub const TARGET_SPECTER_BIN: &str = "operon";

/// Default job execution timeouts and intervals
pub const DEFAULT_JOB_TIMEOUT_MS: u64 = 60_000;
pub const DEFAULT_HEARTBEAT_INTERVAL_SECS: u64 = 20;
pub const DEFAULT_MAX_CONCURRENCY: usize = 4;

/// Environment variable keys
pub const ENV_DATA_DIR: &str = "DATA_DIR";
pub const ENV_APP_ENV: &str = "APP_ENV";
pub const ENV_SUPABASE_URL: &str = "SUPABASE_URL";
pub const ENV_SUPABASE_ANON_KEY: &str = "SUPABASE_ANON_KEY";
pub const ENV_ENROLLMENT_TOKEN: &str = "ENROLLMENT_TOKEN";
pub const ENV_CONTROL_PLANE_URL: &str = "CONTROL_PLANE_URL";
pub const ENV_WORKER_TOKEN: &str = "WORKER_TOKEN";
pub const ENV_WORKER_ID: &str = "WORKER_ID";

/// Standard Message Catalog for Runner Daemon
pub const MSG_JOB_CANCELLED: &str = "Received Ctrl+C signal. Safely terminating job execution...";
pub const MSG_ENROLLMENT_SUCCESS: &str = "Workstation successfully enrolled with Cloud!";
pub const MSG_SHUTDOWN_SIGNAL: &str =
    "Received termination signal (Ctrl+C). Initiating graceful shutdown...";
pub const MSG_SHUTDOWN_CLEAN: &str = "Runner worker daemon exited cleanly.";
pub const MSG_REVOCATION_DETECTED: &str =
    "Cloud device identity revocation detected! Purging credentials...";
pub const MSG_IDENTITY_PURGED: &str = "Local device identity purged.";
