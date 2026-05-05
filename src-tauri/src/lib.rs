mod cs2_discovery;
mod gsi_server;
mod profile_manager;

use tauri::Manager;
use tauri::Emitter;
use tauri::path::BaseDirectory;
use std::path::Path;
use std::sync::{Arc, Mutex, atomic::{AtomicBool, Ordering}};
use tauri_plugin_global_shortcut::ShortcutState;

struct GsiState(Mutex<Arc<AtomicBool>>);
/// Active local GSI HTTP port (must match `gamestate_integration_cs2reactions.cfg`).
struct GsiActivePort(Mutex<Option<u16>>);
struct SystemState(Mutex<sysinfo::System>);

fn gsi_listen_port(app: &tauri::AppHandle) -> Result<u16, String> {
    let state = app
        .try_state::<GsiActivePort>()
        .ok_or_else(|| "GSI port state not initialized.".to_string())?;
    let g = state
        .0
        .lock()
        .map_err(|_| "GSI port lock poisoned.".to_string())?;
    g.ok_or_else(|| {
        "The GSI server is not listening (all ports 27532–27537 may be in use). Restart CS2 Reactions or close conflicting apps."
            .to_string()
    })
}

const AUTOSTART_KEY: &str = "CS2Reactions";
const LEGACY_AUTOSTART_KEYS: &[&str] = &["CS2 Reactions", "CS2Vibe"];

#[tauri::command]
fn link_to_cs2(app: tauri::AppHandle) -> Result<String, String> {
    use std::sync::mpsc;
    use std::thread;
    use std::time::Duration;
    use serde_json::Value;

    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let config_path = app_data_dir.join("config.json");
    if let Ok(config_str) = std::fs::read_to_string(&config_path) {
        if let Ok(json) = serde_json::from_str::<Value>(&config_str) {
            if let Some(cached_path) = json.get("cs2Path").and_then(|p| p.as_str()) {
                let p = std::path::PathBuf::from(cached_path);
                if cs2_discovery::validate_path(&p) {
                    let port = gsi_listen_port(&app)?;
                    let _ = cs2_discovery::install_gsi_config(&p, port)?;
                    return Ok(format!("Successfully linked to CS2 at {:?}", p));
                }
            }
        }
    }

    let (tx, rx) = mpsc::channel();
    
    thread::spawn(move || {
        let result = cs2_discovery::find_cs2_install_dir();
        let _ = tx.send(result);
    });

    match rx.recv_timeout(Duration::from_secs(5)) {
        Ok(Some(path)) => {
            let port = gsi_listen_port(&app)?;
            cs2_discovery::install_gsi_config(&path, port)?;
            Ok(format!("Successfully linked to CS2 at {:?}", path))
        }
        Ok(None) => Err("Could not find Counter-Strike 2. Please make sure the game is installed.".to_string()),
        Err(_) => Err("Automatic search timed out. You can still link manually in the buttons below.".to_string()),
    }
}

#[tauri::command]
fn link_to_cs2_manual(path: String, app: tauri::AppHandle) -> Result<String, String> {
    let p = Path::new(&path);
    let port = gsi_listen_port(&app)?;
    cs2_discovery::install_gsi_config(p, port)?;
    Ok(format!("Successfully linked to CS2 at {:?}", p))
}

#[tauri::command]
fn copy_sound(app: tauri::AppHandle, path: String) -> Result<String, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let source = Path::new(&path);
    let target = profile_manager::copy_sound_to_appdata(source, &app_data_dir)?;
    Ok(target.to_string_lossy().to_string())
}

#[tauri::command]
fn trim_silence(path: String, threshold_db: f32, trim_mode: profile_manager::TrimMode) -> Result<profile_manager::TrimResult, String> {
    Ok(profile_manager::auto_trim_silence(Path::new(&path), threshold_db, trim_mode))
}

#[tauri::command]
fn save_config(app: tauri::AppHandle, json: String) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    if !app_data_dir.exists() {
        let _ = std::fs::create_dir_all(&app_data_dir);
    }
    let config_path = app_data_dir.join("config.json");
    
    if config_path.exists() {
        let backup_path = config_path.with_extension("json.bak");
        let _ = std::fs::copy(&config_path, backup_path);
    }

    std::fs::write(&config_path, json).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_config(app: tauri::AppHandle) -> Result<String, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let config_path = app_data_dir.join("config.json");
    let backup_path = config_path.with_extension("json.bak");

    if config_path.exists() {
        let content = std::fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
        if serde_json::from_str::<serde_json::Value>(&content).is_ok() {
            return Ok(content);
        }
    }
    
    if backup_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&backup_path) {
            if serde_json::from_str::<serde_json::Value>(&content).is_ok() {
                return Ok(content);
            }
        }
    }

    Ok(String::new())
}

