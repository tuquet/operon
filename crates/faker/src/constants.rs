//! Enterprise Constants for Synthetic Identity & Persona Generator

/// Default email domain used when no custom domain or override is supplied
pub const DEFAULT_EMAIL_DOMAIN: &str = "flowup.io.vn";

/// Default email pattern structure ("first.last")
pub const DEFAULT_EMAIL_PATTERN: &str = "first.last";

/// Default nationality code ("US" for United States)
pub const DEFAULT_NATIONALITY: &str = "US";

/// Default avatar generation style ("real" for photography, "svg" for vector)
pub const DEFAULT_AVATAR_STYLE: &str = "real";

/// Canonical SSOT directory name under user home
pub const DEFAULT_SSOT_DIR_NAME: &str = ".operon";
pub const ENV_TQ_HOME: &str = "TQ_HOME";
pub const ENV_SPECTER_HOME: &str = "SPECTER_HOME";

/// Pillar subdirectory name
pub const PILLAR_DIR_FAKER: &str = "faker";

/// Configuration filename
pub const CONFIG_FILE_FAKER_JSON: &str = "faker.json";

/// Dicebear vector avatar API endpoint
pub const URL_DICEBEAR_AVATAR: &str = "https://api.dicebear.com/7.x/avataaars/svg";

/// RandomUser photographic portrait API endpoint
pub const URL_RANDOMUSER_PORTRAITS: &str = "https://randomuser.me/api/portraits";

/// Minimum realistic working age for synthetic personas
pub const PERSONA_MIN_AGE: u32 = 18;

/// Maximum realistic working age for synthetic personas
pub const PERSONA_MAX_AGE: u32 = 45;

/// Supported nationalities
pub const NAT_VN: &str = "VN";
pub const NAT_US: &str = "US";
pub const NAT_JP: &str = "JP";
pub const ALL_NATIONALITIES: &[&str] = &[NAT_VN, NAT_US, NAT_JP];
