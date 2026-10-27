use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct FakerConfig {
    /// List of email domains used for rotation
    pub email_domains: Vec<String>,

    /// Primary default domain
    pub default_domain: String,

    /// Email address generation pattern:
    /// - "first.last": john.doe123@domain
    /// - "last.first": doe.john123@domain
    /// - "first": johnd123@domain
    /// - "username": doe_john123@domain
    pub email_pattern: String,

    /// Default nationality: "VN", "US", "JP"
    pub default_nat: String,

    /// Default avatar style: "real" or "svg"
    pub default_avatar: String,
}

impl Default for FakerConfig {
    fn default() -> Self {
        Self {
            email_domains: vec![crate::constants::DEFAULT_EMAIL_DOMAIN.to_string()],
            default_domain: crate::constants::DEFAULT_EMAIL_DOMAIN.to_string(),
            email_pattern: crate::constants::DEFAULT_EMAIL_PATTERN.to_string(),
            default_nat: crate::constants::DEFAULT_NATIONALITY.to_string(),
            default_avatar: crate::constants::DEFAULT_AVATAR_STYLE.to_string(),
        }
    }
}

impl FakerConfig {
    /// Canonical root directory for SSOT (~/.operon/ or $TQ_HOME)
    pub fn canonical_dir() -> PathBuf {
        if let Ok(dir) = std::env::var(crate::constants::ENV_TQ_HOME)
            .or_else(|_| std::env::var(crate::constants::ENV_SPECTER_HOME))
        {
            if !dir.trim().is_empty() {
                return PathBuf::from(dir);
            }
        }
        let home = std::env::var("USERPROFILE")
            .or_else(|_| std::env::var("HOME"))
            .unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home).join(crate::constants::DEFAULT_SSOT_DIR_NAME)
    }

    /// Single source of truth (SSOT) config path: ~/.operon/faker/faker.json
    pub fn config_path() -> PathBuf {
        let faker_dir = Self::canonical_dir().join(crate::constants::PILLAR_DIR_FAKER);
        let _ = fs::create_dir_all(&faker_dir);
        faker_dir.join(crate::constants::CONFIG_FILE_FAKER_JSON)
    }

    /// Load config from ~/.operon/faker/faker.json.
    /// If file does not exist, automationtically creates default faker.json and returns it.
    pub fn load() -> Self {
        let path = Self::config_path();
        if path.exists() {
            if let Ok(content) = fs::read_to_string(&path) {
                if let Ok(mut config) = serde_json::from_str::<Self>(&content) {
                    config.normalize();
                    return config;
                }
            }
        }

        // Create default config file on first access
        let mut config = Self::default();
        config.normalize();
        let _ = config.save();
        config
    }

    /// Save configuration to ~/.operon/faker/faker.json
    pub fn save(&self) -> Result<(), std::io::Error> {
        let path = Self::config_path();
        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let json_str = serde_json::to_string_pretty(self).map_err(std::io::Error::other)?;
        fs::write(path, json_str)?;
        Ok(())
    }

    /// Sanitize and normalize domain names (strip '@', trim whitespace)
    pub fn normalize(&mut self) {
        self.default_domain = clean_domain(&self.default_domain);
        if self.default_domain.is_empty() {
            self.default_domain = crate::constants::DEFAULT_EMAIL_DOMAIN.to_string();
        }

        let mut cleaned_domains: Vec<String> = self
            .email_domains
            .iter()
            .map(|d| clean_domain(d))
            .filter(|d| !d.is_empty())
            .collect();

        if !cleaned_domains.contains(&self.default_domain) {
            cleaned_domains.insert(0, self.default_domain.clone());
        }

        if cleaned_domains.is_empty() {
            cleaned_domains.push(self.default_domain.clone());
        }

        self.email_domains = cleaned_domains;
    }

    /// Pick a domain for email generation
    pub fn pick_domain(&self, rng: &mut impl rand::Rng, override_domain: Option<&str>) -> String {
        if let Some(d) = override_domain {
            let cleaned = clean_domain(d);
            if !cleaned.is_empty() {
                return cleaned;
            }
        }

        if !self.email_domains.is_empty() {
            let idx = rng.gen_range(0..self.email_domains.len());
            return self.email_domains[idx].clone();
        }

        self.default_domain.clone()
    }
}

pub fn clean_domain(domain: &str) -> String {
    domain.trim().trim_start_matches('@').trim().to_lowercase()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clean_domain() {
        assert_eq!(clean_domain("@flowup.io.vn"), "flowup.io.vn");
        assert_eq!(clean_domain("  FLOWUP.IO.VN  "), "flowup.io.vn");
        assert_eq!(clean_domain("@GMAIL.COM"), "gmail.com");
    }

    #[test]
    fn test_faker_config_pick_domain() {
        let cfg = FakerConfig {
            default_domain: "flowup.io.vn".to_string(),
            email_domains: vec!["flowup.io.vn".to_string()],
            ..Default::default()
        };

        let mut rng = rand::thread_rng();
        // Default pick
        assert_eq!(cfg.pick_domain(&mut rng, None), "flowup.io.vn");
        // Override pick with @
        assert_eq!(cfg.pick_domain(&mut rng, Some("@custom.org")), "custom.org");
    }

    #[test]
    fn test_canonical_dir() {
        let dir = FakerConfig::canonical_dir();
        assert!(dir.to_string_lossy().contains(".opn") || dir.to_string_lossy().contains(".opn"));
    }
}
