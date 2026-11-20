use regex::Regex;
use std::sync::{Arc, Mutex};

/// Fast, single-pass regex-based secret and credential masking filter.
///
/// Custom secrets (e.g. values resolved from the Secret Store) can be registered
/// at runtime through an `Arc` handle, so a single shared masker instance can be
/// enriched per job without interior-refactor of every call site.
#[derive(Clone)]
pub struct SecretMasker {
    combined_pattern: Regex,
    custom_secrets: Arc<Mutex<Vec<String>>>,
}

impl Default for SecretMasker {
    fn default() -> Self {
        Self::new()
    }
}

impl SecretMasker {
    pub fn new() -> Self {
        // Single combined DFA pattern combining Google OAuth, Anthropic, OpenAI, GitHub, and Bearer tokens
        let pattern_str = r"(ya29\.[a-zA-Z0-9_\-]+|sk-ant-[a-zA-Z0-9_\-]+|sk-[a-zA-Z0-9]{20,}|gh[pousr]_[a-zA-Z0-9]{20,}|(?i)bearer\s+[a-zA-Z0-9_\-\.]{20,})";
        let combined_pattern = Regex::new(pattern_str).unwrap();

        Self {
            combined_pattern,
            custom_secrets: Arc::new(Mutex::new(Vec::new())),
        }
    }

    /// Registers a custom secret string to be masked (idempotent, thread-safe).
    pub fn add_custom_secret(&self, secret: impl Into<String>) {
        let s = secret.into();
        if s.len() >= 4 {
            if let Ok(mut guard) = self.custom_secrets.lock() {
                if !guard.contains(&s) {
                    guard.push(s);
                }
            }
        }
    }

    /// Sanitizes text by replacing sensitive patterns with "***MASKED***"
    pub fn mask(&self, input: &str) -> String {
        let has_pattern_match = self.combined_pattern.is_match(input);
        let custom: Vec<String> = self
            .custom_secrets
            .lock()
            .map(|g| g.clone())
            .unwrap_or_default();

        // Fast-path: nothing to do
        if !has_pattern_match && custom.is_empty() {
            return input.to_string();
        }

        let mut result = if has_pattern_match {
            self.combined_pattern
                .replace_all(input, "***MASKED***")
                .into_owned()
        } else {
            input.to_string()
        };

        // Mask custom registered secrets (longest-first to avoid partial leftovers)
        let mut sorted = custom;
        sorted.sort_by_key(|entry| std::cmp::Reverse(entry.len()));
        for secret in &sorted {
            if result.contains(secret.as_str()) {
                result = result.replace(secret.as_str(), "***MASKED***");
            }
        }
        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mask_google_token() {
        let masker = SecretMasker::new();
        let log = "Using token ya29.a0AfH6SMAxyz1234567890 for auth";
        assert_eq!(masker.mask(log), "Using token ***MASKED*** for auth");
    }

    #[test]
    fn test_mask_custom_secret() {
        let masker = SecretMasker::new();
        masker.add_custom_secret("super_secret_password_123");
        let log = "Connecting with pass: super_secret_password_123 now";
        assert_eq!(masker.mask(log), "Connecting with pass: ***MASKED*** now");
    }

    #[test]
    fn test_masker_throughput_benchmark() {
        let masker = SecretMasker::new();
        let regular_log = "2026-10-09T14:22:00.123Z INFO [browser::cdp] Page.navigate completed for https://example.com/checkout status=200";
        let secret_log = "2026-10-09T14:22:00.124Z DEBUG [api::auth] Bearer ya29.a0AfH6SMAxyz1234567890 sent in authorization header";

        let start = std::time::Instant::now();
        for i in 0..10_000 {
            if i % 100 == 0 {
                let _ = masker.mask(secret_log);
            } else {
                let _ = masker.mask(regular_log);
            }
        }
        let elapsed = start.elapsed();
        println!(
            "\n>>> BASELINE MASKER TIME for 10,000 lines: {:?} (approx {:.2} lines/sec)\n",
            elapsed,
            10_000.0 / elapsed.as_secs_f64()
        );
    }
}
