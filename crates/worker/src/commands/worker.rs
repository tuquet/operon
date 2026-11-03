use std::path::{Path, PathBuf};
use std::sync::Arc;
use worker::core::engine::RunnerEngine;
use worker::core::enrollment::EnrollmentClient;
use worker::core::identity::DeviceIdentity;
use worker::core::Notify;
use worker::transport::ws_client::{WsClientConfig, WsRunnerClient};

pub async fn handle_worker(
    server: Option<String>,
    token: Option<String>,
    id: Option<String>,
    tags: Vec<String>,
    engine: Arc<RunnerEngine>,
    config_dir: &Path,
) -> Result<(), Box<dyn std::error::Error>> {
    let loaded_identity = DeviceIdentity::load(config_dir).ok().flatten();

    let runner_id = id
        .or_else(|| loaded_identity.as_ref().map(|i| i.device_id.clone()))
        .unwrap_or_else(|| {
            let host = std::env::var("COMPUTERNAME")
                .or_else(|_| std::env::var("HOSTNAME"))
                .unwrap_or_else(|_| "node".to_string());
            format!(
                "{}-{}",
                host,
                &uuid::Uuid::new_v4().simple().to_string()[..8]
            )
        });

    let auth_token = token.or_else(|| loaded_identity.as_ref().map(|i| i.device_token.clone()));

    let server_url = server
        .or_else(|| {
            loaded_identity.as_ref().map(|i| {
                let base = i.cloud_url.trim_end_matches('/');
                let ws_base = if let Some(stripped) = base.strip_prefix("https://") {
                    format!("wss://{}", stripped)
                } else if let Some(stripped) = base.strip_prefix("http://") {
                    format!("ws://{}", stripped)
                } else {
                    base.to_string()
                };
                format!("{}/api/v1/runner/ws", ws_base)
            })
        })
        .unwrap_or_else(|| worker::constants::DEFAULT_WEBSOCKET_HUB.to_string());

    Notify::header("Starting Runner in Worker Daemon Mode");
    Notify::key_val("Runner ID", &runner_id);
    Notify::key_val("Server", &server_url);
    Notify::key_val(
        "OS/Arch",
        format!("{}/{}", std::env::consts::OS, std::env::consts::ARCH),
    );
    Notify::key_val("Tags", format!("{:?}", tags));
    Notify::key_val(
        "Environment",
        loaded_identity
            .as_ref()
            .map(|i| i.env.to_uppercase())
            .unwrap_or_else(|| "STANDALONE".to_string()),
    );
    Notify::divider();

    // Spawn cloud heartbeat task if device identity is present
    if let Some(ref ident) = loaded_identity {
        let cloud_url = ident.cloud_url.clone();
        let api_key = ident.api_key.clone();
        let device_id = ident.device_id.clone();
        let device_token = ident.device_token.clone();
        let env_name = ident.env.clone();
        let config_dir_clone = PathBuf::from(config_dir);
        let engine_clone = engine.clone();

        tokio::spawn(async move {
            let client = EnrollmentClient::new();
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));

            loop {
                interval.tick().await;
                let active = engine_clone.active_jobs_count();
                let telemetry = serde_json::json!({
                    "timestamp": chrono::Utc::now().to_rfc3339(),
                    "version": env!("CARGO_PKG_VERSION")
                });

                match client
                    .heartbeat(
                        &cloud_url,
                        api_key.as_deref(),
                        &device_id,
                        &device_token,
                        active,
                        telemetry,
                    )
                    .await
                {
                    Ok(true) => {
                        tracing::debug!("Cloud heartbeat sent successfully");
                    }
                    Ok(false) => {
                        eprintln!();
                        Notify::revocation(format!(
                            "Cloud device identity {} was removed from operon.devices!",
                            device_id
                        ));
                        Notify::info("Purging local credentials and initiating self-healing re-enrollment...");
                        let _ = DeviceIdentity::purge(&config_dir_clone);
                        match client
                            .enroll(
                                &cloud_url,
                                api_key.as_deref(),
                                None,
                                &env_name,
                                &config_dir_clone,
                            )
                            .await
                        {
                            Ok(new_id) => {
                                Notify::self_healing(format!(
                                    "Fresh Device ID assigned: {}",
                                    new_id.device_id
                                ));
                            }
                            Err(e) => {
                                Notify::self_healing_failed(format!("Re-enrollment failed: {}", e));
                            }
                        }
                        break;
                    }
                    Err(e) => {
                        tracing::warn!("Cloud heartbeat transient error: {}", e);
                    }
                }
            }
        });

        // Cloud claim loop (SPEC-automation-execution §10). Opt-in via CLAIM_ENABLED so a
        // device that only takes pushed work is unaffected.
        let claim_config = worker::core::claim_loop::ClaimConfig::from_env();
        if claim_config.enabled {
            Notify::key_val(
                "Claim loop",
                format!(
                    "enabled (every {:?}, batch {}, lease {}m)",
                    claim_config.interval, claim_config.batch_size, claim_config.lease_minutes
                ),
            );
        }
        let _ = worker::core::claim_loop::spawn(engine.clone(), ident.clone(), claim_config);
    }

    let config = WsClientConfig {
        server_url,
        token: auth_token,
        runner_id,
        tags,
    };

    let client = WsRunnerClient::new(config, engine);
    tokio::select! {
        _ = client.start() => {
            tracing::info!("Runner worker daemon exited.");
        }
        res = tokio::signal::ctrl_c() => {
            match res {
                Ok(()) => {
                    println!();
                    Notify::shutdown(worker::constants::MSG_SHUTDOWN_SIGNAL);
                    tracing::info!("Received Ctrl+C interrupt signal. Gracefully stopping runner worker daemon...");
                }
                Err(err) => {
                    tracing::error!("Failed to listen for Ctrl+C signal: {}", err);
                }
            }
        }
    }
    Notify::shutdown_clean(worker::constants::MSG_SHUTDOWN_CLEAN);

    Ok(())
}
