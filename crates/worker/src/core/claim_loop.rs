//! Cloud claim loop — pull queued jobs, execute them, report back.
//!
//! Implements SPEC-automation-execution §10: when `CLAIM_ENABLED=1` the worker polls
//! `public.automation_claim_jobs`, runs each claimed job through the normal engine path
//! (the same one `DispatchJob` uses), streams its step logs to `automation.execution_logs`
//! and closes the job with `public.automation_finish_job`. The lease is renewed while the
//! job runs so the stale-lease reaper does not steal it.
//!
//! The `DispatchJob` path (server-pushed jobs) is untouched: claiming is additive.

use crate::core::engine::RunnerEngine;
use crate::core::identity::DeviceIdentity;
use crate::protocol::schema::{DriverType, Job, JobId, JobStatus, LogChannel, LogChunk};
use serde_json::{json, Value};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::mpsc;
use tracing::{debug, info, warn};

/// Environment-tunable configuration (spec §10).
#[derive(Debug, Clone)]
pub struct ClaimConfig {
    pub enabled: bool,
    pub interval: Duration,
    pub batch_size: i32,
    pub lease_minutes: i64,
}

impl ClaimConfig {
    pub fn from_env() -> Self {
        fn num(key: &str, default: u64) -> u64 {
            std::env::var(key)
                .ok()
                .and_then(|value| value.parse().ok())
                .unwrap_or(default)
        }

        let enabled = matches!(
            std::env::var("CLAIM_ENABLED").ok().as_deref(),
            Some("1") | Some("true") | Some("yes")
        );

        Self {
            enabled,
            interval: Duration::from_secs(num("CLAIM_INTERVAL_SECS", 15).max(1)),
            batch_size: num("CLAIM_BATCH", 1).clamp(1, 20) as i32,
            lease_minutes: num("JOB_LEASE_MINUTES", 15).clamp(1, 240) as i64,
        }
    }
}

/// Minimal PostgREST client for the automation RPC wrappers.
#[derive(Clone)]
struct CloudRpc {
    base: String,
    api_key: Option<String>,
    device_id: String,
    device_token: String,
    client: reqwest::Client,
}

impl CloudRpc {
    fn new(identity: &DeviceIdentity) -> Self {
        Self {
            base: identity.cloud_url.trim_end_matches('/').to_string(),
            api_key: identity.api_key.clone(),
            device_id: identity.device_id.clone(),
            device_token: identity.device_token.clone(),
            client: reqwest::Client::builder()
                .timeout(Duration::from_secs(30))
                .build()
                .unwrap_or_else(|_| reqwest::Client::new()),
        }
    }

    async fn call(&self, function: &str, body: Value) -> Result<Value, String> {
        let endpoint = format!("{}/rest/v1/rpc/{}", self.base, function);
        let mut request = self
            .client
            .post(&endpoint)
            .header("Content-Type", "application/json");
        if let Some(key) = &self.api_key {
            request = request
                .header("apikey", key)
                .header("Authorization", format!("Bearer {key}"));
        }

        let response = request
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("{function}: request failed: {e}"))?;

        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        if !status.is_success() {
            return Err(format!("{function}: HTTP {status}: {text}"));
        }

        if text.trim().is_empty() {
            return Ok(Value::Null);
        }
        serde_json::from_str(&text).map_err(|e| format!("{function}: bad JSON response: {e}"))
    }

    async fn claim(&self, batch_size: i32, lease_minutes: i64) -> Result<Vec<Value>, String> {
        let result = self
            .call(
                "automation_claim_jobs",
                json!({
                    "p_device_id": self.device_id,
                    "p_device_token": self.device_token,
                    "p_batch_size": batch_size,
                    "p_lease": format!("{lease_minutes} minutes"),
                }),
            )
            .await?;

        Ok(result.as_array().cloned().unwrap_or_default())
    }

    async fn finish(
        &self,
        job_id: &str,
        status: &str,
        summary: Value,
        error: Option<String>,
    ) -> Result<(), String> {
        self.call(
            "automation_finish_job",
            json!({
                "p_device_id": self.device_id,
                "p_device_token": self.device_token,
                "p_job_id": job_id,
                "p_status": status,
                "p_result_summary": summary,
                "p_error_message": error,
            }),
        )
        .await
        .map(|_| ())
    }

    async fn log_events(&self, job_id: &str, events: &[Value]) -> Result<(), String> {
        self.call(
            "automation_log_job_events",
            json!({
                "p_device_id": self.device_id,
                "p_device_token": self.device_token,
                "p_job_id": job_id,
                "p_events": events,
            }),
        )
        .await
        .map(|_| ())
    }

    async fn renew_lease(&self, job_id: &str, lease_minutes: i64) -> Result<bool, String> {
        let result = self
            .call(
                "automation_renew_job_lease",
                json!({
                    "p_device_id": self.device_id,
                    "p_device_token": self.device_token,
                    "p_job_id": job_id,
                    "p_lease": format!("{lease_minutes} minutes"),
                }),
            )
            .await?;
        Ok(result.as_bool().unwrap_or(false))
    }
}

