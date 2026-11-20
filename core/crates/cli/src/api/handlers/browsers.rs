use crate::AppState;
use crate::api::handlers::jobs::connected_browsers;
use crate::core::browser::archive::{
    get_browsers_base_path, unzip_browser_folder, zip_browser_folder,
};
use crate::core::browser::importer::{CsvImportError, import_csv_into_db_with_tenant};
use crate::core::browser::manager::{BrowserManager, BrowserManagerOptions, browser_registry};
use crate::core::error::AutomationError;
use crate::core::models::id::BrowserId;
use crate::core::models::settings::AppSettings;
use crate::infrastructure::db::{
    Browser, CreateBrowserRecord, DEFAULT_TENANT_ID, FingerprintConfig, PatchBrowserRecord,
};
use axum::body::Bytes;
use axum::extract::{Json, Path, Query, State};
use serde::{Deserialize, Deserializer, Serialize};
use serde_json::json;
use std::collections::{HashMap, HashSet};
use utoipa::{IntoParams, ToSchema};

fn is_valid_id(id: &str) -> bool {
    BrowserId::new(id).is_valid()
}

fn validate_name(name: &str) -> Result<String, AutomationError> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(AutomationError::BadRequest(
            "Browser profile name cannot be empty".to_string(),
        ));
    }
    if trimmed.chars().count() > 100 {
        return Err(AutomationError::BadRequest(
            "Browser profile name must be at most 100 characters".to_string(),
        ));
    }
    Ok(trimmed.to_string())
}

fn validate_proxy_uri(proxy: Option<&str>) -> Result<Option<String>, AutomationError> {
    let Some(raw) = proxy else {
        return Ok(None);
    };
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }
    let lower = trimmed.to_ascii_lowercase();
    let rest = lower
        .strip_prefix("socks5h://")
        .or_else(|| lower.strip_prefix("socks5://"))
        .or_else(|| lower.strip_prefix("https://"))
        .or_else(|| lower.strip_prefix("http://"))
        .ok_or_else(|| {
            AutomationError::BadRequest(
                "Invalid proxy scheme (expected http://, https://, socks5://, or socks5h://)"
                    .to_string(),
            )
        })?;
    if rest.is_empty() || rest.starts_with('@') || rest.ends_with('@') {
        return Err(AutomationError::BadRequest(
            "Invalid proxy URI: missing host".to_string(),
        ));
    }
    Ok(Some(trimmed.to_string()))
}

fn resolve_tenant_id(raw: Option<&str>) -> Result<String, AutomationError> {
    match raw.map(str::trim).filter(|s| !s.is_empty()) {
        Some(tid) => {
            if !is_valid_id(tid) {
                return Err(AutomationError::BadRequest("Invalid tenantId".to_string()));
            }
            Ok(tid.to_string())
        }
        None => Ok(DEFAULT_TENANT_ID.to_string()),
    }
}

fn normalize_tags(tags: &[String]) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut out = Vec::new();
    for t in tags {
        let clean = t.trim().to_ascii_lowercase();
        if !clean.is_empty() && seen.insert(clean.clone()) {
            out.push(clean);
            if out.len() >= 20 {
                break;
            }
        }
    }
    out
}

fn normalize_extensions(exts: &[String], enforce_automation: bool) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut out = Vec::new();
    for ext in exts {
        let clean = ext.trim().to_string();
        if !clean.is_empty() && seen.insert(clean.clone()) {
            out.push(clean);
        }
    }
    if enforce_automation && !seen.contains("automation") {
        out.insert(0, "automation".to_string());
    }
    out
}

fn sanitize_startup_flags(flags: &[String]) -> Result<Vec<String>, AutomationError> {
    const BLOCKED_PREFIXES: &[&str] = &[
        "--no-sandbox",
        "--disable-web-security",
        "--user-data-dir",
        "--remote-debugging-port",
        "--load-extension",
    ];
    let mut out = Vec::new();
    for raw in flags {
        let trimmed = raw.trim();
        if trimmed.is_empty() {
            continue;
        }
        if !trimmed.starts_with('-') {
            return Err(AutomationError::BadRequest(format!(
                "Startup flag '{}' must start with '-'",
                trimmed
            )));
        }
        let lower = trimmed.to_ascii_lowercase();
        if BLOCKED_PREFIXES
            .iter()
            .any(|blocked| lower == *blocked || lower.starts_with(&format!("{blocked}=")))
        {
            return Err(AutomationError::BadRequest(format!(
                "Startup flag '{}' is blocked for sandbox safety",
                trimmed
            )));
        }
        if !out.contains(&trimmed.to_string()) {
            out.push(trimmed.to_string());
        }
    }
    Ok(out)
}

fn generate_fingerprint_defaults(
    name: &str,
    input: Option<FingerprintConfig>,
    proxy: Option<&str>,
    timezone: Option<&str>,
) -> FingerprintConfig {
    let provided = input.unwrap_or_default();
    let generated = browser::BrowserProfile::generate(
        name,
        provided.seed,
        provided.os_platform.clone(),
        provided.hardware_concurrency,
        provided.device_memory_gb,
        proxy.map(str::to_string),
        timezone.map(str::to_string),
        provided.lang.clone(),
    );

    FingerprintConfig {
        seed: provided.seed.or(generated.fingerprint_seed),
        os_platform: provided.os_platform.or(generated.os_platform),
        os_version: provided.os_version.or(generated.os_version),
        hardware_concurrency: provided
            .hardware_concurrency
            .or(generated.hardware_concurrency),
        device_memory_gb: provided.device_memory_gb.or(generated.device_memory_gb),
        screen_width: provided.screen_width.or(generated.screen_width),
        screen_height: provided.screen_height.or(generated.screen_height),
        device_pixel_ratio: provided.device_pixel_ratio.or(generated.device_pixel_ratio),
        webrtc_mode: provided
            .webrtc_mode
            .or_else(|| Some("proxy_shielded".to_string())),
        noise_level: provided
            .noise_level
            .or_else(|| Some("balanced".to_string())),
        lang: provided.lang.or(generated.lang),
        accept_lang: provided.accept_lang.or(generated.accept_lang),
    }
}

fn deserialize_some<'de, T, D>(deserializer: D) -> Result<Option<T>, D::Error>
where
    T: Deserialize<'de>,
    D: Deserializer<'de>,
{
    Deserialize::deserialize(deserializer).map(Some)
}

async fn is_browser_running(id: &str) -> bool {
    if connected_browsers().read().await.contains(id) {
        return true;
    }
    let pid_opt = { browser_registry().read().await.get(id).copied() };
    let Some(pid) = pid_opt else {
        return false;
    };
    let mut sys = sysinfo::System::new();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, false);
    sys.process(sysinfo::Pid::from_u32(pid)).is_some()
}

fn dir_size_bytes(path: &std::path::Path) -> u64 {
    if !path.exists() {
        return 0;
    }
    let Ok(entries) = std::fs::read_dir(path) else {
        return 0;
    };
    let mut total = 0u64;
    for entry in entries.flatten() {
        let Ok(meta) = entry.metadata() else {
            continue;
        };
        if meta.is_file() {
            total = total.saturating_add(meta.len());
        } else if meta.is_dir() && !meta.file_type().is_symlink() {
            total = total.saturating_add(dir_size_bytes(&entry.path()));
        }
    }
    total
}

async fn cleanup_profile_disk(id: &str, data_dir: &str) {
    let base_rel = get_browsers_base_path(data_dir).await;
    let legacy_dir = std::path::PathBuf::from(data_dir).join(&base_rel).join(id);
    let legacy_zip = std::path::PathBuf::from(data_dir)
        .join(&base_rel)
        .join(format!("{}.zip", id));
    let ssot_root = browser::BrowserProfile::default_profiles_dir();
    let ssot_dir = ssot_root.join(id);
    let ssot_snap = ssot_root.join(format!("{}.tar.zst", id));

    for dir in [legacy_dir, ssot_dir] {
        if dir.exists() {
            let _ = tokio::fs::remove_dir_all(&dir).await;
        }
    }
    for file in [legacy_zip, ssot_snap] {
        if file.exists() {
            let _ = tokio::fs::remove_file(&file).await;
        }
    }
}

fn build_browser_response(
    p: Browser,
    settings: &AppSettings,
    is_online: bool,
    session: Option<&browser::BrowserSession>,
    disk_size_bytes: Option<u64>,
) -> BrowserResponse {
    let default_for_tenant = settings.browser.get_default_profile_for(&p.tenant_id);
    let is_default = default_for_tenant == Some(p.id.as_str())
        || (default_for_tenant.is_none() && p.tenant_id == DEFAULT_TENANT_ID && p.id == "default");
    let extensions = p
        .extensions
        .unwrap_or_else(|| vec!["automation".to_string()]);

    BrowserResponse {
        id: p.id,
        tenant_id: p.tenant_id,
        name: p.name,
        group_name: p.group_name,
        tags: p.tags,
        user_agent: p.user_agent,
        timezone: p.timezone,
        proxy: p.proxy,
        extensions,
        fingerprint_config: p.fingerprint_config,
        startup_flags: p.startup_flags,
        is_default,
        created_at: p.created_at,
        updated_at: p.updated_at,
        is_online,
        pid: session.map(|s| s.pid),
        debugging_port: session.map(|s| s.debugging_port),
        ws_url: session.map(|s| s.ws_url.clone()),
        disk_size_bytes,
    }
}

