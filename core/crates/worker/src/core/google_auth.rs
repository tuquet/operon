//! Google service-account authentication for the `google-sheets` block.
//!
//! Automa authenticates to Google through the browser extension's own identity. A headless
//! worker has no browser session, so Operonuses a **service account** held in the Secret
//! Store: workflows reference it as `{{secrets@google_service_account}}`, and the credential
//! never enters the workflow document, the job payload or the logs.
//!
//! Flow (RFC 7523): RS256-signed JWT → `token_uri` → access token, cached in memory until
//! shortly before it expires. Nothing is written to disk.

use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use jsonwebtoken::{Algorithm, EncodingKey, Header};
use serde::Deserialize;
use serde_json::Value;

/// Secret name that holds the service-account JSON.
pub const SERVICE_ACCOUNT_SECRET: &str = "google_service_account";

/// Scope required to read and write spreadsheets.
pub const SHEETS_SCOPE: &str = "https://www.googleapis.com/auth/spreadsheets";

#[derive(Debug, Clone, Deserialize)]
pub struct ServiceAccount {
    pub client_email: String,
    pub private_key: String,
    pub token_uri: String,
}

impl ServiceAccount {
    /// Parses the secret value — either the JSON object itself or a JSON string containing it
    /// (the Secret Store keeps arbitrary strings, so both shapes occur in practice).
    pub fn parse(value: &Value) -> Result<Self, String> {
        let parsed: Value = match value {
            Value::String(raw) => serde_json::from_str(raw)
                .map_err(|e| format!("{SERVICE_ACCOUNT_SECRET} is not valid JSON: {e}"))?,
            other => other.clone(),
        };
        let account: ServiceAccount = serde_json::from_value(parsed)
            .map_err(|e| format!("{SERVICE_ACCOUNT_SECRET} is missing required fields: {e}"))?;
        if account.client_email.is_empty() || account.private_key.is_empty() {
            return Err(format!(
                "{SERVICE_ACCOUNT_SECRET} has an empty client_email/private_key"
            ));
        }
        Ok(account)
    }

    pub fn mint_jwt(&self, scope: &str) -> Result<String, String> {
        self.mint_jwt_at(scope, unix_now())
    }

    fn mint_jwt_at(&self, scope: &str, now: u64) -> Result<String, String> {
        let claims = serde_json::json!({
            "iss": self.client_email,
            "scope": scope,
            "aud": self.token_uri,
            "iat": now,
            "exp": now + 3600,
        });
        let key = EncodingKey::from_rsa_pem(self.private_key.as_bytes()).map_err(|e| {
            format!("{SERVICE_ACCOUNT_SECRET} private_key is not a valid RSA PEM key: {e}")
        })?;
        jsonwebtoken::encode(&Header::new(Algorithm::RS256), &claims, &key)
            .map_err(|e| format!("cannot sign service-account JWT: {e}"))
    }
}

fn unix_now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    #[serde(default)]
    expires_in: Option<u64>,
}

fn token_cache() -> &'static Mutex<HashMap<String, (String, u64)>> {
    static CACHE: OnceLock<Mutex<HashMap<String, (String, u64)>>> = OnceLock::new();
    CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

/// Returns a bearer token for `scope`, reusing a cached one until ~1 minute before expiry.
pub async fn access_token(account: &ServiceAccount, scope: &str) -> Result<String, String> {
    let cache_key = format!("{}|{}", account.client_email, scope);
    let now = unix_now();
    if let Some((token, expires_at)) = token_cache()
        .lock()
        .ok()
        .and_then(|cache| cache.get(&cache_key).cloned())
    {
        if expires_at > now + 60 {
            return Ok(token);
        }
    }

    let assertion = account.mint_jwt(scope)?;
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("cannot build HTTP client: {e}"))?;

    let response = client
        .post(&account.token_uri)
        .form(&[
            ("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer"),
            ("assertion", assertion.as_str()),
        ])
        .send()
        .await
        .map_err(|e| format!("cannot reach Google token endpoint: {e}"))?;

    let status = response.status().as_u16();
    let body = response.text().await.unwrap_or_default();
    if !(200..300).contains(&status) {
        return Err(describe_google_error(status, &body));
    }

    let parsed: TokenResponse =
        serde_json::from_str(&body).map_err(|e| format!("unexpected token response: {e}"))?;
    let ttl = parsed.expires_in.unwrap_or(3600);
    if let Ok(mut cache) = token_cache().lock() {
        cache.insert(cache_key, (parsed.access_token.clone(), now + ttl));
    }
    Ok(parsed.access_token)
}

