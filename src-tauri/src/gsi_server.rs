use serde_json::Value;
use std::sync::{Arc, atomic::{AtomicBool, Ordering}};
use std::thread;
use std::time::Duration;
use tauri::Emitter;
use tiny_http::{Response, Server};

/// Primary + fallback ports for the local GSI HTTP listener (game cfg must match).
pub const GSI_PORT_CANDIDATES: [u16; 6] = [27532, 27533, 27534, 27535, 27536, 27537];

pub struct GsiServer {
    running: Arc<AtomicBool>,
    _thread_handle: Option<thread::JoinHandle<()>>,
}

impl GsiServer {
    pub fn start(app_handle: tauri::AppHandle) -> Result<(Arc<AtomicBool>, u16), String> {
        let mut server_opt = None;
        let mut chosen: Option<u16> = None;
        for &port in GSI_PORT_CANDIDATES.iter() {
            match Server::http(format!("127.0.0.1:{}", port)) {
                Ok(s) => {
                    chosen = Some(port);
                    server_opt = Some(s);
                    break;
                }
                Err(_) => continue,
            }
        }

        let (server, port) = match (server_opt, chosen) {
            (Some(s), Some(p)) => (s, p),
            _ => {
                let msg = format!(
                    "Could not bind a GSI listener on ports {:?}. Close duplicate CS2 Reactions instances or other apps using these ports.",
                    GSI_PORT_CANDIDATES
                );
                let _ = app_handle.emit("gsi_server_error", &msg);
                return Err(msg);
            }
        };

        let _ = app_handle.emit("gsi_listening", serde_json::json!({ "port": port }));

        let running = Arc::new(AtomicBool::new(true));
        let r = running.clone();

        thread::spawn(move || {
            while r.load(Ordering::SeqCst) {
                if let Ok(Some(mut request)) = server.try_recv() {
                    if request.method() == &tiny_http::Method::Post {
                        let mut content = String::new();
                        let mut buffer = [0u8; 8192];
                        let mut total_size = 0;
                        let reader = request.as_reader();

                        while let Ok(n) = reader.read(&mut buffer) {
                            if n == 0 || total_size + n > 65536 { break; }
                            content.push_str(&String::from_utf8_lossy(&buffer[..n]));
                            total_size += n;
                        }

                        if let Ok(json) = serde_json::from_str::<Value>(&content) {
                            let _ = app_handle.emit("gsi_event", &json);
                        }

                        let response = Response::from_string("OK");
                        let _ = request.respond(response);
                    }
                } else {
                    thread::sleep(Duration::from_millis(10));
                }
            }
        });

        Ok((running, port))
    }
}