fn emit_browser_event(
    state: &AppState,
    action: &str,
    id: &str,
    tenant_id: &str,
    extra: Option<serde_json::Value>,
) {
    let mut payload = json!({
        "type": "browser_changed",
        "action": action,
        "id": id,
        "tenantId": tenant_id,
    });
    if let (Some(obj), Some(serde_json::Value::Object(ext))) = (payload.as_object_mut(), extra) {
        for (k, v) in ext {
            obj.insert(k, v);
        }
    }
    let _ = state.tx.send(payload.to_string());
}

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "camelCase")]
#[schema(example = json!({
    "id": "profile_1",
    "tenantId": "local-default",
    "name": "Personal Profile",
    "groupName": "default",
    "tags": ["vip"],
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "timezone": "Asia/Ho_Chi_Minh",
    "proxy": "socks5://127.0.0.1:1080",
    "extensions": ["automation"],
    "isDefault": true,
    "createdAt": "2026-08-25T00:00:00Z",
    "updatedAt": "2026-08-25T00:00:00Z",
    "isOnline": false
}))]
/// Browser profile descriptor
pub struct BrowserResponse {
    /// Unique browser profile identifier
    pub id: String,
    /// Owning tenant identifier ('local-default', 'local-*', or Cloud tenant UUID)
    pub tenant_id: String,
    /// User-friendly profile label
    pub name: String,
    /// Logical group/folder name
    pub group_name: Option<String>,
    /// Profile tags
    pub tags: Vec<String>,
    /// Custom User-Agent header string
    pub user_agent: Option<String>,
    /// Emulated timezone ID
    pub timezone: Option<String>,
    /// Proxy server string
    pub proxy: Option<String>,
    /// Active extension identifiers configured for this profile
    pub extensions: Vec<String>,
    /// Deterministic antidetect fingerprint configuration
    pub fingerprint_config: FingerprintConfig,
    /// Extra startup Chromium CLI flags
    pub startup_flags: Vec<String>,
    /// Whether this profile is currently configured as the tenant default
    pub is_default: bool,
    /// Creation timestamp (ISO 8601)
    pub created_at: String,
    /// Last update timestamp (ISO 8601)
    pub updated_at: String,
    /// Whether an active browser process is currently connected
    pub is_online: bool,
    /// Live OS PID while running
    pub pid: Option<u32>,
    /// Live CDP port while running
    pub debugging_port: Option<u16>,
    /// Live CDP WebSocket URL while running
    pub ws_url: Option<String>,
    /// Profile disk footprint in bytes (populated on detail inspect)
    pub disk_size_bytes: Option<u64>,
}

#[derive(Deserialize, ToSchema, Default)]
#[serde(rename_all = "camelCase")]
#[schema(example = json!({
    "id": "profile_1",
    "tenantId": "local-default",
    "name": "Personal Profile",
    "groupName": "marketing",
    "tags": ["sea"],
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "timezone": "Asia/Ho_Chi_Minh",
    "proxy": "socks5://127.0.0.1:1080",
    "extensions": ["automation", "ublock"]
}))]
/// Request payload for creating a new browser profile
pub struct CreateBrowserRequest {
    /// Optional custom ID (auto-generated if omitted)
    pub id: Option<String>,
    /// Owning tenant ID (defaults to 'local-default')
    #[serde(default)]
    pub tenant_id: Option<String>,
    /// User-friendly profile name
    pub name: String,
    /// Optional group name
    #[serde(default)]
    pub group_name: Option<String>,
    /// Optional tags
    #[serde(default)]
    pub tags: Option<Vec<String>>,
    /// Custom User-Agent header
    pub user_agent: Option<String>,
    /// Emulated timezone ID
    pub timezone: Option<String>,
    /// Optional proxy server URL
    pub proxy: Option<String>,
    /// Optional extension identifiers
    pub extensions: Option<Vec<String>>,
    /// Optional antidetect fingerprint overrides
    #[serde(default)]
    pub fingerprint_config: Option<FingerprintConfig>,
    /// Optional extra Chromium startup flags
    #[serde(default)]
    pub startup_flags: Option<Vec<String>>,
}

#[derive(Deserialize, ToSchema, Default)]
#[serde(rename_all = "camelCase")]
#[schema(example = json!({
    "name": "Updated Profile Name",
    "userAgent": null,
    "timezone": "UTC",
    "proxy": "http://10.0.0.1:8080",
    "extensions": ["automation", "ublock", "cookie-injector"]
}))]
/// Request payload for replacing an existing browser profile (PUT)
pub struct UpdateBrowserRequest {
    /// Profile display name (required non-empty on PUT)
    pub name: Option<String>,
    /// Group name
    #[serde(default)]
    pub group_name: Option<String>,
    /// Profile tags
    #[serde(default)]
    pub tags: Option<Vec<String>>,
    /// New custom User-Agent
    pub user_agent: Option<String>,
    /// New emulated timezone ID
    pub timezone: Option<String>,
    /// New proxy server URL
    pub proxy: Option<String>,
    /// Optional updated list of extension identifiers
    pub extensions: Option<Vec<String>>,
    /// Optional antidetect fingerprint config
    #[serde(default)]
    pub fingerprint_config: Option<FingerprintConfig>,
    /// Optional extra Chromium startup flags
    #[serde(default)]
    pub startup_flags: Option<Vec<String>>,
}

#[derive(Deserialize, ToSchema, Default)]
#[serde(rename_all = "camelCase")]
/// Partial update payload (PATCH) preserving omitted fields and clearing explicit null fields
pub struct PatchBrowserRequest {
    pub name: Option<String>,
    #[serde(default, deserialize_with = "deserialize_some")]
    pub group_name: Option<Option<String>>,
    pub tags: Option<Vec<String>>,
    #[serde(default, deserialize_with = "deserialize_some")]
    pub user_agent: Option<Option<String>>,
    #[serde(default, deserialize_with = "deserialize_some")]
    pub timezone: Option<Option<String>>,
    #[serde(default, deserialize_with = "deserialize_some")]
    pub proxy: Option<Option<String>>,
    pub extensions: Option<Vec<String>>,
    pub fingerprint_config: Option<FingerprintConfig>,
    pub startup_flags: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
/// Response payload when a browser process is terminated
pub struct StopBrowserResponse {
    pub status: String,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
/// Response returned upon creating a new browser profile
pub struct CreateBrowserResponse {
    pub success: bool,
    pub id: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub browser: Option<BrowserResponse>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
/// Confirmation returned upon updating a browser profile
pub struct UpdateBrowserResponse {
    pub success: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub browser: Option<BrowserResponse>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
/// Confirmation returned upon deleting a browser profile
pub struct DeleteBrowserResponse {
    pub success: bool,
    pub message: String,
}

#[derive(Deserialize, IntoParams, Default)]
#[serde(rename_all = "camelCase")]
pub struct GetBrowsersQuery {
    /// Maximum number of browser profiles to return
    #[param(example = 50)]
    pub limit: Option<usize>,
    /// Number of items to skip for pagination (default 0)
    #[param(example = 0)]
    pub offset: Option<usize>,
    /// Optional search query to filter browsers by name, ID, group, or proxy
    pub search: Option<String>,
    /// Filter by owning tenant ID (pass scope=all to list across all tenants)
    #[serde(alias = "tenant_id")]
    pub tenant_id: Option<String>,
    /// Optional scope ('tenant' | 'all')
    pub scope: Option<String>,
    /// Filter by runtime status ('online' | 'offline')
    pub status: Option<String>,
    /// Filter by proxy presence ('true' | 'false')
    pub has_proxy: Option<bool>,
    /// Filter by OS platform ('windows' | 'macos' | 'linux')
    pub platform: Option<String>,
    /// Filter by group_name
    pub group: Option<String>,
}

#[utoipa::path(
    tag = "Browsers",
    get,
    path = "/api/v1/browsers",
    operation_id = "get_browsers",
    summary = "List browser profiles",
    description = "Retrieves persisted browser profiles filtered by optional tenant, search, status, proxy, group, or OS platform.",
    params(GetBrowsersQuery),
    responses(
        (status = 200, description = "List of browser profiles", body = Vec<BrowserResponse>),
        (status = 500, description = "Database read error", body = crate::core::error::ApiErrorResponse)
    )
)]
pub async fn get_browsers(
    State(state): State<AppState>,
    Query(query): Query<GetBrowsersQuery>,
) -> Result<Json<Vec<BrowserResponse>>, AutomationError> {
    let tenant_filter = if query.scope.as_deref() == Some("all") {
        None
    } else {
        query
            .tenant_id
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty())
    };

    let (browsers, settings) = {
        let db = state.db.lock().await;
        let has_secondary_filter = query.status.is_some()
            || query.has_proxy.is_some()
            || query.platform.is_some()
            || query.group.is_some();
        let rows = db
            .browsers()
            .list_browsers(
                tenant_filter,
                if has_secondary_filter {
                    None
                } else {
                    query.limit
                },
                if has_secondary_filter {
                    None
                } else {
                    query.offset
                },
                query.search.as_deref(),
            )
            .map_err(|e| AutomationError::DatabaseError(e.to_string()))?;
        let settings = db.settings().get_settings().unwrap_or_default();
        (rows, settings)
    };

    let online_browsers = connected_browsers().read().await.clone();
    let running_registry = browser_registry().read().await.clone();
    let running_sessions = crate::core::browser::manager::browser_sessions()
        .read()
        .await
        .clone();

    let mut response: Vec<BrowserResponse> = browsers
        .into_iter()
        .filter_map(|p| {
            let is_online = online_browsers.contains(&p.id) || running_registry.contains_key(&p.id);
            if let Some(ref st) = query.status {
                if st.eq_ignore_ascii_case("online") && !is_online {
                    return None;
                }
                if st.eq_ignore_ascii_case("offline") && is_online {
                    return None;
                }
            }
            if let Some(has_px) = query.has_proxy {
                let actual = p.proxy.as_deref().is_some_and(|s| !s.trim().is_empty());
                if has_px != actual {
                    return None;
                }
            }
            if let Some(ref plat) = query.platform {
                let actual = p
                    .fingerprint_config
                    .os_platform
                    .as_deref()
                    .unwrap_or("windows");
                if !actual.eq_ignore_ascii_case(plat.trim()) {
                    return None;
                }
            }
            if let Some(ref grp) = query.group {
                let actual = p.group_name.as_deref().unwrap_or("default");
                if !actual.eq_ignore_ascii_case(grp.trim()) {
                    return None;
                }
            }
            let sess = running_sessions.get(&p.id);
            Some(build_browser_response(p, &settings, is_online, sess, None))
        })
        .collect();

    if query.status.is_some()
        || query.has_proxy.is_some()
        || query.platform.is_some()
        || query.group.is_some()
    {
        let start = query.offset.unwrap_or(0).min(response.len());
        response = response.into_iter().skip(start).collect();
        if let Some(lim) = query.limit {
            response.truncate(lim);
        }
    }