/// Starts the claim loop when enabled. Returns `None` when `CLAIM_ENABLED` is not set,
/// so the worker behaves exactly as before in a non-claiming deployment.
pub fn spawn(
    engine: Arc<RunnerEngine>,
    identity: DeviceIdentity,
    config: ClaimConfig,
) -> Option<tokio::task::JoinHandle<()>> {
    if !config.enabled {
        debug!("Claim loop disabled (CLAIM_ENABLED is not set)");
        return None;
    }

    Some(tokio::spawn(
        async move { run(engine, identity, config).await },
    ))
}

async fn run(engine: Arc<RunnerEngine>, identity: DeviceIdentity, config: ClaimConfig) {
    let rpc = CloudRpc::new(&identity);
    info!(
        "Claim loop enabled (device {}, every {:?}, batch {}, lease {}m)",
        identity.device_id, config.interval, config.batch_size, config.lease_minutes
    );

    let mut ticker = tokio::time::interval(config.interval);
    loop {
        ticker.tick().await;

        match rpc.claim(config.batch_size, config.lease_minutes).await {
            Ok(envelopes) => {
                for envelope in envelopes {
                    execute(engine.clone(), rpc.clone(), envelope, config.lease_minutes).await;
                }
            }
            Err(e) => warn!("Claim request failed: {e}"),
        }
    }
}

