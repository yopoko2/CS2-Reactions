# CS2 Reactions

A small tool I built because I always wanted custom sounds playing on kills in 
competitive and killstreak audio in deathmatch, and there was never a simple way 
to do that. So I built one. Windows only. Fully VAC-safe.

## Install

Grab the latest installer from the releases page and run it. Windows Defender 
will likely flag it during setup — this is a false positive. The app uses a 
low-level keyboard hook for the global mute hotkey, which antivirus software 
tends to be suspicious of. You can check the source code if you want to verify.

Once installed, open CS2 then CS2 Reactions. The app will find your Steam folder 
and write the GSI config automatically. If it can't find Steam you can point it 
to the right folder manually. If sounds aren't triggering after that, try 
relaunching CS2.

## Features

- Custom sounds per event (headshot, kill, bomb plant, round end, match end)
- Per-weapon sound triggers, covers most CS2 weapons
- Random or sequential playback (killstreak mode) so the same sound doesn't 
  loop forever
- Sound profile system (.CSreact) for importing and exporting profiles
- Modifiable global mute hotkey
- Runs in the system tray, autostart optional
- Utility and fun settings (auto-trimming silence, pitch variation, etc.)
- Available in English, Russian, Portuguese, French, and Chinese — auto-detected 
  from your system language

## Tips

**Adding sounds**
Drag and drop audio files directly onto event cards in the app. You can also 
drag and drop .CSreact profile files anywhere on the app window to import them.

**Profiles**
Profiles are .CSreact files — they contain your config and sound files packaged 
together. To create one, click export profile in the app. You can then send it 
to anyone and they can drop it straight into the app to load it.

**Sound ordering**
If an event card has multiple sounds and killstreak mode is on, they play in 
alphabetical order. To control the sequence just prefix your filenames with 
numbers — "1_sound.mp3", "2_sound.mp3", etc.

**First kill**
The first kill of a match won't trigger a sound. This is a GSI limitation and 
not something fixable without breaking the VAC-safe approach.

**Mute While Dead**
The Mute While Dead toggle can occasionally malfunction due to how GSI reports 
player state. There's no clean fix for this right now.

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
- The GSI server runs on a fixed port — if something else on your machine is 
  using it the server won't start
- Stacking a lot of sounds at once may cause clipping

## Building from source

Requires Rust (stable), Node.js 18+, Tauri CLI.

git clone https://github.com/YOUR_USERNAME/cs2-reactions
cd cs2-reactions
npm install
npm run tauri build

## License

MIT