    Ok(Json(response))
}

#[utoipa::path(
    tag = "Browsers",
    post,
    path = "/api/v1/browsers",
    operation_id = "create_browser",
    summary = "Create a new browser profile",
    description = "Persists a new isolated tenant-scoped browser profile with deterministic antidetect fingerprint settings in SQLite.",
    request_body = CreateBrowserRequest,
    responses(
        (status = 200, description = "Browser profile created successfully", body = CreateBrowserResponse),
        (status = 400, description = "Invalid browser ID, empty name, or invalid proxy URI", body = crate::core::error::ApiErrorResponse),
        (status = 409, description = "Browser ID already exists", body = crate::core::error::ApiErrorResponse),
        (status = 500, description = "Failed to create browser profile in database", body = crate::core::error::ApiErrorResponse)
    )
)]
pub async fn create_browser(
    State(state): State<AppState>,
    Json(req): Json<CreateBrowserRequest>,
) -> Result<Json<CreateBrowserResponse>, AutomationError> {
    let final_id = match req.id.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        Some(custom) => custom.to_string(),
        None => format!("prf_{}", &uuid::Uuid::new_v4().simple().to_string()[..12]),
    };
    if !is_valid_id(&final_id) {
        return Err(AutomationError::BadRequest(
            "Invalid browser ID".to_string(),
        ));
    }

    let name = validate_name(&req.name)?;
    let tenant_id = resolve_tenant_id(req.tenant_id.as_deref())?;
    let proxy = validate_proxy_uri(req.proxy.as_deref())?;
    let user_agent = req
        .user_agent
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string);
    let timezone = req
        .timezone
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string);
    let group_name = req
        .group_name
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or("default");
    let tags = normalize_tags(req.tags.as_deref().unwrap_or(&[]));
    let extensions = normalize_extensions(req.extensions.as_deref().unwrap_or(&[]), true);
    let startup_flags = sanitize_startup_flags(req.startup_flags.as_deref().unwrap_or(&[]))?;
    let fp = generate_fingerprint_defaults(
        &name,
        req.fingerprint_config,
        proxy.as_deref(),
        timezone.as_deref(),
    );

    let (created_browser, settings) = {
        let db = state.db.lock().await;
        if db
            .browsers()
            .get_browser(&final_id)
            .map_err(|e| AutomationError::DatabaseError(e.to_string()))?
            .is_some()
        {
            return Err(AutomationError::Conflict(format!(
                "Browser profile '{}' already exists",
                final_id
            )));
        }

        db.browsers()
            .create_browser_record(&CreateBrowserRecord {
                id: &final_id,
                tenant_id: &tenant_id,
                name: &name,
                group_name: Some(group_name),
                tags: Some(&tags),
                user_agent: user_agent.as_deref(),
                timezone: timezone.as_deref(),
                proxy: proxy.as_deref(),
                extensions: Some(&extensions),
                fingerprint_config: Some(&fp),
                startup_flags: Some(&startup_flags),
            })
            .map_err(|e| AutomationError::DatabaseError(e.to_string()))?;

        let record = db
            .browsers()
            .get_browser(&final_id)
            .map_err(|e| AutomationError::DatabaseError(e.to_string()))?;
        let settings = db.settings().get_settings().unwrap_or_default();
        (record, settings)
    };

    emit_browser_event(&state, "create", &final_id, &tenant_id, None);

    Ok(Json(CreateBrowserResponse {
        success: true,
        id: final_id,
        message: "Browser created".to_string(),
        browser: created_browser.map(|b| build_browser_response(b, &settings, false, None, None)),
    }))
}

#[utoipa::path(
    tag = "Browsers",
    put,
    path = "/api/v1/browsers/{id}",
    operation_id = "update_browser",
    summary = "Update a browser profile",
    description = "Updates configuration and metadata of an existing browser profile by ID.",
    params(
        ("id" = String, Path, description = "Unique browser profile identifier")
    ),
    request_body = UpdateBrowserRequest,
    responses(
        (status = 200, description = "Browser profile updated successfully", body = UpdateBrowserResponse),
        (status = 400, description = "Invalid browser ID, blank name, or invalid proxy", body = crate::core::error::ApiErrorResponse),
        (status = 404, description = "Browser profile not found", body = crate::core::error::ApiErrorResponse),
        (status = 500, description = "Database update error", body = crate::core::error::ApiErrorResponse)
    )
)]
pub async fn update_browser(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<UpdateBrowserRequest>,
) -> Result<Json<UpdateBrowserResponse>, AutomationError> {
    if !is_valid_id(&id) {
        return Err(AutomationError::BadRequest(
            "Invalid browser ID".to_string(),
        ));
    }
    let name = validate_name(req.name.as_deref().unwrap_or(""))?;
    let proxy = validate_proxy_uri(req.proxy.as_deref())?;
    let ua = req
        .user_agent
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string);
    let tz = req
        .timezone
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string);
    let grp = req
        .group_name
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string);
    let tags_opt = req.tags.as_deref().map(normalize_tags);
    let exts_opt = req
        .extensions
        .as_deref()
        .map(|e| normalize_extensions(e, false));
    let flags_opt = match req.startup_flags.as_deref() {
        Some(f) => Some(sanitize_startup_flags(f)?),
        None => None,
    };

    let (updated, settings) = {
        let db = state.db.lock().await;
        if db
            .browsers()
            .get_browser(&id)
            .map_err(|e| AutomationError::DatabaseError(e.to_string()))?
            .is_none()
        {
            return Err(AutomationError::NotFound(format!(
                "Browser '{}' not found",
                id
            )));
        }

        db.browsers()
            .patch_browser(
                &id,
                &PatchBrowserRecord {
                    name: Some(&name),
                    group_name: grp.as_deref().map(Some),
                    tags: tags_opt.as_deref(),
                    user_agent: Some(ua.as_deref()),
                    timezone: Some(tz.as_deref()),
                    proxy: Some(proxy.as_deref()),
                    extensions: exts_opt.as_deref(),
                    fingerprint_config: req.fingerprint_config.as_ref(),
                    startup_flags: flags_opt.as_deref(),
                },
            )
            .map_err(|e| AutomationError::DatabaseError(e.to_string()))?;

        let record = db
            .browsers()
            .get_browser(&id)
            .map_err(|e| AutomationError::DatabaseError(e.to_string()))?;
        let settings = db.settings().get_settings().unwrap_or_default();
        (record, settings)
    };

    let tenant_id = updated
        .as_ref()
        .map(|b| b.tenant_id.as_str())
        .unwrap_or(DEFAULT_TENANT_ID)
        .to_string();
    emit_browser_event(&state, "update", &id, &tenant_id, None);
    let is_online = is_browser_running(&id).await;

    Ok(Json(UpdateBrowserResponse {
        success: true,
        message: "Browser updated".to_string(),
        browser: updated.map(|b| build_browser_response(b, &settings, is_online, None, None)),
    }))
}

#[utoipa::path(
    tag = "Browsers",
    patch,
    path = "/api/v1/browsers/{id}",
    operation_id = "patch_browser",
    summary = "Partially update a browser profile",
    description = "Updates only provided fields while preserving omitted configuration.",
    params(
        ("id" = String, Path, description = "Unique browser profile identifier")
    ),
    request_body = PatchBrowserRequest,
    responses(
        (status = 200, description = "Browser profile patched successfully", body = BrowserResponse),
        (status = 400, description = "Invalid browser ID, name, proxy, or startup flags", body = crate::core::error::ApiErrorResponse),
        (status = 404, description = "Browser profile not found", body = crate::core::error::ApiErrorResponse)
    )
)]
pub async fn patch_browser(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<PatchBrowserRequest>,
) -> Result<Json<BrowserResponse>, AutomationError> {
    if !is_valid_id(&id) {
        return Err(AutomationError::BadRequest(
            "Invalid browser ID".to_string(),
        ));
    }

    let name_opt = match req.name {
        Some(ref raw) => Some(validate_name(raw)?),
        None => None,
    };
    let proxy_opt = match req.proxy {
        None => None,
        Some(None) => Some(None),
        Some(Some(ref raw)) => Some(validate_proxy_uri(Some(raw))?),
    };
    let flags_opt = match req.startup_flags {
        Some(ref raw) => Some(sanitize_startup_flags(raw)?),
        None => None,
    };
    let tags_opt = req.tags.as_deref().map(normalize_tags);
    let exts_opt = req
        .extensions
        .as_deref()
        .map(|e| normalize_extensions(e, false));

    let ua_owned = req.user_agent.map(|inner| {
        inner
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
    });
    let tz_owned = req.timezone.map(|inner| {
        inner
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
    });
    let grp_owned = req.group_name.map(|inner| {
        inner
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
    });

    let (updated, settings) = {
        let db = state.db.lock().await;
        if db
            .browsers()
            .get_browser(&id)
            .map_err(|e| AutomationError::DatabaseError(e.to_string()))?
            .is_none()
        {
            return Err(AutomationError::NotFound(format!(
                "Browser '{}' not found",
                id
            )));
        }

        db.browsers()
            .patch_browser(
                &id,
                &PatchBrowserRecord {
                    name: name_opt.as_deref(),
                    group_name: grp_owned.as_ref().map(|o| o.as_deref()),
                    tags: tags_opt.as_deref(),
                    user_agent: ua_owned.as_ref().map(|o| o.as_deref()),
                    timezone: tz_owned.as_ref().map(|o| o.as_deref()),
                    proxy: proxy_opt.as_ref().map(|o| o.as_deref()),
                    extensions: exts_opt.as_deref(),
                    fingerprint_config: req.fingerprint_config.as_ref(),
                    startup_flags: flags_opt.as_deref(),
                },
            )
            .map_err(|e| AutomationError::DatabaseError(e.to_string()))?;

        let record = db
            .browsers()
            .get_browser(&id)
            .map_err(|e| AutomationError::DatabaseError(e.to_string()))?
            .ok_or_else(|| AutomationError::NotFound(format!("Browser '{}' not found", id)))?;
        let settings = db.settings().get_settings().unwrap_or_default();
        (record, settings)
    };

    emit_browser_event(&state, "update", &updated.id, &updated.tenant_id, None);
    let is_online = is_browser_running(&id).await;
    let sess = crate::core::browser::manager::browser_sessions()
        .read()
        .await
        .get(&id)
        .cloned();

    Ok(Json(build_browser_response(
        updated,
        &settings,
        is_online,
        sess.as_ref(),
        None,
    )))
}

#[derive(Deserialize, IntoParams, Default)]
pub struct DeleteBrowserQuery {
    /// If true, forcefully stops running session before deleting the profile
    pub force: Option<bool>,
}