#[tauri::command]
fn export_profile_cmd(output_path: String, config_json: String) -> Result<(), String> {
    profile_manager::export_profile(Path::new(&output_path), &config_json)
}

#[tauri::command]
fn is_cs2_running(state: tauri::State<'_, SystemState>) -> bool {
    let mut s = state.0.lock().unwrap_or_else(|e| e.into_inner());
    s.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
    let exists = s.processes().values().any(|p| {
        let name = p.name().to_string_lossy().to_lowercase();
        name == "cs2.exe" || name == "cs2"
    });
    exists
}

#[tauri::command]
fn import_profile_cmd(app: tauri::AppHandle, zip_path: String) -> Result<String, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    profile_manager::import_profile(Path::new(&zip_path), &app_data_dir)
}

#[tauri::command]
fn peek_profile_cmd(zip_path: String) -> Result<String, String> {
    profile_manager::peek_profile(Path::new(&zip_path))
}

fn set_autostart_internal(enabled: bool) -> Result<(), String> {
    use winreg::enums::*;
    use winreg::RegKey;
    
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let path = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run";
    let (key, _) = hkcu.create_subkey(path).map_err(|e| e.to_string())?;
    
    if enabled {
        let exe_path = std::env::current_exe()
            .map_err(|e| e.to_string())?
            .to_str()
            .ok_or("Invalid path")?
            .to_string();
        key.set_value(AUTOSTART_KEY, &exe_path).map_err(|e| e.to_string())?;
    } else {
        let _ = key.delete_value(AUTOSTART_KEY);
        for legacy in LEGACY_AUTOSTART_KEYS {
            let _ = key.delete_value(legacy);
        }
    }
    Ok(())
}

#[tauri::command]
fn set_autostart(enabled: bool) -> Result<(), String> {
    set_autostart_internal(enabled)
}

fn sync_autostart_with_config(app: &tauri::AppHandle) {
    let app_data_dir = match app.path().app_data_dir() {
        Ok(p) => p,
        Err(_) => return,
    };
    let config_path = app_data_dir.join("config.json");
    if let Ok(content) = std::fs::read_to_string(config_path) {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(enabled) = json.get("autostart").and_then(|v| v.as_bool()) {
                let _ = set_autostart_internal(enabled);
            }
        }
    }
}

#[tauri::command]
fn get_os_language() -> String {
    use winreg::enums::*;
    use winreg::RegKey;
    
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok(key) = hkcu.open_subkey("Control Panel\\International") {
        if let Ok(locale) = key.get_value::<String, _>("LocaleName") {
            return locale;
        }
    }
    "en-US".to_string() 
}

#[tauri::command]
fn update_tray_menu(app: tauri::AppHandle, labels: serde_json::Value) -> Result<(), String> {
    use tauri::menu::{MenuBuilder, MenuItem, SubmenuBuilder, CheckMenuItemBuilder};
    
    let menu_show = labels.get("show").and_then(|v| v.as_str()).unwrap_or("Show app");
    let menu_vol = labels.get("volume").and_then(|v| v.as_str()).unwrap_or("Master Volume");
    let menu_mute = labels.get("mute").and_then(|v| v.as_str()).unwrap_or("Mute");
    let menu_unmute = labels.get("unmute").and_then(|v| v.as_str()).unwrap_or("Unmute");
    let menu_quit = labels.get("quit").and_then(|v| v.as_str()).unwrap_or("Quit");
    let is_currently_muted = labels.get("isMuted").and_then(|v| v.as_bool()).unwrap_or(false);

    let vol_submenu = SubmenuBuilder::new(&app, menu_vol)
        .item(&MenuItem::with_id(&app, "vol_100", "100%", true, None::<&str>).map_err(|e| e.to_string())?)
        .item(&MenuItem::with_id(&app, "vol_80", "80%", true, None::<&str>).map_err(|e| e.to_string())?)
        .item(&MenuItem::with_id(&app, "vol_60", "60%", true, None::<&str>).map_err(|e| e.to_string())?)
        .item(&MenuItem::with_id(&app, "vol_40", "40%", true, None::<&str>).map_err(|e| e.to_string())?)
        .item(&MenuItem::with_id(&app, "vol_20", "20%", true, None::<&str>).map_err(|e| e.to_string())?)
        .separator()
        .item(&CheckMenuItemBuilder::with_id("mute_toggle", if is_currently_muted { menu_unmute } else { menu_mute })
            .checked(is_currently_muted)
            .build(&app).map_err(|e| e.to_string())?)
        .build().map_err(|e| e.to_string())?;

    let menu = MenuBuilder::new(&app)
        .item(&MenuItem::with_id(&app, "show", menu_show, true, None::<&str>).map_err(|e| e.to_string())?)
        .separator()
        .item(&vol_submenu)
        .separator()
        .item(&MenuItem::with_id(&app, "quit", menu_quit, true, None::<&str>).map_err(|e| e.to_string())?)
        .build().map_err(|e| e.to_string())?;

    if let Some(tray) = app.tray_by_id("main-tray") {
        let _ = tray.set_menu(Some(menu));
    }
    Ok(())
}

