use super::state::TuiState;

pub async fn toggle_gateway(state: &mut TuiState) {
    state.status_message = "Please use 'tunnel on' or 'tunnel off' in your terminal.".to_string();
    state.refresh().await;
}

pub async fn kill_browsers(state: &mut TuiState) {
    let base_dir = crate::core::browser::resolve_data_dir();
    let sessions = crate::core::browser::pid_tracker::list_sessions(&base_dir, true);
    let count = sessions.len();
    if count == 0 {
        state.status_message = "No active browser sessions to kill.".to_string();
        return;
    }

    state.status_message = format!("Terminating {} browser session(s)...", count);
    for session in &sessions {
        let _ =
            crate::core::browser::pid_tracker::terminate_session(session, &base_dir, true).await;
    }
    state.refresh().await;
    state.status_message = format!("Terminated {} browser session(s).", count);
}