async fn perform_delete_browser(
    state: &AppState,
    id: &str,
    force: bool,
) -> Result<String, AutomationError> {
    if !is_valid_id(id) {
        return Err(AutomationError::BadRequest(
            "Invalid browser ID".to_string(),
        ));
    }

    let existing = {
        let db = state.db.lock().await;
        db.browsers()
            .get_browser(id)
            .map_err(|e| AutomationError::DatabaseError(e.to_string()))?
    };

    let Some(profile) = existing else {
        return Err(AutomationError::NotFound(format!(
            "Browser '{}' not found",
            id
        )));
    };

    if is_browser_running(id).await {
        if !force {
            return Err(AutomationError::Conflict(format!(
                "Browser '{}' is currently running. Stop it first or pass force=true",
                id
            )));
        }
        let pid = { browser_registry().read().await.get(id).copied() };
        crate::core::browser::manager::kill_browser_processes(id, pid).await;
        browser_registry().write().await.remove(id);
        crate::core::browser::manager::browser_sessions()
            .write()
            .await
            .remove(id);
        connected_browsers().write().await.remove(id);
        let _ = state
            .tx
            .send(json!({ "type": "browser_offline", "id": id }).to_string());
    }

    {
        let db = state.db.lock().await;
        db.browsers()
            .delete_browser_checked(id)
            .map_err(|e| AutomationError::DatabaseError(e.to_string()))?;

        if let Ok(mut settings) = db.settings().get_settings()
            && settings.browser.get_default_profile_for(&profile.tenant_id) == Some(id)
        {
            settings
                .browser
                .set_default_profile_for(&profile.tenant_id, None);
            let _ = db.settings().save_settings(&settings);
            let _ = state.tx.send(
                json!({
                    "type": "settings_updated",
                    "tenantId": profile.tenant_id,
                    "default_profile_id": serde_json::Value::Null
                })
                .to_string(),
            );
        }
    }

    cleanup_profile_disk(id, &state.config.data_dir).await;
    emit_browser_event(state, "delete", id, &profile.tenant_id, None);
    Ok(profile.tenant_id)
}

#[utoipa::path(
    tag = "Browsers",
    delete,
    path = "/api/v1/browsers/{id}",
    operation_id = "delete_browser",
    summary = "Delete a browser profile",
    description = "Permanently removes a browser profile from SQLite storage and cleans up disk directories and archives.",
    params(
        ("id" = String, Path, description = "Unique browser profile identifier"),
        DeleteBrowserQuery
    ),
    responses(
        (status = 200, description = "Browser profile deleted successfully", body = DeleteBrowserResponse),
        (status = 400, description = "Invalid browser ID", body = crate::core::error::ApiErrorResponse),
        (status = 404, description = "Browser profile not found", body = crate::core::error::ApiErrorResponse),
        (status = 409, description = "Browser session is currently active", body = crate::core::error::ApiErrorResponse)
    )
)]
pub async fn delete_browser(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Query(query): Query<DeleteBrowserQuery>,
) -> Result<Json<DeleteBrowserResponse>, AutomationError> {
    perform_delete_browser(&state, &id, query.force.unwrap_or(false)).await?;
    Ok(Json(DeleteBrowserResponse {
        success: true,
        message: "Browser deleted".to_string(),
    }))
}

#[utoipa::path(
    tag = "Browsers",
    get,
    path = "/api/v1/browsers/{id}",
    operation_id = "get_browser_detail",
    summary = "Get browser profile details",
    description = "Retrieves full configuration details, live session info, and disk size for a specific browser profile.",
    params(
        ("id" = String, Path, description = "Unique browser profile identifier")
    ),
    responses(
        (status = 200, description = "Browser profile details", body = BrowserResponse),
        (status = 400, description = "Invalid browser ID", body = crate::core::error::ApiErrorResponse),
        (status = 404, description = "Browser profile not found", body = crate::core::error::ApiErrorResponse),
        (status = 500, description = "Database query error", body = crate::core::error::ApiErrorResponse)
    )
)]
pub async fn get_browser_detail(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<BrowserResponse>, AutomationError> {
    if !is_valid_id(&id) {
        return Err(AutomationError::BadRequest(
            "Invalid browser ID".to_string(),
        ));
    }

    let (browser_opt, settings) = {
        let db = state.db.lock().await;
        let b = db
            .browsers()
            .get_browser(&id)
            .map_err(|e| AutomationError::DatabaseError(e.to_string()))?;
        let settings = db.settings().get_settings().unwrap_or_default();
        (b, settings)
    };

    let Some(p) = browser_opt else {
        return Err(AutomationError::NotFound(format!(
            "Browser '{id}' not found"
        )));
    };

    let is_online = is_browser_running(&p.id).await;
    let sess = crate::core::browser::manager::browser_sessions()
        .read()
        .await
        .get(&p.id)
        .cloned();
    let base_rel = get_browsers_base_path(&state.config.data_dir).await;
    let legacy_dir = std::path::PathBuf::from(&state.config.data_dir)
        .join(&base_rel)
        .join(&p.id);
    let ssot_dir = browser::BrowserProfile::default_profiles_dir().join(&p.id);
    let disk_size = dir_size_bytes(&legacy_dir).saturating_add(dir_size_bytes(&ssot_dir));

    Ok(Json(build_browser_response(
        p,
        &settings,
        is_online,
        sess.as_ref(),
        Some(disk_size),
    )))
}

#[derive(Deserialize, ToSchema, Default)]
#[serde(rename_all = "camelCase")]
pub struct CloneBrowserRequest {
    pub new_id: Option<String>,
    pub name: Option<String>,
    pub target_tenant_id: Option<String>,
    pub preserve_seed: Option<bool>,
    pub copy_storage: Option<bool>,
}

#[utoipa::path(
    tag = "Browsers",
    post,
    path = "/api/v1/browsers/{id}/clone",
    operation_id = "clone_browser",
    summary = "Duplicate or copy browser profile",
    description = "Clones profile metadata (with a fresh fingerprint seed by default) into the same or another tenant.",
    params(
        ("id" = String, Path, description = "Source browser profile identifier")
    ),
    request_body = CloneBrowserRequest,
    responses(
        (status = 200, description = "Cloned browser profile", body = BrowserResponse),
        (status = 400, description = "Invalid browser ID or target tenant", body = crate::core::error::ApiErrorResponse),
        (status = 404, description = "Source browser profile not found", body = crate::core::error::ApiErrorResponse),
        (status = 409, description = "Target ID exists or source is running while copyStorage requested", body = crate::core::error::ApiErrorResponse)
    )
)]
pub async fn clone_browser(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<CloneBrowserRequest>,
) -> Result<Json<BrowserResponse>, AutomationError> {
    if !is_valid_id(&id) {
        return Err(AutomationError::BadRequest(
            "Invalid browser ID".to_string(),
        ));
    }

    let source = {
        let db = state.db.lock().await;
        db.browsers()
            .get_browser(&id)
            .map_err(|e| AutomationError::DatabaseError(e.to_string()))?
            .ok_or_else(|| AutomationError::NotFound(format!("Browser '{}' not found", id)))?
    };

    if req.copy_storage.unwrap_or(false) && is_browser_running(&id).await {
        return Err(AutomationError::Conflict(format!(
            "Stop browser '{}' before cloning its session storage",
            id
        )));
    }

    let target_tenant = match req.target_tenant_id.as_deref() {
        Some(t) => resolve_tenant_id(Some(t))?,
        None => source.tenant_id.clone(),
    };
    let clone_id = match req
        .new_id
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
    {
        Some(custom) => custom.to_string(),
        None => format!(
            "{}_copy_{}",
            id,
            &uuid::Uuid::new_v4().simple().to_string()[..6]
        ),
    };
    if !is_valid_id(&clone_id) {
        return Err(AutomationError::BadRequest(
            "Invalid target browser ID".to_string(),
        ));
    }
    let clone_name = match req.name {
        Some(ref raw) => validate_name(raw)?,
        None => format!("{} (Copy)", source.name),
    };

    let mut fp = source.fingerprint_config.clone();
    if !req.preserve_seed.unwrap_or(false) {
        fp.seed = Some(
            u32::from_le_bytes(
                uuid::Uuid::new_v4().as_bytes()[..4]
                    .try_into()
                    .unwrap_or([1, 2, 3, 4]),
            )
            .max(1000),
        );
    }

    let (cloned, settings) = {
        let db = state.db.lock().await;
        if db
            .browsers()
            .get_browser(&clone_id)
            .map_err(|e| AutomationError::DatabaseError(e.to_string()))?
            .is_some()
        {
            return Err(AutomationError::Conflict(format!(
                "Browser '{}' already exists",
                clone_id
            )));
        }

        let exts = source
            .extensions
            .unwrap_or_else(|| vec!["automation".to_string()]);
        db.browsers()
            .create_browser_record(&CreateBrowserRecord {
                id: &clone_id,
                tenant_id: &target_tenant,
                name: &clone_name,
                group_name: source.group_name.as_deref(),
                tags: Some(&source.tags),
                user_agent: source.user_agent.as_deref(),
                timezone: source.timezone.as_deref(),
                proxy: source.proxy.as_deref(),
                extensions: Some(&exts),
                fingerprint_config: Some(&fp),
                startup_flags: Some(&source.startup_flags),
            })
            .map_err(|e| AutomationError::DatabaseError(e.to_string()))?;

        let rec = db
            .browsers()
            .get_browser(&clone_id)
            .map_err(|e| AutomationError::DatabaseError(e.to_string()))?
            .ok_or_else(|| AutomationError::DatabaseError("Cloned row missing".to_string()))?;
        let settings = db.settings().get_settings().unwrap_or_default();
        (rec, settings)
    };

    emit_browser_event(&state, "create", &clone_id, &target_tenant, None);
    Ok(Json(build_browser_response(
        cloned, &settings, false, None, None,
    )))
}

#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct MoveBrowserRequest {
    pub target_tenant_id: String,
}