#[tauri::command]
fn restart_gsi_server(
    app: tauri::AppHandle,
    state: tauri::State<'_, GsiState>,
    port_state: tauri::State<'_, GsiActivePort>,
) -> Result<(), String> {
    {
        let flag = state.0.lock().unwrap_or_else(|e| e.into_inner());
        flag.store(false, Ordering::SeqCst);
    }

    std::thread::sleep(std::time::Duration::from_millis(150));

    match gsi_server::GsiServer::start(app.clone()) {
        Ok((new_flag, port)) => {
            *state.0.lock().unwrap_or_else(|e| e.into_inner()) = new_flag;
            *port_state.0.lock().unwrap_or_else(|e| e.into_inner()) = Some(port);
            let _ = app.emit("gsi_listening", serde_json::json!({ "port": port }));
            Ok(())
        }
        Err(e) => {
            *port_state.0.lock().unwrap_or_else(|e| e.into_inner()) = None;
            Err(e)
        }
    }
}

#[tauri::command]
fn get_gsi_listen_port(app: tauri::AppHandle) -> Option<u16> {
    let s = app.try_state::<GsiActivePort>()?;
    s.0.lock().ok().and_then(|g| *g)
}

/// Directory containing bundled `.CSreact` starter packs (`$RESOURCE/presets`, or `src-tauri/presets` in debug).
#[tauri::command]
fn get_bundled_presets_dir(app: tauri::AppHandle) -> Option<String> {
    if let Ok(path) = app.path().resolve("presets", BaseDirectory::Resource) {
        if path.is_dir() {
            return Some(path.to_string_lossy().to_string());
        }
    }
    #[cfg(debug_assertions)]
    {
        let dev = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("presets");
        if dev.is_dir() {
            return Some(dev.to_string_lossy().to_string());
        }
    }
    None
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    let _ = app.emit("app-quit", ());
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(500));
        app.exit(0);
    });
}

#[tauri::command]
fn sync_volume_value(app: tauri::AppHandle, volume: f32) {
    let _ = app.emit("volume-sync", volume);
}

#[tauri::command]
fn hide_main_window(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
        let _ = window.set_skip_taskbar(true);
    }
}

#[tauri::command]
fn update_tray_mute_status(_app: tauri::AppHandle, _is_muted: bool) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
fn show_main_window(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.set_skip_taskbar(false);
    }
}

#[tauri::command]
fn update_tray_mute_shortcut(app: tauri::AppHandle, old_shortcut: String, new_shortcut: String) -> Result<(), String> {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;
    
    if !old_shortcut.is_empty() && old_shortcut != new_shortcut {
        if let Ok(s) = old_shortcut.parse::<tauri_plugin_global_shortcut::Shortcut>() {
            let _ = app.global_shortcut().unregister(s);
        }
    }
    
    if !new_shortcut.is_empty() {
        let s = new_shortcut.parse::<tauri_plugin_global_shortcut::Shortcut>()
            .map_err(|e| format!("Invalid hotkey format {}: {}", new_shortcut, e))?;
        app.global_shortcut().register(s)
            .map_err(|e| format!("Failed to register hotkey {}: {}", new_shortcut, e))?;
    }
    
    Ok(())
}

