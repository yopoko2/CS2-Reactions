use std::ffi::OsStr;
use std::fs;
use std::path::{Path, PathBuf};
use sysinfo::{ProcessesToUpdate, System};
use winreg::enums::*;
use winreg::RegKey;

#[derive(Debug, Clone, PartialEq, PartialOrd, Eq, Ord)]
pub enum DiscoveryConfidence {
    Registry = 1,
    Cache = 2,
    Manifest = 3,
    Process = 4,
}

#[derive(Debug, Clone)]
pub struct DiscoveryCandidate {
    pub path: PathBuf,
    pub confidence: DiscoveryConfidence,
}

/// Validates a CS2 path candidate:
/// 1. Exists
/// 2. Contains cs2.exe in game/bin/win64/
/// 3. Contains game/csgo/cfg/
/// 4. Is writable (Crucial for GSI)
pub fn validate_path(path: &Path) -> bool {
    if !path.exists() {
        return false;
    }

    // Binary check
    let bin_path = path.join("game/bin/win64/cs2.exe");
    if !bin_path.exists() {
        return false;
    }

    // CFG directory check
    let cfg_path = path.join("game/csgo/cfg");
    if !cfg_path.exists() {
        return false;
    }

    // Normalization & Symlink resolution
    let _canonical = match fs::canonicalize(path) {
        Ok(p) => p,
        Err(_) => return false,
    };

    // Writable check (Try creating a temp file in cfg)
    let temp_file = cfg_path.join(".cs2reactions_write_test");
    match fs::write(&temp_file, "test") {
        Ok(_) => {
            let _ = fs::remove_file(temp_file);
            true
        }
        Err(_) => false,
    }
}

/// The Ironclad Discovery Engine
/// Collects candidates from all layers, validates them, and returns the highest confidence match.
pub fn find_cs2_install_dir() -> Option<PathBuf> {
    let mut candidates: Vec<DiscoveryCandidate> = Vec::new();

    // LAYER 1: Active Process Intelligence
    if let Some(path) = find_via_active_process() {
        candidates.push(DiscoveryCandidate { path, confidence: DiscoveryConfidence::Process });
    }

    // LAYER 2: Steam Library VDF Scanning
    if let Some(path) = find_via_vdf_scan() {
        candidates.push(DiscoveryCandidate { path, confidence: DiscoveryConfidence::Manifest });
    }

    // LAYER 3: Registry Application Record (Fallback)
    if let Some(path) = find_via_registry() {
        candidates.push(DiscoveryCandidate { path, confidence: DiscoveryConfidence::Registry });
    }

    // Filter, validate, and sort by highest confidence
    candidates.sort_by(|a, b| b.confidence.cmp(&a.confidence));
    
    for candidate in candidates {
        if validate_path(&candidate.path) {
            return Some(candidate.path);
        }
    }

    None
}

fn find_via_active_process() -> Option<PathBuf> {
    let mut s = System::new_all();
    s.refresh_processes(ProcessesToUpdate::All, true);

    for process in s.processes_by_exact_name(OsStr::new("cs2.exe")) {
        if let Some(exe_path) = process.exe() {
            let mut current = exe_path.to_path_buf();
            while let Some(parent) = current.parent() {
                if parent.join("game/csgo/cfg").exists() {
                    return Some(parent.to_path_buf());
                }
                current = parent.to_path_buf();
                if current.as_os_str().is_empty() { break; }
            }
        }
    }
    None
}

fn find_via_registry() -> Option<PathBuf> {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let paths = [
        "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Steam App 730",
        "SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Steam App 730",
    ];

    for path in paths {
        if let Ok(key) = hklm.open_subkey(path) {
            if let Ok(install_location) = key.get_value::<String, _>("InstallLocation") {
                let p = PathBuf::from(install_location);
                if p.exists() {
                    return Some(p);
                }
            }
        }
    }
    None
}

fn find_via_vdf_scan() -> Option<PathBuf> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let steam_key = hkcu.open_subkey("Software\\Valve\\Steam").ok()?;
    let steam_path: String = steam_key.get_value("SteamPath").ok()?;
    let steam_path = Path::new(&steam_path);

    let vdf_path = steam_path.join("steamapps/libraryfolders.vdf");
    if !vdf_path.exists() { return None; }

    let content = fs::read_to_string(vdf_path).ok()?;
    let mut current_lib_path: Option<PathBuf> = None;
    
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("\"path\"") {
            let parts: Vec<&str> = trimmed.split('"').collect();
            if parts.len() >= 4 {
                let raw_path = parts[3].replace("\\\\", "\\");
                current_lib_path = Some(PathBuf::from(raw_path));
            }
        }
        
        if trimmed.contains("\"730\"") {
            if let Some(ref lib_path) = current_lib_path {
                let acf_path = lib_path.join("steamapps/appmanifest_730.acf");
                if acf_path.exists() {
                    if let Ok(acf_content) = fs::read_to_string(&acf_path) {
                        for acf_line in acf_content.lines() {
                            if acf_line.contains("\"installdir\"") {
                                let acf_parts: Vec<&str> = acf_line.split('"').collect();
                                if acf_parts.len() >= 4 {
                                    return Some(lib_path.join("steamapps/common").join(acf_parts[3]));
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    None
}

pub fn install_gsi_config(cs2_root: &Path) -> Result<(), String> {
    let cfg_dir = if cs2_root.join("game/csgo/cfg").exists() {
        cs2_root.join("game/csgo/cfg")
    } else if cs2_root.join("csgo/cfg").exists() {
        cs2_root.join("csgo/cfg")
    } else {
        return Err("Target GSI directory (game/csgo/cfg) not found.".to_string());
    };

    let cfg_file = cfg_dir.join("gamestate_integration_cs2reactions.cfg");
    
    // Core GSI content
    let content = r#""CS2 Reactions"
{
    "uri" "http://127.0.0.1:27532"
    "timeout" "1.0"
    "buffer"  "0.0"
    "throttle" "0.0"
    "heartbeat" "5.0"
    "data"
    {
        "provider"            "1"
        "map"                 "1"
        "round"               "1"
        "bomb"                "1"
        "player_id"           "1"
        "player_state"        "1"
        "player_match_stats"  "1"
        "player_weapons"      "1"
        "map_round_wins"      "1"
    }
}
"#;

    // Force update the file to ensure we have the latest weapon modules
    fs::write(cfg_file, content).map_err(|e| format!("Autonomous GSI write failed: {}", e))
}
