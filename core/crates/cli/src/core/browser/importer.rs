use crate::core::models::id::BrowserId;
use crate::infrastructure::db::{
    AutomationDb, CreateBrowserRecord, DEFAULT_TENANT_ID, FingerprintConfig,
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CsvBrowserProfile {
    pub id: Option<String>,
    pub name: String,
    pub user_agent: Option<String>,
    pub timezone: Option<String>,
    pub proxy: Option<String>,
    pub group_name: Option<String>,
    pub tags: Vec<String>,
    pub tenant_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CsvImportError {
    pub row: usize,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CsvImportReport {
    pub imported: usize,
    pub skipped: usize,
    pub errors: Vec<CsvImportError>,
}

/// RFC-4180 aware single CSV line parser supporting quoted fields and escaped `""`.
fn parse_csv_line(line: &str) -> Result<Vec<String>, String> {
    let mut fields = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    let mut chars = line.chars().peekable();

    while let Some(ch) = chars.next() {
        if in_quotes {
            if ch == '"' {
                if chars.peek() == Some(&'"') {
                    chars.next();
                    current.push('"');
                } else {
                    in_quotes = false;
                }
            } else {
                current.push(ch);
            }
        } else {
            match ch {
                '"' if current.trim().is_empty() => {
                    current.clear();
                    in_quotes = true;
                }
                ',' => {
                    fields.push(current.trim().to_string());
                    current.clear();
                }
                _ => current.push(ch),
            }
        }
    }

    if in_quotes {
        return Err("Unterminated quoted CSV field".to_string());
    }

    fields.push(current.trim().to_string());
    Ok(fields)
}

fn non_empty_opt(val: Option<&String>) -> Option<String> {
    val.map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
}

fn is_valid_proxy_scheme(proxy: &str) -> bool {
    let lower = proxy.trim().to_ascii_lowercase();
    (lower.starts_with("http://")
        || lower.starts_with("https://")
        || lower.starts_with("socks5://")
        || lower.starts_with("socks5h://"))
        && proxy.trim().len() > 8
}

/// Parse CSV text containing browser profiles (5+ columns, RFC-4180 quoted)
pub fn parse_csv_profiles(csv_string: &str) -> Vec<CsvBrowserProfile> {
    let mut profiles = Vec::new();
    for line in csv_string.lines().skip(1) {
        if line.trim().is_empty() {
            continue;
        }
        let Ok(parts) = parse_csv_line(line) else {
            continue;
        };
        let id = non_empty_opt(parts.first());
        let name = parts
            .get(1)
            .map(|s| s.trim().to_string())
            .unwrap_or_default();
        if id.is_none() && name.is_empty() {
            continue;
        }
        let user_agent = non_empty_opt(parts.get(2));
        let timezone = non_empty_opt(parts.get(3));
        let proxy = non_empty_opt(parts.get(4));
        let group_name = non_empty_opt(parts.get(5));
        let tags = non_empty_opt(parts.get(6))
            .map(|raw| {
                raw.split(['|', ';'])
                    .map(|t| t.trim().to_string())
                    .filter(|t| !t.is_empty())
                    .collect()
            })
            .unwrap_or_default();
        let tenant_id = non_empty_opt(parts.get(7));

        profiles.push(CsvBrowserProfile {
            id,
            name,
            user_agent,
            timezone,
            proxy,
            group_name,
            tags,
            tenant_id,
        });
    }
    profiles
}

/// Batch import parsed browser profiles into SQLite database with row-level reporting.
pub fn import_csv_into_db_with_tenant(
    db: &AutomationDb,
    csv_string: &str,
    default_tenant_id: Option<&str>,
) -> CsvImportReport {
    let resolved_tenant = default_tenant_id
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or(DEFAULT_TENANT_ID);

    let mut imported = 0usize;
    let mut skipped = 0usize;
    let mut errors = Vec::new();

    for (idx, line) in csv_string.lines().enumerate() {
        let row_num = idx + 1;
        if idx == 0 || line.trim().is_empty() {
            continue;
        }

        let parts = match parse_csv_line(line) {
            Ok(p) => p,
            Err(reason) => {
                skipped += 1;
                errors.push(CsvImportError {
                    row: row_num,
                    reason,
                });
                continue;
            }
        };

        let explicit_id = non_empty_opt(parts.first());
        let name = parts
            .get(1)
            .map(|s| s.trim().to_string())
            .unwrap_or_default();
        if name.is_empty() {
            skipped += 1;
            errors.push(CsvImportError {
                row: row_num,
                reason: "Missing profile name".to_string(),
            });
            continue;
        }

        let final_id = explicit_id
            .unwrap_or_else(|| format!("prf_{}", &uuid::Uuid::new_v4().simple().to_string()[..12]));
        if !BrowserId::new(&final_id).is_valid() {
            skipped += 1;
            errors.push(CsvImportError {
                row: row_num,
                reason: format!("Invalid browser ID '{}'", final_id),
            });
            continue;
        }

        let user_agent = non_empty_opt(parts.get(2));
        let timezone = non_empty_opt(parts.get(3));
        let proxy = non_empty_opt(parts.get(4));
        if let Some(ref pxy) = proxy
            && !is_valid_proxy_scheme(pxy)
        {
            skipped += 1;
            errors.push(CsvImportError {
                row: row_num,
                reason: format!("Invalid proxy scheme '{}'", pxy),
            });
            continue;
        }

        let group_name = non_empty_opt(parts.get(5));
        let tags: Vec<String> = non_empty_opt(parts.get(6))
            .map(|raw| {
                raw.split(['|', ';'])
                    .map(|t| t.trim().to_string())
                    .filter(|t| !t.is_empty())
                    .collect()
            })
            .unwrap_or_default();
        let tenant_id = non_empty_opt(parts.get(7)).unwrap_or_else(|| resolved_tenant.to_string());

        if let Ok(Some(_)) = db.browsers().get_browser(&final_id) {
            skipped += 1;
            errors.push(CsvImportError {
                row: row_num,
                reason: format!("Duplicate browser ID '{}'", final_id),
            });
            continue;
        }

        let default_exts = vec!["automation".to_string()];
        let fp = FingerprintConfig {
            os_platform: Some("windows".to_string()),
            webrtc_mode: Some("proxy_shielded".to_string()),
            ..Default::default()
        };

        match db.browsers().create_browser_record(&CreateBrowserRecord {
            id: &final_id,
            tenant_id: &tenant_id,
            name: &name,
            group_name: group_name.as_deref(),
            tags: Some(&tags),
            user_agent: user_agent.as_deref(),
            timezone: timezone.as_deref(),
            proxy: proxy.as_deref(),
            extensions: Some(&default_exts),
            fingerprint_config: Some(&fp),
            startup_flags: None,
        }) {
            Ok(()) => imported += 1,
            Err(e) => {
                skipped += 1;
                errors.push(CsvImportError {
                    row: row_num,
                    reason: e.to_string(),
                });
            }
        }
    }

    CsvImportReport {
        imported,
        skipped,
        errors,
    }
}

/// Backward-compatible wrapper defaulting to `'local-default'` tenant.
pub fn import_csv_into_db(db: &AutomationDb, csv_string: &str) -> usize {
    import_csv_into_db_with_tenant(db, csv_string, None).imported
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_csv_profiles_and_quotes() {
        let csv = "id,name,userAgent,timezone,proxy\np1,Profile 1,\"Mozilla/5.0 (Windows NT 10.0; Win64; x64, Chrome)\",UTC,socks5://127.0.0.1:1080\np2,Profile 2,,,";
        let parsed = parse_csv_profiles(csv);
        assert_eq!(parsed.len(), 2);
        assert_eq!(parsed[0].id.as_deref(), Some("p1"));
        assert_eq!(parsed[0].name, "Profile 1");
        assert_eq!(
            parsed[0].user_agent.as_deref(),
            Some("Mozilla/5.0 (Windows NT 10.0; Win64; x64, Chrome)")
        );
        assert_eq!(parsed[0].timezone.as_deref(), Some("UTC"));
        assert_eq!(parsed[0].proxy.as_deref(), Some("socks5://127.0.0.1:1080"));

        assert_eq!(parsed[1].id.as_deref(), Some("p2"));
        assert_eq!(parsed[1].name, "Profile 2");
        assert_eq!(parsed[1].user_agent, None);
        assert_eq!(parsed[1].timezone, None);
        assert_eq!(parsed[1].proxy, None);
    }

    #[test]
    fn test_import_csv_reports_errors_and_tenants() {
        let db = AutomationDb::new_in_memory().unwrap();
        let csv = "id,name,userAgent,timezone,proxy,group,tags\np_ok,Good Profile,,UTC,socks5://127.0.0.1:1080,marketing,vip|sea\n,Auto Id Profile,,UTC,,,\np_bad_name,,,UTC,,,\np_bad_proxy,Bad Proxy,,UTC,ftp://bad-proxy:21,,";
        let report = import_csv_into_db_with_tenant(&db, csv, Some("tenant-custom"));
        assert_eq!(report.imported, 2);
        assert_eq!(report.skipped, 2);
        assert_eq!(report.errors.len(), 2);
        assert_eq!(report.errors[0].row, 4);
        assert_eq!(report.errors[1].row, 5);

        let items = db
            .browsers()
            .list_browsers(Some("tenant-custom"), None, None, None)
            .unwrap();
        assert_eq!(items.len(), 2);
    }
}
