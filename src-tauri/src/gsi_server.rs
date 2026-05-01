use serde_json::Value;
use std::io::Read;
use std::sync::{Arc, atomic::{AtomicBool, Ordering}};
use std::thread;
use std::time::Duration;
use tauri::Emitter;
use tiny_http::{Response, Server};

pub struct GsiServer {
    running: Arc<AtomicBool>,
    _thread_handle: Option<thread::JoinHandle<()>>,
}

impl GsiServer {
    pub fn start(app_handle: tauri::AppHandle) -> Arc<AtomicBool> {
        let running = Arc::new(AtomicBool::new(true));
        let r = running.clone();

        thread::spawn(move || {
            let server = match Server::http("127.0.0.1:27532") {
                Ok(s) => s,
                Err(e) => {
                    // Surface port conflict to user via frontend event
                    let _ = app_handle.emit("gsi_server_error", format!("Port 27532 conflict: {}. Another instance or GSI tool may be running.", e));
                    return;
                }
            };

            while r.load(Ordering::SeqCst) {
                if let Ok(Some(mut request)) = server.try_recv() {
                    if request.method() == &tiny_http::Method::Post {
                        let mut content = String::new();
                        let mut buffer = [0u8; 8192];
                        let mut total_size = 0;
                        let mut reader = request.as_reader();
                        
                        while let Ok(n) = reader.read(&mut buffer) {
                            if n == 0 || total_size + n > 65536 { break; }
                            content.push_str(&String::from_utf8_lossy(&buffer[..n]));
                            total_size += n;
                        }

                        if let Ok(json) = serde_json::from_str::<Value>(&content) {
                            // ROBUST REVERSION: Send the full JSON object to the frontend.
                            // This restores stability by letting React handle the full state
                            // without backend-side stripping errors.
                            let _ = app_handle.emit("gsi_event", &json);
                        }

                        let response = Response::from_string("OK");
                        let _ = request.respond(response);
                    }
                } else {
                    thread::sleep(Duration::from_millis(10)); // Restore slight throttle for stability
                }
            }
        });

        running
    }
}