#[utoipa::path(
    tag = "Browsers",
    post,
    path = "/api/v1/browsers/{id}/move",
    operation_id = "move_browser_tenant",
    summary = "Move browser profile across tenants",
    description = "Reassigns an offline browser profile to another tenant.",
    params(
        ("id" = String, Path, description = "Unique browser profile identifier")
    ),
    request_body = MoveBrowserRequest,
    responses(
        (status = 200, description = "Browser moved to target tenant", body = BrowserResponse),
        (status = 400, description = "Invalid browser ID or target tenantId", body = crate::core::error::ApiErrorResponse),
        (status = 404, description = "Browser profile not found", body = crate::core::error::ApiErrorResponse),
        (status = 409, description = "Cannot move a running browser profile", body = crate::core::error::ApiErrorResponse)
    )
)]
pub async fn move_browser(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<MoveBrowserRequest>,
) -> Result<Json<BrowserResponse>, AutomationError> {
    if !is_valid_id(&id) {
        return Err(AutomationError::BadRequest(
            "Invalid browser ID".to_string(),
        ));
    }
    if req.target_tenant_id.trim().is_empty() {
        return Err(AutomationError::BadRequest(
            "targetTenantId is required".to_string(),
        ));
    }
    let target_tenant = resolve_tenant_id(Some(&req.target_tenant_id))?;

    if is_browser_running(&id).await {
        return Err(AutomationError::Conflict(format!(
            "Stop browser '{}' before moving it to another tenant",
            id
        )));
    }

    let (moved, old_tenant, settings) = {
        let db = state.db.lock().await;
        let existing = db
            .browsers()
            .get_browser(&id)
            .map_err(|e| AutomationError::DatabaseError(e.to_string()))?
            .ok_or_else(|| AutomationError::NotFound(format!("Browser '{}' not found", id)))?;
        let old_tenant = existing.tenant_id.clone();

        db.browsers()
            .move_browser_tenant(&id, &target_tenant)
            .map_err(|e| AutomationError::DatabaseError(e.to_string()))?;

        let mut settings = db.settings().get_settings().unwrap_or_default();
        if old_tenant != target_tenant
            && settings.browser.get_default_profile_for(&old_tenant) == Some(id.as_str())
        {
            settings.browser.set_default_profile_for(&old_tenant, None);
            let _ = db.settings().save_settings(&settings);
        }

        let updated = db
            .browsers()
            .get_browser(&id)
            .map_err(|e| AutomationError::DatabaseError(e.to_string()))?
            .ok_or_else(|| AutomationError::NotFound(format!("Browser '{}' not found", id)))?;
        (updated, old_tenant, settings)
    };

    emit_browser_event(
        &state,
        "move",
        &id,
        &target_tenant,
        Some(json!({ "sourceTenantId": old_tenant })),
    );
    Ok(Json(build_browser_response(
        moved, &settings, false, None, None,
    )))
}

#[derive(Serialize, Deserialize, ToSchema, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UnbindBrowserResponse {
    pub success: bool,
    pub message: String,
    pub id: String,
    pub cloud_released: bool,
}

#[utoipa::path(
    tag = "Browsers",
    post,
    path = "/api/v1/browsers/{id}/unbind",
    operation_id = "unbind_browser",
    summary = "Unbind Cloud lease / device lock for a browser profile",
    description = "Releases remote Cloud device lease if enrolled and resets local lease metadata cleanly.",
    params(
        ("id" = String, Path, description = "Unique browser profile identifier")
    ),
    responses(
        (status = 200, description = "Profile lease unbound", body = UnbindBrowserResponse),
        (status = 400, description = "Invalid browser ID", body = crate::core::error::ApiErrorResponse),
        (status = 404, description = "Browser profile not found", body = crate::core::error::ApiErrorResponse),
        (status = 409, description = "Cannot unbind an actively running browser session", body = crate::core::error::ApiErrorResponse)
    )
)]
pub async fn unbind_browser(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<UnbindBrowserResponse>, AutomationError> {
    if !is_valid_id(&id) {
        return Err(AutomationError::BadRequest(
            "Invalid browser ID".to_string(),
        ));
    }

    let profile = {
        let db = state.db.lock().await;
        db.browsers()
            .get_browser(&id)
            .map_err(|e| AutomationError::DatabaseError(e.to_string()))?
            .ok_or_else(|| AutomationError::NotFound(format!("Browser '{}' not found", id)))?
    };

    if is_browser_running(&id).await {
        return Err(AutomationError::Conflict(format!(
            "Stop browser '{}' before unbinding its device lease",
            id
        )));
    }

    let mut cloud_released = false;
    if let Some(creds) =
        crate::infrastructure::cloud::CredentialStore::load(&state.config.data_dir).await
        && let Ok(cloud_url) = crate::infrastructure::cloud::resolve_supabase_url(
            state.config.cloud_url.as_deref(),
            creds.cloud_url.as_deref(),
        )
        && let Ok(anon_key) =
            crate::infrastructure::cloud::resolve_supabase_anon_key(creds.api_key.as_deref())
    {
        let client = reqwest::Client::new();
        let rpc_url = format!(
            "{}/rest/v1/rpc/release_browser",
            cloud_url.trim_end_matches('/')
        );
        if let Ok(resp) = client
            .post(&rpc_url)
            .header("apikey", &anon_key)
            .header("Authorization", format!("Bearer {}", anon_key))
            .json(&json!({
                "p_browser_id": id,
                "p_device_id": creds.device_id,
                "p_device_token": creds.device_token
            }))
            .send()
            .await
            && resp.status().is_success()
        {
            cloud_released = true;
        }
    }

    emit_browser_event(
        &state,
        "unbind",
        &id,
        &profile.tenant_id,
        Some(json!({ "cloudReleased": cloud_released })),
    );

    Ok(Json(UnbindBrowserResponse {
        success: true,
        message: if cloud_released {
            format!("Released Cloud device lease for '{}'", id)
        } else {
            format!("Unbound local lease state for '{}'", id)
        },
        id,
        cloud_released,
    }))
}

#[derive(Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SetDefaultBrowserResponse {
    pub success: bool,
    pub message: String,
    pub tenant_id: String,
    pub default_profile_id: String,
}

#[utoipa::path(
    tag = "Browsers",
    post,
    path = "/api/v1/browsers/{id}/set-default",
    operation_id = "set_default_browser",
    summary = "Set default browser profile for its tenant",
    description = "Updates per-tenant default browser profile in daemon settings.",
    params(
        ("id" = String, Path, description = "Unique browser profile identifier")
    ),
    responses(
        (status = 200, description = "Default browser updated successfully", body = SetDefaultBrowserResponse),
        (status = 400, description = "Invalid browser ID", body = crate::core::error::ApiErrorResponse),
        (status = 404, description = "Browser profile not found", body = crate::core::error::ApiErrorResponse)
    )
)]
pub async fn set_default_browser(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<SetDefaultBrowserResponse>, AutomationError> {
    if !is_valid_id(&id) {
        return Err(AutomationError::BadRequest(
            "Invalid browser ID".to_string(),
        ));
    }

    let db = state.db.lock().await;
    let existing = db
        .browsers()
        .get_browser(&id)
        .map_err(|e| AutomationError::DatabaseError(e.to_string()))?;

    let tenant_id = match existing {
        Some(b) => b.tenant_id,
        None if id == "default" => DEFAULT_TENANT_ID.to_string(),
        None => {
            return Err(AutomationError::NotFound(format!(
                "Browser profile '{}' not found",
                id
            )));
        }
    };

    let mut settings = db.settings().get_settings().unwrap_or_default();
    settings
        .browser
        .set_default_profile_for(&tenant_id, Some(id.clone()));
    db.settings()
        .save_settings(&settings)
        .map_err(|e| AutomationError::DatabaseError(e.to_string()))?;

    let _ = state.tx.send(
        json!({
            "type": "settings_updated",
            "tenantId": tenant_id,
            "default_profile_id": id
        })
        .to_string(),
    );

    Ok(Json(SetDefaultBrowserResponse {
        success: true,
        message: format!("Profile '{}' set as default browser", id),
        tenant_id,
        default_profile_id: id,
    }))
}

#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ProbeProxyRequest {
    pub proxy: String,
    #[serde(default)]
    pub timeout_secs: Option<u64>,
}

#[derive(Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ProbeProxyResponse {
    pub proxy_url: String,
    pub protocol: String,
    pub alive: bool,
    pub rtt_ms: u64,
    pub egress_ip: Option<String>,
    pub country: Option<String>,
    pub colo: Option<String>,
    pub error: Option<String>,
}

#[utoipa::path(
    tag = "Browsers",
    post,
    path = "/api/v1/browsers/proxy/probe",
    operation_id = "probe_browser_proxy",
    summary = "Test proxy connectivity and egress latency",
    description = "Runs a pre-flight HTTP/SOCKS5 proxy probe via Cloudflare trace without launching Chromium.",
    request_body = ProbeProxyRequest,
    responses(
        (status = 200, description = "Proxy diagnostic result", body = ProbeProxyResponse),
        (status = 400, description = "Invalid proxy URI", body = crate::core::error::ApiErrorResponse)
    )
)]
pub async fn probe_browser_proxy(
    Json(req): Json<ProbeProxyRequest>,
) -> Result<Json<ProbeProxyResponse>, AutomationError> {
    let proxy = validate_proxy_uri(Some(&req.proxy))?
        .ok_or_else(|| AutomationError::BadRequest("Proxy URL is required".to_string()))?;
    let timeout = req.timeout_secs.unwrap_or(5).clamp(1, 15);
    let res = browser::ProxyProbe::probe(&proxy, timeout).await;
    Ok(Json(ProbeProxyResponse {
        proxy_url: res.proxy_url,
        protocol: res.protocol,
        alive: res.alive,
        rtt_ms: res.rtt_ms,
        egress_ip: res.egress_ip,
        country: res.country,
        colo: res.colo,
        error: res.error,
    }))
}

#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct BatchDeleteBrowsersRequest {
    pub ids: Vec<String>,
    #[serde(default)]
    pub force: Option<bool>,
}

#[derive(Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct BatchDeleteFailure {
    pub id: String,
    pub reason: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct BatchDeleteBrowsersResponse {
    pub deleted: Vec<String>,
    pub skipped: Vec<BatchDeleteFailure>,
    pub errors: Vec<BatchDeleteFailure>,
}

