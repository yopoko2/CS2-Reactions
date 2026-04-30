# CS2 Reactions

A small tool I built because I always wanted custom sounds playing on kills in 
competitive and killstreak audio in deathmatch, and there was never a simple way 
to do that. So I built one. Windows only. Fully VAC-safe.

## Install

Grab the latest installer from the releases page and run it. Windows Defender may 
flag it as a false positive caused by the global hotkey hook. Source code is 
available if you want to verify.

Once installed, open CS2 then CS2 Reactions. Click "Link to CS2" to set up the 
GSI config. If it fails, use "Browse folders" to locate your CS2 cfg folder 
manually. If sounds aren't triggering, try relaunching CS2.

## Features

- Custom sounds per event (headshot, kill, bomb plant, round end, match end, etc.)
- Per-weapon sound triggers, covers most CS2 weapons
- Random or sequential playback (killstreak mode) so the same sound doesn't 
  loop forever
- Sound profile system (.CSreact) for importing and exporting profiles
- Modifiable global mute hotkey
- Runs in the system tray, autostart optional
- Utility and fun settings (auto-trimming silence, pitch variation, etc.)
- Available in English, Russian, Portuguese, French, and Chinese, auto-detected 
  from your system language

## Tips

| | |
|---|---|
| **Adding sounds** | Click "Add sound" on any event card, or drag and drop audio files directly onto them. You can also drag and drop .CSreact profile files anywhere on the app to import them. |
| **Profiles** | .CSreact files that contain your config and sounds packaged together. Click export profile in the app to create one, then send it to anyone to load. |
| **Sound ordering** | Multiple sounds on a card play in alphabetical order. Prefix filenames with numbers like "1_sound.mp3" to control the sequence. |
| **First kill** | The first kill of a match won't trigger a sound. GSI limitation, nothing fixable without breaking the VAC-safe approach. |
| **Mute While Dead** | Can occasionally malfunction due to how GSI reports player state. No clean fix for this right now. |

## How it works

CS2 has an official telemetry system called GSI that sends game state updates 
over HTTP to a local server. CS2 Reactions runs that server in Rust, passes the 
data through Tauri's IPC layer to a React frontend, and triggers audio when it 
detects a state change worth reacting to. I went with this approach because the 
alternatives (memory reading, screen capture) either risk a VAC ban or introduce 
too much latency. GSI is slower but it's the only approach that's actually safe.

## VAC safety

The app only communicates with CS2 through the GSI endpoint, which is Valve's 
own documented API. It does not touch game memory or modify any game files 
beyond writing the GSI config into the cfg folder.

## Limitations

- Latency floor around 16ms tied to the engine tick rate
- The GSI server runs on a fixed port, if something else on your machine is 
  using it the server won't start
- Stacking a lot of sounds at once may cause clipping

## Building from source

Requires Rust (stable), Node.js 18+, Tauri CLI.

```bash
git clone https://github.com/yopoko2/CS2-Reactions
cd CS2-Reactions
npm install
npm run tauri build
```

## License

MIT
