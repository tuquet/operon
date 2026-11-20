use std::net::{SocketAddr, TcpStream};
use std::path::PathBuf;
use std::time::Duration;

pub fn probe_port(port: u16) -> bool {
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    TcpStream::connect_timeout(&addr, Duration::from_millis(250)).is_ok()
}

pub async fn probe_port_async(port: u16) -> bool {
    let addr = format!("127.0.0.1:{}", port);
    tokio::time::timeout(
        Duration::from_millis(300),
        tokio::net::TcpStream::connect(&addr),
    )
    .await
    .map(|res| res.is_ok())
    .unwrap_or(false)
}

pub fn find_executable(name: &str) -> Option<PathBuf> {
    if let Ok(path) = std::env::var("PATH") {
        for p in std::env::split_paths(&path) {
            let direct = p.join(name);
            if direct.is_file() {
                return Some(direct);
            }
            #[cfg(windows)]
            {
                let with_exe = p.join(format!("{}.exe", name));
                if with_exe.is_file() {
                    return Some(with_exe);
                }
            }
        }
    }
    None
}