#[utoipa::path(
    tag = "Browsers",
    post,
    path = "/api/v1/browsers/batch/delete",
    operation_id = "batch_delete_browsers",
    summary = "Batch delete multiple browser profiles",
    description = "Deletes multiple profiles with per-ID result reporting (skipping running profiles unless force=true).",
    request_body = BatchDeleteBrowsersRequest,
    responses(
        (status = 200, description = "Batch delete summary", body = BatchDeleteBrowsersResponse)
    )
)]
pub async fn batch_delete_browsers(
    State(state): State<AppState>,
    Json(req): Json<BatchDeleteBrowsersRequest>,
) -> Json<BatchDeleteBrowsersResponse> {
    let force = req.force.unwrap_or(false);
    let mut deleted = Vec::new();
    let mut skipped = Vec::new();
    let mut errors = Vec::new();

    for id in req.ids {
        match perform_delete_browser(&state, &id, force).await {
            Ok(_) => deleted.push(id),
            Err(AutomationError::Conflict(reason)) => {
                skipped.push(BatchDeleteFailure { id, reason })
            }
            Err(AutomationError::NotFound(reason)) => {
                skipped.push(BatchDeleteFailure { id, reason })
            }
            Err(e) => errors.push(BatchDeleteFailure {
                id,
                reason: e.to_string(),
            }),
        }
    }

    Json(BatchDeleteBrowsersResponse {
        deleted,
        skipped,
        errors,
    })
}

#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateExtensionsRequest {
    pub extensions: Vec<String>,
    #[serde(default)]
    pub allow_remove_automation: Option<bool>,
}

#[utoipa::path(
    tag = "Browsers",
    put,
    path = "/api/v1/browsers/{id}/extensions",
    operation_id = "update_browser_extensions",
    summary = "Set configured extensions for a browser profile",
    description = "Replaces the profile's configured extension list while protecting core 'automation' unless explicitly allowed.",
    params(
        ("id" = String, Path, description = "Unique browser profile identifier")
    ),
    request_body = UpdateExtensionsRequest,
    responses(
        (status = 200, description = "Updated browser profile", body = BrowserResponse),
        (status = 400, description = "Invalid browser ID", body = crate::core::error::ApiErrorResponse),
        (status = 404, description = "Browser profile not found", body = crate::core::error::ApiErrorResponse)
    )
)]
pub async fn update_browser_extensions(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<UpdateExtensionsRequest>,
) -> Result<Json<BrowserResponse>, AutomationError> {
    if !is_valid_id(&id) {
        return Err(AutomationError::BadRequest(
            "Invalid browser ID".to_string(),
        ));
    }
    let clean = normalize_extensions(
        &req.extensions,
        !req.allow_remove_automation.unwrap_or(false),
    );

    let (updated, settings) = {
        let db = state.db.lock().await;
        if db
            .browsers()
            .get_browser(&id)
            .map_err(|e| AutomationError::DatabaseError(e.to_string()))?
            .is_none()
        {
            return Err(AutomationError::NotFound(format!(
                "Browser '{}' not found",
                id
            )));
        }
        db.browsers()
            .patch_browser(
                &id,
                &PatchBrowserRecord {
                    extensions: Some(&clean),
                    ..Default::default()
                },
            )
            .map_err(|e| AutomationError::DatabaseError(e.to_string()))?;
        let record = db
            .browsers()
            .get_browser(&id)
            .map_err(|e| AutomationError::DatabaseError(e.to_string()))?
            .ok_or_else(|| AutomationError::NotFound(format!("Browser '{}' not found", id)))?;
        let settings = db.settings().get_settings().unwrap_or_default();
        (record, settings)
    };

    emit_browser_event(&state, "update", &updated.id, &updated.tenant_id, None);
    let is_online = is_browser_running(&id).await;
    Ok(Json(build_browser_response(
        updated, &settings, is_online, None, None,
    )))
}

#[derive(Debug, Deserialize, ToSchema, Default, Clone)]
#[serde(rename_all = "camelCase")]
#[schema(example = json!({
    "headless": false,
    "startUrl": "https://www.google.com",
    "proxy": "socks5://127.0.0.1:1080",
    "args": ["--start-maximized"]
}))]
/// Request options when initiating a browser session
pub struct StartBrowserSessionRequest {
    pub headless: Option<bool>,
    pub start_url: Option<String>,
    pub proxy: Option<String>,
    pub args: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "camelCase")]
/// Response descriptor containing active browser session connection parameters
pub struct StartBrowserSessionResponse {
    pub status: String,
    pub message: String,
    pub browser_id: String,
    pub pid: Option<u32>,
    pub debugging_port: Option<u16>,
    pub ws_url: Option<String>,
    pub user_data_dir: Option<String>,
}

fn push_antidetect_args(
    args: &mut Vec<String>,
    fp: &FingerprintConfig,
    has_proxy: bool,
    has_grid: bool,
) {
    if let Some(seed) = fp.seed {
        args.push(format!("--fingerprint={}", seed));
    }
    if let Some(ref platform) = fp.os_platform
        && !platform.trim().is_empty()
    {
        args.push(format!("--fingerprint-platform={}", platform.trim()));
    }
    if let Some(ref ver) = fp.os_version
        && !ver.trim().is_empty()
    {
        args.push(format!("--fingerprint-platform-version={}", ver.trim()));
    }
    if let Some(cores) = fp.hardware_concurrency {
        args.push(format!("--fingerprint-hardware-concurrency={}", cores));
    }
    if let Some(ram) = fp.device_memory_gb {
        args.push(format!("--fingerprint-device-memory={}", ram));
    }
    if let Some(ref lang) = fp.lang
        && !lang.trim().is_empty()
    {
        args.push(format!("--lang={}", lang.trim()));
    }
    if let Some(ref accept_lang) = fp.accept_lang
        && !accept_lang.trim().is_empty()
    {
        args.push(format!("--accept-lang={}", accept_lang.trim()));
    }
    if !has_grid && let (Some(w), Some(h)) = (fp.screen_width, fp.screen_height) {
        args.push(format!("--window-size={},{}", w, h));
    }
    if let Some(dpr) = fp.device_pixel_ratio {
        args.push(format!("--force-device-scale-factor={:.2}", dpr));
    }
    if has_proxy && fp.webrtc_mode.as_deref() != Some("default") {
        args.push("--disable-non-proxied-udp".to_string());
    }
}

