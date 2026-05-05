import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { 
  Volume2, 
  Power, 
  RefreshCcw, 
  ExternalLink
} from 'lucide-react';
import { useAudio } from './context/AudioContext';
import { useTranslation } from './hooks/useTranslation';

const TrayPanel: React.FC = () => {
  const { t } = useTranslation();
  const { 
    masterVolume, 
    setMasterVolume, 
    isGsiConnected,
    isMuted,
    cs2Path
  } = useAudio();
  
  const [isRestarting, setIsRestarting] = useState(false);

  useEffect(() => {
    const unlisten = listen<number>('volume-sync', (event) => {
      setMasterVolume(event.payload);
    });
    return () => { unlisten.then(f => f()); };
  }, [setMasterVolume]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setMasterVolume(val);
    invoke('sync_volume_value', { volume: val });
  };

  const handleRestart = async () => {
    setIsRestarting(true);
    try {
      await invoke('restart_gsi_server');
      setTimeout(() => setIsRestarting(false), 2000);
    } catch (e) {
      console.error(e);
      setIsRestarting(false);
    }
  };

  const handleShow = () => {
    invoke('show_main_window');
  };

  const handleQuit = () => {
    invoke('quit_app');
  };


  return (
    <div className="tray-panel-container">
      {/* Header */}
      <div className="tray-header">
        <span className="tray-title">CS2 Reactions</span>
        <div className="tray-status">
          <div className={`status-dot ${isGsiConnected ? 'connected' : cs2Path ? 'awaiting' : 'disconnected'}`} />
          <span style={{ color: isGsiConnected ? '#00ff9d' : cs2Path ? '#fbbf24' : '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>
            {isGsiConnected ? t('link_active_title') : cs2Path ? t('status_awaiting') : t('status_disconnected')}
          </span>
        </div>
      </div>

      <div className="tray-body">
        {/* Volume Section */}
        <div className="tray-row tray-volume-row">
          <div className="tray-volume-header">
            <div className="tray-status" style={{ gap: '8px' }}>
              <Volume2 size={12} style={{ color: isMuted ? '#ef4444' : '#fff' }} />
              <span className="tray-label">{t('tray_volume_label')}</span>
            </div>
            <span className="tray-label" style={{ opacity: 0.5 }}>{Math.round(masterVolume * 100)}%</span>
          </div>
          
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={masterVolume}
            onChange={handleVolumeChange}
            className="volume-slider-custom"
          />
        </div>

        {/* Buttons Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
          <span className="tray-section-title">{t('tray_controls_label')}</span>
          
          <button onClick={handleRestart} disabled={isRestarting} className="tray-btn">
            <RefreshCcw size={14} className={isRestarting ? 'spin' : ''} />
            {t('tray_restart_gsi')}
          </button>

          <button onClick={handleShow} className="tray-btn">
            <ExternalLink size={14} />
            {t('tray_show')}
          </button>

          <button onClick={handleQuit} className="tray-btn danger">
            <Power size={14} />
            {t('tray_quit')}
          </button>
        </div>
      </div>

      <div className="tray-footer">
        <span className="tray-footer-text">CS2 Reactions Engine v4.4.5</span>
      </div>
    </div>
  );
};

export default TrayPanel;
