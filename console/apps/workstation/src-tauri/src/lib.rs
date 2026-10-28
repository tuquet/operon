use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Listener, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_window_state::StateFlags;

mod tray;

/// Tracks whether Tauri owns the in-process daemon or is attached to an external CLI daemon
#[derive(Clone)]
pub struct DaemonOwnership {
    pub is_embedded: Arc<AtomicBool>,
}

#[tauri::command]
async fn get_app_environment(app: AppHandle) -> Result<serde_json::Value, String> {
    let package_info = app.package_info();
    Ok(serde_json::json!({
        "appName": package_info.name,
        "version": package_info.version.to_string(),
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
    }))
}

#[tauri::command]
async fn show_main_window(window: tauri::WebviewWindow) -> Result<(), String> {
    window.show().map_err(|e| e.to_string())
}

/// Spawns the embedded Operon Daemon API in the background if port 8765 is not already active
fn spawn_embedded_daemon_if_needed(ownership: DaemonOwnership) {
    tauri::async_runtime::spawn(async move {
        let daemon_port: u16 = 8765;
        let health_url = format!("http://127.0.0.1:{}/api/v1/health", daemon_port);

        // Probe port 8765 first with 800ms timeout
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_millis(800))
            .build();

        let already_running = if let Ok(cli) = client {
            match cli.get(&health_url).send().await {
                Ok(resp) => resp.status().is_success(),
                Err(_) => false,
            }
        } else {
            false
        };

        if already_running {
            println!("[tauri::daemon] Active Daemon detected on 127.0.0.1:{}. Attaching as client (external ownership).", daemon_port);
            ownership.is_embedded.store(false, Ordering::SeqCst);
        } else {
            println!("[tauri::daemon] Spawning in-process Daemon API on 127.0.0.1:{}...", daemon_port);
            ownership.is_embedded.store(true, Ordering::SeqCst);
            // Run server in-process (detach=false, cloud=false, claim=false)
            if let Err(e) = operon::commands::worker::supervisor::run_server(
                Some("127.0.0.1".into()),
                Some(daemon_port),
                false,
                None,
                None,
                false,
                false,
            )
            .await
            {
                eprintln!("[tauri::daemon] Embedded daemon server exited: {}", e);
            }
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let ownership = DaemonOwnership {
        is_embedded: Arc::new(AtomicBool::new(false)),
    };
    let ownership_shutdown = ownership.clone();

    let app = tauri::Builder::default()
        .manage(ownership.clone())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::default().build())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::all())
                .build(),
        )
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
            // If single-instance receives deep-link URL on secondary launch
            for arg in args {
                if arg.starts_with("operon://") {
                    let _ = app.emit("deep-link-received", arg);
                }
            }
        }))
        .invoke_handler(tauri::generate_handler![
            get_app_environment,
            show_main_window
        ])
        .setup(move |app| {
            // Setup system tray
            let _ = tray::setup_tray(app.handle());

            // Auto-start or attach to embedded Daemon API on port 8765
            spawn_embedded_daemon_if_needed(ownership);

            // Build main window with strict navigation security guard
            let app_handle = app.handle().clone();
            let window = WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::App("index.html".into()),
            )
            .title("Operon Workstation")
            .inner_size(1440.0, 900.0)
            .min_inner_size(1024.0, 700.0)
            .resizable(true)
            .center()
            .decorations(false)
            .shadow(true)
            .visible(false)
            .on_navigation(move |url| {
                let scheme = url.scheme();
                let host = url.host_str().unwrap_or("");
                // Allow internal dev server, loopback, or custom tauri/asset schemes
                if scheme == "tauri" || scheme == "asset" || host == "localhost" || host == "127.0.0.1" {
                    return true;
                }
                // Intercept and open external links in default system browser
                use tauri_plugin_opener::OpenerExt;
                let _ = app_handle.opener().open_url(url.as_str(), None::<&str>);
                false
            })
            .build()?;

            // Smooth startup: show window only after DOM is ready
            let w = window.clone();
            window.once("tauri://ready", move |_| {
                let _ = w.show();
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building opn admin tauri application");

    app.run(move |_app_handle, event| {
        if let tauri::RunEvent::ExitRequested { .. } = event {
            let is_embedded = ownership_shutdown.is_embedded.load(Ordering::SeqCst);
            if is_embedded {
                println!("[tauri::shutdown] Desktop app exiting (Embedded Daemon Owner). Reaping child browser and daemon resources...");
                tauri::async_runtime::block_on(async {
                    let _ = operon::commands::worker::supervisor::stop_daemon(true).await;
                });
            } else {
                println!("[tauri::shutdown] Desktop app exiting in Client Mode. External CLI Daemon remains intact.");
            }
        }
    });
}
