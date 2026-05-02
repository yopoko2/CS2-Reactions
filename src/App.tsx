import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow, LogicalSize, primaryMonitor } from '@tauri-apps/api/window';
import { useAudio, AudioMapping } from './context/AudioContext';
import { useTranslation } from './hooks/useTranslation';
import { EVENT_CATALOG, getDefaultMapping } from './eventCatalog';
import { WEAPON_CATALOG } from './weaponCatalog';
import { EventManager } from './components/EventManager';
import { 
  Settings2, 
  Volume2, 
  VolumeX,
  Link as LinkIcon, 
  Plus,
  X,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  Play,
  ChevronDown,
  ChevronUp,
  Bomb,
  Zap,
  Languages,
  LayoutGrid,
  Activity,
  Layers,
  Info,
  Clock,
  AlertCircle,
  Power,
  Check,
  Headphones,
  Speaker,
  Scissors,
  GripVertical
} from 'lucide-react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';


const APP_VERSION = '4.4.1';
const SUPPORTED_PROFILE_EXTENSIONS = [".CSreact", ".cs2vibe"];

const TacticalIcon: React.FC<{ icon: any, color: string, size: number }> = ({ icon, color, size }) => {
  if (typeof icon === 'string') {
    return (
      <div style={{ 
        width: size, 
        height: size, 
        backgroundColor: color, 
        WebkitMaskImage: `url(${icon})`, 
        maskImage: `url(${icon})`, 
        maskSize: 'contain', 
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
        display: 'inline-block',
        flexShrink: 0,
        aspectRatio: '1/1'
      }} />
    );
  }
  return (
    <div style={{ display: 'flex', flexShrink: 0 }}>
      {React.createElement(icon, { size, color })}
    </div>
  );
};

