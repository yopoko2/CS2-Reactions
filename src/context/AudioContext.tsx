import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { readFile } from '@tauri-apps/plugin-fs';
import { getDefaultMapping } from '../eventCatalog';

interface Sound {
  id: string;
  name: string;
  path: string;
  volume: number;
  trimMetadata?: {
    leadMs: number;
    tailMs: number;
    skipped?: string;
  };
}

export interface Mapping {
  [eventId: string]: {
    sounds: Sound[];
    currentIndex: number;
    mode: 'random' | 'sequence';
    history: number[];
    isLayered?: boolean;
    enabled: boolean;
    dashboardVisible: boolean;
  };
}

export type AudioMapping = Mapping;

interface AudioContextType {
  isGsiConnected: boolean;
  isMuted: boolean;
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
  mapping: Mapping;
  setMapping: React.Dispatch<React.SetStateAction<Mapping>>;
  masterVolume: number;
  setMasterVolume: (v: number) => void;
  normalizationEnabled: boolean;
  isNormalizationEnabled: boolean;
  setIsNormalizationEnabled: (v: boolean) => void;
  audioDynamicsEnabled: boolean;
  setAudioDynamicsEnabled: (v: boolean) => void;
  dynamicsIntensity: number;
  setDynamicsIntensity: (val: number) => void;
  debugLogs: Array<{ id: string; time: string; event: string; details: string }>;
  addDebugLog: (event: string, details: string) => void;
  playSound: (eventId: string, isTest?: boolean) => void;
  testSound: (eventId: string) => void;
  autoTrimEnabled: boolean;
  setAutoTrimEnabled: (v: boolean) => void;

  isCs2Running: boolean;
  cs2Path: string | null;
  setCs2Path: (path: string | null) => void;
  initializeAudio: () => Promise<void>;
  clearAllData: () => void;
  availableDevices: MediaDeviceInfo[];
  selectedDeviceId: string;
  setSelectedDeviceId: (id: string) => void;
  refreshDevices: () => Promise<MediaDeviceInfo[]>;
  muteHotkey: string;
  setMuteHotkey: (key: string) => void;
  pitchVariationEnabled: boolean;
  setPitchVariationEnabled: (v: boolean) => void;
  pitchIntensity: number;
  setPitchIntensity: (v: number) => void;
  volumeBoostEnabled: boolean;
  setVolumeBoostEnabled: (v: boolean) => void;
  volumeBoostDb: number;
  setVolumeBoostDb: (v: number) => void;
  skipVolumeBoostWarning: boolean;
  setSkipVolumeBoostWarning: (v: boolean) => void;
  removeWeaponEvent: (eventId: string) => void;
  addWeaponEvent: (eventId: string) => void;
  skipQuitConfirm: boolean;
  setSkipQuitConfirm: (v: boolean) => void;
  autoTrimThreshold: number;
  setAutoTrimThreshold: (v: number) => void;
  autoTrimMode: 'start' | 'end' | 'both';
  setAutoTrimMode: (v: 'start' | 'end' | 'both') => void;
  requestAudioPermissions: () => Promise<boolean>;
  previewSoundFile: (path: string, volume: number) => Promise<void>;
  muteWhileDead: boolean;
  setMuteWhileDead: (v: boolean) => void;
  muteWhileDeadExcludeGlobal: boolean;
  setMuteWhileDeadExcludeGlobal: (v: boolean) => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isGsiConnected, setIsGsiConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [masterVolume, setMasterVolume] = useState(() => Number(localStorage.getItem('master_volume') || 0.5));
  const [normalizationEnabled, setNormalizationEnabled] = useState(() => localStorage.getItem('normalization_enabled') !== 'false');
  const [audioDynamicsEnabled, setAudioDynamicsEnabled] = useState(() => localStorage.getItem('audio_dynamics_enabled') === 'true');
  const [dynamicsIntensity, setDynamicsIntensity] = useState(() => Number(localStorage.getItem('dynamics_intensity') || 50));
  const [autoTrimEnabled, setAutoTrimEnabled] = useState(() => localStorage.getItem('auto_trim_enabled') !== 'false');
  const [debugLogs, setDebugLogs] = useState<Array<{ id: string; time: string; event: string; details: string }>>([]);