/// Google returns structured error payloads; surface the actionable part rather than a blob.
pub fn describe_google_error(status: u16, body: &str) -> String {
    let message = serde_json::from_str::<Value>(body)
        .ok()
        .and_then(|json| {
            json.pointer("/error/message")
                .and_then(|m| m.as_str())
                .map(str::to_string)
                .or_else(|| {
                    json.pointer("/error")
                        .and_then(|e| e.as_str())
                        .map(str::to_string)
                })
        })
        .unwrap_or_else(|| body.chars().take(300).collect());

    let hint = match status {
        401 => " — the service-account key is invalid or expired",
        403 if message.contains("SERVICE_DISABLED") => {
            " — enable the Google Sheets API for the project"
        }
        403 => " — share the spreadsheet with the service account (Editor), or the SA lacks access",
        404 => " — wrong spreadsheetId, or the sheet/tab in `range` does not exist",
        400 if message.contains("parse range") => {
            " — `range` must be A1 notation, e.g. Sheet1!A1:C1"
        }
        _ => "",
    };
    format!("Google API {status}: {message}{hint}")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn account() -> ServiceAccount {
        ServiceAccount {
            client_email: "svc@example.iam.gserviceaccount.com".to_string(),
            private_key: "not-a-pem".to_string(),
            token_uri: "https://oauth2.googleapis.com/token".to_string(),
        }
    }

    #[test]
    fn parses_object_and_json_string_forms() {
        let object = serde_json::json!({
            "client_email": "svc@example.com",
            "private_key": "-----BEGIN PRIVATE KEY-----\nx\n-----END PRIVATE KEY-----\n",
            "token_uri": "https://oauth2.googleapis.com/token"
        });
        assert_eq!(
            ServiceAccount::parse(&object).unwrap().client_email,
            "svc@example.com"
        );
        assert_eq!(
            ServiceAccount::parse(&Value::String(object.to_string()))
                .unwrap()
                .token_uri,
            "https://oauth2.googleapis.com/token"
        );
    }

    #[test]
    fn rejects_incomplete_credentials_with_a_clear_message() {
        let err = ServiceAccount::parse(&serde_json::json!({"client_email": "x"})).unwrap_err();
        assert!(err.contains("missing required fields"), "got: {err}");
        assert!(ServiceAccount::parse(&Value::String("not json".into())).is_err());
    }

    #[test]
    fn malformed_private_key_is_reported_not_panicked() {
        let err = account().mint_jwt(SHEETS_SCOPE).unwrap_err();
        assert!(err.contains("not a valid RSA PEM key"), "got: {err}");
    }

    #[test]
    fn jwt_carries_the_claims_google_requires() {
        // Sign with a throwaway key generated at test time so no private key lives in the repo.
        let pem = std::process::Command::new("openssl")
            .args([
                "genpkey",
                "-algorithm",
                "RSA",
                "-pkeyopt",
                "rsa_keygen_bits:2048",
            ])
            .stderr(std::process::Stdio::null())
            .output();
        let Ok(out) = pem else {
            eprintln!("openssl unavailable — skipping");
            return;
        };
        let key = ServiceAccount {
            private_key: String::from_utf8_lossy(&out.stdout).to_string(),
            ..account()
        };

        let token = key.mint_jwt_at(SHEETS_SCOPE, 1_700_000_000).unwrap();
        let parts: Vec<&str> = token.split('.').collect();
        assert_eq!(parts.len(), 3, "JWT must be header.payload.signature");

        let decode = |part: &str| {
            use base64::Engine;
            let bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
                .decode(part)
                .unwrap();
            serde_json::from_slice::<Value>(&bytes).unwrap()
        };
        assert_eq!(decode(parts[0])["alg"], "RS256");
        let claims = decode(parts[1]);
        assert_eq!(claims["iss"], "svc@example.iam.gserviceaccount.com");
        assert_eq!(claims["aud"], "https://oauth2.googleapis.com/token");
        assert_eq!(claims["scope"], SHEETS_SCOPE);
        assert_eq!(claims["iat"], 1_700_000_000u64);
        assert_eq!(
            claims["exp"], 1_700_003_600u64,
            "Google requires exp <= iat + 1h"
        );
    }

    #[test]
    fn error_mapping_points_at_the_real_cause() {
        assert!(describe_google_error(
            403,
            r#"{"error":{"message":"The caller does not have permission"}}"#
        )
        .contains("share the spreadsheet"));
        assert!(
            describe_google_error(403, r#"{"error":{"message":"SERVICE_DISABLED blah"}}"#)
                .contains("enable the Google Sheets API")
        );
        assert!(describe_google_error(
            404,
            r#"{"error":{"message":"Requested entity was not found."}}"#
        )
        .contains("wrong spreadsheetId"));
        assert!(
            describe_google_error(400, r#"{"error":{"message":"Unable to parse range: X"}}"#)
                .contains("A1 notation")
        );
    }
}
