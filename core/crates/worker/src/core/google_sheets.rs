//! Google Sheets v4 client used by the `google-sheets` block.
//!
//! Mirrors Automa's `handlerGoogleSheets.js` actions (`get`, `getRange`, `update`, `append`,
//! `clear`, `create`, `add-sheet`) on top of the service-account auth in [`google_auth`].
//! Automa reaches the API from the browser with the extension's Google identity; here the
//! credential comes from the Secret Store.

use std::sync::OnceLock;

use serde_json::{json, Map, Value};

use crate::core::google_auth::{self, ServiceAccount, SHEETS_SCOPE};

const API: &str = "https://sheets.googleapis.com/v4";
/// Automa writes rows as if typed by a user (numbers stay numbers, formulas evaluate).
const VALUE_INPUT: &str = "USER_ENTERED";

fn client() -> &'static reqwest::Client {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new())
    })
}

pub struct SheetsClient {
    token: String,
}

impl SheetsClient {
    /// Builds a client from the service-account secret value.
    pub async fn connect(secret: &Value) -> Result<Self, String> {
        let account = ServiceAccount::parse(secret)?;
        let token = google_auth::access_token(&account, SHEETS_SCOPE).await?;
        Ok(Self { token })
    }

    async fn send(
        &self,
        method: reqwest::Method,
        url: &str,
        body: Option<Value>,
    ) -> Result<Value, String> {
        let mut request = client()
            .request(method, url)
            .bearer_auth(&self.token)
            .header("Accept", "application/json");
        if let Some(payload) = body {
            request = request.json(&payload);
        }
        let response = request
            .send()
            .await
            .map_err(|e| format!("cannot reach Google Sheets API: {e}"))?;
        let status = response.status().as_u16();
        let text = response.text().await.unwrap_or_default();
        if !(200..300).contains(&status) {
            return Err(google_auth::describe_google_error(status, &text));
        }
        if text.trim().is_empty() {
            return Ok(Value::Null);
        }
        serde_json::from_str(&text).map_err(|e| format!("unexpected Sheets API response: {e}"))
    }

    pub async fn get_values(&self, spreadsheet_id: &str, range: &str) -> Result<Value, String> {
        self.send(
            reqwest::Method::GET,
            &values_url(spreadsheet_id, range),
            None,
        )
        .await
    }

    pub async fn append_values(
        &self,
        spreadsheet_id: &str,
        range: &str,
        rows: &[Vec<Value>],
    ) -> Result<Value, String> {
        self.send(
            reqwest::Method::POST,
            &append_url(spreadsheet_id, range),
            Some(json!({ "values": rows })),
        )
        .await
    }

    pub async fn update_values(
        &self,
        spreadsheet_id: &str,
        range: &str,
        rows: &[Vec<Value>],
    ) -> Result<Value, String> {
        self.send(
            reqwest::Method::PUT,
            &update_url(spreadsheet_id, range),
            Some(json!({ "values": rows })),
        )
        .await
    }

    pub async fn clear_values(&self, spreadsheet_id: &str, range: &str) -> Result<Value, String> {
        self.send(
            reqwest::Method::POST,
            &format!(
                "{API}/spreadsheets/{spreadsheet_id}/values/{}:clear",
                encode_range(range)
            ),
            Some(json!({})),
        )
        .await
    }

    /// Automa's `create` action.
    ///
    /// Note for service accounts: Google gives them **no Drive storage quota**, so they cannot
    /// own a brand-new file in "My Drive" — the API answers `403 The caller does not have
    /// permission`. Create the spreadsheet yourself and share it with the service account
    /// (or use a Workspace shared drive) instead of relying on this action.
    pub async fn create_spreadsheet(&self, title: &str) -> Result<Value, String> {
        self.send(
            reqwest::Method::POST,
            &format!("{API}/spreadsheets"),
            Some(json!({ "properties": { "title": title } })),
        )
        .await
        .map_err(|error| {
            if error.contains("Google API 403") {
                format!(
                    "{error} — a service account cannot own a new file (Google gives SAs no Drive \
                     storage quota); create the sheet yourself and share it instead"
                )
            } else {
                error
            }
        })
    }