#[utoipa::path(
    tag = "Browsers",
    post,
    path = "/api/v1/browsers/{id}/session",
    operation_id = "start_browser",
    summary = "Launch isolated browser profile instance",
    description = "Spawns a Chromium process with deterministic antidetect fingerprint args, proxy shield, and extensions.",
    params(
        ("id" = String, Path, description = "Unique browser profile identifier")
    ),
    request_body = StartBrowserSessionRequest,
    responses(
        (status = 200, description = "Browser session started", body = StartBrowserSessionResponse),
        (status = 400, description = "Invalid browser ID or configuration error", body = crate::core::error::ApiErrorResponse),
        (status = 500, description = "Process spawn failure", body = crate::core::error::ApiErrorResponse)
    )
)]
pub async fn start_browser(
    State(state): State<crate::AppState>,
    Path(browser_id): Path<String>,
    body: Bytes,
) -> Result<Json<StartBrowserSessionResponse>, AutomationError> {
    if !is_valid_id(&browser_id) {
        return Err(AutomationError::BadRequest(
            "Invalid browser ID".to_string(),
        ));
    }

    let req: StartBrowserSessionRequest = if body.is_empty() {
        StartBrowserSessionRequest::default()
    } else {
        serde_json::from_slice(&body).unwrap_or_default()
    };

    let _lock =
        crate::core::browser::worker_coordinator::get_browser_launcher_lock(&browser_id).await;

    let existing_session = {
        let registry = browser_registry().read().await;
        let pid_opt = registry.get(&browser_id).copied();
        if let Some(pid) = pid_opt {
            let mut sys = sysinfo::System::new();
            sys.refresh_processes(sysinfo::ProcessesToUpdate::All, false);
            if sys.process(sysinfo::Pid::from_u32(pid)).is_some() {
                crate::core::browser::manager::browser_sessions()
                    .read()
                    .await
                    .get(&browser_id)
                    .cloned()
            } else {
                None
            }
        } else {
            None
        }
    };

    if let Some(sess) = existing_session {
        return Ok(Json(StartBrowserSessionResponse {
            status: "success".to_string(),
            message: "Browser session already running".to_string(),
            browser_id,
            pid: Some(sess.pid),
            debugging_port: Some(sess.debugging_port),
            ws_url: Some(sess.ws_url),
            user_data_dir: Some(sess.user_data_dir),
        }));
    }

    {
        browser_registry().write().await.remove(&browser_id);
        crate::core::browser::manager::browser_sessions()
            .write()
            .await
            .remove(&browser_id);
    }

    let ext_path = crate::core::browser::worker_coordinator::resolve_cli_runner_extension_path();
    let browsers_base_path = get_browsers_base_path(&state.config.data_dir).await;
    let target_dir = std::path::Path::new(&state.config.data_dir)
        .join(&browsers_base_path)
        .join(&browser_id);
    crate::core::browser::manager::sanitize_browser_profile(&target_dir, false).await;

    if let Err(e) = unzip_browser_folder(&browser_id, &state.config.data_dir).await {
        tracing::error!("Failed to unzip browser folder: {}", e);
        return Err(AutomationError::Internal(format!(
            "Failed to unzip browser: {}",
            e
        )));
    }

    let (profile_opt, app_settings) = {
        let db = state.db.lock().await;
        let prof = db.browsers().get_browser(&browser_id).ok().flatten();
        let settings = db.settings().get_settings().unwrap_or_default();
        (prof, settings)
    };

    let (tenant_id, db_user_agent, db_timezone, db_proxy, db_extensions, db_fp, db_flags) =
        match profile_opt {
            Some(p) => (
                p.tenant_id,
                p.user_agent,
                p.timezone,
                p.proxy,
                p.extensions,
                p.fingerprint_config,
                p.startup_flags,
            ),
            None => (
                DEFAULT_TENANT_ID.to_string(),
                None,
                None,
                None,
                None,
                FingerprintConfig::default(),
                Vec::new(),
            ),
        };

    let mut custom_args = Vec::new();
    if app_settings.grid.enabled {
        let active_browsers_count = connected_browsers().read().await.len() as u32;
        let (pos_x, pos_y, slot_w, slot_h) = app_settings
            .grid
            .calculate_slot_bounds(active_browsers_count);
        custom_args.push(format!("--window-position={},{}", pos_x, pos_y));
        custom_args.push(format!("--window-size={},{}", slot_w, slot_h));
    }

    let effective_ua = db_user_agent.or(app_settings.browser.default_user_agent);
    if let Some(ref ua) = effective_ua
        && !ua.is_empty()
    {
        custom_args.push(format!("--user-agent={}", ua));
    }

    if let Some(ref tz) = db_timezone
        && !tz.is_empty()
    {
        custom_args.push(format!("--timezone={}", tz));
    }

    let effective_proxy = req.proxy.or(db_proxy);
    let has_proxy = effective_proxy
        .as_deref()
        .is_some_and(|p| !p.trim().is_empty());
    if let Some(ref proxy) = effective_proxy
        && !proxy.is_empty()
    {
        custom_args.push(format!("--proxy-server={}", proxy));
    }

    push_antidetect_args(
        &mut custom_args,
        &db_fp,
        has_proxy,
        app_settings.grid.enabled,
    );

    for flag in db_flags {
        if !custom_args.contains(&flag) {
            custom_args.push(flag);
        }
    }

    if let Some(ref extra_args) = req.args {
        custom_args.extend(extra_args.clone());
    }

    if let Some(ref start_url) = req.start_url
        && !start_url.is_empty()
    {
        custom_args.push(start_url.clone());
    }

    let headless = req.headless.unwrap_or(app_settings.browser.headless);
    let default_browser = if app_settings.browser.default_type.is_empty() {
        "chromium".to_string()
    } else {
        app_settings.browser.default_type.clone()
    };

    let profile_ext_ids = db_extensions.unwrap_or_else(|| vec!["automation".to_string()]);
    let resolved_ext_paths = browser::resolve_profile_extension_paths(&profile_ext_ids, true).await;
    let mut ext_path_strings: Vec<String> = resolved_ext_paths
        .into_iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect();
    if ext_path_strings.is_empty() {
        ext_path_strings.push(ext_path);
    }

    let mut manager = BrowserManager::new(BrowserManagerOptions {
        default_browser,
        browser_id: browser_id.clone(),
        headless,
        extension_paths: ext_path_strings,
        custom_args,
        user_data_dir: Some(target_dir.to_string_lossy().to_string()),
    });

    let ws_url = manager
        .launch()
        .await
        .map_err(|e| AutomationError::Internal(format!("Failed to launch browser: {}", e)))?;

    let pid = manager.get_pid();
    let (debugging_port, actual_user_data_dir) = {
        let sessions = crate::core::browser::manager::browser_sessions()
            .read()
            .await;
        if let Some(sess) = sessions.get(&browser_id) {
            (Some(sess.debugging_port), Some(sess.user_data_dir.clone()))
        } else {
            (None, Some(target_dir.to_string_lossy().to_string()))
        }
    };

    let _ = state.tx.send(
        json!({
            "type": "browser_online",
            "id": browser_id,
            "tenantId": tenant_id,
        })
        .to_string(),
    );

    Ok(Json(StartBrowserSessionResponse {
        status: "success".to_string(),
        message: "Browser session launched successfully".to_string(),
        browser_id,
        pid,
        debugging_port,
        ws_url: Some(ws_url),
        user_data_dir: actual_user_data_dir,
    }))
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct StopBrowserQuery {
    /// If true, forcefully kills the process immediately without graceful closing or saving cache
    pub force: Option<bool>,
}

#[utoipa::path(
    tag = "Browsers",
    delete,
    path = "/api/v1/browsers/{id}/session",
    operation_id = "stop_browser_session",
    summary = "Terminate or stop an active browser session",
    description = "Gracefully closes the running browser process (or forcefully if force=true), sanitizes volatile caches, cleans up locks, and syncs profile data.",
    params(
        ("id" = String, Path, description = "Unique browser profile identifier"),
        StopBrowserQuery
    ),
    responses(
        (status = 200, description = "Browser session terminated successfully", body = StopBrowserResponse),
        (status = 400, description = "Invalid browser ID", body = crate::core::error::ApiErrorResponse)
    )
)]
pub async fn stop_browser(
    State(state): State<crate::AppState>,
    Path(browser_id): Path<String>,
    Query(query): Query<StopBrowserQuery>,
) -> Result<Json<StopBrowserResponse>, AutomationError> {
    if !is_valid_id(&browser_id) {
        return Err(AutomationError::BadRequest(
            "Invalid browser ID".to_string(),
        ));
    }

    let is_force = query.force.unwrap_or(false);
    let pid = { browser_registry().read().await.get(&browser_id).copied() };

    let browsers_base_path = get_browsers_base_path(&state.config.data_dir).await;
    let target_dir = std::path::Path::new(&state.config.data_dir)
        .join(&browsers_base_path)
        .join(&browser_id);

    if is_force {
        crate::core::browser::manager::kill_browser_processes(&browser_id, pid).await;
        crate::core::browser::manager::sanitize_browser_profile(&target_dir, true).await;
    } else {
        crate::core::browser::manager::graceful_stop_browser(&browser_id, pid).await;
        crate::core::browser::manager::sanitize_browser_profile(&target_dir, false).await;
    }

    {
        browser_registry().write().await.remove(&browser_id);
        crate::core::browser::manager::browser_sessions()
            .write()
            .await
            .remove(&browser_id);
        connected_browsers().write().await.remove(&browser_id);
    }

    let _ = state
        .tx
        .send(json!({ "type": "browser_offline", "id": browser_id }).to_string());

    if !is_force && let Err(e) = zip_browser_folder(&browser_id, &state.config.data_dir).await {
        tracing::warn!("Browser folder zip skipped or error: {}", e);
    }

    let msg = if is_force {
        "Browser session forcefully terminated"
    } else {
        "Browser session closed and profile sanitized"
    };

    Ok(Json(StopBrowserResponse {
        status: "success".to_string(),
        message: msg.to_string(),
    }))
}

#[derive(serde::Deserialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
#[schema(example = json!({"csvString": "id,name,userAgent,timezone,proxy\nprofile1,Main Profile,,UTC,socks5://127.0.0.1:1080", "tenantId": "local-default"}))]
pub struct ImportCsvPayload {
    #[serde(alias = "csv_string")]
    pub csv_string: String,
    #[serde(default, alias = "tenant_id")]
    pub tenant_id: Option<String>,
}

#[derive(serde::Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ImportCsvResponse {
    pub status: String,
    pub message: String,
    pub imported: usize,
    pub skipped: usize,
    pub errors: Vec<CsvImportError>,
}

#[utoipa::path(
    tag = "Browsers",
    post,
    path = "/api/v1/browsers/import-csv",
    operation_id = "import_browsers_csv",
    summary = "Batch import browser profiles from CSV",
    description = "Parses RFC-4180 CSV rows, validates entries, and inserts valid browser profiles scoped to tenant.",
    request_body = ImportCsvPayload,
    responses(
        (status = 200, description = "CSV profiles parsed and imported", body = ImportCsvResponse)
    )
)]
pub async fn import_csv(
    State(state): State<crate::AppState>,
    Json(payload): Json<ImportCsvPayload>,
) -> axum::response::Json<ImportCsvResponse> {
    let report = {
        let db = state.db.lock().await;
        import_csv_into_db_with_tenant(&db, &payload.csv_string, payload.tenant_id.as_deref())
    };
    let tid = payload
        .tenant_id
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or(DEFAULT_TENANT_ID);

    if report.imported > 0 {
        emit_browser_event(&state, "batch_create", "*", tid, None);
    }

    axum::response::Json(ImportCsvResponse {
        status: "success".to_string(),
        message: format!(
            "Imported {} profiles ({} skipped)",
            report.imported, report.skipped
        ),
        imported: report.imported,
        skipped: report.skipped,
        errors: report.errors,
    })
}

#[derive(serde::Deserialize, utoipa::ToSchema)]
#[schema(example = json!({"extension_path": "C:/extensions/my-custom-plugin"}))]
pub struct SideloadExtensionPayload {
    #[serde(alias = "extensionPath")]
    pub extension_path: String,
}

#[derive(serde::Serialize, utoipa::ToSchema)]
pub struct SideloadExtensionResponse {
    pub status: String,
    pub message: String,
    pub success: bool,
}

#[utoipa::path(
    tag = "Browsers",
    post,
    path = "/api/v1/browsers/{id}/extensions",
    operation_id = "sideload_browser_extension",
    summary = "Sideload unpacked extension into browser profile",
    description = "Validates manifest.json and registers an unpacked extension path on the specified browser profile.",
    params(
        ("id" = String, Path, description = "Unique browser profile identifier")
    ),
    request_body = SideloadExtensionPayload,
    responses(
        (status = 200, description = "Extension sideloaded successfully", body = SideloadExtensionResponse),
        (status = 400, description = "Invalid extension path or manifest", body = crate::core::error::ApiErrorResponse),
        (status = 404, description = "Browser profile not found", body = crate::core::error::ApiErrorResponse)
    )
)]
pub async fn sideload_extension(
    State(state): State<crate::AppState>,
    Path(id): Path<String>,
    Json(payload): Json<SideloadExtensionPayload>,
) -> Result<Json<SideloadExtensionResponse>, AutomationError> {
    if !is_valid_id(&id) {
        return Err(AutomationError::BadRequest(
            "Invalid browser ID".to_string(),
        ));
    }

    let ext_path = std::path::Path::new(&payload.extension_path);
    if !ext_path.exists() {
        return Err(AutomationError::BadRequest(format!(
            "Extension directory does not exist: {}",
            payload.extension_path
        )));
    }

    let manifest_path = ext_path.join("manifest.json");
    if !manifest_path.exists() {
        return Err(AutomationError::BadRequest(format!(
            "manifest.json not found in extension directory: {}",
            payload.extension_path
        )));
    }

    let ext_name = std::fs::read_to_string(&manifest_path)
        .ok()
        .and_then(|c| serde_json::from_str::<serde_json::Value>(&c).ok())
        .and_then(|v| {
            v.get("name")
                .and_then(|n| n.as_str())
                .map(|s| s.to_string())
        })
        .unwrap_or_else(|| {
            ext_path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| "custom-extension".to_string())
        });

    let canonical_path = ext_path
        .canonicalize()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| payload.extension_path.clone());

    let tenant_id = {
        let db = state.db.lock().await;
        let browser = db
            .browsers()
            .get_browser(&id)
            .map_err(|e| AutomationError::DatabaseError(e.to_string()))?
            .ok_or_else(|| {
                AutomationError::NotFound(format!("Browser profile '{}' not found", id))
            })?;

        let mut extensions = browser
            .extensions
            .unwrap_or_else(|| vec!["automation".to_string()]);
        if !extensions.contains(&canonical_path) {
            extensions.push(canonical_path);
        }

        db.browsers()
            .patch_browser(
                &id,
                &PatchBrowserRecord {
                    extensions: Some(extensions.as_slice()),
                    ..Default::default()
                },
            )
            .map_err(|e| AutomationError::DatabaseError(e.to_string()))?;
        browser.tenant_id
    };

    emit_browser_event(&state, "update", &id, &tenant_id, None);

    Ok(Json(SideloadExtensionResponse {
        status: "success".to_string(),
        message: format!("Extension '{}' sideloaded successfully", ext_name),
        success: true,
    }))
}