const TrimBadge: React.FC<{ leadMs: number; tailMs: number; t: any }> = ({ leadMs, tailMs, t }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8, x: -5 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.8, x: 5 }}
          style={{ 
            fontSize: '0.6rem', 
            padding: '1px 6px', 
            background: 'rgba(52, 211, 153, 0.15)', 
            color: '#34d399', 
            borderRadius: '4px', 
            fontWeight: 700,
            textTransform: 'uppercase',
            border: '1px solid rgba(52, 211, 153, 0.2)',
            display: 'inline-flex',
            alignItems: 'center',
            marginLeft: '4px'
          }}
        >
          {t('badge_trimmed').replace('{ms}', (leadMs + tailMs).toString())}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const DeviceSelector: React.FC<{
  devices: MediaDeviceInfo[];
  selectedId: string;
  onSelect: (id: string) => void;
  requestPermissions: () => Promise<boolean>;
  t: (key: string) => string;
}> = ({ devices, selectedId, onSelect, requestPermissions, t }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  
  const hasLabels = devices.length > 0 && devices.some(d => d.label && d.label.length > 0);

  const selectedDevice = devices.find(d => d.deviceId === selectedId) || 
                         (selectedId === 'default' ? { label: t('audio_device_default') } : null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && containerRef.current.contains(e.target as Node)) return;
      if (popoverRef.current && popoverRef.current.contains(e.target as Node)) return;
      setIsOpen(false);
    };
    const handleScroll = (e: Event) => {
      if (popoverRef.current && popoverRef.current.contains(e.target as Node)) return;
      if (isOpen) setIsOpen(false);
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', () => setIsOpen(false));
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', () => setIsOpen(false));
    };
  }, [isOpen]);

  const toggleOpen = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 8, left: rect.left, width: rect.width });
    }
    setIsOpen(!isOpen);
  };

  const getDeviceIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('head') || l.includes('casque') || l.includes('ear')) return <Headphones size={14} />;
    return <Speaker size={14} />;
  };

  const formatLabel = (label: string) => {
    if (!label) return t('audio_device_unknown');
    return label.replace(/Communications - |Default - /g, '');
  };

  return (
    <div className="device-dropdown-container" ref={containerRef}>
      <button 
        className="device-trigger" 
        onClick={toggleOpen}
        style={{ borderColor: isOpen ? 'rgba(255,255,255,0.3)' : '' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          <div className="device-item-icon" style={{ width: '24px', height: '24px', background: 'transparent', border: 'none' }}>
            {getDeviceIcon(selectedDevice?.label || '')}
          </div>
          <span className="device-trigger-label">
            {formatLabel(selectedDevice?.label || t('audio_device_default'))}
          </span>
        </div>
        <ChevronDown 
          size={14} 
          style={{ opacity: 0.5, transition: 'transform 0.3s', transform: isOpen ? 'rotate(180deg)' : '' }} 
        />
      </button>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              ref={popoverRef}
              className="tactical-popover device-popover"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              style={{ position: 'fixed', top: coords.top, left: coords.left, width: coords.width, zIndex: 100000 }}
            >
              {!hasLabels && (
                <div style={{ padding: '12px', background: 'rgba(251,191,36,0.05)', borderBottom: '1px solid rgba(251,191,36,0.1)', marginBottom: '4px' }}>
                  <p style={{ fontSize: '0.65rem', opacity: 0.8, color: '#fbbf24', marginBottom: '8px', lineHeight: '1.3' }}>
                    {t('audio_permission_request')}
                  </p>
                  <button 
                    className="btn-primary" 
                    style={{ width: '100%', fontSize: '0.65rem', padding: '6px', background: '#fbbf24', color: '#000' }}
                    onClick={(e) => { e.stopPropagation(); requestPermissions(); }}
                  >
                    {t('audio_permission_btn')}
                  </button>
                </div>
              )}

              <button 
                className={`tactical-popover-item device-item ${selectedId === 'default' ? 'active' : ''}`}
                onClick={() => { onSelect('default'); setIsOpen(false); }}
              >
                <div className="device-item-icon"><Volume2 size={14} /></div>
                <div className="device-item-text">
                  <span className="device-name-main">{t('audio_device_default')}</span>
                  <span className="device-name-sub">System Default Output</span>
                </div>
              </button>

              {devices.map(device => (
                <button 
                  key={device.deviceId}
                  className={`tactical-popover-item device-item ${selectedId === device.deviceId ? 'active' : ''}`}
                  onClick={() => { onSelect(device.deviceId); setIsOpen(false); }}
                >
                  <div className="device-item-icon">{getDeviceIcon(device.label)}</div>
                  <div className="device-item-text">
                    <span className="device-name-main">{formatLabel(device.label)}</span>
                    <span className="device-name-sub">ID: {device.deviceId.slice(0, 8)}...</span>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

const TrimModeSelector: React.FC<{
  value: 'start' | 'end' | 'both';
  onChange: (v: 'start' | 'end' | 'both') => void;
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ bottom: 0, left: 0, width: 0 });
  const { t } = useTranslation();
  
  const options: { id: 'start' | 'end' | 'both', label: string }[] = [
    { id: 'both', label: t('trim_mode_both') },
    { id: 'start', label: t('trim_mode_start') },
    { id: 'end', label: t('trim_mode_end') }
  ];

  const current = options.find(o => o.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && containerRef.current.contains(event.target as Node)) return;
      if (popoverRef.current && popoverRef.current.contains(event.target as Node)) return;
      setIsOpen(false);
    };
    const handleScroll = (e: Event) => {
      if (popoverRef.current && popoverRef.current.contains(e.target as Node)) return;
      if (isOpen) setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', () => setIsOpen(false));
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', () => setIsOpen(false));
    };
  }, [isOpen]);

  const toggleOpen = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({ bottom: window.innerHeight - rect.top + 8, left: rect.left, width: rect.width });
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="custom-select-container" ref={containerRef} style={{ position: 'relative', width: '100%', maxWidth: '240px' }}>
      <button 
        className="device-trigger"
        onClick={toggleOpen}
        style={{ 
          height: '42px', 
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '10px',
          color: '#fff',
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Scissors size={14} style={{ opacity: 0.6 }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{current?.label}</span>
        </div>
        <ChevronDown size={14} style={{ opacity: 0.4, transition: 'transform 0.3s', transform: isOpen ? 'rotate(180deg)' : '' }} />
      </button>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              ref={popoverRef}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="tactical-popover"
              style={{ 
                position: 'fixed',
                top: 'auto',
                bottom: coords.bottom,
                left: coords.left,
                width: coords.width,
                maxHeight: '300px',
                overflowY: 'auto',
                zIndex: 100000
              }}
            >
              {options.map(opt => (
                <button 
                  key={opt.id}
                  className={`tactical-popover-item ${opt.id === value ? 'active' : ''}`}
                  onClick={() => { onChange(opt.id); setIsOpen(false); }}
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontSize: '0.75rem', 
                    color: opt.id === value ? '#fff' : 'rgba(255,255,255,0.4)', 
                    background: opt.id === value ? 'rgba(255,255,255,0.05)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <span style={{ fontSize: '0.8rem', fontWeight: opt.id === value ? 800 : 500 }}>{opt.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

const SUB_TO_BASE: Record<string, string> = {
  'headshots': 'kills',
  'knife_kills': 'kills',
  'mvp_award': 'round_win',
  'first_blood': 'kills'
};

const LayerToggle: React.FC<{ 
  isLayered: boolean, 
  onToggle: (val: boolean) => void, 
  t: any 
}> = ({ isLayered, onToggle, t }) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const timerRef = React.useRef<any>(null);

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => setIsHovered(true), 200);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsHovered(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <motion.div 
        className="tactical-stack-container"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => onToggle(!isLayered)}
        whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
        whileTap={{ scale: 0.94 }}
        initial={false}
      >
        <Layers 
          size={13} 
          className={`layer-icon-reactive ${isLayered ? 'active' : ''}`} 
        />
        
        <div className={`tactical-checkbox ${isLayered ? 'active' : ''}`}>
          <div className="checkbox-visual-fill" />
        </div>
      </motion.div>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 14px)',
              left: '50%',
              x: '-50%',
              zIndex: 1000,
              pointerEvents: 'none',
              perspective: '1000px'
            }}
          >
      <div className="glass-panel" style={{ 
        width: '260px', 
        padding: '12px', 
        textAlign: 'center',
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(10, 10, 15, 0.98)', 
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        borderRadius: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Layers size={14} color="#ffffff" />
        <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase' }}>
          {t('layer_tooltip_title')}
        </h4>
      </div>
      <p style={{ fontSize: '0.68rem', lineHeight: '1.4', opacity: 0.6, color: '#fff', fontWeight: 500 }}>
        {t('layer_tooltip_desc')}
      </p>
      <div style={{ 
        position: 'absolute', 
        bottom: '-6px', 
        left: '50%', 
        x: '-50%', 
        rotate: '45deg',
        width: '12px', 
        height: '12px', 
        background: 'rgba(10, 10, 15, 0.98)',
        borderRight: '1px solid rgba(255,255,255,0.1)',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }} />
    </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TacticalToggle: React.FC<{ checked: boolean, onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <div 
    className={`tactical-checkbox ${checked ? 'active' : ''}`} 
    onClick={() => onChange(!checked)}
    style={{ 
      cursor: 'pointer',
      width: '32px',
      height: '17px',
      borderRadius: '20px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      position: 'relative',
      overflow: 'hidden',
      background: checked ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0,0,0,0.2)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }}
  >
    <motion.div 
      animate={{ x: checked ? 14 : 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      style={{
        width: '11px',
        height: '11px',
        background: checked ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.3)',
        borderRadius: '50%',
        position: 'absolute',
        top: '2px',
        left: '2px',
        boxShadow: checked ? '0 0 5px rgba(255,255,255,0.1)' : 'none'
      }}
    />
  </div>
);


const EditableUnitValue: React.FC<{ 
  value: number, 
  onChange: (v: number) => void,
  suffix?: string,
  prefix?: string,
  multiplier?: number,
  className?: string,
  style?: React.CSSProperties
}> = ({ value, onChange, suffix = '%', prefix = '', multiplier = 100, className, style }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [hasError, setHasError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startVal = (value * multiplier).toFixed(multiplier === 1 ? 0 : 1).replace(/\.0$/, '');
    setInputValue(startVal);
    setIsEditing(true);
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const save = () => {
    const trimmed = inputValue.trim();
    let num: number | null = null;
    
    if (trimmed.startsWith('+') || (trimmed.startsWith('-') && trimmed.length > 1 && !/^-?\d+(\.\d+)?$/.test(trimmed))) {
      const delta = parseFloat(trimmed);
      if (!isNaN(delta)) num = (value * multiplier) + delta;
    } else {
      num = parseFloat(trimmed);
    }

    if (num !== null && !isNaN(num)) {
      if ((multiplier === 100 && (num > 100 || num < 0)) || (multiplier === 1 && (num > 12 || num < 1))) {
         setHasError(true);
         setTimeout(() => setHasError(false), 1000);
      }
      const maxVal = multiplier === 100 ? 100 : 12;
      const minVal = multiplier === 100 ? 0 : 1;
      const capped = Math.max(minVal, Math.min(maxVal, num));
      onChange(capped / multiplier);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') setIsEditing(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(',', '.');
    if (val === '' || val === '+' || val === '-' || /^[+-]?\d*(\.\d{0,1})?$/.test(val)) {
      setInputValue(val);
      if (!val.startsWith('+') && !val.startsWith('-')) {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          const maxVal = multiplier === 100 ? 100 : 12;
          const minVal = multiplier === 100 ? 0 : 1;
          const capped = Math.max(minVal, Math.min(maxVal, num));
          onChange(capped / multiplier);
        }
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (isEditing) return;
    const step = multiplier === 100 ? (e.ctrlKey ? 0.001 : 0.01) : 1; 
    const direction = e.deltaY > 0 ? -1 : 1;
    const fastMultiplier = e.shiftKey ? 10 : 1;
    const finalStep = step * fastMultiplier;
    
    let newValue = value + (direction * finalStep / (multiplier === 100 ? 1 : 1));
    if (multiplier === 1) newValue = value + (direction * step * fastMultiplier);
    
    const maxVal = multiplier === 100 ? 1 : 12;
    const minVal = multiplier === 100 ? 0 : 1;
    onChange(Math.max(minVal, Math.min(maxVal, newValue)));
  };

  const displayVal = (value * multiplier).toFixed(multiplier === 1 ? 0 : 1).replace(/\.0$/, '');

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={save}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className={hasError ? 'pulse-error' : ''}
        style={{
          width: multiplier === 100 ? '48px' : '40px',
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid var(--accent-primary, rgba(255,255,255,0.3))',
          borderRadius: '4px',
          color: '#fff',
          fontSize: 'inherit',
          textAlign: 'right',
          padding: '0 4px',
          outline: 'none',
          fontFamily: 'inherit',
          transition: 'all 0.3s ease',
          ...style
        }}
      />
    );
  }

  return (
    <span 
      className={`${className || ''} ${hasError ? 'pulse-error' : ''}`}
      onClick={startEditing}
      onDoubleClick={() => onChange(multiplier === 100 ? 1.0 : 6)}
      onWheel={handleWheel}
      style={{ 
        cursor: 'pointer', 
        userSelect: 'none', 
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        minWidth: multiplier === 100 ? '3.5ch' : '3ch',
        fontWeight: 800,
        ...style 
      }}
    >
      {prefix}{displayVal}{suffix}
    </span>
  );
};


const ModeSelector: React.FC<{ 
  mode: 'random' | 'sequence', 
  onModeChange: (m: 'random' | 'sequence') => void, 
  t: any 
}> = ({ mode, onModeChange, t }) => {
  const [hoveredMode, setHoveredMode] = React.useState<'random' | 'sequence' | null>(null);
  const timerRef = React.useRef<any>(null);

  const handleEnter = (m: 'random' | 'sequence') => {
    timerRef.current = setTimeout(() => setHoveredMode(m), 1000);
  };

  const handleLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setHoveredMode(null);
  };

  return (
    <div style={{ position: 'relative', display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '3px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', minWidth: 0, maxWidth: '100%', flexShrink: 1 }}>
      {[
        { id: 'random', icon: RefreshCw },
        { id: 'sequence', icon: Activity }
      ].map((m) => (
        <button
          key={m.id}
          onMouseEnter={() => handleEnter(m.id as any)}
          onMouseLeave={handleLeave}
          onClick={() => onModeChange(m.id as any)}
          className={`mode-btn ${mode === m.id ? 'active' : ''}`}
          style={{
            padding: '4px 12px',
            borderRadius: '7px',
            background: mode === m.id ? 'rgba(255,255,255,0.1)' : 'transparent',
            border: 'none',
            color: mode === m.id ? '#fff' : 'rgba(255,255,255,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.65rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            minWidth: 0,
            flex: '1 1 0',
            overflow: 'hidden',
            justifyContent: 'center'
          }}
        >
          <m.icon size={11} style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
            {t('sound_mode_' + m.id)}
          </span>
        </button>
      ))}

      <AnimatePresence>
        {hoveredMode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 5 }}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 12px)',
              left: hoveredMode === 'random' ? '25%' : '75%',
              x: '-50%',
              zIndex: 1000,
              pointerEvents: 'none',
              width: '200px'
            }}
          >
            <div className="glass-panel" style={{ 
              padding: '12px', 
              background: 'rgba(10, 10, 15, 0.98)', 
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}>
              <h5 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', marginBottom: '4px', textTransform: 'uppercase' }}>
                {t('sound_mode_' + hoveredMode)}
              </h5>
              <p style={{ fontSize: '0.68rem', opacity: 0.6, color: '#fff', lineHeight: '1.4' }}>
                {t('sound_mode_desc_' + hoveredMode)}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.98, y: 10 },
  show: { opacity: 1, scale: 1, y: 0 }
};

/** Sort a batch of sounds A–Z (numeric-aware); used for each import only—list order is otherwise manual. */
const sortSoundsAlphabetically = (sounds: any[]) =>
  [...sounds].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

const EventSoundRow: React.FC<{
  s: any;
  event: string;
  t: (key: string) => string;
  previewSoundFile: (path: string, volume: number) => void;
  handleSoundVolumeChange: (event: string, soundId: string, volume: number) => void;
  handleRemoveSoundItem: (event: string, soundId: string) => void;
}> = ({ s, event, t, previewSoundFile, handleSoundVolumeChange, handleRemoveSoundItem }) => {
  const dragControls = useDragControls();
  return (
    <Reorder.Item
      as="div"
      value={s}
      dragListener={false}
      dragControls={dragControls}
      className="sound-item-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(255,255,255,0.03)',
        padding: '6px 10px',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.05)'
      }}
    >
      <button
        type="button"
        className="icon-btn-ghost"
        aria-label={t('sound_drag_reorder')}
        title={t('sound_drag_reorder')}
        onPointerDown={(e) => dragControls.start(e)}
        style={{
          width: '22px',
          height: '22px',
          padding: 0,
          cursor: 'grab',
          flexShrink: 0,
          touchAction: 'none'
        }}
      >
        <GripVertical size={14} color="rgba(255,255,255,0.35)" />
      </button>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        <button
          type="button"
          className="icon-btn-ghost"
          onClick={() => previewSoundFile(s.path, s.volume)}
          style={{ width: '22px', height: '22px', padding: 0, flexShrink: 0 }}
        >
          <Play size={10} fill="rgba(255,255,255,0.4)" />
        </button>
        <div style={{ fontSize: '0.7rem', color: '#fff', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>
          {s.name}
        </div>
        {s.trimMetadata && !s.trimMetadata.skipped && (
          <TrimBadge leadMs={s.trimMetadata.leadMs} tailMs={s.trimMetadata.tailMs} t={t} />
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={s.volume}
          onChange={(e) => handleSoundVolumeChange(event, s.id, parseFloat(e.target.value))}
          style={{ width: '50px' }}
        />
        <EditableUnitValue
          value={s.volume}
          onChange={(v) => handleSoundVolumeChange(event, s.id, v)}
          style={{ fontSize: '0.6rem', opacity: 0.5 }}
        />
        <button
          type="button"
          className="icon-btn-ghost destruct"
          onClick={() => handleRemoveSoundItem(event, s.id)}
          style={{ width: '24px', height: '24px' }}
        >
          <Trash2 size={10} />
        </button>
      </div>
    </Reorder.Item>
  );
};

const EventCard = React.memo(({ 
  event, 
  config, 
  isTriggered, 
  t, 
  playSound, 
  previewSoundFile, 
  handleModeChange, 
  handleSoundVolumeChange, 
  handleRemoveSoundItem, 
  handleAddSound, 
  handleLayerToggle,
  handleReorderSounds,
  onRemoveEvent
}: { 
  event: string, 
  config: any, 
  isTriggered: boolean,
  t: any,
  playSound: (event: string) => void,
  handleLayerToggle: (event: string, layered: boolean) => void,
  onRemoveEvent?: (event: string) => void,
  previewSoundFile: (path: string, volume: number) => void,
  handleModeChange: (event: string, mode: 'random' | 'sequence') => void,
  handleSoundVolumeChange: (event: string, soundId: string, volume: number) => void,
  handleRemoveSoundItem: (event: string, soundId: string) => void,
  handleRemoveWeaponEvent?: (event: string) => void,
  handleAddSound: (event: string) => void,
  handleReorderSounds: (event: string, sounds: any[]) => void,
}) => {
  const [dragOver, setDragOver] = useState(false);

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Required for onDrop to fire
  };

  const onDragLeave = () => {
    setDragOver(false);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  return (
    <motion.div
      key={event}
      variants={itemVariants}
      className={`event-card ${isTriggered ? 'triggered' : ''} ${dragOver ? 'drag-over' : ''}`}
      style={{ minHeight: '140px', display: 'flex', flexDirection: 'column', position: 'relative' }}
      data-event-id={event}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <AnimatePresence>
        {dragOver && (
          <motion.div 
            className="drag-overlay"
            initial={{ opacity: 0 }}
            style={{ pointerEvents: 'none' }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="drag-overlay-label">
              <Plus size={20} color="#fff" />
              <span className="drag-overlay-text">{t('drag_drop_overlay')}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '14px', minWidth: 0, width: '100%', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: '1 1 auto' }}>
          {(() => {
            const catItem = EVENT_CATALOG.find(i => i.id === event) || WEAPON_CATALOG.find(w => w.id === event);
            if (!catItem) return null;
            return (
              <div className="tactical-icon-outer" style={{ width: '30px', height: '30px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                <TacticalIcon 
                  icon={catItem.icon} 
                  color={catItem.color} 
                  size={16} 
                />
              </div>
            );
          })()}
          <div style={{ minWidth: 0 }}>
            <div className="event-label" style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {(() => {
                const weaponDef = WEAPON_CATALOG.find(w => w.id === event);
                if (weaponDef) return t(weaponDef.label_key);
                return t('event_' + event.toUpperCase());
              })()}
            </div>
            <div style={{ fontSize: '0.65rem', opacity: 0.4, fontWeight: 600 }}>
              {(config.sounds?.length || 0)} {t('sounds_count')}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexShrink: 1, maxWidth: '100%' }}>
          {onRemoveEvent && (
            <button 
              className="icon-btn-ghost destruct" 
              onClick={() => onRemoveEvent(event)}
              style={{ width: '28px', height: '28px' }}
            >
              <Trash2 size={14} />
            </button>
          )}
          {config.sounds?.length > 0 && (
            <button 
              className="icon-btn-ghost active" 
              onClick={() => playSound(event)}
              style={{ width: '28px', height: '28px' }}
            >
              <Play size={14} fill="#fff" />
            </button>
          )}

          {(config.sounds?.length || 0) > 1 && (
            <ModeSelector 
              mode={config.mode} 
              onModeChange={(m) => handleModeChange(event, m)} 
              t={t} 
            />
          )}
        </div>
      </div>

      <div className="sound-list-container" style={{ flex: 1, maxHeight: '200px', overflowY: 'auto', marginBottom: '12px' }}>
        {config.sounds && config.sounds.length > 0 ? (
          <Reorder.Group
            axis="y"
            as="div"
            values={config.sounds}
            onReorder={(order) => handleReorderSounds(event, order)}
            style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
          >
            {config.sounds.map((s: any) => (
              <EventSoundRow
                key={s.id}
                s={s}
                event={event}
                t={t}
                previewSoundFile={previewSoundFile}
                handleSoundVolumeChange={handleSoundVolumeChange}
                handleRemoveSoundItem={handleRemoveSoundItem}
              />
            ))}
          </Reorder.Group>
        ) : (
          <div 
             className="empty-drop-zone"
             onClick={() => handleAddSound(event)}
             style={{ flex: 1, border: '1px dashed rgba(255,255,255,0.12)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '20px 16px', cursor: 'pointer', transition: 'all 0.3s', textAlign: 'center' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.45 }}>
              <Upload size={18} strokeWidth={2} />
              <Plus size={18} strokeWidth={2} />
            </div>
            <span style={{ fontSize: '0.72rem', opacity: 0.45, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('event_card_empty_title')}</span>
            <span style={{ fontSize: '0.65rem', opacity: 0.32, fontWeight: 600, lineHeight: 1.45, maxWidth: '260px' }}>{t('event_card_empty_sub')}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 'auto' }}>
        {(config.sounds?.length || 0) > 0 && (
          <button 
            className="btn-add-mini"
            onClick={() => handleAddSound(event)}
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '8px', 
              padding: '4px 8px', 
              fontSize: '0.65rem', 
              fontWeight: 800, 
              color: '#fff', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              textTransform: 'uppercase'
            }}
          >
            <Plus size={12} />
            {t('add_sound_btn')}
          </button>
        )}
        
        <div style={{ flex: 1 }} />
        
        {(SUB_TO_BASE[event] || event.startsWith('weapon_')) && (
          <LayerToggle 
            isLayered={config.isLayered || false} 
            onToggle={(v) => handleLayerToggle(event, v)}
            t={t}
          />
        )}
      </div>
    </motion.div>
  );
});

const DebugConsole: React.FC<{ logs: any[], t: any }> = ({ logs, t }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && isExpanded) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs, isExpanded]);

  return (
    <div className="debug-console-outer" style={{ marginTop: '40px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px', paddingBottom: '40px' }}>
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          background: 'transparent', 
          border: 'none', 
          color: 'rgba(255,255,255,0.3)', 
          fontSize: '0.7rem', 
          fontWeight: 800, 
          textTransform: 'uppercase', 
          cursor: 'pointer',
          padding: '8px 0',
          transition: 'color 0.2s'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
      >
        <Activity size={14} />
        {t('debug_title')}
        <ChevronDown size={14} style={{ transform: isExpanded ? 'rotate(180deg)' : '', transition: 'transform 0.3s' }} />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: '240px', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{ overflow: 'hidden' }}
          >
            <div 
              ref={scrollRef}
              style={{ 
                background: 'rgba(0,0,0,0.2)', 
                borderRadius: '12px', 
                height: '100%',
                overflowY: 'auto', 
                padding: '16px',
                marginTop: '12px',
                fontFamily: 'monospace',
                fontSize: '0.7rem',
                border: '1px solid rgba(255,255,255,0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                scrollBehavior: 'smooth'
              }}
            >
              {logs.length === 0 ? (
                 <div style={{ opacity: 0.2, textAlign: 'center', padding: '40px', fontSize: '0.8rem' }}>
                    {t('debug_no_events')}
                 </div>
              ) : (
                  logs.map(log => (
                      <div key={log.id} style={{ display: 'flex', gap: '12px', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <span style={{ opacity: 0.3, flexShrink: 0 }}>[{log.time}]</span>
                          <span style={{ color: log.event.startsWith('PLAY') ? '#fbbf24' : '#60a5fa', fontWeight: 800, flexShrink: 0, width: '120px' }}>
                            {log.event}
                          </span>
                          <span style={{ opacity: 0.7, wordBreak: 'break-all' }}>{log.details}</span>
                      </div>
                  ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const App: React.FC = () => {
  const { t, lang, setLang, languages } = useTranslation();

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'warning' | 'error' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const { 
    mapping, 
    setMapping, 
    masterVolume, 
    setMasterVolume, 
    isGsiConnected, 
    isCs2Running,
    cs2Path, 
    setCs2Path, 
    playSound, 
    previewSoundFile,
    addDebugLog, 
    initializeAudio, 
    clearAllData,
    availableDevices, 
    selectedDeviceId, 
    setSelectedDeviceId,
    isNormalizationEnabled, 
    setIsNormalizationEnabled, 
    refreshDevices,
    requestAudioPermissions,
    isMuted, 
    setIsMuted, 
    muteHotkey, 
    setMuteHotkey,
    pitchVariationEnabled, 
    setPitchVariationEnabled,
    pitchIntensity, 
    setPitchIntensity,
    volumeBoostEnabled, 
    setVolumeBoostEnabled,
    volumeBoostDb, 
    setVolumeBoostDb,
    skipVolumeBoostWarning, 
    setSkipVolumeBoostWarning,
    removeWeaponEvent,
    autoTrimEnabled,
    setAutoTrimEnabled,
    autoTrimThreshold,
    setAutoTrimThreshold,
    autoTrimMode,
    setAutoTrimMode,
    debugLogs,
    muteWhileDead,
    setMuteWhileDead,
    muteWhileDeadExcludeGlobal,
    setMuteWhileDeadExcludeGlobal
  } = useAudio();
  
  const [settingsTab, setSettingsTab] = useState<'general' | 'audio' | 'sync'>('general');

  const formatDisplayPath = (path: string | null) => {
    if (!path) return t('not_linked');
    return path.replace(/\\+/g, '\\');
  };

  const handleLayerToggle = (event: string, val: boolean) => {
    setMapping({
      ...mapping,
      [event]: { ...mapping[event], isLayered: val }
    });
  };

  
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [autostart, setAutostart] = useState(false);
  const [triggeredEvents, setTriggeredEvents] = useState<string[]>([]);
  const visualTimeouts = useRef<Record<string, any>>({});
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [isBombExpanded, setIsBombExpanded] = useState(false);
  const [isBombInfoHovered, setIsBombInfoHovered] = useState(false);
  const bombInfoTimerRef = React.useRef<any>(null);
  const [showVolumeBoostModal, setShowVolumeBoostModal] = useState(false);
  const [showEventManager, setShowEventManager] = useState(false);

  const [minimizeToTray, setMinimizeToTray] = useState(true);
  const [skipQuitConfirm, setSkipQuitConfirm] = useState(false);
  const [trayEducationCount, setTrayEducationCount] = useState(0);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [dontAskQuitAgain, setDontAskQuitAgain] = useState(false);
  const [gsiListenPort, setGsiListenPort] = useState<number | null>(null);

  const [isDraggingProfile, setIsDraggingProfile] = useState(false);
  const [peekData, setPeekData] = useState<any>(null);
  const [peekPath, setPeekPath] = useState<string | null>(null);

  useEffect(() => {
    localStorage.removeItem("gsi_hint_dismissed");

    const req = async () => {
      try {
        await requestAudioPermissions();
        await initializeAudio();
        refreshDevices();
      } catch (e) {
        console.error("Startup permission check failed", e);
      }
    };
    req();
  }, []);

  useEffect(() => {
    const scaleWindow = async () => {
      try {
        const appWindow = getCurrentWindow();
        const hasScaled = sessionStorage.getItem('has_scaled_startup');
        
        if (!hasScaled) {
          const monitor = await primaryMonitor();
          if (monitor) {
            const sf = monitor.scaleFactor;
            const { width: mw, height: mh } = monitor.size;
            
            const screenW = mw / sf;
            const screenH = mh / sf;
            
            const targetW = Math.round(screenW * 0.70);
            const targetH = Math.round(screenH * 0.75);
            
            const w = Math.max(960, targetW);
            const h = Math.max(720, targetH);
            
            await appWindow.setSize(new LogicalSize(w, h));
            await appWindow.center();
            sessionStorage.setItem('has_scaled_startup', 'true');
          }
        }
        
        setTimeout(async () => {
          await appWindow.show();
        }, 50);

      } catch (e) {
        console.error("Window scale failed", e);
        getCurrentWindow().show().catch(console.error);
      }
    };
    scaleWindow();
  }, []);

  useEffect(() => {
    const loadSaved = async () => {
      try {
        const json = await invoke<string>('load_config');
        if (json) {
          const saved = JSON.parse(json);
          if (saved.mapping) {
            const defaults = getDefaultMapping();
            const merged = { ...defaults };
            
            Object.keys(saved.mapping).forEach(key => {
              if (merged[key]) {
                merged[key] = {
                  ...merged[key],
                  ...saved.mapping[key],
                  subOf: EVENT_CATALOG.find(e => e.id === key)?.subOf
                };
              } else if (key.startsWith('weapon_')) {
                merged[key] = saved.mapping[key];
              }
            });

            ['kills', 'headshots', 'deaths'].forEach(id => {
              if (!merged[id]) {
                merged[id] = defaults[id] || { sounds: [], enabled: true, dashboardVisible: true, mode: 'random', currentIndex: 0, history: [] };
                merged[id].enabled = true;
                merged[id].dashboardVisible = true;
              }
            });

            setMapping(merged);
          }
          if (saved.masterVolume !== undefined) setMasterVolume(saved.masterVolume);
          if (saved.cs2Path) setCs2Path(saved.cs2Path);
          if (saved.autostart !== undefined) setAutostart(saved.autostart);
          if (saved.pitchVariationEnabled !== undefined) setPitchVariationEnabled(saved.pitchVariationEnabled);
          if (saved.pitchIntensity !== undefined) setPitchIntensity(saved.pitchIntensity);
          
          if (saved.minimizeToTray !== undefined) setMinimizeToTray(saved.minimizeToTray);
          if (saved.skipQuitConfirm !== undefined) setSkipQuitConfirm(saved.skipQuitConfirm);
          if (saved.trayEducationCount !== undefined) setTrayEducationCount(saved.trayEducationCount);

          if (saved.muteHotkey) {
            setMuteHotkey(saved.muteHotkey);
            invoke('update_tray_mute_shortcut', { 
              oldShortcut: '', 
              newShortcut: saved.muteHotkey 
            }).catch(console.error);
            if (saved.muteWhileDead !== undefined) setMuteWhileDead(saved.muteWhileDead);
            if (saved.muteWhileDeadExcludeGlobal !== undefined) setMuteWhileDeadExcludeGlobal(saved.muteWhileDeadExcludeGlobal);
          }
        }
      } catch (e) {
        console.error('Failed to load config:', e);
      }
    };
    loadSaved();
  }, []);

  useEffect(() => {
    const autoSave = async () => {
      try {
        const json = JSON.stringify({ 
          mapping, masterVolume, cs2Path, autostart, muteHotkey,
          pitchVariationEnabled, pitchIntensity,
          minimizeToTray, skipQuitConfirm, trayEducationCount,
          muteWhileDead, muteWhileDeadExcludeGlobal
        });
        await invoke('save_config', { json });
      } catch (e) {
        console.error('Auto-save failed:', e);
      }
    };
    autoSave();
  }, [mapping, masterVolume, cs2Path, autostart, muteHotkey, pitchVariationEnabled, pitchIntensity, minimizeToTray, skipQuitConfirm, trayEducationCount, muteWhileDead, muteWhileDeadExcludeGlobal]);

  useEffect(() => {
    let cancelled = false;
    invoke<number | null>('get_gsi_listen_port')
      .then((p) => {
        if (!cancelled && typeof p === 'number') setGsiListenPort(p);
      })
      .catch(() => {});
    const unlisten = listen<{ port: number }>('gsi_listening', (ev) => {
      if (typeof ev.payload?.port === 'number') setGsiListenPort(ev.payload.port);
    });
    return () => {
      cancelled = true;
      unlisten.then((f) => f());
    };
  }, []);

  useEffect(() => {
    const unlisten = listen('main-window-close', () => {
      if (minimizeToTray) {
        invoke('hide_main_window');

        if (trayEducationCount < 3) {
          handleTrayEducation();
        }
      } else {
        if (skipQuitConfirm) {
          invoke('quit_app');
        } else {
          setShowQuitModal(true);
        }
      }
    });
    return () => { unlisten.then(f => f()); };
  }, [minimizeToTray, skipQuitConfirm, trayEducationCount]);

  const handleTrayEducation = async () => {
    try {
      let permission = await isPermissionGranted();
      if (!permission) {
        const res = await requestPermission();
        permission = res === 'granted';
      }
      if (permission) {
        sendNotification({
          title: "CS2 Reactions",
          body: t('toast_tray_education'),
          icon: 'logo.png'
        });
        setTrayEducationCount(prev => prev + 1);
      }
    } catch (e) {
      console.error('Tray education failed:', e);
    }
  };

  const handleBatchAddSoundsRef = useRef(handleBatchAddSounds);
  useEffect(() => { handleBatchAddSoundsRef.current = handleBatchAddSounds; });

  useEffect(() => {
    const unlistenHover = listen('tauri://drag-over', (event: any) => {
      if (event.payload && event.payload.paths) {
        const isProfile = event.payload.paths.some((p: string) => 
          SUPPORTED_PROFILE_EXTENSIONS.some(ext => p.toLowerCase().endsWith(ext.toLowerCase()))
        );
        if (isProfile) setIsDraggingProfile(true);
      }
    });

    const unlistenDrop = listen('tauri://drag-drop', async (event: any) => {
      setIsDraggingProfile(false);
      if (event.payload && event.payload.paths && event.payload.paths.length > 0) {
        const firstPath = event.payload.paths[0];
        const isProfile = SUPPORTED_PROFILE_EXTENSIONS.some(ext => 
          firstPath.toLowerCase().endsWith(ext.toLowerCase())
        );

        if (isProfile) {
          try {
            const manifestJson = await invoke<string>('peek_profile_cmd', { zipPath: firstPath });
            setPeekData(JSON.parse(manifestJson));
            setPeekPath(firstPath);
          } catch (e: any) {
            addDebugLog('PROFILE_ERR', e.toString());
          }
          return;
        }

        const { x, y } = event.payload.position;
        const elementAtPoint = document.elementFromPoint(x, y);
        if (elementAtPoint) {
          const card = elementAtPoint.closest('[data-event-id]');
          if (card) {
            const eventId = card.getAttribute('data-event-id');
            if (eventId) {
              handleBatchAddSoundsRef.current(eventId, event.payload.paths);
            }
          }
        }
      }
    });

    const unlistenLeave = listen('tauri://drag-leave', () => {
      setIsDraggingProfile(false);
    });

    return () => { 
      unlistenHover.then(f => f());
      unlistenDrop.then(f => f());
      unlistenLeave.then(f => f());
    };
  }, []);

  useEffect(() => {
    invoke('update_tray_menu', { 
      labels: { 
        show: t('tray_show'), 
        volume: t('tray_volume_label'),
        mute: t('tray_mute'),
        unmute: t('tray_unmute'),
        quit: t('tray_quit'),
        isMuted: isMuted
      } 
    }).catch(console.error);
  }, [lang, t, isMuted]);

  useEffect(() => {
    invoke('sync_volume_value', { volume: masterVolume });
  }, [masterVolume]);

  const handleToggleAutostart = async (val: boolean) => {
    try {
      await invoke('set_autostart', { enabled: val });
      setAutostart(val);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLink = async () => {
    try {
      setIsLoading(true);
      addDebugLog('LINK', t('status_disconnected') + " (Smart Scan)...");
      const res = await invoke<string>('link_to_cs2');
      if (res.includes("at \"")) {
        const pathMatch = res.match(/at "(.+)"/);
        if (pathMatch && pathMatch[1]) setCs2Path(pathMatch[1]);
      }
      addDebugLog('LINK', res);
      if (res.includes("Successfully")) {
        addDebugLog('LINK_OK', 'GSI Config Synchronized');
      }
    } catch (e: any) {
      addDebugLog('LINK_ERR', e.toString());
    } finally {
      setIsLoading(false);
    }
  };

  const [isRecording, setIsRecording] = useState(false);
  const handleRecordHotkey = () => setIsRecording(true);

  useEffect(() => {
    if (!isRecording) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const modifiers = ['Control', 'Shift', 'Alt', 'Meta'];
      if (modifiers.includes(e.key)) return;
      let combo = '';
      if (e.ctrlKey) combo += 'Ctrl+';
      if (e.shiftKey) combo += 'Shift+';
      if (e.altKey) combo += 'Alt+';
      let key = e.code.replace('Key', '').replace('Digit', '');
      if (key === 'Escape') {
        setIsRecording(false);
        return;
      }
      const finalHotkey = combo + key;
      const old = muteHotkey;
      setMuteHotkey(finalHotkey);
      setIsRecording(false);
      invoke('update_tray_mute_shortcut', { 
        oldShortcut: old, 
        newShortcut: finalHotkey 
      }).catch(err => {
        addDebugLog('HOTKEY_ERR', `Error: ${err}`);
        setMuteHotkey(old); 
      });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, muteHotkey, setMuteHotkey]);

  const triggerVisualFeedback = (eventId: string) => {
    if (visualTimeouts.current[eventId]) {
      clearTimeout(visualTimeouts.current[eventId]);
    }

    setTriggeredEvents(prev => prev.includes(eventId) ? prev : [...prev, eventId]);

    visualTimeouts.current[eventId] = setTimeout(() => {
      setTriggeredEvents(prev => prev.filter(id => id !== eventId));
      delete visualTimeouts.current[eventId];
    }, 800);
  };

  useEffect(() => {
    return () => {
      Object.values(visualTimeouts.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    const unsub = listen('sound-triggered', (event: any) => {
      triggerVisualFeedback(event.payload);
    });
    return () => { unsub.then((f: any) => f()); };
  }, []);

  const handleManualLink = async () => {
    await initializeAudio();
    const selected = await open({ directory: true, multiple: false });
    if (selected && typeof selected === 'string') {
      setIsLoading(true);
      try {
        const res = await invoke<string>('link_to_cs2_manual', { path: selected });
        addDebugLog('MANUAL_LINK', res);
        setCs2Path(selected);
      } catch (e: any) {
        addDebugLog('MANUAL_LINK_ERR', `Error: ${e}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  async function handleBatchAddSounds(event: string, paths: string[]) {
    setIsLoading(true);
    try {
      const audioExtensions = ['.mp3', '.wav', '.ogg'];
      const validPaths = paths.filter(p => audioExtensions.some(ext => p.toLowerCase().endsWith(ext)));
      
      if (validPaths.length === 0) return;

      const settled = await Promise.allSettled(validPaths.map(async (p) => {
        const name = p.split(/[\\/]/).pop() || 'Unknown';
        let finalPath = await invoke<string>('copy_sound', { path: p });
        
        if (!finalPath || finalPath.trim() === '') {
          throw new Error(`copy_sound returned empty path for: ${name}`);
        }
        
        let trimData = undefined;
        if (autoTrimEnabled) {
          try {
            const res = await invoke<any>('trim_silence', { 
              path: finalPath, 
              thresholdDb: autoTrimThreshold,
              trimMode: autoTrimMode 
            });
            if (res.type === 'Trimmed') {
              trimData = { leadMs: res.data.lead_ms, tailMs: res.data.tail_ms };
              const pathParts = finalPath.split('.');
              pathParts.pop();
              finalPath = pathParts.join('.') + '.wav';
            } else if (res.type === 'Skipped') {
              trimData = { leadMs: 0, tailMs: 0, skipped: res.data };
              addDebugLog('TRIM_SKIP', `${name}: ${res.data}`);
            } else if (res.type === 'Error') {
              addDebugLog('TRIM_ERR', `${name}: ${res.data}`);
            }
          } catch (err) {
            console.error("Trim failed:", err);
          }
        }

        return { 
          id: crypto.randomUUID(), 
          path: finalPath, 
          volume: 1.0, 
          name, 
          trimMetadata: trimData 
        };
      }));

      const results: any[] = [];
      settled.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          results.push(r.value);
        } else {
          const failedName = validPaths[i].split(/[\\/]/).pop() || validPaths[i];
          addDebugLog('IMPORT_ERR', `Skipped "${failedName}": ${r.reason?.message || r.reason}`);
          console.error('Import failed for', failedName, r.reason);
        }
      });

      if (results.length === 0) return;

      try {
        setMapping((prev: AudioMapping) => {
          const existingPaths = new Set(prev[event]?.sounds.map(s => s.path) || []);
          const uniqueResults = results.filter(r => !existingPaths.has(r.path));
          const sortedBatch = sortSoundsAlphabetically(uniqueResults);
          
          return {
            ...prev,
            [event]: {
              ...prev[event],
              sounds: [
                ...(prev[event]?.sounds || []),
                ...sortedBatch
              ]
            }
          };
        });
      } catch (stateErr: any) {
        console.error('[CS2 Reactions] setMapping failed after import:', stateErr);
        addDebugLog('STATE_ERR', stateErr?.message || stateErr.toString());
      }
      
      const failed = settled.filter(r => r.status === 'rejected').length;
      addDebugLog('IMPORT', `Added ${results.length} sounds to ${event}${failed > 0 ? ` (${failed} skipped)` : ''}`);
    } catch (e: any) {
      addDebugLog('IMPORT_ERR', e.toString());
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddSound(event: string) {
    await initializeAudio();
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg'] }]
      });

      if (selected && Array.isArray(selected)) {
        await handleBatchAddSounds(event, selected);
      } else if (selected && typeof selected === 'string') {
        await handleBatchAddSounds(event, [selected]);
      }
    } catch (e) { 
      console.error(e); 
    }
  }

  const handleRemoveSoundItem = (event: string, soundId: string) => {
    setMapping((prev: AudioMapping) => ({
      ...prev,
      [event]: {
        ...prev[event],
        sounds: prev[event].sounds.filter((s: any) => s.id !== soundId)
      }
    }));
  };

  const handleReorderSounds = React.useCallback((event: string, newSounds: any[]) => {
    setMapping((prev: AudioMapping) => ({
      ...prev,
      [event]: {
        ...prev[event],
        sounds: newSounds
      }
    }));
  }, [setMapping]);

  const handleSoundVolumeChange = (event: string, soundId: string, volume: number) => {
    setMapping((prev: AudioMapping) => ({
      ...prev,
      [event]: {
        ...prev[event],
        sounds: prev[event].sounds.map((s: any) => s.id === soundId ? { ...s, volume } : s)
      }
    }));
  };

  const handleModeChange = (event: string, mode: 'random' | 'sequence') => {
    setMapping((prev: AudioMapping) => ({
      ...prev,
      [event]: { ...prev[event], mode, currentIndex: 0, history: [] }
    }));
  };

  const handleExportProfile = async () => {
    try {
      const outputPath = await save({
        filters: [{ name: 'CS2 Reactions Profile', extensions: ['CSreact', 'cs2vibe'] }],
        defaultPath: 'my_reaction_setup'
      });
      if (outputPath) {
        await invoke('export_profile_cmd', { outputPath, configJson: JSON.stringify(mapping) });
        addDebugLog('EXPORT', t('export_success'));
      }
    } catch (e: any) { addDebugLog('EXPORT_ERR', `Error: ${e}`); }
  };

  const handleImportProfile = async () => {
    try {
      let defaultPath: string | undefined;
      try {
        const dir = await invoke<string | null>('get_bundled_presets_dir');
        if (dir) defaultPath = dir;
      } catch {
        /* optional */
      }
      const selected = await open({
        multiple: false,
        defaultPath,
        filters: [{ name: 'Profiles', extensions: ['CSreact', 'cs2vibe'] }]
      });
      if (selected && typeof selected === 'string') {
        const manifestJson = await invoke<string>('peek_profile_cmd', { zipPath: selected });
        setPeekData(JSON.parse(manifestJson));
        setPeekPath(selected);
      }
    } catch (e: any) { addDebugLog('IMPORT_ERR', e.toString()); }
  };

  const confirmImport = async () => {
    if (!peekPath) return;
    try {
      setIsLoading(true);
      const json = await invoke<string>('import_profile_cmd', { zipPath: peekPath });
      const importedMapping = JSON.parse(json);
      const meta = importedMapping.__import_meta || { total: 0, skipped: 0 };
      
      delete importedMapping.__import_meta;
      
      setMapping(prev => {
        const defaults = getDefaultMapping();
        const next: AudioMapping = { ...defaults, ...prev };
        const emptySlot = {
          enabled: true,
          dashboardVisible: true,
          sounds: [] as any[],
          mode: 'random' as const,
          currentIndex: 0,
          history: [] as number[]
        };
        Object.keys(importedMapping).forEach(key => {
          next[key] = {
            ...(next[key] || emptySlot),
            ...importedMapping[key],
            dashboardVisible: true,
            enabled: true
          };
        });
        return next;
      });

      setPeekData(null);
      setPeekPath(null);
      
      if (meta.skipped > 0) {
        showToast(t('import_warning').replace('{count}', meta.skipped.toString()), 'warning');
      } else {
        showToast(t('import_success'), 'success');
      }
      
      addDebugLog('IMPORT', t('import_success'));
    } catch (e: any) {
      addDebugLog('IMPORT_ERR', e.toString());
      showToast(e.toString(), 'error');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="app-container">
      <AnimatePresence>
        {isDraggingProfile && (
          <motion.div 
            className="global-profile-drag-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="overlay-content">
              <Upload size={48} color="#fff" />
              <h2>{t('drop_to_import_title')}</h2>
              <p>{t('drop_to_import_desc')}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {peekData && (
          <div className="modal-backdrop floating" onClick={() => setPeekData(null)}>
            <motion.div 
              className="peek-modal glass-panel"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="peek-header" style={{ marginBottom: '28px' }}>
                <div className="tactical-icon-outer" style={{ background: 'rgba(255,255,255,0.05)', width: '52px', height: '52px', borderRadius: '16px', marginRight: '18px' }}>
                  <Layers size={24} color="#fff" />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#fff', letterSpacing: '-0.02em' }}>{peekData.profile_name}</h3>
                  <div className="peek-meta" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: 800 }}>v{peekData.app_version || APP_VERSION}</span>
                    <span style={{ width: '3px', height: '3px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%' }} />
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {peekData.sound_count} {peekData.sound_count === 1 ? t('sounds_count_singular') : t('sounds_count')}
                    </span>
                  </div>
                </div>
                <button className="icon-btn-sm" onClick={() => setPeekData(null)} style={{ opacity: 0.3 }}>
                  <X size={18}/>
                </button>
              </div>

              {peekData.missing_at_export?.length > 0 && (
                <div className="peek-warning" style={{ 
                  background: 'rgba(245, 158, 11, 0.08)', 
                  border: '1px solid rgba(245, 158, 11, 0.15)', 
                  borderRadius: '14px', 
                  padding: '16px', 
                  marginBottom: '28px'
                }}>
                  <AlertCircle size={18} color="#fbbf24" style={{ minWidth: '18px' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24', lineHeight: '1.4' }}>{t('missing_sounds_warning').replace('{count}', peekData.missing_at_export.length.toString())}</span>
                </div>
              )}

              <div className="peek-actions" style={{ display: 'flex', gap: '14px', marginTop: '8px' }}>
                <button 
                  className="btn-secondary" 
                  onClick={() => setPeekData(null)}
                  style={{ flex: 1, padding: '14px', borderRadius: '14px', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em' }}
                >
                  <X size={14} />
                  {t('cancel')}
                </button>
                <button 
                  className="btn-primary" 
                  onClick={confirmImport}
                  disabled={isLoading}
                  style={{ flex: 1.8, padding: '14px', borderRadius: '14px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.1em' }}
                >
                  {isLoading ? <RefreshCw size={16} className="spin"/> : <Download size={16}/>}
                  {t('confirm_import')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Header */}
      <header className="app-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="lang-dropdown-container" ref={langMenuRef}>
            <button className={`lang-selected-btn ${isLangOpen ? 'active' : ''}`} onClick={() => setIsLangOpen(!isLangOpen)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 8px', minWidth: 'auto', borderRadius: '8px' }}>
              <Languages size={14} />
              <div className={`lang-code-tag lang-tag-${lang}`} style={{ minWidth: 'auto', padding: '1px 4px', fontSize: '0.6rem' }}>{lang.toUpperCase()}</div>
              <ChevronDown size={12} className={isLangOpen ? 'rotate-180' : ''} />
            </button>
            <AnimatePresence>
              {isLangOpen && (
                <motion.div 
                  className="tactical-popover lang-menu" 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                >
                  {languages.map((l) => (
                    <button key={l.code} className={`tactical-popover-item lang-menu-item ${lang === l.code ? 'active' : ''}`} onClick={() => { setLang(l.code); setIsLangOpen(false); }}>
                      <span className={`lang-code-tag lang-tag-${l.code.toLowerCase()}`}>{l.code.toUpperCase()}</span>
                      <span className="lang-label-text">{l.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="header-controls" style={{ alignItems: 'center' }}>
          <div className="volume-info-group" onClick={() => setIsMuted(!isMuted)}>
            <div className="volume-info">
              {isMuted ? <VolumeX size={18} color="var(--danger)" /> : <Volume2 size={18} color="var(--text-secondary)" />}
              <EditableUnitValue 
                className="master-percentage" 
                style={{ fontSize: '0.75rem' }} 
                value={masterVolume} 
                onChange={setMasterVolume} 
              />
            </div>
          </div>
          <div className="slider-group">
            <input type="range" min="0" max="1" step="0.01" value={masterVolume} onChange={(e) => setMasterVolume(parseFloat(e.target.value))} className="master-slider" style={{ width: '120px' }} />
          </div>
          <button className="icon-btn" onClick={() => setShowSettings(true)} style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
            <Settings2 size={18} />
          </button>
          <button className="power-btn" onClick={() => {
            if (skipQuitConfirm) {
              invoke('quit_app');
            } else {
              setShowQuitModal(true);
            }
          }}>
            <Power size={18} />
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="glass-panel centered" style={{ padding: '40px 32px', borderRadius: '24px' }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="branding-logo-container">
              <motion.div 
                className="branding-logo-outer"
              >
                <img 
                  src="/logo.png" 
                  alt="CS2 Reactions Logo" 
                  className={`branding-logo ${isLoading ? 'loading-pulse' : ''}`}
                />
              </motion.div>
              {isLoading && (
                <motion.div 
                  className="logo-loading-ring"
                  animate={{ 
                    rotate: 360,
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                    scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                  }}
                />
              )}
            </div>

            <motion.div 
              className="status-hub"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className={`status-hub-pill ${isGsiConnected ? 'live' : isCs2Running ? 'detected' : cs2Path ? 'awaiting' : 'disconnected'}`}>
                  {isGsiConnected ? <Check size={10} /> : isCs2Running ? <Clock size={10} /> : cs2Path ? <Activity size={10} /> : <AlertCircle size={10} />}
                  <span>{isGsiConnected ? t('link_active_title') : isCs2Running ? t('status_detected') : cs2Path ? t('status_awaiting') : t('status_disconnected')}</span>
                </div>
              </div>
              
              <h2 className="link-title" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                <span className="link-title-main" style={{ fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {isGsiConnected ? t('link_active_title') : isCs2Running ? t('sync_synchronizing') : cs2Path ? t('link_step_2_title') : t('link_step_1_title')}
                </span>
                <span className="link-title-sub" style={{ fontSize: '0.85rem', opacity: 0.6, fontWeight: 500, maxWidth: '600px', margin: '0 auto', lineHeight: '1.4' }}>
                  {isGsiConnected ? t('link_active_desc') : isCs2Running ? t('sync_synchronizing') : cs2Path ? t('link_step_2_desc') : t('desc_disconnected')}
                </span>
              </h2>
            </motion.div>

            {!isGsiConnected && (
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                <button className="btn-primary" onClick={handleLink} disabled={isLoading} style={{ minWidth: '180px' }}>
                  {isLoading ? <RefreshCw size={20} className="spin" /> : <LinkIcon size={20} />}
                  {t('link_btn')}
                </button>
                <button className="btn-secondary rounded-full" onClick={handleManualLink} disabled={isLoading} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 24px', borderRadius: '50px' }}>
                  <Plus size={20} />
                  {t('manual_link')}
                </button>
              </div>
            )}
          </motion.div>
        </div>

        <div className="profile-btns">
          <button className="btn-ghost" onClick={handleImportProfile}><Upload size={16} />{t('import_profile')}</button>
          <button className="btn-ghost" onClick={handleExportProfile}><Download size={16} />{t('export_profile')}</button>
        </div>


        <div style={{ marginTop: '32px' }}>
          <div className="events-header-row">
            <h2 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.5, fontWeight: 800, margin: 0 }}>{t('events')}</h2>
            <button className="manage-events-btn" onClick={() => setShowEventManager(true)}>
              <LayoutGrid size={14} />
              {t('manage_events_btn')}
            </button>
          </div>
          
          <motion.div className="grid-container" variants={containerVariants} initial="hidden" animate="show">
            <AnimatePresence mode="popLayout">
                {Object.entries(mapping)
                  .filter(([e, c]) => {
                    const catDef = EVENT_CATALOG.find(cat => cat.id === e);
                    const isWeaponEvent = e.startsWith('weapon_');
                    return (catDef || isWeaponEvent) && c.dashboardVisible && (!catDef || catDef.category !== 'bomb');
                  })
                  .map(([e, c]) => (
                    <EventCard 
                      key={e} 
                      event={e} 
                      config={c} 
                      isTriggered={triggeredEvents.includes(e)}
                      t={t}
                      playSound={(id) => { playSound(id); triggerVisualFeedback(id); }}
                      previewSoundFile={(path, vol) => { previewSoundFile(path, vol); triggerVisualFeedback(e); }}
                      handleModeChange={handleModeChange}
                      handleSoundVolumeChange={handleSoundVolumeChange}
                      handleRemoveSoundItem={handleRemoveSoundItem}
                      handleAddSound={handleAddSound}
                      handleLayerToggle={handleLayerToggle}
                      handleReorderSounds={handleReorderSounds}
                      onRemoveEvent={(id) => {
                        if (id.startsWith('weapon_')) {
                          removeWeaponEvent(id);
                        } else {
                          setMapping(prev => ({
                            ...prev,
                            [id]: {
                              ...prev[id],
                              dashboardVisible: false,
                              enabled: false
                            }
                          }));
                        }
                      }}
                    />
                  ))}
            </AnimatePresence>
          </motion.div>

          <div className="bomb-section-container" style={{ marginTop: '32px' }}>
            <button 
              className="bomb-section-header"
              onClick={() => setIsBombExpanded(!isBombExpanded)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', color: '#fff' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="bomb-icon-pulse">
                  <Bomb size={18} color="#f59e0b" />
                </div>
                <span style={{ fontWeight: 700 }}>{t('bomb_alerts')}</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 500, marginLeft: '2px' }}>{t('bomb_timer_label')}</span>
                <div 
                  onMouseEnter={() => {
                    bombInfoTimerRef.current = setTimeout(() => setIsBombInfoHovered(true), 200);
                  }}
                  onMouseLeave={() => {
                    if (bombInfoTimerRef.current) clearTimeout(bombInfoTimerRef.current);
                    setIsBombInfoHovered(false);
                  }}
                  style={{ display: 'flex', alignItems: 'center', marginLeft: '4px', cursor: 'help', position: 'relative' }}
                >
                  <Info size={14} color="rgba(255,255,255,0.4)" />
                  <AnimatePresence>
                    {isBombInfoHovered && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        style={{
                          position: 'absolute',
                          bottom: 'calc(100% + 12px)',
                          left: '0',
                          zIndex: 1000,
                          pointerEvents: 'none',
                          width: '240px'
                        }}
                      >
                        <div className="glass-panel" style={{ 
                          padding: '12px', 
                          background: 'rgba(10, 10, 15, 0.98)', 
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <h5 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase' }}>
                              {t('bomb_info_tooltip_title')}
                            </h5>
                          </div>
                          <p style={{ fontSize: '0.68rem', opacity: 0.6, color: '#fff', lineHeight: '1.4', fontWeight: 500 }}>
                            {t('bomb_info_tooltip_desc')}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              {isBombExpanded ? <ChevronUp size={16} color="#fff" /> : <ChevronDown size={16} color="#fff" />}
            </button>

            <AnimatePresence>
              {isBombExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0, overflow: 'hidden' }} 
                  animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }} 
                  exit={{ height: 0, opacity: 0, overflow: 'hidden' }} 
                  style={{ padding: '4px' }}
                >
                  <div className="grid-container" style={{ paddingTop: '8px', paddingBottom: '20px' }}>
                        {Object.entries(mapping)
                          .filter(([e]) => {
                            const catDef = EVENT_CATALOG.find(cat => cat.id === e);
                            return catDef && catDef.category === 'bomb';
                          })
                          .map(([e, c]) => (
                            <EventCard 
                              key={e} 
                              event={e} 
                              config={c} 
                              isTriggered={triggeredEvents.includes(e)}
                              t={t}
                              playSound={(id) => { playSound(id); triggerVisualFeedback(id); }}
                              previewSoundFile={(path, vol) => { previewSoundFile(path, vol); triggerVisualFeedback(e); }}
                              handleModeChange={handleModeChange}
                              handleSoundVolumeChange={handleSoundVolumeChange}
                              handleRemoveSoundItem={handleRemoveSoundItem}
                              handleAddSound={handleAddSound}
                              handleLayerToggle={handleLayerToggle}
                              handleReorderSounds={handleReorderSounds}
                            />
                          ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <DebugConsole logs={debugLogs} t={t} />
        </div>
      </main>

      <EventManager 
        isOpen={showEventManager} 
        onClose={() => setShowEventManager(false)} 
      />

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div className="modal-backdrop" onClick={() => setShowSettings(false)}>
            <motion.div className="modal-panel" onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}>
              <div className="modal-sidebar">
                <button 
                  className={`nav-item ${settingsTab === 'general' ? 'active' : ''}`} 
                  onClick={() => setSettingsTab('general')}
                >
                  <Settings2 size={18} />
                  {t('settings_tab_general')}
                </button>
                <button 
                  className={`nav-item ${settingsTab === 'audio' ? 'active' : ''}`} 
                  onClick={() => setSettingsTab('audio')}
                >
                  <Volume2 size={18} />
                  {t('settings_tab_audio')}
                </button>
                <button 
                  className={`nav-item ${settingsTab === 'sync' ? 'active' : ''}`} 
                  onClick={() => setSettingsTab('sync')}
                >
                  <Zap size={18} />
                  {t('settings_tab_sync')}
                </button>
              </div>

              <div className="modal-content-area">
                <div className="modal-header">
                  <h2>{t('settings_title')}</h2>
                  <button className="icon-btn" onClick={() => setShowSettings(false)}><X size={20} /></button>
                </div>

                <div className="modal-body">
                  {settingsTab === 'general' && (
                    <motion.div 
                      className="modal-scroll-area"
                      initial={{ opacity: 0, x: 10 }} 
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <div className="setting-row">
                        <div><label className="setting-label">{t('mute_hotkey')}</label><p className="setting-desc">{t('mute_hotkey_desc')}</p></div>
                        <button className={`btn-secondary ${isRecording ? 'recording' : ''}`} onClick={handleRecordHotkey}>{isRecording ? t('recording') : muteHotkey}</button>
                      </div>
                      <div className="setting-row">
                        <div style={{ flex: 1 }}>
                          <label className="setting-label">{t('settings_minimize_to_tray')}</label>
                          <p className="setting-desc">{t('settings_minimize_to_tray_desc')}</p>
                        </div>
                        <TacticalToggle checked={minimizeToTray} onChange={setMinimizeToTray} />
                      </div>
                      <div className="setting-row">
                        <div><label className="setting-label">{t('launch_startup')}</label><p className="setting-desc">{t('launch_startup_desc')}</p></div>
                        <TacticalToggle checked={autostart} onChange={handleToggleAutostart} />
                      </div>
                      <div style={{ height: '120px' }} />
                    </motion.div>
                  )}

                  {settingsTab === 'audio' && (
                    <motion.div 
                      className="modal-scroll-area"
                      initial={{ opacity: 0, x: 10 }} 
                      animate={{ opacity: 1, x: 0 }}
                    >
                      {/* Section: Output Configuration */}
                      
                      <div className="setting-row">
                        <div><label className="setting-label">{t('settings_master_volume')}</label><p className="setting-desc">{t('settings_master_volume_desc')}</p></div>
                        <div style={{ flex: 1, position: 'relative' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input 
                              type="range" 
                              className="volume-slider-custom" 
                              min="0" 
                              max="1" 
                              step="0.01" 
                              value={masterVolume} 
                              onChange={(e) => setMasterVolume(parseFloat(e.target.value))} 
                              style={{ flex: 1 }}
                            />
                            <EditableUnitValue 
                              value={masterVolume} 
                              onChange={setMasterVolume} 
                              style={{ fontSize: '0.85rem' }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="setting-row">
                        <div style={{ flex: 1 }}>
                          <label className="setting-label">{t('settings_audio_output')}</label>
                          <p className="setting-desc">{t('settings_audio_output_desc')}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, gap: '8px' }}>
                          <DeviceSelector 
                            devices={availableDevices}
                            selectedId={selectedDeviceId}
                            onSelect={setSelectedDeviceId}
                            requestPermissions={useAudio()?.requestAudioPermissions || (async () => false)}
                            t={t}
                          />
                        </div>
                      </div>

                      <div className="setting-row">
                        <div style={{ flex: 1 }}>
                          <label className="setting-label">{t('settings_audio_boost')}</label>
                          <p className="setting-desc">{t('settings_audio_boost_desc')}</p>
                        </div>
                        <TacticalToggle 
                          checked={volumeBoostEnabled} 
                          onChange={(val) => {
                            if (val && !skipVolumeBoostWarning) {
                               setShowVolumeBoostModal(true);
                            } else {
                               setVolumeBoostEnabled(val);
                            }
                          }} 
                        />
                      </div>

                      <AnimatePresence>
                        {volumeBoostEnabled && (
                          <motion.div 
                            className="sub-setting"
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{ height: 'auto', opacity: 1, marginTop: -4, transitionEnd: { overflow: 'visible' } }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            style={{ overflow: 'hidden', marginBottom: '16px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <label className="setting-label" style={{ fontSize: '0.75rem', opacity: 0.6 }}>{t('settings_audio_boost_amount')}</label>
                                <EditableUnitValue 
                                  value={volumeBoostDb} 
                                  onChange={setVolumeBoostDb} 
                                  suffix=" dB" 
                                  prefix="+" 
                                  multiplier={1} 
                                  style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}
                                />
                              </div>
                              <input 
                                type="range" 
                                min="1" 
                                max="12" 
                                step="1" 
                                value={volumeBoostDb} 
                                onChange={(e) => setVolumeBoostDb(parseInt(e.target.value))} 
                                className="volume-slider-custom"
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="setting-row">
                        <div><label className="setting-label">{t('settings_normalization')}</label><p className="setting-desc">{t('settings_normalization_desc')}</p></div>
                        <TacticalToggle checked={isNormalizationEnabled} onChange={setIsNormalizationEnabled} />
                      </div>

                      <div className="setting-row">
                        <div>
                          <label className="setting-label">{t('settings_mute_while_dead')}</label>
                          <p className="setting-desc">{t('settings_mute_while_dead_desc')}</p>
                        </div>
                        <TacticalToggle checked={muteWhileDead} onChange={setMuteWhileDead} />
                      </div>

                      <AnimatePresence>
                        {muteWhileDead && (
                          <motion.div 
                            className="sub-setting"
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{ height: 'auto', opacity: 1, marginTop: -4, transitionEnd: { overflow: 'visible' } }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            style={{ overflow: 'hidden', marginBottom: '16px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                              <div style={{ flex: 1 }}>
                                <label className="setting-label" style={{ fontSize: '0.75rem', opacity: 0.8 }}>{t('settings_mute_while_dead_exclude_global')}</label>
                                <p className="setting-desc" style={{ fontSize: '0.65rem', opacity: 0.5 }}>{t('settings_mute_while_dead_exclude_global_desc')}</p>
                              </div>
                              <TacticalToggle checked={muteWhileDeadExcludeGlobal} onChange={setMuteWhileDeadExcludeGlobal} />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="setting-row">
                        <div><label className="setting-label">{t('settings_enable_dynamics')}</label><p className="setting-desc">{t('pitch_variation_desc')}</p></div>
                        <TacticalToggle checked={pitchVariationEnabled} onChange={setPitchVariationEnabled} />
                      </div>

                      {pitchVariationEnabled && (
                        <div className="sub-setting" style={{ marginTop: '-4px', marginBottom: '16px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <label className="setting-label" style={{ fontSize: '0.75rem', opacity: 0.6 }}>{t('pitch_intensity_label')}</label>
                              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', opacity: 0.8 }}>{pitchIntensity} {t('pitch_intensity_cents')}</span>
                            </div>
                            <input 
                              type="range" 
                              min="0" 
                              max="200" 
                              step="5" 
                              value={pitchIntensity} 
                              onChange={(e) => setPitchIntensity(parseInt(e.target.value))} 
                              className="volume-slider-custom"
                            />
                          </div>
                        </div>
                      )}

                      <div className="setting-row">
                        <div style={{ flex: 1 }}>
                          <label className="setting-label" style={{ fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.02em', color: '#fff' }}>{t('settings_auto_trim')}</label>
                          <p className="setting-desc" style={{ marginTop: '4px', opacity: 0.4 }}>{t('settings_auto_trim_desc')}</p>
                        </div>
                        <TacticalToggle checked={autoTrimEnabled} onChange={setAutoTrimEnabled} />
                      </div>

                      <AnimatePresence>
                        {autoTrimEnabled && (
                          <motion.div 
                            className="sub-setting"
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{ height: 'auto', opacity: 1, marginTop: -4, transitionEnd: { overflow: 'visible' } }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            style={{ overflow: 'hidden', marginBottom: '16px', padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)' }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                <label className="setting-label" style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6 }}>{t('settings_auto_trim_threshold')}</label>
                                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#fff', opacity: 0.9 }}>{autoTrimThreshold} dB</span>
                              </div>
                              <input 
                                type="range" 
                                min="-80" 
                                max="0" 
                                step="1" 
                                value={autoTrimThreshold} 
                                onChange={(e) => setAutoTrimThreshold(parseInt(e.target.value))} 
                                className="volume-slider-custom"
                                style={{ marginBottom: '24px' }}
                              />
                              
                              <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.03)', marginBottom: '24px' }} />

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <label className="setting-label" style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6 }}>{t('settings_auto_trim_mode')}</label>
                                <TrimModeSelector 
                                  value={autoTrimMode} 
                                  onChange={setAutoTrimMode} 
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div style={{ height: '120px' }} />
                    </motion.div>
                  )}

                  {settingsTab === 'sync' && (
                    <motion.div 
                      className="modal-scroll-area"
                      initial={{ opacity: 0, x: 10 }} 
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <div className="setting-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                          <div className={`status-dot ${isGsiConnected ? 'connected' : isCs2Running ? 'detected' : 'disconnected'}`} style={{ width: '12px', height: '12px' }} />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="setting-label" style={{ marginBottom: 0 }}>
                              {isGsiConnected ? t('status_connected') : isCs2Running ? t('status_detected') : t('status_disconnected')}
                            </span>
                            <p className="setting-desc" style={{ marginTop: '2px' }}>{t('settings_gsi_status_desc')}</p>
                            <p className="setting-desc" style={{ marginTop: '6px', fontSize: '0.65rem', opacity: 0.5 }}>
                              {gsiListenPort != null
                                ? t('settings_gsi_port_value').replace('{port}', String(gsiListenPort))
                                : t('settings_gsi_port_unavailable')}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="setting-row">
                        <div style={{ flex: 1 }}>
                          <label className="setting-label">{t('settings_cs2_path')}</label>
                          <p className="setting-desc">
                            {formatDisplayPath(cs2Path)}
                          </p>
                        </div>
                        <button className="btn-secondary" style={{ gap: '8px', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }} onClick={() => { setShowSettings(false); handleLink(); }}>
                          <RefreshCw size={14} />
                          <span>{t('settings_relink')}</span>
                        </button>
                      </div>

                      <div className="setting-row">
                        <div style={{ flex: 1 }}>
                          <label className="setting-label">{t('settings_gsi_repair_title')}</label>
                          <p className="setting-desc">{t('settings_gsi_repair_desc')}</p>
                        </div>
                        <button className="btn-troubleshoot-yellow" style={{ padding: '8px 16px' }} onClick={() => { setShowSettings(false); handleLink(); }}>
                          <span>{t('settings_gsi_repair_title')}</span>
                        </button>
                      </div>
                      
                      <div className="setting-row" style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
                        <div style={{ flex: 1 }}>
                          <label className="setting-label">{t('version_label')}</label>
                          <p className="setting-desc">CS2 Reactions v{APP_VERSION}</p>
                        </div>
                        <button 
                          className="btn-troubleshoot-red"
                          style={{ padding: '8px 16px' }}
                          onClick={() => {
                            setShowSettings(false);
                            setShowResetModal(true);
                          }}
                        >
                          {t('settings_clear_cache')}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="modal-footer">
                  <button className="btn-primary" onClick={() => setShowSettings(false)}>{t('settings_close')}</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Volume Boost Safety Modal */}
      <AnimatePresence>
        {showVolumeBoostModal && (
          <motion.div className="modal-backdrop" onClick={() => setShowVolumeBoostModal(false)}>
            <motion.div className="modal-panel center-layout" onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}>
              <div className="modal-header centered">
                <div className="modal-prompt-icon" style={{ borderColor: 'rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.05)', color: '#fbbf24' }}>
                  <Activity size={32} />
                </div>
                <h2 className="modal-prompt-title">{t('modal_boost_title')}</h2>
              </div>

              <div className="modal-body">
                <p className="modal-prompt-text">{t('modal_boost_desc')}</p>
                <div className="modal-checkbox-group" onClick={() => setSkipVolumeBoostWarning(!skipVolumeBoostWarning)}>
                  <TacticalToggle checked={skipVolumeBoostWarning} onChange={() => {}} />
                  <span className="setting-label" style={{ marginBottom: 0, fontSize: '0.75rem', opacity: 0.8 }}>{t('modal_quit_dont_ask')}</span>
                </div>
              </div>

              <div className="modal-footer" style={{ justifyContent: 'center', gap: '12px' }}>
                <button className="btn-secondary" onClick={() => setShowVolumeBoostModal(false)}>{t('modal_boost_cancel')}</button>
                <button className="btn-primary" style={{ background: '#fbbf24', color: '#000' }} onClick={() => {
                  setVolumeBoostEnabled(true);
                  if (volumeBoostDb === 0) setVolumeBoostDb(6);
                  setShowVolumeBoostModal(false);
                }}>{t('modal_boost_proceed')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quit Confirmation Modal */}
      <AnimatePresence>
        {showQuitModal && (
          <motion.div className="modal-backdrop" onClick={() => setShowQuitModal(false)}>
            <motion.div className="modal-panel center-layout" onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}>
              <div className="modal-header centered">
                <div className="modal-prompt-icon" style={{ borderColor: 'rgba(255,77,77,0.2)', background: 'rgba(255,77,77,0.05)', color: '#ff4d4d' }}>
                  <Power size={32} />
                </div>
                <h2 className="modal-prompt-title">{t('modal_quit_title')}</h2>
              </div>

              <div className="modal-body">
                <p className="modal-prompt-text">{t('modal_quit_desc')}</p>
                <div className="modal-checkbox-group" onClick={() => setDontAskQuitAgain(!dontAskQuitAgain)}>
                  <TacticalToggle checked={dontAskQuitAgain} onChange={() => {}} />
                  <span className="setting-label" style={{ marginBottom: 0, fontSize: '0.75rem', opacity: 0.8 }}>{t('modal_quit_dont_ask')}</span>
                </div>
              </div>

              <div className="modal-footer" style={{ justifyContent: 'center', gap: '12px' }}>
                <button className="btn-secondary" onClick={() => setShowQuitModal(false)}>{t('modal_quit_cancel')}</button>
                <button className="btn-primary" style={{ background: '#ff4d4d', color: '#fff' }} onClick={() => {
                  if (dontAskQuitAgain) setSkipQuitConfirm(true);
                  invoke('quit_app');
                }}>{t('modal_quit_confirm')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetModal && (
          <motion.div className="modal-backdrop" onClick={() => setShowResetModal(false)}>
            <motion.div className="modal-panel center-layout" onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}>
              <div className="modal-header centered">
                <div className="modal-prompt-icon" style={{ borderColor: 'rgba(255,191,36,0.3)', background: 'rgba(251,191,36,0.08)', color: '#fbbf24' }}>
                  <Trash2 size={32} />
                </div>
                <h2 className="modal-prompt-title">{t('settings_clear_cache')}</h2>
              </div>

              <div className="modal-body">
                <p className="modal-prompt-text">{t('modal_reset_desc')}</p>
              </div>

              <div className="modal-footer" style={{ justifyContent: 'center', gap: '12px' }}>
                <button className="btn-secondary" onClick={() => setShowResetModal(false)}>{t('cancel')}</button>
                <button className="btn-primary" style={{ background: '#ff4d4d', color: '#fff' }} onClick={() => {
                  clearAllData();
                  setShowResetModal(false);
                }}>{t('settings_clear_cache_confirm')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Minimalist Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            className={`toast-notification ${toast.type}`}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={() => setToast(null)}
          >
            <div className="toast-icon">
              {toast.type === 'success' && <Check size={16} />}
              {toast.type === 'error' && <AlertCircle size={16} />}
              {toast.type === 'warning' && <Info size={16} />}
              {toast.type === 'info' && <Zap size={16} />}
            </div>
            <span className="toast-message">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
