<p align="center">
  <img src="public/logo.png" width="150"/>
</p>

# CS2 Reactions

A small tool I built because I always wanted custom sounds playing on kills in
competitive and killstreak audio in deathmatch, and there was never a simple way
to do that. So I built it!

## Preview

<p align="center">
  <img src="public/AppShowcase.png" alt="CS2 Reactions App Preview" />
</p>

## Install

Grab the latest installer from the [releases](https://github.com/yopoko2/CS2-Reactions/releases/latest) page and run it. Windows Defender may
flag it as a false positive caused by the global hotkey hook. Source code is
available if you want to verify.

Once installed, open CS2 then CS2 Reactions. Click "Link to CS2" to set up the
GSI config. If it fails, use "Browse Folders" to locate your CS2 installation
folder manually. If sounds aren't triggering, try relaunching CS2.

## Features

- Custom sounds per event (headshot, kill, bomb plant, round end, match end, etc.)
- Per-weapon sound triggers, covers most CS2 weapons
- Random or sequential playback, sequential mode is labeled "Killstreak" and
  plays sounds in order as your streak grows, resetting on death
- Sound profile system (.CSreact) for importing and exporting profiles
- Modifiable global mute hotkey
- Runs in the system tray, autostart optional
- Utility and fun settings (auto-trimming silence, pitch variation, etc.)
- Available in English, Russian, Portuguese, French, and Simplified Chinese.
  Defaults to your OS language on first launch, override anytime in settings.

## Tips

| Topic | Details |
|---|---|
| **Adding sounds** | Click "Add sound" on any event card, or drag and drop audio files directly onto them. You can also drag and drop .CSreact profile files anywhere on the app to import them. |
| **Profiles** | .CSreact files that contain your config and sounds packaged together. Click export profile in the app to create one, then send it to anyone to load. |
| **Sound ordering** | Sounds on a card play in alphabetical order. Prefix filenames with numbers like "1_sound.mp3" to control the sequence in Killstreak mode. |
| **First kill** | The first kill of a match won't trigger a sound. GSI limitation, nothing fixable without moving away from the GSI approach. |
| **Mute While Dead** | Can occasionally malfunction due to how GSI reports player state. No clean fix for this right now. |

## Privacy

Everything runs locally. GSI sends data to 127.0.0.1 only. No accounts, no
telemetry, no network requests outside your machine.

## How it works

CS2 has an official telemetry system called GSI that sends game state updates
over HTTP to a local server. CS2 Reactions runs that server in Rust on port
27532, passes the data through Tauri's IPC layer to a React frontend, and
triggers audio when it detects a state change worth reacting to.

I went with this approach because the alternatives (memory reading, screen
capture) either risk a VAC ban or introduce too much latency. GSI only exposes
state-level data and adds some delay compared to direct memory access, but it
is the only method that doesn't touch the game process. The app never reads
game memory or modifies any game files beyond writing the GSI config into the
cfg folder.

## Files

The app stores your config and sounds under: 

%APPDATA%\com.cs2reactions.app\

It also writes one file into your CS2 installation:

game\csgo\cfg\gamestate_integration_cs2reactions.cfg

Uninstalling the app does not remove either of these. Delete them manually if
you want a clean removal.

## Troubleshooting

**Blank window on launch** — install WebView2 from microsoft.com/en-us/edge/webview2.

**GSI not working / no sounds** — port 27532 may be in use by another app or a
duplicate instance of CS2 Reactions. The error is shown in-app. Close the
conflicting process and relaunch.

**Defender blocking install or startup** — add an exclusion for the app in
Windows Security settings.

## Limitations

- GSI adds latency on top of the engine tick rate; fine for sound feedback but
  not instant
- Port 27532 must be free or the GSI server won't start. It is not
  user-configurable
- Stacking a lot of sounds at once may cause clipping

## Building from source

Requires Rust (stable), Node.js 18+, Tauri CLI. The frontend build runs
automatically through Tauri so you don't need to run it separately.

```bash
git clone https://github.com/yopoko2/CS2-Reactions
cd CS2-Reactions
npm install
npm run tauri build
```

## License

MIT