#[utoipa::path(
    tag = "Browsers",
    post,
    path = "/api/v1/browsers/auto-detect",
    operation_id = "auto_detect_browsers",
    summary = "Ensure managed default Chromium browser profile",
    description = "Ensures standard managed Chromium browser profile is registered in SQLite and configured as default.",
    responses(
        (status = 200, description = "List of all registered browser profiles after detection", body = Vec<BrowserResponse>),
        (status = 500, description = "Database error during auto-detection", body = crate::core::error::ApiErrorResponse)
    )
)]
pub async fn auto_detect_browsers(
    State(state): State<AppState>,
) -> Result<Json<Vec<BrowserResponse>>, AutomationError> {
    let detected = crate::core::browser::resolver::detect_host_browsers();
    let db = state.db.lock().await;

    let existing = db
        .browsers()
        .list_browsers(None, None, None, None)
        .map_err(|e| AutomationError::DatabaseError(e.to_string()))?;

    for host_browser in detected {
        let already_exists = existing
            .iter()
            .any(|b| b.name.eq_ignore_ascii_case(&host_browser.name));
        if !already_exists {
            let id = "default_chromium".to_string();
            if db
                .browsers()
                .get_browser(&id)
                .map_err(|e| AutomationError::DatabaseError(e.to_string()))?
                .is_none()
            {
                let _ =
                    db.browsers()
                        .create_browser(&id, &host_browser.name, None, None, None, None);
            }
        }
    }

    let settings = if let Ok(mut s) = db.settings().get_settings() {
        if s.browser
            .get_default_profile_for(DEFAULT_TENANT_ID)
            .is_none()
        {
            let all = db
                .browsers()
                .list_browsers(Some(DEFAULT_TENANT_ID), None, None, None)
                .unwrap_or_default();
            if let Some(first) = all.first() {
                s.browser
                    .set_default_profile_for(DEFAULT_TENANT_ID, Some(first.id.clone()));
                let _ = db.settings().save_settings(&s);
            }
        }
        s
    } else {
        AppSettings::default()
    };

    let updated_browsers = db
        .browsers()
        .list_browsers(None, None, None, None)
        .map_err(|e| AutomationError::DatabaseError(e.to_string()))?;
    let online_browsers = connected_browsers().read().await.clone();
    let running_registry = browser_registry().read().await.clone();
    let running_sessions: HashMap<String, browser::BrowserSession> =
        crate::core::browser::manager::browser_sessions()
            .read()
            .await
            .clone();

    let response = updated_browsers
        .into_iter()
        .map(|p| {
            let is_online = online_browsers.contains(&p.id) || running_registry.contains_key(&p.id);
            let sess = running_sessions.get(&p.id);
            build_browser_response(p, &settings, is_online, sess, None)
        })
        .collect();

    Ok(Json(response))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::AppConfig;
    use crate::infrastructure::db::AutomationDb;
    use std::collections::HashMap;
    use std::sync::Arc;

    fn create_test_state() -> AppState {
        let db = Arc::new(tokio::sync::Mutex::new(
            AutomationDb::new_in_memory().unwrap(),
        ));
        let config = Arc::new(AppConfig::load());
        let (tx, _rx) = tokio::sync::broadcast::channel(100);
        let (worker_tx, _worker_rx) = tokio::sync::broadcast::channel(100);

        AppState {
            db,
            config,
            tx,
            worker_tx,
            active_jobs: Arc::new(tokio::sync::RwLock::new(HashMap::new())),
        }
    }

    #[tokio::test]
    async fn test_create_get_patch_clone_move_and_delete_guards() {
        let state = create_test_state();
        let create_req = CreateBrowserRequest {
            id: Some("test_browser_profile_1".to_string()),
            tenant_id: Some("tenant-a".to_string()),
            name: "Test Browser 1".to_string(),
            user_agent: Some("TestAgent/1.0".to_string()),
            timezone: Some("UTC".to_string()),
            proxy: Some("socks5://127.0.0.1:1080".to_string()),
            extensions: Some(vec!["automation".to_string(), "ublock".to_string()]),
            ..Default::default()
        };

        let create_res = create_browser(State(state.clone()), Json(create_req))
            .await
            .unwrap();
        assert_eq!(create_res.0.id, "test_browser_profile_1");
        assert!(create_res.0.success);

        // Duplicate ID -> 409 Conflict
        let dup_err = create_browser(
            State(state.clone()),
            Json(CreateBrowserRequest {
                id: Some("test_browser_profile_1".to_string()),
                name: "Duplicate".to_string(),
                ..Default::default()
            }),
        )
        .await
        .unwrap_err();
        assert!(matches!(dup_err, AutomationError::Conflict(_)));

        // Tenant-scoped query
        let list_a = get_browsers(
            State(state.clone()),
            Query(GetBrowsersQuery {
                tenant_id: Some("tenant-a".to_string()),
                ..Default::default()
            }),
        )
        .await
        .unwrap();
        assert_eq!(list_a.len(), 1);
        assert_eq!(list_a[0].tenant_id, "tenant-a");
        assert_eq!(list_a[0].proxy.as_deref(), Some("socks5://127.0.0.1:1080"));

        // PATCH partial update preserves proxy while clearing timezone via explicit null
        let patch_payload: PatchBrowserRequest =
            serde_json::from_value(json!({ "name": "Patched Browser", "timezone": null })).unwrap();
        let patched = patch_browser(
            State(state.clone()),
            Path("test_browser_profile_1".to_string()),
            Json(patch_payload),
        )
        .await
        .unwrap();
        assert_eq!(patched.0.name, "Patched Browser");
        assert_eq!(patched.0.timezone, None);
        assert_eq!(patched.0.proxy.as_deref(), Some("socks5://127.0.0.1:1080"));

        // Clone across tenant with fresh seed
        let cloned = clone_browser(
            State(state.clone()),
            Path("test_browser_profile_1".to_string()),
            Json(CloneBrowserRequest {
                new_id: Some("cloned_1".to_string()),
                target_tenant_id: Some("tenant-b".to_string()),
                ..Default::default()
            }),
        )
        .await
        .unwrap();
        assert_eq!(cloned.0.tenant_id, "tenant-b");
        assert_eq!(cloned.0.name, "Patched Browser (Copy)");

        // Move across tenant
        let moved = move_browser(
            State(state.clone()),
            Path("test_browser_profile_1".to_string()),
            Json(MoveBrowserRequest {
                target_tenant_id: "tenant-b".to_string(),
            }),
        )
        .await
        .unwrap();
        assert_eq!(moved.0.tenant_id, "tenant-b");

        // Update extensions (automation kept by default)
        let updated_exts = update_browser_extensions(
            State(state.clone()),
            Path("test_browser_profile_1".to_string()),
            Json(UpdateExtensionsRequest {
                extensions: vec!["cookie-injector".to_string()],
                allow_remove_automation: None,
            }),
        )
        .await
        .unwrap();
        assert_eq!(
            updated_exts.0.extensions,
            vec!["automation".to_string(), "cookie-injector".to_string()]
        );

        // Batch delete missing + existing
        let batch = batch_delete_browsers(
            State(state.clone()),
            Json(BatchDeleteBrowsersRequest {
                ids: vec![
                    "missing_id".to_string(),
                    "test_browser_profile_1".to_string(),
                    "cloned_1".to_string(),
                ],
                force: Some(false),
            }),
        )
        .await;
        assert_eq!(batch.0.deleted.len(), 2);
        assert_eq!(batch.0.skipped.len(), 1);
    }

    #[tokio::test]
    async fn test_validation_and_404_errors() {
        let state = create_test_state();

        // Blank name -> 400
        let err = create_browser(
            State(state.clone()),
            Json(CreateBrowserRequest {
                name: "   ".to_string(),
                ..Default::default()
            }),
        )
        .await
        .unwrap_err();
        assert!(matches!(err, AutomationError::BadRequest(_)));

        // Invalid proxy -> 400
        let err = create_browser(
            State(state.clone()),
            Json(CreateBrowserRequest {
                name: "Valid Name".to_string(),
                proxy: Some("ftp://invalid:21".to_string()),
                ..Default::default()
            }),
        )
        .await
        .unwrap_err();
        assert!(matches!(err, AutomationError::BadRequest(_)));

        // Missing ID on PUT/PATCH/DELETE -> 404
        let put_err = update_browser(
            State(state.clone()),
            Path("missing_id".to_string()),
            Json(UpdateBrowserRequest {
                name: Some("Valid".to_string()),
                ..Default::default()
            }),
        )
        .await
        .unwrap_err();
        assert!(matches!(put_err, AutomationError::NotFound(_)));

        let del_err = delete_browser(
            State(state.clone()),
            Path("missing_id".to_string()),
            Query(DeleteBrowserQuery::default()),
        )
        .await
        .unwrap_err();
        assert!(matches!(del_err, AutomationError::NotFound(_)));
    }

    #[tokio::test]
    async fn test_set_default_browser_per_tenant() {
        let state = create_test_state();
        let _ = create_browser(
            State(state.clone()),
            Json(CreateBrowserRequest {
                id: Some("p_tenant_1".to_string()),
                tenant_id: Some("tenant-1".to_string()),
                name: "Tenant 1 Profile".to_string(),
                ..Default::default()
            }),
        )
        .await
        .unwrap();

        let set_res = set_default_browser(State(state.clone()), Path("p_tenant_1".to_string()))
            .await
            .unwrap();
        assert!(set_res.0.success);
        assert_eq!(set_res.0.tenant_id, "tenant-1");

        let detail = get_browser_detail(State(state.clone()), Path("p_tenant_1".to_string()))
            .await
            .unwrap();
        assert!(detail.is_default);
    }
}
