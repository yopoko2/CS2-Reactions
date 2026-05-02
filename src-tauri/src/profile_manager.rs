use std::panic;
use std::fs::{self, File};
use std::io::{Read, Write, self};
use std::path::{Path, PathBuf};
use serde::{Serialize, Deserialize};
use serde_json::{Value, json};
use chrono::Local;
use zip::write::{ZipWriter, SimpleFileOptions};
use zip::read::ZipArchive;
use sha2::{Sha256, Digest};
use hex;

use symphonia::core::audio::AudioBufferRef;
use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_NULL};
use symphonia::core::errors::Error as SymphoniaError;
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use hound::{WavWriter, WavSpec, SampleFormat};

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum TrimResult {
    Trimmed { lead_ms: u32, tail_ms: u32 },
    Skipped(String),
    Error(String),
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TrimMode {
    Start,
    End,
    Both,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Manifest {
    pub manifest_version: u32,
    pub profile_name: String,
    pub created_at: String,
    pub app_version: String,
    pub sound_count: usize,
    pub sounds: Vec<ProfileSound>,
    pub missing_at_export: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProfileSound {
    pub event_key: String,
    pub filename: String,
    pub volume: f32,
    pub playback_mode: String,
    pub content_hash: String,
    pub trim_metadata: Option<Value>,
}

pub fn sanitize_filename(name: &str) -> String {
    let mut sanitized = name
        .chars()
        .map(|c| match c {
            '\\' | '/' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            c if c.is_control() => '_',
            c => c,
        })
        .collect::<String>();
    
    sanitized = sanitized.trim_end_matches(|c| c == ' ' || c == '.').to_string();
    
    if sanitized.is_empty() {
        "unnamed_file".to_string()
    } else {
        sanitized
    }
}

pub fn calculate_hash(path: &Path) -> Result<String, String> {
    let mut file = File::open(path).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    let mut buffer = [0; 1024];
    loop {
        let n = file.read(&mut buffer).map_err(|e| e.to_string())?;
        if n == 0 { break; }
        hasher.update(&buffer[..n]);
    }
    Ok(hex::encode(hasher.finalize()))
}

pub fn copy_sound_to_appdata(source_path: &Path, app_data_dir: &Path) -> Result<PathBuf, String> {
    let sounds_dir = app_data_dir.join("sounds");
    if !sounds_dir.exists() {
        fs::create_dir_all(&sounds_dir).map_err(|e| format!("Failed to create AppData/sounds directory: {}", e))?;
    }

    let file_name = source_path.file_name().ok_or("Invalid file name")?;
    let target_path = sounds_dir.join(file_name);
    
    fs::copy(source_path, &target_path).map_err(|e| format!("Failed to copy sound: {}", e))?;
    
    Ok(target_path)
}


pub fn auto_trim_silence(path: &Path, threshold_db: f32, mode: TrimMode) -> TrimResult {
    match panic::catch_unwind(|| {
        inner_auto_trim_silence(path, threshold_db, mode)
    }) {
        Ok(res) => res,
        Err(_) => TrimResult::Error("Panic during trim operation".to_string()),
    }
}

fn inner_auto_trim_silence(path: &Path, threshold_db: f32, mode: TrimMode) -> TrimResult {
    let file = match File::open(path) {
        Ok(f) => f,
        Err(e) => return TrimResult::Error(format!("IO Error: {}", e)),
    };

    let mss = MediaSourceStream::new(Box::new(file), Default::default());
    let mut hint = Hint::new();
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        hint.with_extension(ext);
    }

    let meta_opts = MetadataOptions::default();
    let fmt_opts = FormatOptions::default();

    let probed = match symphonia::default::get_probe().format(&hint, mss, &fmt_opts, &meta_opts) {
        Ok(p) => p,
        Err(e) => return TrimResult::Error(format!("Decode Error: {}", e)),
    };

    let mut format = probed.format;
    let track = match format.tracks().iter().find(|t| t.codec_params.codec != CODEC_TYPE_NULL) {
        Some(t) => t,
        None => return TrimResult::Error("No valid audio track found".to_string()),
    };

    let dec_opts = DecoderOptions::default();
    let mut decoder = match symphonia::default::get_codecs().make(&track.codec_params, &dec_opts) {
        Ok(d) => d,
        Err(e) => return TrimResult::Error(format!("Codec Error: {}", e)),
    };

    let sample_rate = track.codec_params.sample_rate.unwrap_or(44100);
    let mut samples: Vec<Vec<f32>> = Vec::new();

    while let Ok(packet) = format.next_packet() {
        match decoder.decode(&packet) {
            Ok(AudioBufferRef::F32(buf)) => {
                if samples.is_empty() {
                    samples = vec![Vec::new(); buf.spec().channels.count()];
                }
                for (plane_idx, plane) in buf.planes().planes().iter().enumerate() {
                    samples[plane_idx].extend_from_slice(plane);
                }
            }
            Ok(AudioBufferRef::S16(buf)) => {
                if samples.is_empty() {
                    samples = vec![Vec::new(); buf.spec().channels.count()];
                }
                for (plane_idx, plane) in buf.planes().planes().iter().enumerate() {
                    samples[plane_idx].extend(plane.iter().map(|&s| s as f32 / 32768.0));
                }
            }
            Ok(AudioBufferRef::S32(buf)) => {
                if samples.is_empty() {
                    samples = vec![Vec::new(); buf.spec().channels.count()];
                }
                for (plane_idx, plane) in buf.planes().planes().iter().enumerate() {
                    samples[plane_idx].extend(plane.iter().map(|&s| s as f32 / 2147483648.0));
                }
            }
            Ok(AudioBufferRef::S24(buf)) => {
                if samples.is_empty() {
                    samples = vec![Vec::new(); buf.spec().channels.count()];
                }
                for (plane_idx, plane) in buf.planes().planes().iter().enumerate() {
                    samples[plane_idx].extend(plane.iter().map(|&s| s.0 as f32 / 8388608.0));
                }
            }
            Ok(AudioBufferRef::U8(buf)) => {
                if samples.is_empty() {
                    samples = vec![Vec::new(); buf.spec().channels.count()];
                }
                for (plane_idx, plane) in buf.planes().planes().iter().enumerate() {
                    samples[plane_idx].extend(plane.iter().map(|&s| (s as f32 - 128.0) / 128.0));
                }
            }
            Ok(AudioBufferRef::F64(buf)) => {
                if samples.is_empty() {
                    samples = vec![Vec::new(); buf.spec().channels.count()];
                }
                for (plane_idx, plane) in buf.planes().planes().iter().enumerate() {
                    samples[plane_idx].extend(plane.iter().map(|&s| s as f32));
                }
            }
            Ok(_) => continue,
            Err(SymphoniaError::IoError(_)) => break,
            Err(e) => return TrimResult::Error(format!("Decoding Error: {}", e)),
        }
    }

    if samples.is_empty() || samples[0].is_empty() {
        return TrimResult::Skipped("empty_file".to_string());
    }

    let total_samples = samples[0].len();
    let duration_ms = (total_samples as f32 / sample_rate as f32 * 1000.0) as u32;

    if duration_ms < 100 {
        return TrimResult::Skipped("too_short".to_string());
    }

    let linear_threshold = 10.0_f32.powf(threshold_db / 20.0);
    
    let mut lead_index = 0;
    let mut found_lead = false;
    for i in 0..total_samples {
        let mut peak = 0.0_f32;
        for ch in 0..samples.len() {
            peak = peak.max(samples[ch][i].abs());
        }
        if peak > linear_threshold {
            lead_index = i;
            found_lead = true;
            break;
        }
    }

    let mut tail_index = total_samples - 1;
    let mut found_tail = false;
    for i in (0..total_samples).rev() {
        let mut peak = 0.0_f32;
        for ch in 0..samples.len() {
            peak = peak.max(samples[ch][i].abs());
        }
        if peak > linear_threshold {
            tail_index = i;
            found_tail = true;
            break;
        }
    }

    if !found_lead || !found_tail {
        return TrimResult::Skipped("all_silent".to_string());
    }

    let mut start_idx = lead_index;
    let mut end_idx = tail_index;

    match mode {
        TrimMode::Start => {
            end_idx = total_samples - 1;
        }
        TrimMode::End => {
            start_idx = 0;
        }
        TrimMode::Both => {}
    }

    let lead_ms = (start_idx as f32 / sample_rate as f32 * 1000.0) as u32;
    let tail_ms = ((total_samples - 1 - end_idx) as f32 / sample_rate as f32 * 1000.0) as u32;

    if lead_ms < 50 && tail_ms < 100 {
        return TrimResult::Skipped("below_min_threshold".to_string());
    }

    let trimmed_duration_samples = end_idx - start_idx;
    if (trimmed_duration_samples as f32 / total_samples as f32) < 0.2 {
        return TrimResult::Skipped("trim_exceeds_threshold".to_string());
    }
    
    let trimmed_ms = (trimmed_duration_samples as f32 / sample_rate as f32 * 1000.0) as u32;
    if trimmed_ms < 100 {
        return TrimResult::Skipped("result_too_short".to_string());
    }

    let temp_path = path.with_extension("tmp_wav");
    let spec = WavSpec {
        channels: samples.len() as u16,
        sample_rate,
        bits_per_sample: 32,
        sample_format: SampleFormat::Float,
    };

    {
        let mut writer = match WavWriter::create(&temp_path, spec) {
            Ok(w) => w,
            Err(e) => return TrimResult::Error(format!("WAV Create Error: {}", e)),
        };

        for i in start_idx..end_idx {
            for ch in &samples {
                if let Err(e) = writer.write_sample(ch[i]) {
                    return TrimResult::Error(format!("WAV Write Error: {}", e));
                }
            }
        }
        let _ = writer.finalize();
    }

    let mut final_path = path.to_path_buf();
    final_path.set_extension("wav");

    if let Err(e) = fs::rename(&temp_path, &final_path) {
        return TrimResult::Error(format!("Final Rename Error: {}", e));
    }

    if path != final_path {
        let _ = fs::remove_file(path);
    }

    TrimResult::Trimmed { lead_ms, tail_ms }
}

pub fn export_profile(output_path: &Path, config_json: &str) -> Result<(), String> {
    let file = File::create(output_path).map_err(|e| e.to_string())?;
    let mut zip = ZipWriter::new(file);

    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Stored)
        .unix_permissions(0o755);

    let mapping_val: Value = serde_json::from_str(config_json).map_err(|e| format!("Invalid JSON: {}", e))?;
    
    let profile_name = output_path.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("unnamed_profile")
        .to_string();

    let mut manifest = Manifest {
        manifest_version: 2,
        profile_name,
        created_at: Local::now().to_rfc3339(),
        app_version: "4.4.1".to_string(),
        sound_count: 0,
        sounds: Vec::new(),
        missing_at_export: Vec::new(),
    };

    let mut expected_entry_count = 1; // manifest.json
    let mut exported_hash_to_filename: std::collections::HashMap<String, String> = std::collections::HashMap::new();

    if let Some(mapping) = mapping_val.as_object() {
        for (event_key, event_config) in mapping {
            if let Some(sounds) = event_config.get("sounds").and_then(|s| s.as_array()) {
                let playback_mode = event_config.get("mode").and_then(|m| m.as_str()).unwrap_or("random").to_string();
                
                for sound_item in sounds {
                    let original_path_str = sound_item.get("path").and_then(|p| p.as_str()).unwrap_or("");
                    let volume = sound_item.get("volume").and_then(|v| v.as_f64()).unwrap_or(1.0) as f32;
                    let sound_name_orig = sound_item.get("name").and_then(|n| n.as_str()).unwrap_or("unknown");
                    
                    let original_path = Path::new(original_path_str);
                    
                    if original_path.exists() && original_path.is_file() {
                        let hash = calculate_hash(original_path)?;
                        let file_name = sanitize_filename(
                            original_path.file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("unknown_file")
                        );
                        
                        let canonical_filename = if let Some(existing_filename) = exported_hash_to_filename.get(&hash) {
                            existing_filename.clone()
                        } else {
                            let zip_internal_path = format!("sounds/{}", file_name);
                            let mut f = File::open(original_path).map_err(|e| e.to_string())?;
                            zip.start_file(&zip_internal_path, options).map_err(|e| e.to_string())?;
                            std::io::copy(&mut f, &mut zip).map_err(|e| e.to_string())?;
                            expected_entry_count += 1;
                            exported_hash_to_filename.insert(hash.clone(), file_name.clone());
                            file_name
                        };

                        manifest.sounds.push(ProfileSound {
                            event_key: event_key.clone(),
                            filename: canonical_filename,
                            volume,
                            playback_mode: playback_mode.clone(),
                            content_hash: hash,
                            trim_metadata: sound_item.get("trimMetadata").cloned(),
                        });
                    } else {
                        manifest.missing_at_export.push(format!("{} ({})", sound_name_orig, event_key));
                    }
                }
            }
        }
    }

    manifest.sound_count = manifest.sounds.len();
    let manifest_json = serde_json::to_string_pretty(&manifest).map_err(|e| e.to_string())?;
    
    zip.start_file("manifest.json", options).map_err(|e| e.to_string())?;
    zip.write_all(manifest_json.as_bytes()).map_err(|e| e.to_string())?;

    zip.finish().map_err(|e| e.to_string())?;

    let verify_file = File::open(output_path).map_err(|e| e.to_string())?;
    let verify_zip = ZipArchive::new(verify_file).map_err(|e| e.to_string())?;
    if verify_zip.len() != expected_entry_count {
        return Err(format!("Export validation failed: entries mismatch (expected {}, found {})", expected_entry_count, verify_zip.len()));
    }

    Ok(())
}

pub fn import_profile(zip_path: &Path, app_data_dir: &Path) -> Result<String, String> {
    let file = File::open(zip_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;
    
    let sounds_dir = app_data_dir.join("sounds");
    fs::create_dir_all(&sounds_dir).map_err(|e| format!("Import failed: could not create sounds directory: {}", e))?;

    let is_v2 = archive.by_name("manifest.json").is_ok();
    
    if is_v2 {
        let manifest: Manifest = {
            let mut manifest_file = archive.by_name("manifest.json").map_err(|e| e.to_string())?;
            let mut manifest_content = String::new();
            manifest_file.read_to_string(&mut manifest_content).map_err(|e| e.to_string())?;
            serde_json::from_str(&manifest_content).map_err(|e| e.to_string())?
        };

        let mut hash_to_path = std::collections::HashMap::new();
        if let Ok(entries) = fs::read_dir(&sounds_dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_file() {
                    if let Ok(h) = calculate_hash(&p) {
                        hash_to_path.insert(h, p);
                    }
                }
            }
        }

        let mut final_mapping = json!({});
        let mut skipped_count = 0;
        let total_planned = manifest.sounds.len();

        for sound in &manifest.sounds {
            let zip_internal_path = format!("sounds/{}", sound.filename);
            
            let mut zip_file = match archive.by_name(&zip_internal_path) {
                Ok(f) => f,
                Err(_) => {
                    skipped_count += 1;
                    continue;
                }
            };
            
            let final_path = if let Some(existing_path) = hash_to_path.get(&sound.content_hash) {
                existing_path.clone()
            } else {
                let timestamp = Local::now().format("%Y%m%d%H%M%S").to_string();
                let hash_prefix = &sound.content_hash[..sound.content_hash.len().min(8)];
                let unique_filename = format!("{}_{}_{}", timestamp, hash_prefix, sanitize_filename(&sound.filename));
                let target_path = sounds_dir.join(unique_filename);
                
                let creation_res = File::create(&target_path);
                match creation_res {
                    Ok(mut out) => {
                        if let Err(_) = io::copy(&mut zip_file, &mut out) {
                            skipped_count += 1;
                            continue;
                        }
                        hash_to_path.insert(sound.content_hash.clone(), target_path.clone());
                        target_path
                    }
                    Err(_) => {
                        skipped_count += 1;
                        continue;
                    }
                }
            };

            if final_mapping.get(&sound.event_key).is_none() {
                final_mapping[&sound.event_key] = json!({
                    "enabled": true,
                    "dashboardVisible": true,
                    "sounds": [],
                    "mode": sound.playback_mode,
                    "currentIndex": 0,
                    "history": []
                });
            }

            let sound_id = format!("imported_{}", sound.content_hash);
            final_mapping[&sound.event_key]["sounds"].as_array_mut().unwrap().push(json!({
                "id": sound_id,
                "path": final_path.to_str().unwrap_or(""),
                "name": sound.filename,
                "volume": sound.volume,
                "trimMetadata": sound.trim_metadata
            }));
        }

        if let Some(obj) = final_mapping.as_object_mut() {
            obj.insert("__import_meta".to_string(), json!({
                "total": total_planned,
                "skipped": skipped_count
            }));
        }

        Ok(serde_json::to_string(&final_mapping).map_err(|e| e.to_string())?)
    } else {
        let mut json: Value = {
            let mut config_file = archive.by_name("config.json").map_err(|e| e.to_string())?;
            let mut config_content = String::new();
            config_file.read_to_string(&mut config_content).map_err(|e| e.to_string())?;
            serde_json::from_str(&config_content).map_err(|e| e.to_string())?
        };

        for i in 0..archive.len() {
            let (entry_name, content) = {
                let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
                let name = file.name().to_string();
                let mut buf = Vec::new();
                if name.starts_with("sounds/") {
                    let _ = file.read_to_end(&mut buf);
                }
                (name, buf)
            };
            
            if entry_name.starts_with("sounds/") && !content.is_empty() {
                if let Some(file_name) = Path::new(&entry_name).file_name().and_then(|s| s.to_str()) {
                    let sanitized = sanitize_filename(file_name);
                    let target_path = sounds_dir.join(sanitized);
                    let mut out = File::create(target_path).map_err(|e| e.to_string())?;
                    out.write_all(&content).map_err(|e| e.to_string())?;
                }
            }
        }

        if let Some(mapping) = json.get_mut("mapping").and_then(|m| m.as_object_mut()) {
            for (_, event_config) in mapping.iter_mut() {
                if let Some(sounds) = event_config.get_mut("sounds").and_then(|s| s.as_array_mut()) {
                    for sound_item in sounds {
                        if let Some(path_item) = sound_item.get_mut("path") {
                            let file_name = path_item.as_str().unwrap_or("");
                            let new_absolute_path = sounds_dir.join(file_name);
                            *path_item = Value::String(new_absolute_path.to_str().unwrap_or("").to_string());
                        }
                    }
                }
            }
            let mut result = Value::Object(mapping.clone());
            if let Some(obj) = result.as_object_mut() {
                obj.insert("__import_meta".to_string(), json!({
                    "total": 0,
                    "skipped": 0
                }));
            }
            return Ok(serde_json::to_string(&result).map_err(|e| e.to_string())?);
        }

        Err("Legacy profile is missing a valid mapping object.".to_string())
    }
}

pub fn peek_profile(zip_path: &Path) -> Result<String, String> {
    let file = File::open(zip_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;
    
    let manifest_content = {
        if let Ok(mut f) = archive.by_name("manifest.json") {
            let mut content = String::new();
            f.read_to_string(&mut content).ok();
            Some(content)
        } else {
            None
        }
    };

    if let Some(content) = manifest_content {
        return Ok(content);
    }

    let config_content = {
        if let Ok(mut f) = archive.by_name("config.json") {
            let mut content = String::new();
            f.read_to_string(&mut content).ok();
            Some(content)
        } else {
            None
        }
    };

    if let Some(content) = config_content {
        let legacy_json: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        let count = legacy_json.get("mapping")
            .and_then(|m| m.as_object())
            .map(|m| {
                m.values()
                    .filter_map(|e| e.get("sounds").and_then(|s| s.as_array()))
                    .flatten()
                    .count()
            })
            .unwrap_or(0);

        let synthesized = json!({
            "manifest_version": 1,
            "profile_name": zip_path.file_stem().and_then(|s| s.to_str()).unwrap_or("Legacy Profile"),
            "created_at": "Unknown",
            "app_version": "Legacy",
            "sound_count": count,
            "sounds": [],
            "missing_at_export": []
        });
        return Ok(serde_json::to_string(&synthesized).map_err(|e| e.to_string())?);
    }

    Err("This file is not a valid profile (.CSreact or legacy .cs2vibe).".to_string())
}
