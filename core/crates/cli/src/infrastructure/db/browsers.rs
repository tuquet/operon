use rusqlite::{Connection, Result, params};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

pub const DEFAULT_TENANT_ID: &str = "local-default";

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct FingerprintConfig {
    #[serde(default)]
    pub seed: Option<u32>,
    #[serde(default)]
    pub os_platform: Option<String>,
    #[serde(default)]
    pub os_version: Option<String>,
    #[serde(default)]
    pub hardware_concurrency: Option<u32>,
    #[serde(default)]
    pub device_memory_gb: Option<u32>,
    #[serde(default)]
    pub screen_width: Option<u32>,
    #[serde(default)]
    pub screen_height: Option<u32>,
    #[serde(default)]
    pub device_pixel_ratio: Option<f32>,
    #[serde(default)]
    pub webrtc_mode: Option<String>,
    #[serde(default)]
    pub noise_level: Option<String>,
    #[serde(default)]
    pub lang: Option<String>,
    #[serde(default)]
    pub accept_lang: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
pub struct Browser {
    pub id: String,
    pub tenant_id: String,
    pub name: String,
    pub group_name: Option<String>,
    pub tags: Vec<String>,
    pub user_agent: Option<String>,
    pub timezone: Option<String>,
    pub proxy: Option<String>,
    pub extensions: Option<Vec<String>>,
    pub fingerprint_config: FingerprintConfig,
    pub startup_flags: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone)]
pub struct CreateBrowserRecord<'a> {
    pub id: &'a str,
    pub tenant_id: &'a str,
    pub name: &'a str,
    pub group_name: Option<&'a str>,
    pub tags: Option<&'a [String]>,
    pub user_agent: Option<&'a str>,
    pub timezone: Option<&'a str>,
    pub proxy: Option<&'a str>,
    pub extensions: Option<&'a [String]>,
    pub fingerprint_config: Option<&'a FingerprintConfig>,
    pub startup_flags: Option<&'a [String]>,
}

#[derive(Debug, Clone, Default)]
pub struct PatchBrowserRecord<'a> {
    pub name: Option<&'a str>,
    pub group_name: Option<Option<&'a str>>,
    pub tags: Option<&'a [String]>,
    pub user_agent: Option<Option<&'a str>>,
    pub timezone: Option<Option<&'a str>>,
    pub proxy: Option<Option<&'a str>>,
    pub extensions: Option<&'a [String]>,
    pub fingerprint_config: Option<&'a FingerprintConfig>,
    pub startup_flags: Option<&'a [String]>,
}

fn parse_extensions(raw: Option<String>) -> Vec<String> {
    match raw {
        Some(s) if !s.trim().is_empty() => {
            serde_json::from_str(&s).unwrap_or_else(|_| vec!["automation".to_string()])
        }
        _ => vec!["automation".to_string()],
    }
}

fn parse_string_vec(raw: Option<String>) -> Vec<String> {
    match raw {
        Some(s) if !s.trim().is_empty() => serde_json::from_str(&s).unwrap_or_default(),
        _ => Vec::new(),
    }
}

fn parse_fingerprint(raw: Option<String>) -> FingerprintConfig {
    match raw {
        Some(s) if !s.trim().is_empty() => serde_json::from_str(&s).unwrap_or_default(),
        _ => FingerprintConfig::default(),
    }
}

fn map_browser_row(row: &rusqlite::Row<'_>) -> Result<Browser> {
    let tags_raw: Option<String> = row.get(4)?;
    let exts_raw: Option<String> = row.get(8)?;
    let fp_raw: Option<String> = row.get(9)?;
    let flags_raw: Option<String> = row.get(10)?;

    Ok(Browser {
        id: row.get(0)?,
        tenant_id: row
            .get::<_, Option<String>>(1)?
            .unwrap_or_else(|| DEFAULT_TENANT_ID.to_string()),
        name: row.get(2)?,
        group_name: row.get(3)?,
        tags: parse_string_vec(tags_raw),
        user_agent: row.get(5)?,
        timezone: row.get(6)?,
        proxy: row.get(7)?,
        extensions: Some(parse_extensions(exts_raw)),
        fingerprint_config: parse_fingerprint(fp_raw),
        startup_flags: parse_string_vec(flags_raw),
        created_at: row.get(11)?,
        updated_at: row.get(12)?,
    })
}