  const [isCs2Running, setIsCs2Running] = useState(false);
  const [cs2Path, setCs2Path] = useState<string | null>(() => localStorage.getItem('cs2_path'));
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(() => localStorage.getItem('selected_audio_device') || 'default');
  const [muteHotkey, setMuteHotkey] = useState(() => localStorage.getItem('mute_hotkey') || 'Ctrl+F11');
  const [volumeBoostEnabled, setVolumeBoostEnabled] = useState(() => localStorage.getItem('volume_boost_enabled') === 'true');
  const [volumeBoostDb, setVolumeBoostDb] = useState(() => Number(localStorage.getItem('volume_boost_db') || 0));
  const [skipVolumeBoostWarning, setSkipVolumeBoostWarning] = useState(() => localStorage.getItem('skip_volume_boost_warning') === 'true');
  const [autoTrimThreshold, setAutoTrimThreshold] = useState(() => Number(localStorage.getItem('auto_trim_threshold') || -45));
  const [autoTrimMode, setAutoTrimMode] = useState<'start' | 'end' | 'both'>(() => (localStorage.getItem('auto_trim_mode') as any) || 'both');
  const [skipQuitConfirm, setSkipQuitConfirm] = useState(() => localStorage.getItem('skip_quit_confirm') === 'true');
  const [muteWhileDead, setMuteWhileDead] = useState(() => localStorage.getItem('mute_while_dead') === 'true');
  const [muteWhileDeadExcludeGlobal, setMuteWhileDeadExcludeGlobal] = useState(() => localStorage.getItem('mute_while_dead_exclude_global') === 'true');

