use crate::config::AppConfig;
use crate::infrastructure::cloud::credential_store::DeviceCredentials;
use crate::infrastructure::cloud_reporter::CloudReporter;

/// Errors returned when an unauthenticated execution is intercepted
#[derive(Debug, thiserror::Error)]
pub enum AuthGuardError {
    #[error("Authentication required")]
    Unauthenticated,
    #[error("IO/Storage error: {0}")]
    Io(String),
}

/// Enforces that the workstation is authenticated with Cloud fleet credentials.
/// If not logged in, it prints a Google/AGY-standard notification card and returns an error.
pub async fn require_auth(command_context: &str) -> Result<DeviceCredentials, AuthGuardError> {
    let config = AppConfig::load();
    let creds = CloudReporter::load_credentials(&config.data_dir).await;

    if let Some(c) = creds {
        if !c.device_id.trim().is_empty() && !c.device_token.trim().is_empty() {
            return Ok(c);
        }
    }

    render_unauthenticated_card(command_context);
    Err(AuthGuardError::Unauthenticated)
}

/// Displays an AGY / Google Cloud standard authentication error card
fn render_unauthenticated_card(command_context: &str) {
    let mut card = crate::ui::Card::new("AUTHENTICATION REQUIRED");
    card.with_badge(crate::ui::badge_error("UNAUTHENTICATED"));
    card.with_min_width(68);
    card.add_line(&format!(
        "Command '{}' requires an authenticated operator or workstation session.",
        command_context
    ));
    card.add_line("");
    card.add_line("To log in and pair your workstation, run:");
    card.add_line("  $ opn auth login");
    card.add_line("");
    card.add_line("Or inspect authentication status:");
    card.add_line("  $ opn auth status");
    card.with_footer("Google Standard Workstation Security Policy (Invariant A2)");
    println!();
    card.print();
    println!();
}
