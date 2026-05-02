# Change log (agent)

Dated notes when Cursor agents modify this repo. Newest first.

## 2026-05-02 — Release 4.4.1

- Bumped version to **4.4.1** (PATCH: GSI mute/spectate fixes) in `package.json`, `package-lock.json`, `tauri.conf.json`, `Cargo.toml` / `Cargo.lock`, `App.tsx` (`APP_VERSION`), `lib.rs` startup log, `profile_manager.rs` manifest default, `TrayPanel.tsx`.

## 2026-05-02 — Mute-while-dead + spectate false kills (GSI)

- `AudioContext.tsx`: `provider.steamid` vs `player.steamid` — mute reaction sounds while spectating another pawn or when local pawn is dead (`deathIncreased` forces HP 0 for that tick). Kill/HS baselines resync when `gsi_identity` (steamid/name) changes so spectate target swaps don’t fire kills. Low-health only for local pawn. `playSound` / `scheduleSound` use `effectiveMuteDeadRef`.

## 2026-05-02 — Rule: SemVer / release version discipline

- Added `.cursor/rules/versioning-semver.mdc`: when to bump MAJOR/MINOR/PATCH, which files stay in sync, no bump without user/release intent, build only when asked.

## 2026-05-02 — Release 4.4.0

- Bumped version to **4.4.0** in `package.json`, `package-lock.json`, `tauri.conf.json`, `Cargo.toml` / `Cargo.lock`, `App.tsx` (`APP_VERSION`), `lib.rs` startup log, `profile_manager.rs` manifest default, `TrayPanel.tsx`.

## 2026-05-02 — Empty event card: drag-and-drop hint

- `App.tsx`: empty state shows upload + add icons, title + subline explaining drag onto card or click; formats listed.
- `useTranslation.ts`: `event_card_empty_title` / `event_card_empty_sub` (all langs); removed `click_to_add_sound`.

## 2026-05-02 — Preset filenames (convention)

- `src-tauri/presets/`: unified names `preset-sfx-valorant.CSreact`, `preset-voice-female-cs16.CSreact`, `preset-voice-unreal-tournament.CSreact` (kebab-case, `preset-{sfx|voice}-…`). Removed `.gitkeep`.

## 2026-05-02 — Bundled presets folder + import default path

- `src-tauri/presets/`: drop `.CSreact` packs here; `tauri.conf.json` `bundle.resources` includes `presets/`.
- `get_bundled_presets_dir` command resolves `$RESOURCE/presets` (debug: `src-tauri/presets`).
- `App.tsx` **Import profile** dialog uses that path as `defaultPath`.

## 2026-05-02 — Comment cleanup (core sources)

- Trimmed redundant / marketing-style comments in `AudioContext.tsx`, `App.tsx`, `TrayPanel.tsx`, `useTranslation.ts`, `vite.config.ts`, `EventManager.tsx`, `src-tauri/src/lib.rs`, `cs2_discovery.rs`, `profile_manager.rs`. Kept short doc comments where they carry real constraints (e.g. GSI port, path validation).

## 2026-05-02 — MVP sound: snapshot-based delta (no cross-match false positives)

- `src/context/AudioContext.tsx`: store `match_stats.mvps` on `lastStateRef`; detect MVP only when `mvps` increases vs previous tick; if `mvps` drops (new match / reset), skip “increase” for that edge. Removed `lastMvpCountRef`.

## 2026-05-02 — README: user-facing tone

- `README.md`: Rewrote Tips / How it works / Troubleshooting / Limitations for players (no changelog or internal jargon); added reorder bullet under Features.

## 2026-05-02 — Release 4.3.0

- Bumped version to **4.3.0** in `package.json`, `package-lock.json`, `tauri.conf.json`, `Cargo.toml` / `Cargo.lock`, `App.tsx` (`APP_VERSION`), `lib.rs` startup log, `profile_manager.rs` manifest default, `TrayPanel.tsx`.

## 2026-05-02 — Mute while dead + first-kill GSI handling

- `src/context/AudioContext.tsx`: sticky health when GSI omits `health` while dead (`?? 100` no longer overrides mute); `match_stats.kills` fallback when `round_kills` stalls; first-blood when round counter stuck; `playSound` + `gsi_event` effect deps include mute toggles and `playSound` so settings apply immediately.
- `README.md`: Tips + “How it works” port range note.

## 2026-05-02 — GSI port fallback (27532–27537)

- `src-tauri/src/gsi_server.rs`: try ports in `GSI_PORT_CANDIDATES`, emit `gsi_listening` / `gsi_server_error`.
- `src-tauri/src/cs2_discovery.rs`: `install_gsi_config(..., gsi_port)` writes matching URI.
- `src-tauri/src/lib.rs`: `GsiActivePort`, `get_gsi_listen_port`, link/repair use active port; `restart_gsi_server` updates port.
- `src/App.tsx` + `useTranslation.ts`: Sync tab shows listener port; README troubleshooting/limitations updated.

## 2026-05-02 — Rule: no builds unless asked

- Added `.cursor/rules/no-build-unless-asked.mdc` (`alwaysApply`): do not run `npm`/`vite`/`tauri` production builds unless the user explicitly requests.

## 2026-05-02 — Sound list: drag reorder + import batch sort

- `src/App.tsx`: Framer `Reorder` + grip-only drag (`EventSoundRow`); `handleReorderSounds` preserves manual order; batch imports sort **only the new files** A–Z then append (no full-list resort).
- `src/hooks/useTranslation.ts`: `sound_drag_reorder` string.
- `README.md`: Tips table updated for ordering behavior.

## 2026-05-01 — Token efficiency rule

- Added `.cursor/rules/efficiency-tokens.mdc`: default terse replies, fewer speculative tool calls, less filler (user “caveman trick”).

## 2026-05-01 — Agent continuity: privacy + change memory

- Added `.cursor/rules/remember-changes.mdc`: agents append substantive edits here for future sessions.
- Added `.cursor/change-log.md` (this file) as the running log.
- Earlier same day: `.cursor/rules/repo-privacy.mdc` for GitHub/privacy reminders on sensitive files and pushes.
