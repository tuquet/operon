use tauri::{AppHandle, Emitter, Listener, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_window_state::StateFlags;

mod tray;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
        .setup(|app| {
            // Setup system tray
            let _ = tray::setup_tray(app.handle());

            // Build main window with strict navigation security guard
            let app_handle = app.handle().clone();
            let window = WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::App("index.html".into()),
            )
            .title("Admin")
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
        .run(tauri::generate_context!())
        .expect("error while running opn admin tauri application");
}
