import { 
  Crosshair, 
  Skull, 
  Trophy, 
  Flag, 
  Zap, 
  Activity, 
  AlertTriangle, 
  UserPlus,
  Target,
  Flame,
  Bomb,
  Clock,
  Shield
} from 'lucide-react';

export interface EventDefinition {
  id: string;
  defaultEnabled: boolean;
  label_key: string;
  icon: any;
  color: string;
  keywords: string[];
  isLayered?: boolean;
  subOf?: string;
  category?: 'reaction' | 'bomb' | 'experimental';
}

export const EVENT_CATALOG: EventDefinition[] = [
  {
    id: 'kills',
    defaultEnabled: true,
    label_key: 'event_KILLS',
    icon: Crosshair,
    color: '#ef4444',
    keywords: ['kill', 'elimination', 'élimination', 'убийство', 'eliminar', '击杀']
  },
  {
    id: 'headshots',
    defaultEnabled: true,
    label_key: 'event_HEADSHOTS',
    icon: Target,
    color: '#facc15',
    keywords: ['headshot', 'hs', 'tir à la tête', 'хедшот', '爆头'],
    isLayered: true,
    subOf: 'kills'
  },
  {
    id: 'deaths',
    defaultEnabled: true,
    label_key: 'event_DEATHS',
    icon: Skull,
    color: '#94a3b8',
    keywords: ['death', 'died', 'mort', 'смерть', '死亡']
  },
  {
    id: 'round_win',
    defaultEnabled: false,
    label_key: 'event_ROUND_WIN',
    icon: Trophy,
    color: '#22c55e',
    keywords: ['win', 'victory', 'gagné', 'победа', 'vitoria', '胜利']
  },
  {
    id: 'round_loss',
    defaultEnabled: false,
    label_key: 'event_ROUND_LOSS',
    icon: AlertTriangle,
    color: '#ef4444',
    keywords: ['loss', 'lost', 'perdu', 'поражение', 'derrota', '失败']
  },
  {
    id: 'match_over',
    defaultEnabled: false,
    label_key: 'event_MATCH_OVER',
    icon: Zap,
    color: '#a855f7',
    keywords: ['gg', 'match', 'end', 'fini', 'конец', '结束']
  },
  {
    id: 'low_health',
    defaultEnabled: false,
    label_key: 'event_LOW_HEALTH',
    icon: Activity,
    color: '#f43f5e',
    keywords: ['health', 'hp', 'low', 'vie', 'santé', 'здоровье', '生命值']
  },
  {
    id: 'first_blood',
    defaultEnabled: false,
    label_key: 'event_FIRST_BLOOD',
    icon: UserPlus,
    color: '#fbbf24',
    keywords: ['first', 'blood', 'premier', 'первая кровь', '第一滴血']
  },
  {
    id: 'mvp_award',
    defaultEnabled: false,
    label_key: 'event_MVP_AWARD',
    icon: Trophy,
    color: '#facc15',
    keywords: ['mvp', 'best', 'meilleur', 'лучший', '最有价值球员'],
    isLayered: true,
    subOf: 'round_win'
  },
  {
    id: 'round_start',
    defaultEnabled: false,
    label_key: 'event_ROUND_START',
    icon: Flag,
    color: '#3b82f6',
    keywords: ['start', 'begin', 'début', 'начало', 'começo', '开始']
  },
  {
    id: 'bomb_planted',
    defaultEnabled: true,
    label_key: 'event_BOMB_PLANTED',
    icon: Bomb,
    color: '#ef4444',
    keywords: ['bomb', 'planted', 'bombe', 'posée', 'бомба', 'установлена', 'C4', '炸弹', '安置'],
    category: 'bomb'
  },
  {
    id: 'bomb_10s',
    defaultEnabled: true,
    label_key: 'event_BOMB_10S',
    icon: Clock,
    color: '#f97316',
    keywords: ['10', 'ten', '10s', 'warning', 'dix', 'секунд', '十秒'],
    category: 'bomb'
  },
  {
    id: 'bomb_5s',
    defaultEnabled: true,
    label_key: 'event_BOMB_5S',
    icon: Activity,
    color: '#ea580c',
    keywords: ['5', 'five', '5s', 'urgency', 'cinq', 'секунд', '五秒'],
    category: 'bomb'
  },
  {
    id: 'bomb_defused',
    defaultEnabled: false,
    label_key: 'event_BOMB_DEFUSED',
    icon: Shield,
    color: '#3b82f6',
    keywords: ['defused', 'désamorcée', 'обезврежена', '拆除'],
    category: 'reaction'
  },
  {
    id: 'bomb_exploded',
    defaultEnabled: false,
    label_key: 'event_BOMB_EXPLODED',
    icon: Flame,
    color: '#ef4444',
    keywords: ['exploded', 'boom', 'explose', 'взрыв', '爆炸'],
    category: 'reaction'
  },
];

export const getDefaultMapping = () => {
  const mapping: any = {};
  EVENT_CATALOG.forEach(ev => {
    mapping[ev.id] = {
      enabled: ev.defaultEnabled,
      dashboardVisible: ev.defaultEnabled,
      sounds: [],
      mode: 'random',
      currentIndex: 0,
      history: [],
      isLayered: ev.isLayered || false
    };
  });
  return mapping;
};