#[tauri::command]
fn nuke_all_data(app: tauri::AppHandle) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    
    let sounds_dir = app_data_dir.join("sounds");
    if sounds_dir.exists() {
        let _ = std::fs::remove_dir_all(&sounds_dir);
    }

    let config_path = app_data_dir.join("config.json");
    if config_path.exists() {
        let _ = std::fs::remove_file(&config_path);
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new()
            .with_handler(|app, _shortcut, event| {
                if event.state() == ShortcutState::Pressed {
                    let _ = app.emit("shortcut-mute-toggle", ());
                }
            })
            .build())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            println!("[STARTUP] CS2 Reactions v4.4.5 initializing...");
            let handle = app.handle().clone();
            match gsi_server::GsiServer::start(handle.clone()) {
                Ok((gsi_running, port)) => {
                    println!("[STARTUP] GSI server listening on port {}.", port);
                    app.manage(GsiState(Mutex::new(gsi_running)));
                    app.manage(GsiActivePort(Mutex::new(Some(port))));
                }
                Err(e) => {
                    eprintln!("[STARTUP] GSI server failed: {}", e);
                    app.manage(GsiState(Mutex::new(Arc::new(AtomicBool::new(false)))));
                    app.manage(GsiActivePort(Mutex::new(None)));
                }
            }
            app.manage(SystemState(Mutex::new(sysinfo::System::new())));

            let handle_watchdog = app.handle().clone();
            std::thread::spawn(move || {
                let s_state: tauri::State<'_, SystemState> = handle_watchdog.state();
                loop {
                    let mut s = s_state.0.lock().unwrap_or_else(|e| e.into_inner());
                    s.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
                    let exists = s.processes().values().any(|p| {
                        let name = p.name().to_string_lossy().to_lowercase();
                        name == "cs2.exe" || name == "cs2"
                    });
                    let _ = handle_watchdog.emit("cs2-running", exists);
                    drop(s);
                    std::thread::sleep(std::time::Duration::from_secs(2));
                }
            });
            
            let _tray = tauri::tray::TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().cloned().unwrap_or_else(|| tauri::image::Image::new(&[], 0, 0)))
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                                let _ = window.set_skip_taskbar(false);
                            }
                        }
                        "quit" => {
                            let _ = app.emit("app-quit", ());
                            let handle = app.clone();
                            std::thread::spawn(move || {
                                std::thread::sleep(std::time::Duration::from_millis(500));
                                handle.exit(0);
                            });
                        }
                        "vol_100" => { let _ = app.emit("volume-sync", 1.0); }
                        "vol_80" => { let _ = app.emit("volume-sync", 0.8); }
                        "vol_60" => { let _ = app.emit("volume-sync", 0.6); }
                        "vol_40" => { let _ = app.emit("volume-sync", 0.4); }
                        "vol_20" => { let _ = app.emit("volume-sync", 0.2); }
                        "mute_toggle" => { let _ = app.emit("shortcut-mute-toggle", ()); }
                        _ => {}
                    }
                })
                .build(app)?;

            if let Some(window) = app.get_webview_window("main") {
                if let Ok(Some(monitor)) = window.primary_monitor() {
                    let screen_w = monitor.size().width as f64 / monitor.scale_factor();
                    let screen_h = monitor.size().height as f64 / monitor.scale_factor();
                    let target_w = (screen_w * 0.70).clamp(960.0, 1600.0) as u32;
                    let target_h = (screen_h * 0.70).clamp(700.0, 1000.0) as u32;
                    let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize { width: target_w, height: target_h }));
                    let _ = window.center();
                }
            }

            sync_autostart_with_config(app.handle());
            
            Ok(())
        })
        .plugin(tauri_plugin_positioner::init())
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                let _ = window.emit("main-window-close", ());
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            link_to_cs2,
            link_to_cs2_manual,
            copy_sound,
            save_config,
            load_config,
            export_profile_cmd,
            import_profile_cmd,
            peek_profile_cmd,
            trim_silence,
            set_autostart,
            get_os_language,
            update_tray_menu,
            update_tray_mute_shortcut,
            update_tray_mute_status,
            nuke_all_data,
            restart_gsi_server,
            sync_volume_value,
            show_main_window,
            hide_main_window,
            is_cs2_running,
            quit_app,
            get_gsi_listen_port,
            get_bundled_presets_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