    pub async fn add_sheet(&self, spreadsheet_id: &str, title: &str) -> Result<Value, String> {
        self.send(
            reqwest::Method::POST,
            &format!("{API}/spreadsheets/{spreadsheet_id}:batchUpdate"),
            Some(json!({
                "requests": [{ "addSheet": { "properties": { "title": title } } }]
            })),
        )
        .await
    }
}

/// Percent-encodes a range for use inside a path segment — `Sheet1!A1:C1` contains `!` and `:`,
/// which are legal in a path but clearer (and safer across proxies) encoded.
fn encode_range(range: &str) -> String {
    range
        .chars()
        .map(|c| match c {
            'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => c.to_string(),
            other => {
                let mut buf = [0u8; 4];
                other
                    .encode_utf8(&mut buf)
                    .bytes()
                    .map(|b| format!("%{b:02X}"))
                    .collect()
            }
        })
        .collect()
}

pub fn values_url(spreadsheet_id: &str, range: &str) -> String {
    format!(
        "{API}/spreadsheets/{spreadsheet_id}/values/{}",
        encode_range(range)
    )
}

pub fn append_url(spreadsheet_id: &str, range: &str) -> String {
    format!(
        "{API}/spreadsheets/{spreadsheet_id}/values/{}:append?valueInputOption={VALUE_INPUT}&insertDataOption=INSERT_ROWS",
        encode_range(range)
    )
}

pub fn update_url(spreadsheet_id: &str, range: &str) -> String {
    format!(
        "{API}/spreadsheets/{spreadsheet_id}/values/{}?valueInputOption={VALUE_INPUT}",
        encode_range(range)
    )
}

/// Turns the engine's row-oriented table into the 2-D array the Sheets API expects.
///
/// Column order follows the workflow's declared `table` first (Automa `workflow.table`), then
/// any extra keys, so an export/append never shuffles columns.
pub fn table_to_values(
    rows: &[Map<String, Value>],
    declared_columns: &[String],
) -> Vec<Vec<Value>> {
    let mut columns: Vec<String> = declared_columns.to_vec();
    for row in rows {
        for key in row.keys() {
            if !columns.iter().any(|c| c == key) {
                columns.push(key.clone());
            }
        }
    }
    rows.iter()
        .map(|row| {
            columns
                .iter()
                .map(|column| {
                    row.get(column)
                        .cloned()
                        .unwrap_or(Value::String(String::new()))
                })
                .collect()
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_the_urls_automa_uses() {
        assert_eq!(
            values_url("SID", "Sheet1!A1:C1"),
            "https://sheets.googleapis.com/v4/spreadsheets/SID/values/Sheet1%21A1%3AC1"
        );
        assert!(append_url("SID", "Sheet1!A1:C1").ends_with(
            "/values/Sheet1%21A1%3AC1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS"
        ));
        assert!(
            update_url("SID", "A1:B2").ends_with("/values/A1%3AB2?valueInputOption=USER_ENTERED")
        );
    }

    #[test]
    fn create_failure_explains_the_service_account_quota_rule() {
        // Mirrors the real response we got from Google when exercising `create` E2E.
        let error = google_auth::describe_google_error(
            403,
            r#"{"error":{"message":"The caller does not have permission"}}"#,
        );
        assert!(error.contains("share the spreadsheet"), "got: {error}");
    }

    #[test]
    fn table_to_values_respects_declared_column_order() {
        let rows = vec![
            serde_json::json!({ "b": 2, "a": "x" })
                .as_object()
                .unwrap()
                .clone(),
            serde_json::json!({ "a": "y", "b": 3 })
                .as_object()
                .unwrap()
                .clone(),
        ];
        let values = table_to_values(&rows, &["a".to_string(), "b".to_string()]);
        assert_eq!(
            values,
            vec![vec![json!("x"), json!(2)], vec![json!("y"), json!(3)],]
        );
    }

    #[test]
    fn table_to_values_appends_unknown_columns_and_fills_gaps() {
        let rows = vec![serde_json::json!({ "extra": "e" })
            .as_object()
            .unwrap()
            .clone()];
        let values = table_to_values(&rows, &["a".to_string()]);
        assert_eq!(values, vec![vec![json!(""), json!("e")]]);
    }
}
