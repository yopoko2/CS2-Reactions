import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Search, 
  Check, 
  LayoutGrid,
  Trash2,
  Plus
} from 'lucide-react';
import { EVENT_CATALOG } from '../eventCatalog';
import { useAudio } from '../context/AudioContext';
import { useTranslation } from '../hooks/useTranslation';
import { WEAPON_CATALOG, WEAPON_CATEGORIES } from '../weaponCatalog';

interface EventManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const EventRow = ({ ev, t, mapping, handleAction }: any) => {
  const isActive = mapping[ev.id]?.dashboardVisible;
  const isWeapon = (ev as any).isWeapon;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`event-catalog-row ${isActive ? 'active' : ''} ${isWeapon ? 'weapon-row' : ''}`}
      onClick={() => handleAction(ev)}
    >
      <div style={{ 
        width: '40px', 
        height: '40px', 
        borderRadius: '10px', 
        background: 'rgba(255,255,255,0.03)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        border: `1px solid ${ev.color}22`
      }}>
        <ev.icon size={20} color={ev.color} />
      </div>
      
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
          {t(ev.label_key)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
          <span className={`catalog-status-tag ${isActive ? 'catalog-status-active' : 'catalog-status-inactive'}`}>
            {isWeapon ? 'CUSTOM WEAPON' : (isActive ? t('event_manager_enabled') : t('event_manager_disabled'))}
          </span>
        </div>
      </div>

      {isWeapon ? (
        <div className="catalog-action-btn remove" onClick={(e) => { e.stopPropagation(); handleAction(ev, true); }}>
          <Trash2 size={16} />
        </div>
      ) : (
        <div className={`tactical-checkbox ${isActive ? 'active' : ''}`} style={{ border: '2px solid rgba(255,255,255,0.1)' }}>
          <AnimatePresence>
            {isActive && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                style={{ color: '#22c55e' }}
              >
                <Check size={14} strokeWidth={4} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export const EventManager: React.FC<EventManagerProps> = ({ isOpen, onClose }) => {
  const { mapping, setMapping, addWeaponEvent, removeWeaponEvent } = useAudio();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [showWeaponPicker, setShowWeaponPicker] = useState(false);
  const [weaponSearch, setWeaponSearch] = useState('');

  const activeWeaponEvents = WEAPON_CATALOG
    .filter(w => mapping[w.id])
    .map(w => ({
      id: w.id,
      label_key: w.label_key,
      icon: w.icon,
      color: w.color,
      isWeapon: true,
      keywords: [w.id]
    }));

  const allEvents = [...EVENT_CATALOG, ...activeWeaponEvents];

  const filteredEvents = allEvents.filter(ev => {
    const q = search.toLowerCase();
    const label = t(ev.label_key).toLowerCase();
    const matchesKeyword = (ev as any).keywords?.some((k: string) => k.toLowerCase().includes(q)) || false;
    const matchesId = ev.id.toLowerCase().includes(q);
    const isNotBomb = (ev as any).category !== 'bomb';
    return (label.includes(q) || matchesKeyword || matchesId) && isNotBomb;
  });

  const handleAction = (ev: any, isDelete = false) => {
    if (isDelete && ev.isWeapon) {
      removeWeaponEvent(ev.id);
      return;
    }

    setMapping(prev => {
      const isCurrentlyVisible = prev[ev.id]?.dashboardVisible || false;
      return {
        ...prev,
        [ev.id]: {
          ...prev[ev.id],
          dashboardVisible: !isCurrentlyVisible,
          enabled: !isCurrentlyVisible 
        }
      };
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div 
            className="modal-panel"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sidebar with Branding/Logo or just Title */}
            <div className="modal-sidebar">
                <div style={{ padding: '0 20px', textAlign: 'center' }}>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '14px', 
                    background: 'var(--primary)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginBottom: '16px',
                    marginInline: 'auto',
                    boxShadow: '0 10px 20px rgba(250, 204, 21, 0.2)'
                  }}>
                    <LayoutGrid size={24} color="#fff" />
                  </div>
                  <h2 style={{ fontSize: '1rem', fontWeight: 800, lineHeight: 1.2, color: '#fff', marginBottom: '8px' }}>
                    {t('event_manager_title')}
                  </h2>
                  <p style={{ fontSize: '0.65rem', opacity: 0.4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '24px' }}>
                    {t('event_manager_subtitle')}
                  </p>

                  <div style={{ width: '100%', marginTop: 'auto' }}>
                    <div 
                      className="sidebar-action-card"
                      onClick={() => setShowWeaponPicker(true)}
                    >
                      <div className="sidebar-action-icon">
                        <Plus size={18} strokeWidth={3} />
                      </div>
                      <span className="sidebar-action-label">
                        {t('event_add_weapon_btn')}
                      </span>
                    </div>

                    <AnimatePresence>
                      {showWeaponPicker && (
                        <motion.div 
                          className="weapon-picker-full-overlay"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setShowWeaponPicker(false)}
                        >
                          <motion.div 
                            className="weapon-picker-panel"
                            onClick={(e) => e.stopPropagation()}
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                          >
                            <div className="weapon-picker-header">
                              <div className="weapon-picker-title-row">
                                <h3>{t('event_add_weapon_btn')}</h3>
                                <button className="icon-btn-sm" onClick={() => setShowWeaponPicker(false)}>
                                  <X size={14} />
                                </button>
                              </div>
                              <div className="weapon-picker-search-container">
                                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                                <input 
                                  type="text"
                                  placeholder={t('weapon_picker_search')}
                                  value={weaponSearch}
                                  onChange={(e) => setWeaponSearch(e.target.value)}
                                  autoFocus
                                />
                              </div>
                            </div>

                            <div className="weapon-picker-body">
                              {WEAPON_CATEGORIES.map(category => {
                                const weaponsInCategory = WEAPON_CATALOG.filter(w => 
                                  w.category === category && 
                                  (!w.isSecondary || weaponSearch.trim() !== '') &&
                                  (t(w.label_key).toLowerCase().includes(weaponSearch.toLowerCase()) || w.id.includes(weaponSearch.toLowerCase()))
                                );

                                if (weaponsInCategory.length === 0) return null;

                                return (
                                  <div key={category}>
                                    <div className="weapon-category-header">
                                      {t('weapon_category_' + category.toLowerCase())}
                                    </div>
                                    <div className="weapon-item-grid">
                                      {weaponsInCategory.map(weapon => {
                                        const isAlreadyAdded = mapping[weapon.id] !== undefined;
                                        return (
                                          <button 
                                            key={weapon.id}
                                            className={`weapon-item-btn ${isAlreadyAdded ? 'added' : ''}`}
                                            onClick={() => {
                                              if (!isAlreadyAdded) {
                                                addWeaponEvent(weapon.id);
                                                setShowWeaponPicker(false);
                                              }
                                            }}
                                            disabled={isAlreadyAdded}
                                          >
                                            <div className="weapon-item-icon-box">
                                              <weapon.icon size={16} color={weapon.color} />
                                            </div>
                                            <span className="weapon-item-label">
                                              {t(weapon.label_key)}
                                            </span>
                                            {isAlreadyAdded && <Check size={14} color="#22c55e" strokeWidth={3} />}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
               </div>
            </div>

            {/* Main Content Area */}
            <div className="modal-content-area">
              <div className="modal-header">
                <div style={{ flex: 1, position: 'relative' }}>
                  <Search 
                    size={16} 
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} 
                  />
                  <input 
                    type="text"
                    className="catalog-search-input"
                    placeholder={t('event_manager_search')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ 
                      paddingLeft: '36px', 
                      background: 'rgba(255,255,255,0.03)',
                      height: '40px' 
                    }}
                    autoFocus
                  />
                </div>
                <button 
                  className="icon-btn" 
                  onClick={onClose}
                  style={{ marginLeft: '12px' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                <div className="event-catalog-list">
                  <AnimatePresence mode="popLayout">
                    {filteredEvents.map((ev) => (
                      <EventRow key={ev.id} ev={ev} t={t} mapping={mapping} handleAction={handleAction} />
                    ))}
                  </AnimatePresence>
                  {filteredEvents.length === 0 && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{ padding: '60px 20px', textAlign: 'center', opacity: 0.3 }}
                    >
                      <p>{t('event_manager_no_results')}</p>
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn-secondary" onClick={onClose}>
                  {t('settings_close')}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
