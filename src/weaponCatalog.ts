import { 
  Sword, 
  Target, 
  Crosshair, 
  Zap, 
  Dna,
  Shield,
  Activity,
  Flame,
  Bomb
} from 'lucide-react';

export interface WeaponDefinition {
  id: string;
  label_key: string;
  category: 'Melee' | 'Grenades' | 'Snipers' | 'Rifles' | 'Pistols' | 'SMGs' | 'Heavy';
  icon: any;
  color: string;
  isSecondary?: boolean; // If true, only shown in search, not default list
}

export const WEAPON_CATALOG: WeaponDefinition[] = [
  // Melee & Special
  { id: 'weapon_knife', label_key: 'weapon_KNIFE', category: 'Melee', icon: Sword, color: '#94a3b8' },
  { id: 'weapon_taser', label_key: 'weapon_ZEUS', category: 'Melee', icon: Zap, color: '#facc15' },

  // Specialized Knives (isSecondary: true means they only show up in search)
  { id: 'weapon_knife_karambit', label_key: 'weapon_KNIFE_KARAMBIT', category: 'Melee', icon: Sword, color: '#94a3b8', isSecondary: true },
  { id: 'weapon_knife_butterfly', label_key: 'weapon_KNIFE_BUTTERFLY', category: 'Melee', icon: Sword, color: '#94a3b8', isSecondary: true },
  { id: 'weapon_knife_m9_bayonet', label_key: 'weapon_KNIFE_M9_BAYONET', category: 'Melee', icon: Sword, color: '#94a3b8', isSecondary: true },
  { id: 'weapon_bayonet', label_key: 'weapon_KNIFE_BAYONET', category: 'Melee', icon: Sword, color: '#94a3b8', isSecondary: true },
  { id: 'weapon_knife_flip', label_key: 'weapon_KNIFE_FLIP', category: 'Melee', icon: Sword, color: '#94a3b8', isSecondary: true },
  { id: 'weapon_knife_gut', label_key: 'weapon_KNIFE_GUT', category: 'Melee', icon: Sword, color: '#94a3b8', isSecondary: true },
  { id: 'weapon_knife_tactical', label_key: 'weapon_KNIFE_HUNTSMAN', category: 'Melee', icon: Sword, color: '#94a3b8', isSecondary: true },
  { id: 'weapon_knife_falchion', label_key: 'weapon_KNIFE_FALCHION', category: 'Melee', icon: Sword, color: '#94a3b8', isSecondary: true },
  { id: 'weapon_knife_survival_bowie', label_key: 'weapon_KNIFE_BOWIE', category: 'Melee', icon: Sword, color: '#94a3b8', isSecondary: true },
  { id: 'weapon_knife_push', label_key: 'weapon_KNIFE_DAGGERS', category: 'Melee', icon: Sword, color: '#94a3b8', isSecondary: true },
  { id: 'weapon_knife_canis', label_key: 'weapon_KNIFE_PARACORD', category: 'Melee', icon: Sword, color: '#94a3b8', isSecondary: true },
  { id: 'weapon_knife_cord', label_key: 'weapon_KNIFE_SURVIVAL', category: 'Melee', icon: Sword, color: '#94a3b8', isSecondary: true },
  { id: 'weapon_knife_ursus', label_key: 'weapon_KNIFE_URSUS', category: 'Melee', icon: Sword, color: '#94a3b8', isSecondary: true },
  { id: 'weapon_knife_gypsy_jackknife', label_key: 'weapon_KNIFE_NAVAJA', category: 'Melee', icon: Sword, color: '#94a3b8', isSecondary: true },
  { id: 'weapon_knife_outdoor', label_key: 'weapon_KNIFE_NOMAD', category: 'Melee', icon: Sword, color: '#94a3b8', isSecondary: true },
  { id: 'weapon_knife_stiletto', label_key: 'weapon_KNIFE_STILETTO', category: 'Melee', icon: Sword, color: '#94a3b8', isSecondary: true },
  { id: 'weapon_knife_widowmaker', label_key: 'weapon_KNIFE_TALON', category: 'Melee', icon: Sword, color: '#94a3b8', isSecondary: true },
  { id: 'weapon_knife_skeleton', label_key: 'weapon_KNIFE_SKELETON', category: 'Melee', icon: Sword, color: '#94a3b8', isSecondary: true },
  { id: 'weapon_knife_kukri', label_key: 'weapon_KNIFE_KUKRI', category: 'Melee', icon: Sword, color: '#94a3b8', isSecondary: true },
  { id: 'weapon_knife_css', label_key: 'weapon_KNIFE_CLASSIC', category: 'Melee', icon: Sword, color: '#94a3b8', isSecondary: true },

  // Snipers
  { id: 'weapon_awp', label_key: 'weapon_AWP', category: 'Snipers', icon: Crosshair, color: '#ef4444' },
  { id: 'weapon_ssg08', label_key: 'weapon_SSG08', category: 'Snipers', icon: Target, color: '#facc15' },
  { id: 'weapon_scar20', label_key: 'weapon_SCAR20', category: 'Snipers', icon: Crosshair, color: '#a855f7' },
  { id: 'weapon_g3sg1', label_key: 'weapon_G3SG1', category: 'Snipers', icon: Crosshair, color: '#a855f7' },

  // Rifles
  { id: 'weapon_ak47', label_key: 'weapon_AK47', category: 'Rifles', icon: Activity, color: '#f97316' },
  { id: 'weapon_m4a1', label_key: 'weapon_M4_GROUP', category: 'Rifles', icon: Activity, color: '#3b82f6' },
  { id: 'weapon_famas', label_key: 'weapon_FAMAS', category: 'Rifles', icon: Activity, color: '#3b82f6' },
  { id: 'weapon_galilar', label_key: 'weapon_GALIL', category: 'Rifles', icon: Activity, color: '#f97316' },
  { id: 'weapon_aug', label_key: 'weapon_AUG', category: 'Rifles', icon: Activity, color: '#22c55e' },
  { id: 'weapon_sg556', label_key: 'weapon_SG556', category: 'Rifles', icon: Activity, color: '#22c55e' },

  // Pistols
  { id: 'weapon_deagle', label_key: 'weapon_DEAGLE', category: 'Pistols', icon: Flame, color: '#ef4444' },
  { id: 'weapon_revolver', label_key: 'weapon_REVOLVER', category: 'Pistols', icon: Flame, color: '#ef4444' },
  { id: 'weapon_usp_silencer', label_key: 'weapon_USP', category: 'Pistols', icon: Shield, color: '#3b82f6' },
  { id: 'weapon_glock', label_key: 'weapon_GLOCK', category: 'Pistols', icon: Shield, color: '#f97316' },
  { id: 'weapon_hkp2000', label_key: 'weapon_P2000', category: 'Pistols', icon: Shield, color: '#3b82f6' },
  { id: 'weapon_p250', label_key: 'weapon_P250', category: 'Pistols', icon: Shield, color: '#94a3b8' },
  { id: 'weapon_tec9', label_key: 'weapon_TEC9', category: 'Pistols', icon: Shield, color: '#f97316' },
  { id: 'weapon_fiveseven', label_key: 'weapon_FIVESEVEN', category: 'Pistols', icon: Shield, color: '#3b82f6' },
  { id: 'weapon_cz75a', label_key: 'weapon_CZ75', category: 'Pistols', icon: Shield, color: '#94a3b8' },
  { id: 'weapon_elite', label_key: 'weapon_ELITE', category: 'Pistols', icon: Shield, color: '#22c55e' },

  // SMGs
  { id: 'weapon_mac10', label_key: 'weapon_MAC10', category: 'SMGs', icon: Zap, color: '#f97316' },
  { id: 'weapon_mp9', label_key: 'weapon_MP9', category: 'SMGs', icon: Zap, color: '#3b82f6' },
  { id: 'weapon_p90', label_key: 'weapon_P90', category: 'SMGs', icon: Zap, color: '#a855f7' },
  { id: 'weapon_mp7', label_key: 'weapon_MP7', category: 'SMGs', icon: Zap, color: '#94a3b8' },
  { id: 'weapon_mp5sd', label_key: 'weapon_MP5', category: 'SMGs', icon: Zap, color: '#3b82f6' },
  { id: 'weapon_ump45', label_key: 'weapon_UMP45', category: 'SMGs', icon: Zap, color: '#94a3b8' },
  { id: 'weapon_bizon', label_key: 'weapon_BIZON', category: 'SMGs', icon: Zap, color: '#22c55e' },

  // Heavy
  { id: 'weapon_nova', label_key: 'weapon_NOVA', category: 'Heavy', icon: Dna, color: '#94a3b8' },
  { id: 'weapon_xm1014', label_key: 'weapon_XM1014', category: 'Heavy', icon: Dna, color: '#22c55e' },
  { id: 'weapon_mag7', label_key: 'weapon_MAG7', category: 'Heavy', icon: Dna, color: '#3b82f6' },
  { id: 'weapon_sawedoff', label_key: 'weapon_SAWEDOFF', category: 'Heavy', icon: Dna, color: '#f97316' },
  { id: 'weapon_m249', label_key: 'weapon_M249', category: 'Heavy', icon: Activity, color: '#facc15' },
  { id: 'weapon_negev', label_key: 'weapon_NEGEV', category: 'Heavy', icon: Activity, color: '#22c55e' },

  // Grenades
  { id: 'grenade_he_kill', label_key: 'event_GRENADE_HE_KILL', category: 'Grenades', icon: Bomb, color: '#fbbf24' },
  { id: 'grenade_fire_kill', label_key: 'event_GRENADE_FIRE_KILL', category: 'Grenades', icon: Flame, color: '#ef4444' }
];

export const WEAPON_CATEGORIES = ['Melee', 'Grenades', 'Snipers', 'Rifles', 'Pistols', 'SMGs', 'Heavy'] as const;