const BROWSER_SELECT_COLS: &str = "id, tenant_id, name, group_name, tags, user_agent, timezone, proxy, extensions, fingerprint_config, startup_flags, created_at, updated_at";

pub struct SqliteBrowserRepository<'a> {
    pub conn: &'a Connection,
}

impl<'a> SqliteBrowserRepository<'a> {
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    pub fn create_browser_record(&self, input: &CreateBrowserRecord<'_>) -> Result<()> {
        let tenant_id = if input.tenant_id.trim().is_empty() {
            DEFAULT_TENANT_ID
        } else {
            input.tenant_id.trim()
        };
        let group_name = input.group_name.unwrap_or("default");
        let tags_json = input
            .tags
            .map(|t| serde_json::to_string(t).unwrap_or_else(|_| "[]".to_string()))
            .unwrap_or_else(|| "[]".to_string());
        let exts_json = input
            .extensions
            .map(|e| serde_json::to_string(e).unwrap_or_else(|_| "[\"automation\"]".to_string()))
            .unwrap_or_else(|| "[\"automation\"]".to_string());
        let fp_json = input
            .fingerprint_config
            .map(|fp| serde_json::to_string(fp).unwrap_or_else(|_| "{}".to_string()))
            .unwrap_or_else(|| "{}".to_string());
        let flags_json = input
            .startup_flags
            .map(|f| serde_json::to_string(f).unwrap_or_else(|_| "[]".to_string()))
            .unwrap_or_else(|| "[]".to_string());

        self.conn.execute(
            "INSERT INTO browsers (id, tenant_id, name, group_name, tags, user_agent, timezone, proxy, extensions, fingerprint_config, startup_flags) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                input.id,
                tenant_id,
                input.name,
                group_name,
                tags_json,
                input.user_agent,
                input.timezone,
                input.proxy,
                exts_json,
                fp_json,
                flags_json
            ],
        )?;
        Ok(())
    }

    pub fn create_browser(
        &self,
        id: &str,
        name: &str,
        user_agent: Option<&str>,
        timezone: Option<&str>,
        proxy: Option<&str>,
        extensions: Option<&[String]>,
    ) -> Result<()> {
        self.create_browser_record(&CreateBrowserRecord {
            id,
            tenant_id: DEFAULT_TENANT_ID,
            name,
            group_name: None,
            tags: None,
            user_agent,
            timezone,
            proxy,
            extensions,
            fingerprint_config: None,
            startup_flags: None,
        })
    }

    pub fn list_browsers(
        &self,
        tenant_id: Option<&str>,
        limit: Option<usize>,
        offset: Option<usize>,
        search: Option<&str>,
    ) -> Result<Vec<Browser>> {
        let l = limit.map(|v| v as i64).unwrap_or(-1);
        let o = offset.unwrap_or(0) as i64;
        let search_pattern = search
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(|s| format!("%{}%", s));
        let tenant_clean = tenant_id.map(str::trim).filter(|s| !s.is_empty());

        let mut browsers = Vec::new();
        match (tenant_clean, search_pattern) {
            (Some(tid), Some(pattern)) => {
                let sql = format!(
                    "SELECT {BROWSER_SELECT_COLS} FROM browsers WHERE tenant_id = ?1 AND (name LIKE ?2 OR id LIKE ?2 OR COALESCE(group_name, '') LIKE ?2 OR COALESCE(proxy, '') LIKE ?2) ORDER BY name ASC LIMIT ?3 OFFSET ?4"
                );
                let mut stmt = self.conn.prepare(&sql)?;
                let rows = stmt.query_map(params![tid, pattern, l, o], map_browser_row)?;
                for row in rows {
                    browsers.push(row?);
                }
            }
            (Some(tid), None) => {
                let sql = format!(
                    "SELECT {BROWSER_SELECT_COLS} FROM browsers WHERE tenant_id = ?1 ORDER BY name ASC LIMIT ?2 OFFSET ?3"
                );
                let mut stmt = self.conn.prepare(&sql)?;
                let rows = stmt.query_map(params![tid, l, o], map_browser_row)?;
                for row in rows {
                    browsers.push(row?);
                }
            }
            (None, Some(pattern)) => {
                let sql = format!(
                    "SELECT {BROWSER_SELECT_COLS} FROM browsers WHERE (name LIKE ?1 OR id LIKE ?1 OR COALESCE(group_name, '') LIKE ?1 OR COALESCE(proxy, '') LIKE ?1) ORDER BY name ASC LIMIT ?2 OFFSET ?3"
                );
                let mut stmt = self.conn.prepare(&sql)?;
                let rows = stmt.query_map(params![pattern, l, o], map_browser_row)?;
                for row in rows {
                    browsers.push(row?);
                }
            }
            (None, None) => {
                let sql = format!(
                    "SELECT {BROWSER_SELECT_COLS} FROM browsers ORDER BY name ASC LIMIT ?1 OFFSET ?2"
                );
                let mut stmt = self.conn.prepare(&sql)?;
                let rows = stmt.query_map(params![l, o], map_browser_row)?;
                for row in rows {
                    browsers.push(row?);
                }
            }
        }

        Ok(browsers)
    }

    pub fn get_browsers(
        &self,
        limit: Option<usize>,
        offset: Option<usize>,
        search: Option<&str>,
    ) -> Result<Vec<Browser>> {
        self.list_browsers(None, limit, offset, search)
    }

    pub fn get_browser(&self, id: &str) -> Result<Option<Browser>> {
        let sql = format!("SELECT {BROWSER_SELECT_COLS} FROM browsers WHERE id = ?1");
        let mut stmt = self.conn.prepare(&sql)?;
        let mut browser_iter = stmt.query_map(params![id], map_browser_row)?;

        if let Some(browser) = browser_iter.next() {
            Ok(Some(browser?))
        } else {
            Ok(None)
        }
    }

    pub fn patch_browser(&self, id: &str, patch: &PatchBrowserRecord<'_>) -> Result<usize> {
        let Some(existing) = self.get_browser(id)? else {
            return Ok(0);
        };

        let next_name = patch.name.unwrap_or(&existing.name);
        let next_group = match patch.group_name {
            Some(v) => v,
            None => existing.group_name.as_deref(),
        };
        let next_tags_json = match patch.tags {
            Some(t) => serde_json::to_string(t).unwrap_or_else(|_| "[]".to_string()),
            None => serde_json::to_string(&existing.tags).unwrap_or_else(|_| "[]".to_string()),
        };
        let next_ua = match patch.user_agent {
            Some(v) => v,
            None => existing.user_agent.as_deref(),
        };
        let next_tz = match patch.timezone {
            Some(v) => v,
            None => existing.timezone.as_deref(),
        };
        let next_proxy = match patch.proxy {
            Some(v) => v,
            None => existing.proxy.as_deref(),
        };
        let next_exts_json = match patch.extensions {
            Some(e) => serde_json::to_string(e).unwrap_or_else(|_| "[\"automation\"]".to_string()),
            None => existing
                .extensions
                .as_ref()
                .map(|e| {
                    serde_json::to_string(e).unwrap_or_else(|_| "[\"automation\"]".to_string())
                })
                .unwrap_or_else(|| "[\"automation\"]".to_string()),
        };
        let next_fp_json = match patch.fingerprint_config {
            Some(fp) => serde_json::to_string(fp).unwrap_or_else(|_| "{}".to_string()),
            None => serde_json::to_string(&existing.fingerprint_config)
                .unwrap_or_else(|_| "{}".to_string()),
        };
        let next_flags_json = match patch.startup_flags {
            Some(f) => serde_json::to_string(f).unwrap_or_else(|_| "[]".to_string()),
            None => {
                serde_json::to_string(&existing.startup_flags).unwrap_or_else(|_| "[]".to_string())
            }
        };

        let affected = self.conn.execute(
            "UPDATE browsers SET name = ?1, group_name = ?2, tags = ?3, user_agent = ?4, timezone = ?5, proxy = ?6, extensions = ?7, fingerprint_config = ?8, startup_flags = ?9, updated_at = CURRENT_TIMESTAMP WHERE id = ?10",
            params![
                next_name,
                next_group,
                next_tags_json,
                next_ua,
                next_tz,
                next_proxy,
                next_exts_json,
                next_fp_json,
                next_flags_json,
                id
            ],
        )?;
        Ok(affected)
    }

    pub fn update_browser(
        &self,
        id: &str,
        name: &str,
        user_agent: Option<&str>,
        timezone: Option<&str>,
        proxy: Option<&str>,
        extensions: Option<&[String]>,
    ) -> Result<()> {
        if let Some(exts) = extensions {
            let exts_json =
                serde_json::to_string(exts).unwrap_or_else(|_| "[\"automation\"]".to_string());
            self.conn.execute(
                "UPDATE browsers SET name = ?1, user_agent = ?2, timezone = ?3, proxy = ?4, extensions = ?5, updated_at = CURRENT_TIMESTAMP WHERE id = ?6",
                params![name, user_agent, timezone, proxy, exts_json, id],
            )?;
        } else {
            self.conn.execute(
                "UPDATE browsers SET name = ?1, user_agent = ?2, timezone = ?3, proxy = ?4, updated_at = CURRENT_TIMESTAMP WHERE id = ?5",
                params![name, user_agent, timezone, proxy, id],
            )?;
        }
        Ok(())
    }

    pub fn move_browser_tenant(&self, id: &str, target_tenant_id: &str) -> Result<usize> {
        let tid = target_tenant_id.trim();
        self.conn.execute(
            "UPDATE browsers SET tenant_id = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            params![tid, id],
        )
    }

    pub fn delete_browser_checked(&self, id: &str) -> Result<usize> {
        self.conn
            .execute("DELETE FROM browsers WHERE id = ?1", params![id])
    }

    pub fn delete_browser(&self, id: &str) -> Result<()> {
        self.delete_browser_checked(id)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::db::AutomationDb;

    #[test]
    fn test_sqlite_browser_repo_crud_and_tenant_scoping() {
        let db = AutomationDb::new_in_memory().unwrap();
        let conn = db.raw_conn();
        let repo = SqliteBrowserRepository::new(conn);

        let initial_exts = vec!["automation".to_string(), "ublock".to_string()];
        let initial_tags = vec!["vip".to_string(), "sea".to_string()];
        let fp = FingerprintConfig {
            seed: Some(42),
            os_platform: Some("windows".to_string()),
            hardware_concurrency: Some(8),
            device_memory_gb: Some(16),
            screen_width: Some(1920),
            screen_height: Some(1080),
            webrtc_mode: Some("proxy_shielded".to_string()),
            ..Default::default()
        };

        repo.create_browser_record(&CreateBrowserRecord {
            id: "b_test_1",
            tenant_id: "tenant-alpha",
            name: "Profile 1",
            group_name: Some("marketing"),
            tags: Some(&initial_tags),
            user_agent: Some("UA/1.0"),
            timezone: Some("UTC"),
            proxy: Some("socks5://127.0.0.1:1080"),
            extensions: Some(&initial_exts),
            fingerprint_config: Some(&fp),
            startup_flags: None,
        })
        .unwrap();

        repo.create_browser(
            "b_default_tenant",
            "Default Tenant Profile",
            None,
            None,
            None,
            None,
        )
        .unwrap();

        let alpha_list = repo
            .list_browsers(Some("tenant-alpha"), None, None, None)
            .unwrap();
        assert_eq!(alpha_list.len(), 1);
        assert_eq!(alpha_list[0].tenant_id, "tenant-alpha");
        assert_eq!(alpha_list[0].fingerprint_config.seed, Some(42));
        assert_eq!(alpha_list[0].tags, initial_tags);

        let default_list = repo
            .list_browsers(Some(DEFAULT_TENANT_ID), None, None, None)
            .unwrap();
        assert_eq!(default_list.len(), 1);
        assert_eq!(default_list[0].id, "b_default_tenant");

        // Partial PATCH preserves omitted fields
        let affected = repo
            .patch_browser(
                "b_test_1",
                &PatchBrowserRecord {
                    name: Some("Profile 1 Renamed"),
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(affected, 1);

        let patched = repo.get_browser("b_test_1").unwrap().unwrap();
        assert_eq!(patched.name, "Profile 1 Renamed");
        assert_eq!(patched.proxy.as_deref(), Some("socks5://127.0.0.1:1080"));
        assert_eq!(patched.fingerprint_config.seed, Some(42));

        // Move tenant
        assert_eq!(
            repo.move_browser_tenant("b_test_1", "tenant-beta").unwrap(),
            1
        );
        assert!(
            repo.list_browsers(Some("tenant-alpha"), None, None, None)
                .unwrap()
                .is_empty()
        );
        assert_eq!(
            repo.list_browsers(Some("tenant-beta"), None, None, None)
                .unwrap()
                .len(),
            1
        );

        // Missing ID returns 0 affected rows
        assert_eq!(repo.delete_browser_checked("missing").unwrap(), 0);
        assert_eq!(repo.delete_browser_checked("b_test_1").unwrap(), 1);
        assert!(repo.get_browser("b_test_1").unwrap().is_none());
    }
}