/// Runs one claimed job end-to-end and reports the outcome.
async fn execute(engine: Arc<RunnerEngine>, rpc: CloudRpc, envelope: Value, lease_minutes: i64) {
    let job_id = envelope
        .get("job_id")
        .and_then(|value| value.as_str())
        .unwrap_or_default()
        .to_string();

    if job_id.is_empty() {
        warn!("Claimed envelope without a job_id — ignoring: {envelope}");
        return;
    }

    info!(
        "Claimed job {job_id} ({})",
        envelope
            .get("workflow_name")
            .and_then(|value| value.as_str())
            .unwrap_or("-")
    );

    // The engine takes the same payload shape the CLI dispatches.
    let payload = json!({
        "workflowData": envelope.get("document").cloned().unwrap_or(Value::Null),
        "variables": envelope.get("parameters").cloned().unwrap_or(json!({})),
        "headless": true,
        "closeBrowserOnFinish": true,
    });

    let job = Job {
        id: JobId::from(job_id.clone()),
        driver: DriverType::Automa,
        payload,
        cwd: None,
        env: None,
        timeout_ms: 30 * 60 * 1000,
        created_at: None,
    };

    // Renew the lease while the job runs, so a long run is not reaped as stale.
    let renew_handle = {
        let rpc = rpc.clone();
        let job_id = job_id.clone();
        let period = Duration::from_secs((lease_minutes.max(1) as u64) * 60 / 3);
        let (cancel_tx, mut cancel_rx) = tokio::sync::oneshot::channel::<()>();
        let handle = tokio::spawn(async move {
            let mut ticker = tokio::time::interval(period);
            ticker.tick().await; // first tick is immediate
            loop {
                tokio::select! {
                    _ = &mut cancel_rx => break,
                    _ = ticker.tick() => {
                        match rpc.renew_lease(&job_id, lease_minutes).await {
                            Ok(true) => debug!("Lease renewed for job {job_id}"),
                            Ok(false) => {
                                warn!("Lease renewal rejected for job {job_id} (job no longer running)");
                                break;
                            }
                            Err(e) => warn!("Lease renewal failed for job {job_id}: {e}"),
                        }
                    }
                }
            }
        });
        (cancel_tx, handle)
    };

    let (log_tx, mut log_rx) = mpsc::unbounded_channel::<LogChunk>();
    let collector = tokio::spawn(async move {
        let mut chunks: Vec<LogChunk> = Vec::new();
        while let Some(chunk) = log_rx.recv().await {
            chunks.push(chunk);
        }
        chunks
    });

    let result = engine.execute_job(job, log_tx).await;
    let chunks = collector.await.unwrap_or_default();

    // Stop renewing and report the terminal state.
    let (cancel_tx, renew_handle) = renew_handle;
    let _ = cancel_tx.send(());
    let _ = renew_handle.await;

    if !chunks.is_empty() {
        let events: Vec<Value> = chunks
            .iter()
            .map(|chunk| {
                json!({
                    "level": match chunk.channel {
                        LogChannel::Stderr => "error",
                        LogChannel::Stdout | LogChannel::System => "info",
                    },
                    "message": chunk.text,
                    "payload": { "channel": format!("{:?}", chunk.channel) },
                })
            })
            .collect();

        for batch in events.chunks(200) {
            if let Err(e) = rpc.log_events(&job_id, batch).await {
                warn!(
                    "Failed to push {} log event(s) for job {job_id}: {e}",
                    batch.len()
                );
            }
        }
    }

    let status = match result.status {
        JobStatus::Completed => "completed",
        JobStatus::Cancelled => "cancelled",
        _ => "failed",
    };

    let summary = json!({
        "exit_code": result.exit_code,
        "duration_ms": result.duration_ms,
        "logs": chunks.len(),
    });

    match rpc
        .finish(&job_id, status, summary, result.error.clone())
        .await
    {
        Ok(()) => info!(
            "Job {job_id} finished: {status} ({} ms)",
            result.duration_ms
        ),
        Err(e) => warn!("Failed to report completion of job {job_id}: {e}"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Env vars are process-wide: tests that mutate CLAIM_*/JOB_* must not race.
    static CLAIM_ENV_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());

    #[test]
    fn claim_config_defaults_are_sane() {
        let _guard = CLAIM_ENV_LOCK.lock().unwrap();
        for key in [
            "CLAIM_ENABLED",
            "CLAIM_INTERVAL_SECS",
            "CLAIM_BATCH",
            "JOB_LEASE_MINUTES",
        ] {
            std::env::remove_var(key);
        }

        let config = ClaimConfig::from_env();
        assert!(!config.enabled, "claiming must be opt-in");
        assert_eq!(config.interval, Duration::from_secs(15));
        assert_eq!(config.batch_size, 1);
        assert_eq!(config.lease_minutes, 15);
    }

    #[test]
    fn claim_config_reads_and_clamps_env() {
        let _guard = CLAIM_ENV_LOCK.lock().unwrap();
        std::env::set_var("CLAIM_ENABLED", "1");
        std::env::set_var("CLAIM_INTERVAL_SECS", "5");
        std::env::set_var("CLAIM_BATCH", "999");
        std::env::set_var("JOB_LEASE_MINUTES", "0");

        let config = ClaimConfig::from_env();
        assert!(config.enabled);
        assert_eq!(config.interval, Duration::from_secs(5));
        assert_eq!(config.batch_size, 20, "batch size is clamped");
        assert_eq!(
            config.lease_minutes, 1,
            "lease is clamped to at least a minute"
        );

        for key in [
            "CLAIM_ENABLED",
            "CLAIM_INTERVAL_SECS",
            "CLAIM_BATCH",
            "JOB_LEASE_MINUTES",
        ] {
            std::env::remove_var(key);
        }
    }

    #[test]
    fn payload_matches_the_dispatched_job_shape() {
        let envelope = json!({
            "job_id": "11111111-1111-4111-8111-111111111111",
            "document": { "nodes": [], "edges": [] },
            "parameters": { "mode": "dry-run" }
        });

        let payload = json!({
            "workflowData": envelope.get("document").cloned().unwrap_or(Value::Null),
            "variables": envelope.get("parameters").cloned().unwrap_or(json!({})),
            "headless": true,
            "closeBrowserOnFinish": true,
        });

        // AutomaJobPayload aliases: `workflowData` → workflow_data, `variables` → variables.
        assert!(payload.get("workflowData").is_some());
        assert_eq!(payload["variables"]["mode"], "dry-run");
        assert_eq!(payload["headless"], true);
    }
}
