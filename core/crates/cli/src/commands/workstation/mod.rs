use clap::Args;
use std::path::PathBuf;

#[derive(Args, Debug, Clone)]
pub struct WorkstationArgs {
    /// Specific page/route to open (e.g. 'jobs', 'devices', 'browsers', 'workflows', 'overview')
    #[arg(short = 'p', long, value_name = "PAGE")]
    pub page: Option<String>,

    /// Direct shortcut to the Jobs monitor (/automation/jobs)
    #[arg(short = 'j', long)]
    pub jobs: bool,

    /// Direct shortcut to the Worker Nodes / Devices page (/automation/devices)
    #[arg(short = 'd', long)]
    pub devices: bool,

    /// Direct shortcut to the Stealth Browsers page (/automation/browsers)
    #[arg(short = 'b', long)]
    pub browsers: bool,

    /// Direct shortcut to the Workflows builder (/automation/workflows)
    #[arg(short = 'w', long)]
    pub workflows: bool,

    /// Target Workstation port (defaults to 5666 or VITE_PORT)
    #[arg(long, value_name = "PORT")]
    pub port: Option<u16>,

    /// Skip background daemon verification and auto-start
    #[arg(long)]
    pub no_daemon: bool,

    /// Launch local native desktop application (Tauri binary) instead of browser
    #[arg(long)]
    pub native: bool,
}

pub async fn handle(args: WorkstationArgs) -> Result<(), Box<dyn std::error::Error>> {
    println!("\x1b[1;36moperon\x1b[0m: initializing workstation control plane...");

    let daemon_port: u16 = std::env::var("DAEMON_PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8765);

    // 1. Verify or auto-start background daemon unless --no-daemon is specified
    if !args.no_daemon {
        print!(
            "operon: verifying daemon health on port {}... ",
            daemon_port
        );
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_millis(1500))
            .build()?;

        let health_url = format!("http://127.0.0.1:{}/api/v1/health", daemon_port);
        let daemon_alive = match client.get(&health_url).send().await {
            Ok(resp) => resp.status().is_success(),
            Err(_) => false,
        };

        if daemon_alive {
            println!("\x1b[32m[ok]\x1b[0m active");
        } else {
            println!("\x1b[33m[not running]\x1b[0m");
            println!(
                "operon: starting daemon in background on port {}...",
                daemon_port
            );

            let current_exe = std::env::current_exe()?;
            let mut cmd = std::process::Command::new(&current_exe);
            cmd.args([
                "worker",
                "start",
                "-H",
                "127.0.0.1",
                "-p",
                &daemon_port.to_string(),
                "-d",
            ]);

            #[cfg(windows)]
            {
                use std::os::windows::process::CommandExt;
                const CREATE_NO_WINDOW: u32 = 0x08000000;
                const DETACHED_PROCESS: u32 = 0x00000008;
                cmd.creation_flags(CREATE_NO_WINDOW | DETACHED_PROCESS);
            }

            match cmd.spawn() {
                Ok(_) => {
                    // Give daemon 1.5 seconds to bind
                    tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
                    println!("operon: daemon background process spawned successfully");
                }
                Err(e) => {
                    eprintln!("operon: warning: failed to auto-start daemon: {}", e);
                }
            }
        }
    }

    // 2. Resolve subpage route
    let route = if args.jobs {
        "/automation/jobs"
    } else if args.devices {
        "/automation/devices"
    } else if args.browsers {
        "/automation/browsers"
    } else if args.workflows {
        "/automation/workflows"
    } else if let Some(ref p) = args.page {
        match p.to_lowercase().as_str() {
            "jobs" | "job" => "/automation/jobs",
            "devices" | "device" | "node" | "nodes" => "/automation/devices",
            "browsers" | "browser" | "profile" | "profiles" => "/automation/browsers",
            "workflows" | "workflow" => "/automation/workflows",
            "overview" => "/automation/overview",
            "dashboard" | "analytics" => "/dashboard/analytics",
            "secrets" | "secret" => "/secrets/credentials",
            other => {
                if other.starts_with('/') {
                    p.as_str()
                } else {
                    "/automation/overview"
                }
            }
        }
    } else {
        "/automation/overview"
    };

    // 3. Launch native Tauri desktop or Web browser
    if args.native {
        let possible_native_paths = [
            PathBuf::from("target/release/operon-desktop.exe"),
            PathBuf::from("target/release/operon-desktop"),
            PathBuf::from(
                "../console/apps/workstation/src-tauri/target/release/operon-workstation.exe",
            ),
        ];

        let mut launched = false;
        for path in &possible_native_paths {
            if path.exists() {
                println!("operon: launching native desktop app: {}", path.display());
                let _ = std::process::Command::new(path).spawn();
                launched = true;
                break;
            }
        }

        if !launched {
            println!(
                "operon: native desktop binary not found in build paths, falling back to web console"
            );
        } else {
            return Ok(());
        }
    }

    // 4. Resolve web port and open default browser
    let web_port = args
        .port
        .or_else(|| std::env::var("VITE_PORT").ok().and_then(|p| p.parse().ok()))
        .unwrap_or(5666);

    let target_url = format!("http://localhost:{}{}", web_port, route);
    println!(
        "operon: launching workstation control plane at \x1b[1;32m{}\x1b[0m",
        target_url
    );

    open_in_system_browser(&target_url)?;

    Ok(())
}

fn open_in_system_browser(url: &str) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", url])
            .spawn()?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open").arg(url).spawn()?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open").arg(url).spawn()?;
    }

    Ok(())
}