  const refreshDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const outputDevices = devices.filter(d => d.kind === 'audiooutput');
      setAvailableDevices(outputDevices);
      return outputDevices;
    } catch (e) { 
      console.error("Device refresh failed", e); 
      return [];
    }
  }, []);

  const requestAudioPermissions = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      await refreshDevices();
      return true;
    } catch (e) {
      console.error("Audio permission denied", e);
      return false;
    }
  }, [refreshDevices]);

  const trimAudioBuffer = useCallback((buffer: AudioBuffer, thresholdDb: number, mode: 'start' | 'end' | 'both') => {
    const threshold = Math.pow(10, thresholdDb / 20);
    const data = buffer.getChannelData(0);
    let start = 0;
    let end = data.length - 1;

    if (mode === 'start' || mode === 'both') {
      for (let i = 0; i < data.length; i++) {
        if (Math.abs(data[i]) > threshold) {
          start = i;
          break;
        }
      }
    }

    if (mode === 'end' || mode === 'both') {
      for (let i = data.length - 1; i >= start; i--) {
        if (Math.abs(data[i]) > threshold) {
          end = i;
          break;
        }
      }
    }

    if (start === 0 && end === data.length - 1) return buffer;

    const newLength = end - start + 1;
    const ctx = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
    const newBuffer = ctx.createBuffer(buffer.numberOfChannels, newLength, buffer.sampleRate);

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const oldData = buffer.getChannelData(channel);
      const newData = newBuffer.getChannelData(channel);
      for (let i = 0; i < newLength; i++) {
        newData[i] = oldData[i + start];
      }
    }
    return newBuffer;
  }, []);

  const clearAllData = useCallback(() => {
    const defaults = getDefaultMapping();
    const newMapping: Mapping = {};
    ['kills', 'headshots', 'deaths'].forEach(id => {
      newMapping[id] = defaults[id] || { sounds: [], enabled: true, dashboardVisible: true, mode: 'random', currentIndex: 0, history: [] };
      newMapping[id].enabled = true;
      newMapping[id].dashboardVisible = true;
    });
    setMapping(newMapping);
    localStorage.removeItem('sound_mapping');
    addDebugLog('SYSTEM', 'All data cleared');
  }, []);

  const addWeaponEvent = useCallback((eventId: string) => {
    setMapping(prev => ({
      ...prev,
      [eventId]: {
        sounds: [],
        currentIndex: 0,
        mode: 'random',
        history: [],
        enabled: true,
        dashboardVisible: true
      }
    }));
  }, []);

  const removeWeaponEvent = useCallback((eventId: string) => {
    setMapping(prev => {
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('cs2_path', cs2Path || '');
  }, [cs2Path]);

  useEffect(() => {
    localStorage.setItem('selected_audio_device', selectedDeviceId);
    const applySink = async () => {
      if (audioContextRef.current && (audioContextRef.current as any).setSinkId) {
        try {
          await (audioContextRef.current as any).setSinkId(selectedDeviceId === 'default' ? '' : selectedDeviceId);
        } catch (e) {
          console.error("Failed to set audio sinkId", e);
        }
      }
    };
    applySink();
  }, [selectedDeviceId]);

  useEffect(() => {
    localStorage.setItem('auto_trim_threshold', autoTrimThreshold.toString());
  }, [autoTrimThreshold]);

  useEffect(() => {
    localStorage.setItem('auto_trim_mode', autoTrimMode);
  }, [autoTrimMode]);

  useEffect(() => {
    localStorage.setItem('mute_while_dead', muteWhileDead.toString());
  }, [muteWhileDead]);

  useEffect(() => {
    localStorage.setItem('mute_while_dead_exclude_global', muteWhileDeadExcludeGlobal.toString());
  }, [muteWhileDeadExcludeGlobal]);
  
  const [mapping, setMapping] = useState<Mapping>(() => {
    const saved = localStorage.getItem('sound_mapping');
    const defaults = getDefaultMapping();
    if (!saved) return defaults;
    try {
      const parsed = JSON.parse(saved);
      return { ...defaults, ...parsed };
    } catch {
      return defaults;
    }
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainNodeRef = useRef<GainNode | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const scheduledBombNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const lastStateRef = useRef({ 
    round_kills: 0, round_killhs: 0, match_kills: 0, deaths: 0, mvps: 0,
    activity: '', round_phase: '', team: '',
    health: 100,
    gsi_identity: ''
  });
  const lastBombStateRef = useRef('none');
  const lowHealthFiredRef = useRef(false);
  const firstBloodFiredRef = useRef(false);
  const isMatchOverProcessedRef = useRef(false);
  const heartbeatTimerRef = useRef<number | null>(null);
  const cs2FalseStreakRef = useRef(0);
  const invokeGameFalseStreakRef = useRef(0);
  /** Mute kill-style sounds while dead or while GSI `player` is another pawn (spectate). Set each GSI tick. */
  const effectiveMuteDeadRef = useRef(false);
  /** Avoid firing local kill events on POV transition frames (respawn/spectate switches). */
  const localPovStableTicksRef = useRef(0);
  const lastPovKeyRef = useRef('');
  /** Track local player's deaths only (never spectated pawn deaths). */
  const localDeathsRef = useRef<number | null>(null);
  /** Keep dead mute active after local death until a confident local respawn is observed. */
  const localDeadLatchedRef = useRef(false);

  const addDebugLog = useCallback((event: string, details: string) => {
    setDebugLogs(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      time: new Date().toLocaleTimeString(),
      event,
      details
    }, ...prev].slice(0, 50));
  }, [setDebugLogs]);

  const initializeAudio = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: 'interactive'
      });
      masterGainNodeRef.current = audioContextRef.current.createGain();
      masterGainNodeRef.current.connect(audioContextRef.current.destination);
      masterGainNodeRef.current.gain.value = isMuted ? 0 : (masterVolume * 0.5); // headroom

      if (selectedDeviceId !== 'default' && (audioContextRef.current as any).setSinkId) {
        (audioContextRef.current as any).setSinkId(selectedDeviceId).catch(console.error);
      }
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  }, [isMuted, masterVolume]);

  const loadAudioBuffer = async (path: string): Promise<AudioBuffer> => {
    const ctx = audioContextRef.current!;
    try {
      const uint8Array = await readFile(path);
      const arrayBuffer = uint8Array.buffer.slice(uint8Array.byteOffset, uint8Array.byteOffset + uint8Array.byteLength);
      return await ctx.decodeAudioData(arrayBuffer);
    } catch (err: any) {
      throw new Error(`Failed to load/decode audio at ${path}: ${err.message || err.toString()}`);
    }
  };

  const previewSoundFile = useCallback(async (path: string, volume: number) => {
    await initializeAudio();
    const ctx = audioContextRef.current!;
    try {
      let audioBuffer = await loadAudioBuffer(path);

      if (autoTrimEnabled) {
        audioBuffer = trimAudioBuffer(audioBuffer, autoTrimThreshold, autoTrimMode);
      }

      const source = ctx.createBufferSource();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      source.buffer = audioBuffer;

      const gainNode = ctx.createGain();
      gainNode.gain.value = volume;

      const masterGain = masterGainNodeRef.current!;
      source.connect(gainNode);
      gainNode.connect(masterGain);
      source.start(0);
    } catch (err: any) {
      console.error('Preview Error:', err);
      addDebugLog('PREVIEW_ERR', err.message || err.toString());
    }
  }, [initializeAudio, autoTrimEnabled, autoTrimThreshold, autoTrimMode, addDebugLog]);

  const playSound = useCallback(async (eventId: string, isTest = false) => {
    if (isMuted && !isTest) return;

    if (effectiveMuteDeadRef.current && muteWhileDead && !isTest && eventId !== 'deaths') {
      const isGlobal = ['bomb_planted', 'bomb_10s', 'bomb_5s', 'bomb_defused', 'bomb_exploded', 'round_win', 'round_loss', 'mvp_award', 'match_over', 'round_start'].includes(eventId);
      if (!muteWhileDeadExcludeGlobal || !isGlobal) {
        return;
      }
    }

    const eventMapping = mapping[eventId];
    if (!eventMapping || eventMapping.sounds.length === 0) return;

    await initializeAudio();
    const ctx = audioContextRef.current!;
    const masterGain = masterGainNodeRef.current!;

    let soundToPlay: Sound;
    let newIndex = eventMapping.currentIndex;

    if (eventMapping.mode === 'random') {
      const available = eventMapping.sounds.filter((_, i) => i !== eventMapping.currentIndex || eventMapping.sounds.length === 1);
      const rand = Math.floor(Math.random() * available.length);
      soundToPlay = available[rand];
      newIndex = eventMapping.sounds.indexOf(soundToPlay);
    } else {
      soundToPlay = eventMapping.sounds[newIndex];
      newIndex = (newIndex + 1) % eventMapping.sounds.length;
    }

    if (!isTest) {
      setMapping(prev => ({
        ...prev,
        [eventId]: { ...prev[eventId], currentIndex: newIndex }
      }));
    }

    try {
      if (isTest) addDebugLog(`READ_START`, `Event: ${eventId} | Path: ${soundToPlay.path}`);
      
      let audioBuffer = await loadAudioBuffer(soundToPlay.path);

      if (autoTrimEnabled) {
        audioBuffer = trimAudioBuffer(audioBuffer, autoTrimThreshold, autoTrimMode);
      }

      const source = ctx.createBufferSource();
      if (ctx.state === 'suspended') {
        addDebugLog(`RESUMING`, `AudioContext suspended, attempting resume...`);
        await ctx.resume();
      }
      
      addDebugLog(`READY`, `Ctx: ${ctx.state} | Buf: ${audioBuffer.duration.toFixed(2)}s`);
      
      source.buffer = audioBuffer;

      const gainNode = ctx.createGain();
      gainNode.gain.value = (soundToPlay.volume ?? 0.8);
      
      if (normalizationEnabled) {
        const rawData = audioBuffer.getChannelData(0);
        let maxVal = 0;
        for (let i = 0; i < rawData.length; i++) {
          const v = Math.abs(rawData[i]);
          if (v > maxVal) maxVal = v;
        }
        if (maxVal > 0.01) {
          gainNode.gain.value *= (1.0 / maxVal);
        }
      }

      if (audioDynamicsEnabled) {
        const cents = (Math.random() * 2 - 1) * dynamicsIntensity;
        source.playbackRate.value = Math.pow(2, cents / 1200);
      }

      if (activeSourcesRef.current.length >= 8) {
        const oldest = activeSourcesRef.current.shift();
        if (oldest) try { oldest.stop(); } catch (e) {}
      }

      source.connect(gainNode);
      gainNode.connect(masterGain);
      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
      };
      source.start(0);
      activeSourcesRef.current.push(source);
      
      addDebugLog(isTest ? `TEST_OK` : `PLAY_${eventId.toUpperCase()}`, `File: ${soundToPlay.name}`);
    } catch (err: any) {
      console.error('Playback Error:', err);
      addDebugLog('AUDIO_ERR', err.message || err.toString());
    }
  }, [mapping, masterVolume, isMuted, muteWhileDead, muteWhileDeadExcludeGlobal, normalizationEnabled, audioDynamicsEnabled, dynamicsIntensity, autoTrimEnabled, autoTrimThreshold, autoTrimMode, addDebugLog]);

  const scheduleSound = async (eventId: string, delaySeconds: number) => {
    if (muteWhileDead && effectiveMuteDeadRef.current) {
      const isGlobal = ['bomb_planted', 'bomb_10s', 'bomb_5s', 'bomb_defused', 'bomb_exploded', 'round_win', 'round_loss', 'mvp_award', 'match_over', 'round_start'].includes(eventId);
      if (!muteWhileDeadExcludeGlobal || !isGlobal) {
        return null;
      }
    }

    const eventMapping = mapping[eventId];
    if (!eventMapping || eventMapping.sounds.length === 0) return null;

    await initializeAudio();
    const ctx = audioContextRef.current!;
    const sound = eventMapping.sounds[0]; // Sequences not supported for scheduled bomb sounds

    try {
      const audioBuffer = await loadAudioBuffer(sound.path);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(masterGainNodeRef.current!);
      
      const startTime = ctx.currentTime + delaySeconds;
      source.start(startTime);
      addDebugLog(`SCHEDULED_${eventId.toUpperCase()}`, `Planned for +${delaySeconds.toFixed(2)}s`);
      return source;
    } catch (e) {
      console.error('Schedule Error:', e);
      return null;
    }
  };

  const cancelScheduledBombSounds = () => {
    scheduledBombNodesRef.current.forEach(node => {
      try { node.stop(); } catch (e) {}
    });
    scheduledBombNodesRef.current = [];
  };

  const GSI_HEARTBEAT_MS = 22_000;

  const resetHeartbeat = () => {
    setIsGsiConnected(true);
    if (heartbeatTimerRef.current) window.clearTimeout(heartbeatTimerRef.current);
    heartbeatTimerRef.current = window.setTimeout(() => {
      setIsGsiConnected(false);
    }, GSI_HEARTBEAT_MS);
  };

  useEffect(() => {
    localStorage.setItem('master_volume', masterVolume.toString());
    if (masterGainNodeRef.current) masterGainNodeRef.current.gain.value = isMuted ? 0 : (masterVolume * 0.5); // 50% internal volume attenuation
  }, [masterVolume, isMuted]);

  useEffect(() => { localStorage.setItem('sound_mapping', JSON.stringify(mapping)); }, [mapping]);
  useEffect(() => { localStorage.setItem('normalization_enabled', normalizationEnabled.toString()); }, [normalizationEnabled]);
  useEffect(() => { localStorage.setItem('audio_dynamics_enabled', audioDynamicsEnabled.toString()); }, [audioDynamicsEnabled]);
  useEffect(() => { localStorage.setItem('dynamics_intensity', dynamicsIntensity.toString()); }, [dynamicsIntensity]);
  useEffect(() => { localStorage.setItem('auto_trim_enabled', autoTrimEnabled.toString()); }, [autoTrimEnabled]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const pollRate = isGsiConnected ? 3000 : 1000;
    interval = setInterval(async () => {
      try {
        const isGameRunning = await invoke<boolean>('is_cs2_running');
        if (!isGameRunning) {
          invokeGameFalseStreakRef.current += 1;
          if (invokeGameFalseStreakRef.current >= 2) {
            setIsGsiConnected(prev => (prev ? false : prev));
          }
        } else {
          invokeGameFalseStreakRef.current = 0;
        }
      } catch (e) { console.error('Watchdog failed:', e); }
    }, pollRate);
    return () => { clearInterval(interval); };
  }, [isGsiConnected]);

  useEffect(() => {
    const unlisten = listen<boolean>('cs2-running', (event) => {
      const v = event.payload;
      if (v) {
        cs2FalseStreakRef.current = 0;
        setIsCs2Running(true);
      } else {
        cs2FalseStreakRef.current += 1;
        if (cs2FalseStreakRef.current >= 3) {
          setIsCs2Running(false);
        }
      }
    });
    return () => { unlisten.then(u => u()); };
  }, []);

  useEffect(() => { invoke('update_tray_mute_status', { isMuted }); }, [isMuted]);
  useEffect(() => { initializeAudio().catch(console.error); }, []);

  useEffect(() => {
    const unlisten = listen('gsi_event', (event: any) => {
      const g = event.payload; 
      if (!g || !g.player) return;
      resetHeartbeat();

      const player = g.player;
      const state = player.state || {};
      const matchStats = player.match_stats || {};
      const map = g.map || {};
      const round = g.round || {};
      const bombPayload = g.bomb ?? {};
      const roundBombPayload = round.bomb ?? {};

      const currMvps = matchStats.mvps ?? 0;
      const prevMvps = lastStateRef.current.mvps ?? 0;
      const mvpsStatReset = currMvps < prevMvps;
      const mvpsIncreased = !mvpsStatReset && currMvps > prevMvps;

      const sid = String((player as any).steamid ?? (player as any).steam_id ?? '').trim();
      const providerSid = String((g as any).provider?.steamid ?? '').trim();
      const normalizeSteamId = (v: string) => v.replace(/\D/g, '');
      const sidNorm = normalizeSteamId(sid);
      const providerSidNorm = normalizeSteamId(providerSid);
      const canCompareIdentity = sidNorm.length >= 16 && providerSidNorm.length >= 16;
      /** Spectated pawn vs client: `player.*` follows POV; `provider.steamid` is always you (needs `provider` in GSI cfg). */
      const isViewingOtherPawn = canCompareIdentity ? sidNorm !== providerSidNorm : false;
      const isLocalPawn = !isViewingOtherPawn;
      const currentDeaths = matchStats.deaths ?? 0;
      let localDeathIncreased = false;
      if (isLocalPawn) {
        if (localDeathsRef.current === null) {
          localDeathsRef.current = currentDeaths;
        } else if (currentDeaths > localDeathsRef.current) {
          localDeathIncreased = true;
          localDeathsRef.current = currentDeaths;
          localDeadLatchedRef.current = true;
        } else if (currentDeaths < localDeathsRef.current) {
          // Match/state reset edge.
          localDeathsRef.current = currentDeaths;
          localDeadLatchedRef.current = false;
        }
      }

      const rawHealth = state.health;
      const prevHealthSnap = lastStateRef.current.health;
      let resolvedHealth: number;
      if (localDeathIncreased) {
        resolvedHealth = 0;
      } else if (typeof rawHealth === 'number' && !Number.isNaN(rawHealth)) {
        resolvedHealth = rawHealth;
      } else if (prevHealthSnap <= 0) {
        resolvedHealth = 0;
      } else {
        resolvedHealth = 100;
      }
      lastStateRef.current.health = resolvedHealth;

      const localDeathByHealthEdge = isLocalPawn && prevHealthSnap > 0 && resolvedHealth <= 0;
      if (localDeathByHealthEdge) {
        localDeadLatchedRef.current = true;
      }

      const localAliveNow = isLocalPawn && resolvedHealth > 0 && player.activity !== 'menu';
      if (localAliveNow) {
        localDeadLatchedRef.current = false;
      }

      // Mute: spectating other pawn, local death edge, latched dead state, or local HP 0.
      effectiveMuteDeadRef.current =
        isViewingOtherPawn || localDeathIncreased || localDeadLatchedRef.current || (isLocalPawn && resolvedHealth <= 0);

      const shouldReset = (round.phase === 'live' && lastStateRef.current.round_phase !== 'live') || 
                          localDeathIncreased || 
                          (player.activity === 'menu' && lastStateRef.current.activity !== 'menu') ||
                          (player.team !== lastStateRef.current.team);

      if (shouldReset) {
        lowHealthFiredRef.current = false;
        if (round.phase === 'live' && lastStateRef.current.round_phase !== 'live') {
          firstBloodFiredRef.current = false; 
          isMatchOverProcessedRef.current = false;
        }
        cancelScheduledBombSounds();
        lastBombStateRef.current = 'none'; 
      }

      const prevSnap = lastStateRef.current;
      const rk = state.round_kills ?? 0;
      const mk = matchStats.kills ?? 0;
      const identityKey = sid || String((player as any).name ?? '').trim();
      const prevIdentity = prevSnap.gsi_identity || '';
      const identityChanged = Boolean(identityKey && prevIdentity && identityKey !== prevIdentity);
      /** First payload: don't diff kills against 0 — avoids a burst when joining on someone's POV. */
      const identityBaselineOnly = Boolean(identityKey && !prevIdentity);

      const stableIdentity = isLocalPawn
        ? (providerSid || sid || identityKey || 'local')
        : (sid || identityKey || 'spectate');
      const povKey = `${isLocalPawn ? 'local' : 'spectate'}:${stableIdentity}`;
      if (lastPovKeyRef.current === povKey) {
        localPovStableTicksRef.current += 1;
      } else {
        localPovStableTicksRef.current = 1;
        lastPovKeyRef.current = povKey;
      }

      let baseRK = prevSnap.round_kills;
      let baseMK = prevSnap.match_kills;
      let baseRHS = prevSnap.round_killhs;
      if (identityChanged || identityBaselineOnly) {
        baseRK = rk;
        baseMK = mk;
        baseRHS = state.round_killhs ?? 0;
      }

      const roundDelta = rk > baseRK;
      const matchDelta = mk > baseMK;
      const killDetected = roundDelta || (matchDelta && rk === baseRK);

      // Keep optional mute logic from breaking base behavior:
      // if mute-while-dead is OFF, do not apply dead/spectate kill gating.
      const localKillEventsAllowed =
        (!muteWhileDead || (!isViewingOtherPawn && resolvedHealth > 0)) &&
        localPovStableTicksRef.current >= 1;

      if (killDetected && localKillEventsAllowed) {
        const isHS = (state.round_killhs ?? 0) > baseRHS;

        let activeWeaponName = '';
        if (player.weapons) {
          const activeWep = Object.values(player.weapons).find((w: any) => w.state === 'active');
          if (activeWep) activeWeaponName = (activeWep as any).name;
        }

        const normalizeId = (id: string) => {
          if (!id) return '';
          const lower = id.toLowerCase().trim();
          return lower.startsWith('weapon_') ? lower : `weapon_${lower}`;
        };
        const weaponEventId = normalizeId(activeWeaponName);
        
        const isFirstBlood = !firstBloodFiredRef.current && baseRK === 0 && (
          rk >= 1 || (rk === 0 && mk === 1 && baseMK === 0 && matchDelta)
        );
        if (isFirstBlood) { playSound('first_blood'); firstBloodFiredRef.current = true; }

        const hasWeaponEvent = weaponEventId && mapping[weaponEventId] && mapping[weaponEventId].sounds.length > 0;
        const hasFirstBloodEvent = Boolean(mapping['first_blood']?.sounds?.length);
        const skipStandardForFB = isFirstBlood && hasFirstBloodEvent && !mapping['first_blood']?.isLayered;
        const skipStandardForWeapon = hasWeaponEvent && !mapping[weaponEventId]?.isLayered;

        if (hasWeaponEvent) playSound(weaponEventId);
        
        if (!skipStandardForFB && !skipStandardForWeapon) {
          if (isHS) { playSound('headshots'); if (mapping['headshots']?.isLayered) playSound('kills'); }
          else if (activeWeaponName.includes('knife') || activeWeaponName.includes('bayonet')) { playSound('knife_kills'); if (mapping['knife_kills']?.isLayered) playSound('kills'); }
          else playSound('kills');
        }
      }

      if (isLocalPawn && state.health <= 25 && state.health > 0 && !lowHealthFiredRef.current) { playSound('low_health'); lowHealthFiredRef.current = true; }
      if (localDeathIncreased) playSound('deaths');
      if (round.phase === 'freezetime' && lastStateRef.current.round_phase !== 'freezetime') playSound('round_start');

      if ((player.activity === 'menu' || map.phase === 'gameover') && !isMatchOverProcessedRef.current) {
        if (map.phase === 'gameover') { playSound('match_over'); isMatchOverProcessedRef.current = true; }
      }
      if (round.phase === 'over' && lastStateRef.current.round_phase !== 'over') {
        const wonRound = round.win_team === player.team;
        if (wonRound && !isMatchOverProcessedRef.current) {
          if (mvpsIncreased) {
            playSound('mvp_award');
            if (mapping['mvp_award']?.isLayered) playSound('round_win');
          } else {
            playSound('round_win');
          }
        } else if (!isMatchOverProcessedRef.current) {
          playSound('round_loss');
        }
      }

      const bombStateRaw =
        (typeof bombPayload === 'object' && bombPayload !== null ? (bombPayload as any).state : '') ||
        (typeof roundBombPayload === 'object' && roundBombPayload !== null ? (roundBombPayload as any).state : '') ||
        (typeof roundBombPayload === 'string' ? roundBombPayload : '') ||
        'none';
      const bombState = String(bombStateRaw).toLowerCase();

      const bombCountdownRaw =
        (typeof bombPayload === 'object' && bombPayload !== null ? (bombPayload as any).countdown : undefined) ??
        (typeof roundBombPayload === 'object' && roundBombPayload !== null ? (roundBombPayload as any).countdown : undefined);
      let bombCountdown = Number.parseFloat(String(bombCountdownRaw ?? '0'));
      if (!Number.isFinite(bombCountdown)) bombCountdown = 0;
      // Some GSI payload variants expose planted state but no countdown.
      if (bombState === 'planted' && bombCountdown <= 0) bombCountdown = 40.0;
      
      if (bombState !== lastBombStateRef.current) {
        cancelScheduledBombSounds();
        if (bombState === 'planted') {
          playSound('bomb_planted');
          const nodes: AudioBufferSourceNode[] = [];
          if (bombCountdown > 10.0) scheduleSound('bomb_10s', bombCountdown - 10.0).then(n => { if (n) nodes.push(n); });
          if (bombCountdown > 5.0) scheduleSound('bomb_5s', bombCountdown - 5.0).then(n => { if (n) nodes.push(n); });
          scheduledBombNodesRef.current = nodes;
        } else if (bombState === 'exploded') playSound('bomb_exploded');
        else if (bombState === 'defused') playSound('bomb_defused');
        lastBombStateRef.current = bombState;
      }

      lastStateRef.current = {
        round_kills: state.round_kills ?? 0,
        round_killhs: state.round_killhs ?? 0,
        match_kills: matchStats.kills ?? prevSnap.match_kills,
        deaths: currentDeaths,
        mvps: currMvps,
        activity: player.activity || '',
        round_phase: round.phase || '',
        team: player.team || '',
        health: resolvedHealth,
        gsi_identity: identityKey || prevSnap.gsi_identity
      };

      if (shouldReset) {
        setMapping(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(k => { updated[k] = { ...updated[k], currentIndex: 0, history: [] }; });
          return updated;
        });
      }
    });

    const unlistenShortcuts = listen('shortcut-mute-toggle', () => setIsMuted(prev => !prev));
    const unlistenSync = listen<number>('volume-sync', (event) => setMasterVolume(event.payload));

    return () => {
      unlisten.then(u => u());
      unlistenShortcuts.then(u => u());
      unlistenSync.then(u => u());
      if (heartbeatTimerRef.current) window.clearTimeout(heartbeatTimerRef.current);
    };
  }, [mapping, playSound, muteWhileDead, muteWhileDeadExcludeGlobal]);

  const testSound = useCallback((eventId: string) => playSound(eventId, true), [playSound]);

  return (
    <AudioContext.Provider value={{
      isGsiConnected, isMuted, setIsMuted, mapping, setMapping, 
      masterVolume, setMasterVolume, 
      normalizationEnabled, isNormalizationEnabled: normalizationEnabled, setIsNormalizationEnabled: setNormalizationEnabled,
      audioDynamicsEnabled, setAudioDynamicsEnabled, dynamicsIntensity, setDynamicsIntensity,
      debugLogs, addDebugLog, playSound, testSound, 
      autoTrimEnabled, setAutoTrimEnabled,
      isCs2Running, cs2Path, setCs2Path, initializeAudio, clearAllData,
      availableDevices, selectedDeviceId, setSelectedDeviceId, refreshDevices,
      requestAudioPermissions,
      muteHotkey, setMuteHotkey,
      pitchVariationEnabled: audioDynamicsEnabled, setPitchVariationEnabled: setAudioDynamicsEnabled,
      pitchIntensity: dynamicsIntensity, setPitchIntensity: setDynamicsIntensity,
      volumeBoostEnabled, setVolumeBoostEnabled,
      volumeBoostDb, setVolumeBoostDb,
      skipVolumeBoostWarning, setSkipVolumeBoostWarning,
      removeWeaponEvent,
      addWeaponEvent,
      skipQuitConfirm, setSkipQuitConfirm,
      autoTrimThreshold, setAutoTrimThreshold,
      autoTrimMode, setAutoTrimMode,
      previewSoundFile,
      muteWhileDead, setMuteWhileDead,
      muteWhileDeadExcludeGlobal, setMuteWhileDeadExcludeGlobal
    }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useAudio must be used within AudioProvider');
  return context;
};
