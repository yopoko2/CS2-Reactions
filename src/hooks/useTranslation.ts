import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { emit, listen } from '@tauri-apps/api/event';

export type Language = 'en' | 'ru' | 'pt' | 'fr' | 'zh';

export const LANGUAGES: { code: Language, label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
  { code: 'pt', label: 'Português (Brasil)' },
  { code: 'fr', label: 'Français' },
  { code: 'zh', label: '中文' }
];

interface Translations {
  [key: string]: {
    [lang in Language]: string;
  };
}

const translations: Translations = {
  // General UI
  link_btn: {
    en: "Connect Game", ru: "Подключить игру", pt: "Conectar Jogo", fr: "Connecter le jeu", zh: "连接游戏"
  },

  desc_disconnected: {
    en: "Connect your game to synchronize high-fidelity sounds with your actions in real-time.",
    ru: "Подключите игру, чтобы слышать звуки при убийствах или победах в раундах.",
    pt: "Vincule seu jogo para ouvir sons durante todos os seus eventos e acciones em tempo real.",
    fr: "Connectez votre jeu pour synchroniser vos sons avec vos actions en temps réel.",
    zh: "连接您的游戏，以便在击杀或回合获胜时听到实时反应。"
  },
  link_step_1_title: {
    en: "Link Counter-Strike 2", ru: "Связь с CS2", pt: "Vincular CS2", fr: "Lien CS2", zh: "链接 CS2"
  },
  link_step_1_desc: {
    en: "Select your Counter-Strike 2 installation folder to enable GSI integration.",
    ru: "Выберите папку установки Counter-Strike 2 для активации GSI.",
    pt: "Selecione a pasta de instalação do Counter-Strike 2 para ativar o GSI.",
    fr: "Sélectionnez votre dossier Counter-Strike 2 pour activer l'intégration GSI.",
    zh: "选择 Counter-Strike 2 安装文件夹以启用 GSI 集成。"
  },
  link_step_2_title: {
    en: "Ready to Launch", ru: "Запустите CS2", pt: "Inicie o CS2", fr: "Prêt à lancer", zh: "启动 CS2"
  },
  link_step_2_desc: {
    en: "Configuration successful! Customize your sounds below, then launch Counter-Strike 2.",
    ru: "Путь привязан! Добавьте звуки к событиям ниже, затем запустите CS2.",
    pt: "Pasta vinculada! Adicione sons aos seus eventos abaixo e inicie o Counter-Strike 2.",
    fr: "Configuration réussie ! Personnalisez vos sons ci-dessous, puis lancez CS2.",
    zh: "路径已链接！请在下方为事件添加声音，然后启动 CS2。"
  },
  link_active_title: {
    en: "LIVE SIGNAL", ru: "ЖИВОЙ СИГНАЛ", pt: "SINAL AO VIVO", fr: "SIGNAL ACTIF", zh: "实时信号"
  },
  link_active_desc: {
    en: "Connection established. Your audio profile is now active.",
    ru: "Соединение установлено. Ваш аудиопрофиль активен.",
    pt: "Conexão estabelecida. Seu perfil de áudio está ativo.",
    fr: "Connexion établie. Votre profil audio est maintenant actif.",
    zh: "连接已建立。您的音频配置文件现已启用。"
  },
  status_connected: {
    en: "Synchronized", ru: "Подключено", pt: "Conectado", fr: "Synchronisé", zh: "已连接"
  },
  status_awaiting: {
    en: "Searching for CS2...", ru: "Ожидание игры...", pt: "Aguardando Jogo...", fr: "Recherche de CS2...", zh: "等待游戏..."
  },
  status_detected: {
    en: "CS2 Detected", ru: "CS2 Обнаружен", pt: "CS2 Detectado", fr: "CS2 Détecté", zh: "已检测到 CS2"
  },
  status_disconnected: {
    en: "Signal Lost", ru: "Сигнал потерян", pt: "Desconectado", fr: "Signal Interrompu", zh: "未连接"
  },
  bomb_timer_label: {
    en: "(timer)", ru: "(таймер)", pt: "(timer)", fr: "(timer)", zh: "(计时器)"
  },
  bomb_info_tooltip_title: {
    en: "Smart Timer", ru: "Умный таймер", pt: "Timer Inteligente", fr: "Timer Intelligent", zh: "智能计时器"
  },
  bomb_info_tooltip_desc: {
    en: "Automated high-precision calculation for bomb status alerts.",
    ru: "Определяет момент закладки бомбы и запускает автоматический таймер для воспроизведения выбранных звуков вовремя.",
    pt: "Detecta quando a bomba é plantada e inicia um timer automático para reproduzir seus sons no momento certo.",
    fr: "Calcul automatisé de haute précision pour les alertes de bombe.",
    zh: "检测炸弹安放时机，并启动自动计时器以便在正确的时刻播放您选择的声音。"
  },
  drop_audio: {
    en: "Drop audio files here", ru: "Перетащите аудио сюда", pt: "Solte o áudio aqui", fr: "Déposez vos sons ici", zh: "在此处拖放音频"
  },
  manual_link: {
    en: "Browse Folders", ru: "Выбрать вручную", pt: "Escolher Manualmente", fr: "Parcourir les dossiers", zh: "手动选择"
  },
  choose_folder: {
    en: "Select CS2 Installation Folder", ru: "Выберите папку Counter-Strike 2", pt: "Selecionar Pasta do CS2", fr: "Dossier d'installation CS2", zh: "选择 CS2 文件夹"
  },
  settings_title: {
    en: "Settings", ru: "Настройки", pt: "Configurações", fr: "Paramètres", zh: "设置"
  },
  settings_general_title: {
    en: "General Configuration", ru: "Общие настройки", pt: "Configurações Gerais", fr: "Configuration Générale", zh: "常规设置"
  },
  settings_enable_dynamics: {
    en: "Enable Audio Dynamics", ru: "Включить динамику звука", pt: "Habilitar Dinâmica de Áudio", fr: "Activer la Dynamique Audio", zh: "启用音频动态"
  },
  pitch_variation_desc: {
    en: "Adds organic pitch variation to every event for a more natural feel.",
    ru: "Добавляет случайное изменение высоты тона для каждого события.",
    pt: "Adiciona variação orgânica de tom para uma sensação mais natural.",
    fr: "Ajoute des variations de pitch organiques pour un rendu plus naturel.",
    zh: "为每个事件添加有机音调变化，让听感更自然。"
  },
  pitch_intensity_cents: {
    en: "cents", ru: "центов", pt: "cents", fr: "cents", zh: "音分"
  },
  bomb_timer_section: {
    en: "Explosives Logic", ru: "Логика детонации", pt: "Lógica de Explosivos", fr: "Logique des Explosifs", zh: "炸弹逻辑设计"
  },
  settings_cs2_path: {
    en: "CS2 Installation", ru: "Установка CS2", pt: "Instalação do CS2", fr: "Installation CS2", zh: "CS2 安装"
  },
  folder_synced: {
    en: "Synchronized", ru: "Синхронизировано", pt: "Sincronizado", fr: "Synchronisé", zh: "已同步"
  },
  settings_relink: {
    en: "Relink Folder", ru: "Переподключить CS2", pt: "Vincular Novamente", fr: "Relier le dossier", zh: "重新链接 CS2"
  },
  settings_clear_cache: {
    en: "Clear Cache", ru: "Очистить кэш", pt: "Limpar Cache", fr: "Vider le cache", zh: "清除缓存"
  },
  settings_clear_cache_confirm: {
    en: "Confirm Reset", ru: "Сбросить всё", pt: "Confirmar Reset", fr: "Tout réinitialiser", zh: "确认重置"
  },
  settings_close: {
    en: "Close", ru: "Закрыть", pt: "Fechar", fr: "Fermer", zh: "关闭"
  },
  cancel: {
    en: "Cancel", ru: "Отмена", pt: "Cancelar", fr: "Annuler", zh: "取消"
  },
  got_it: {
    en: "Got it", ru: "Понятно", pt: "Entendi", fr: "Compris", zh: "明白"
  },
  export_profile: {
    en: "Export Profile", ru: "Экспортировать профиль", pt: "Exportar Perfil", fr: "Exporter le profil", zh: "导出配置"
  },
  import_profile: {
    en: "Import Profile", ru: "Импортировать профиль", pt: "Importar Perfil", fr: "Importer le profil", zh: "导入配置"
  },
  event_card_empty_title: {
    en: "Add sounds",
    ru: "Добавьте звуки",
    pt: "Adicione sons",
    fr: "Ajoutez des sons",
    zh: "添加音效",
  },
  event_card_empty_sub: {
    en: "Drag audio files onto this card, or click to browse. MP3, WAV, OGG.",
    ru: "Перетащите аудио на карточку или нажмите для выбора. MP3, WAV, OGG.",
    pt: "Arraste áudios para o card ou clique para escolher. MP3, WAV, OGG.",
    fr: "Glissez des fichiers audio sur la carte ou cliquez pour parcourir. MP3, WAV, OGG.",
    zh: "将音频拖到此卡片上，或点击浏览。支持 MP3、WAV、OGG。",
  },
  add_sound_btn: {
    en: "Add Sound", ru: "Добавить звук", pt: "Adicionar som", fr: "Ajouter un son", zh: "添加声音"
  },

  remove_sound: {
    en: "Remove", ru: "Удалить", pt: "Remover", fr: "Supprimer", zh: "移除"
  },
  no_sound: {
    en: "No sound selected", ru: "Звук не выбран", pt: "Nenhum som selecionado", fr: "Aucun son configuré", zh: "未选择声音"
  },
  audio_device_unknown: {
    en: "Unknown Device", ru: "Неизвестное устройство", pt: "Dispositivo Desconhecido", fr: "Périphérique inconnu", zh: "未知设备"
  },
  audio_permission_request: {
    en: "Hardware labels are locked by OS", ru: "Имена устройств заблокированы ОС", pt: "Nomes de hardware bloqueados pelo SO", fr: "Noms du matériel verrouillés par l'OS", zh: "硬件名称被系统锁定"
  },
  audio_permission_btn: {
    en: "Authorize Labels", ru: "Разрешить доступ", pt: "Autorizar Nomes", fr: "Autoriser les noms", zh: "授权显示名称"
  },
  launch_startup: {
    en: "Launch on Startup", ru: "Запуск при старте", pt: "Iniciar com o Windows", fr: "Lancer au démarrage", zh: "开机自启"
  },
  launch_startup_desc: {
    en: "Automatically open CS2 Reactions with Windows", ru: "Автоматически открывать при запуске Windows", pt: "Inicia o CS2 Reactions automaticamente com o Windows", fr: "Ouvrir automatiquement avec Windows", zh: "随 Windows 自动启动"
  },
  preview_sound: {
    en: "Preview Sound", ru: "Предпросмотр звука", pt: "Testar Som", fr: "Écouter l'aperçu", zh: "试听声音"
  },
  mute_hotkey: {
    en: "Global Mute Hotkey", ru: "Глобальная клавиша немоты", pt: "Atalho para Silenciar", fr: "Raccourci Muet Global", zh: "全局静音快捷键"
  },
  mute_hotkey_desc: {
    en: "Press this combo any time to silence or activate sounds", ru: "Нажмите эту комбинацию, чтобы включить или выключить звуки", pt: "Pressione esta combinação para silenciar ou ativar os sons", fr: "Pressez ce raccourci pour couper ou activer les sons", zh: "随时按下此组合键以静音或激活声音"
  },
  settings_mute_while_dead: {
    en: "Mute While Dead", ru: "Тишина после смерти", pt: "Mudar após a morte", fr: "Muet si mort", zh: "死亡后静音"
  },
  settings_mute_while_dead_desc: {
    en: "Stops all reactionary sounds while you are dead or waiting for respawn.",
    ru: "Останавливает все звуки реакций, пока вы мертвы или ожидаете возрождения.",
    pt: "Para todos os sons de reação enquanto você está morto ou aguardando o respawn.",
    fr: "Arrête tous les sons de réaction quand vous êtes mort ou en attente de réapparition.",
    zh: "在您死亡或等待重生期间停止所有反应声音。"
  },
  settings_mute_while_dead_exclude_global: {
    en: "Keep Global Sounds", ru: "Оставить важные звуки", pt: "Manter sons globais", fr: "Garder sons globaux", zh: "保留全局声音"
  },
  settings_mute_while_dead_exclude_global_desc: {
    en: "Allow bomb alerts, round ends, and MVP sounds to play even while dead.",
    ru: "Разрешить воспроизведение звуков бомбы, конца раунда и MVP, даже когда вы мертвы.",
    pt: "Permite que alertas de bomba, final de rodada e sons de MVP toquem mesmo quando morto.",
    fr: "Autorise les alertes de bombe, les fins de round et les sons MVP même en étant mort.",
    zh: "即使在死亡时也允许播放炸弹警报、回合结束和 MVP 声音。"
  },
  recording: {
    en: "Recording...", ru: "Запись...", pt: "Gravando...", fr: "Enregistrement...", zh: "录制中..."
  },
  missing_sounds_warning: {
    en: "{count} sounds missing in this profile.",
    ru: "{count} звуков отсутствуют в этом профиле.",
    pt: "{count} sons faltando neste perfil.",
    fr: "{count} sons manquants dans ce profil.",
    zh: "此配置中缺少 {count} 个声音。"
  },
  sync_status: {
    en: "Sync Status", ru: "Статус синхронизации", pt: "Status de Sincronia", fr: "État de synchronisation", zh: "同步状态"
  },
  sync_data_flowing: {
    en: "Receiving game data", ru: "Получение данных игры", pt: "Recebendo dados da partida", fr: "Réception des données", zh: "正在接收 game data"
  },
  sync_awaiting_launch: {
    en: "Awaiting sync... Launch Counter-Strike 2 to begin", ru: "Ожидание синхронизации... Запустите CS2", pt: "Aguardando sincronia... Inicie o CS2 para começar", fr: "En attente de synchronisation... Lancez CS2", zh: "等待同步... 请启动 CS2"
  },
  sync_synchronizing: {
    en: "Synchronizing game data...", ru: "Синхронизация данных...", pt: "Sincronizando dados...", fr: "Synchronisation des données...", zh: "正在同步数据..."
  },
  version_label: {
    en: "Version", ru: "Версия", pt: "Versão", fr: "Version", zh: "版本"
  },
  debug_title: {
    en: "GSI & Audio Debugger", ru: "Отладчик GSI и аудио", pt: "Depurador de GSI e Áudio", fr: "Débogueur GSI & Audio", zh: "GSI 和音频调试器"
  },
  debug_no_events: {
    en: "No events recorded yet. Launch CS2...", ru: "Событий пока нет. Запустите CS2...", pt: "Nenhum evento gravado. Inicie o CS2...", fr: "Aucun événement enregistré. Lancez CS2...", zh: "尚无记录事件。请启动 CS2..."
  },
  event_manager_no_results: {
    en: "No events matching your search.",
    ru: "Событий по вашему запросу не найдено.",
    pt: "Nenhum evento corresponde à sua pesquisa.",
    fr: "Aucun événement ne correspond à votre recherche.",
    zh: "未检索到匹配的事件。"
  },
  not_linked: {
    en: "Not linked", ru: "Не привязано", pt: "Não vinculado", fr: "Non lié", zh: "未链接"
  },
  export_success: {
    en: "Profile exported successfully!", ru: "Профиль успешно экспортирован!", pt: "Perfil exportado com sucesso!", fr: "Profil exporté avec succès !", zh: "配置导出成功！"
  },
  bomb_alerts: {
    en: "Bomb Alerts",
    ru: "Оповещения бомбы",
    pt: "Alertas de Bomba",
    fr: "Alertes de Bombe",
    zh: "炸弹警报"
  },
  bomb_alerts_active: {
    en: "Active Alerts", ru: "Активных оповещений", pt: "Alertas Ativos", fr: "Alertes activées", zh: "已配置提醒"
  },
  import_success: {
    en: "Profile imported successfully!", ru: "Профиль успешно импортирован!", pt: "Perfil importado com sucesso!", fr: "Profil importé avec succès !", zh: "配置导入成功！"
  },
  import_warning: {
    en: "Imported with warnings: {count} sounds skipped",
    ru: "Импортировано с предупреждениями: {count} звуков пропущено",
    pt: "Importado com avisos: {count} sons pulados",
    fr: "Importé avec des avertissements : {count} sons ignorés",
    zh: "导入完成，但有警告：跳过了 {count} 个声音"
  },
  confirm_import: {
    en: "Confirm Import", ru: "Подтвердить импорт", pt: "Confirmar Importação", fr: "Confirmer l'importation", zh: "确认导入"
  },
  drop_to_import_title: {
    en: "Drop to Import Profile", ru: "Перетащите профиль", pt: "Solte para importar perfil", fr: "Importer un profil", zh: "拖放以导入配置"
  },
  drop_to_import_desc: {
    en: "Supports .CSreact profiles", 
    ru: "Поддержка профилей .CSreact", 
    pt: "Suporta perfis .CSreact", 
    fr: "Déposez un fichier .CSreact", 
    zh: "支持 .CSreact 配置文件"
  },
  layer_sound_label: {
    en: "Play Both", ru: "Играть оба", pt: "Reproduzir Ambos", fr: "Superposer les sons", zh: "同时播放"
  },
  layer_tooltip_title: {
    en: "Sound Stacking", ru: "Наслаивание звука", pt: "Empilhamento de Som", fr: "Superposition (Stacking)", zh: "声音叠加"
  },
  layer_tooltip_desc: {
    en: "Plays both the specialized sound and basic kill sound at once instead of replacing.",
    ru: "Воспроизводит спецзвук и обычный звук убийства одновременно, а не заменяет его.",
    pt: "Reproduz o som especial e o som de abate padrão simultaneamente, em vez de substituir.",
    fr: "Joue le son spécial et le son d'élimination en même temps au lieu de le remplacer.",
    zh: "同时播放特殊音效和基础击杀音效，而不是替换。"
  },
  drag_drop_overlay: {
    en: "Drop to add sounds",
    ru: "Перетащите звуки сюда",
    pt: "Solte para adicionar os sons",
    fr: "Déposer pour ajouter",
    zh: "松开以添加声音"
  },
  sound_drag_reorder: {
    en: "Drag to reorder sounds",
    ru: "Перетащите для изменения порядка",
    pt: "Arraste para reordenar sons",
    fr: "Glisser pour réordonner les sons",
    zh: "拖动以排序音效"
  },
  sounds_count: {
    en: "SOUNDS",
    ru: "ЗВУКОВ",
    pt: "SONS",
    fr: "SONS",
    zh: "声音"
  },
  sounds_count_singular: {
    en: "SOUND",
    ru: "ЗВУК",
    pt: "SOM",
    fr: "SON",
    zh: "声音"
  },

  // Event Labels
  event_HEADSHOTS: { en: "Headshots", ru: "Хедшоты", pt: "Headshots", fr: "Headshots", zh: "爆头" },
  event_KNIFE_KILLS: { en: "Knife Kills", ru: "Убийства ножом", pt: "Eliminações com Faca", fr: "Kills au couteau", zh: "小刀击杀" },
  event_KILLS: { en: "Kills", ru: "Убийства", pt: "Abates", fr: "Kills", zh: "击杀" },
  event_DEATHS: { en: "Deaths", ru: "Смерти", pt: "Mortes", fr: "Morts", zh: "死亡" },
  event_ROUND_START: { en: "Round Start", ru: "Начало раунда", pt: "Início do Round", fr: "Manche lancée", zh: "回合开始" },
  event_MVP: { en: "MVP", ru: "Лучший игрок", pt: "MVP", fr: "MVP", zh: "最有价值球员" },
  event_WIN_ROUND_CT: { en: "CT Win", ru: "Победа Спецназа", pt: "Vitória dos CTs", fr: "Victoire CT", zh: "CT 胜利" },
  event_WIN_ROUND_T: { en: "T Win", ru: "Победа Террористов", pt: "Vitória dos TRs", fr: "Victoire T", zh: "T 胜利" },
  event_BOMB_PLANTED: { en: "Bomb Planted", ru: "Бомба заложена", pt: "Bomba Plantada", fr: "Bombe posée", zh: "炸弹已安放" },
  event_BOMB_EXPLODED: { en: "Bomb Exploded", ru: "Бомба взорвана", pt: "Bomba Explodiu", fr: "Bombe a explosé", zh: "炸弹已爆炸" },
  event_BOMB_DEFUSED: { en: "Bomb Defused", ru: "Бомба обезврежена", pt: "Bomba Desarmada", fr: "Bombe désamorcée", zh: "炸弹已拆除" },
  event_BOMB_10S: { en: "10s Warning", ru: "Логика 10с", pt: "Lógica 10s", fr: "Alerte des 10s", zh: "10秒提醒" },
  event_BOMB_5S: { en: "Critical Evasion", ru: "Беги / Критично", pt: "Corra / Crítico", fr: "Évacuation / Critique", zh: "紧急撤离" },
  event_ROUND_WIN: { en: "Victory (Round)", ru: "Раунд выигран", pt: "Round Vencido", fr: "Victoire (Manche)", zh: "回合获胜" },
  event_ROUND_LOSS: { en: "Defeat (Round)", ru: "Раунд проигран", pt: "Round Perdido", fr: "Défaite (Manche)", zh: "回合失败" },
  event_MATCH_OVER: { en: "Match Over / GG", ru: "Матч окончен", pt: "Fim de Partida", fr: "Fin de match / GG", zh: "比赛结束 / GG" },
  event_LOW_HEALTH: { en: "Low Health", ru: "Мало здоровья", pt: "Vida Baixa", fr: "Santé faible", zh: "低生命值" },
  event_FIRST_BLOOD: { en: "First Blood", ru: "Первая кровь", pt: "First Blood", fr: "Premier sang", zh: "第一滴血" },
  event_FLASHED: { en: "Player Flashed", ru: "Ослепление", pt: "Cego (Flash)", fr: "Ébloui (Flash)", zh: "被闪" },
  event_MVP_AWARD: { en: "MVP Award", ru: "Награда MVP", pt: "Prêmio MVP", fr: "Récompense MVP", zh: "最有价值球员" },
  event_RELOADING: { en: "Reloading", ru: "Перезарядка", pt: "Recarregando", fr: "Rechargement", zh: "正在换弹" },
  event_GRENADE_KILL: { en: "Grenade Kill", ru: "Убийство гранатой", pt: "Abate com Granada", fr: "Kill à la grenade", zh: "手雷击杀" },

  // Weapon Names
  weapon_KNIFE: { en: "Knife (default)", ru: "Нож (по умолчанию)", pt: "Faca (padrão)", fr: "Couteau (défaut)", zh: "小刀 (默认)" },
  weapon_KNIFE_KARAMBIT: { en: "Karambit", ru: "Керамбит", pt: "Karambit", fr: "Karambit", zh: "爪子刀" },
  weapon_KNIFE_BUTTERFLY: { en: "Butterfly Knife", ru: "Нож-бабочка", pt: "Faca Borboleta (Butterfly)", fr: "Couteau papillon", zh: "蝴蝶刀" },
  weapon_KNIFE_M9_BAYONET: { en: "M9 Bayonet", ru: "Штык-нож M9", pt: "M9 Bayoneta", fr: "Baïonnette M9", zh: "M9 刺刀" },
  weapon_KNIFE_BAYONET: { en: "Bayonet", ru: "Штык-нож", pt: "Baioneta", fr: "Baïonnette", zh: "刺刀" },
  weapon_KNIFE_FLIP: { en: "Flip Knife", ru: "Складной нож", pt: "Faca Flip", fr: "Couteau pliant", zh: "折叠刀" },
  weapon_KNIFE_GUT: { en: "Gut Knife", ru: "Нож с лезвием-крюком", pt: "Faca Gut", fr: "Couteau à crochet", zh: "穿肠刀" },
  weapon_KNIFE_HUNTSMAN: { en: "Huntsman Knife", ru: "Охотничий нож", pt: "Faca Huntsman", fr: "Couteau de chasse", zh: "猎杀者匕首" },
  weapon_KNIFE_FALCHION: { en: "Falchion Knife", ru: "Фальшион", pt: "Faca Falchion", fr: "Couteau Falchion", zh: "弯刀" },
  weapon_KNIFE_BOWIE: { en: "Bowie Knife", ru: "Нож Боуи", pt: "Faca Bowie", fr: "Couteau Bowie", zh: "鲍伊猎刀" },
  weapon_KNIFE_DAGGERS: { en: "Shadow Daggers", ru: "Тычковые ножи", pt: "Adagas Sombrias", fr: "Dagues de l'ombre", zh: "暗影双匕" },
  weapon_KNIFE_PARACORD: { en: "Paracord Knife", ru: "Паракорд-нож", pt: "Faca Paracord", fr: "Couteau Paracord", zh: "伞绳刀" },
  weapon_KNIFE_SURVIVAL: { en: "Survival Knife", ru: "Нож выживания", pt: "Faca de Sobrevivência", fr: "Couteau de survie", zh: "生存匕首" },
  weapon_KNIFE_URSUS: { en: "Ursus Knife", ru: "Нож Урсус", pt: "Faca Ursus", fr: "Couteau Ursus", zh: "熊刀" },
  weapon_KNIFE_NAVAJA: { en: "Navaja Knife", ru: "Наваха", pt: "Faca Navaja", fr: "Couteau Navaja", zh: "纳瓦雅" },
  weapon_KNIFE_NOMAD: { en: "Nomad Knife", ru: "Нож бродяги", pt: "Faca Nomad", fr: "Couteau Nomad", zh: "流浪者匕首" },
  weapon_KNIFE_STILETTO: { en: "Stiletto Knife", ru: "Стилет", pt: "Faca Stiletto", fr: "Couteau Stiletto", zh: "短剑" },
  weapon_KNIFE_TALON: { en: "Talon Knife", ru: "Нож Талон", pt: "Faca Talon", fr: "Couteau Talon", zh: "锯齿爪刀" },
  weapon_KNIFE_SKELETON: { en: "Skeleton Knife", ru: "Скелетный нож", pt: "Faca Skeleton", fr: "Couteau Squelette", zh: "骷髅匕首" },
  weapon_KNIFE_KUKRI: { en: "Kukri Knife", ru: "Кукри", pt: "Faca Kukri", fr: "Couteau Kukri", zh: "库克力" },
  weapon_KNIFE_CLASSIC: { en: "Classic Knife", ru: "Классический нож", pt: "Faca Clássica", fr: "Couteau classique", zh: "经典匕首" },
  weapon_ZEUS: { en: "Zeus x27", ru: "Зевс", pt: "Zeus x27", fr: "Zeus x27", zh: "宙斯" },
  weapon_AWP: { en: "AWP Sniper", ru: "AWP", pt: "AWP", fr: "AWP", zh: "AWP" },
  weapon_SSG08: { en: "SSG 08 (Scout)", ru: "SSG 08 (Скаут)", pt: "SSG 08", fr: "SSG 08", zh: "SSG 08" },
  weapon_SCAR20: { en: "SCAR-20 Auto", ru: "SCAR-20", pt: "SCAR-20", fr: "SCAR-20", zh: "SCAR-20" },
  weapon_G3SG1: { en: "G3SG1 Auto", ru: "G3SG1", pt: "G3SG1", fr: "G3SG1", zh: "G3SG1" },
  weapon_AK47: { en: "AK-47", ru: "АК-47", pt: "AK-47", fr: "AK-47", zh: "AK-47" },
  weapon_M4_GROUP: { en: "M4A4 / M4A1-S", ru: "M4A4 / M4A1-S", pt: "M4A4 / M4A1-S", fr: "M4A4 / M4A1-S", zh: "M4A4 / M4A1-S" },
  weapon_FAMAS: { en: "FAMAS", ru: "FAMAS", pt: "FAMAS", fr: "FAMAS", zh: "FAMAS" },
  weapon_GALIL: { en: "Galil AR", ru: "Galil AR", pt: "Galil AR", fr: "Galil AR", zh: "Galil AR" },
  weapon_AUG: { en: "AUG", ru: "AUG", pt: "AUG", fr: "AUG", zh: "AUG" },
  weapon_SG556: { en: "SG 553", ru: "SG 553", pt: "SG 553", fr: "SG 553", zh: "SG 553" },
  weapon_DEAGLE: { en: "Desert Eagle", ru: "Deagle", pt: "Deagle", fr: "Deagle", zh: "沙漠之鹰" },
  weapon_REVOLVER: { en: "R8 Revolver", ru: "R8 Револьвер", pt: "Revólver R8", fr: "R8 Revolver", zh: "R8 左轮手枪" },
  weapon_USP: { en: "USP-S", ru: "USP-S", pt: "USP-S", fr: "USP-S", zh: "USP-S" },
  weapon_GLOCK: { en: "Glock-18", ru: "Glock-18", pt: "Glock-18", fr: "Glock-18", zh: "Glock-18" },
  weapon_P2000: { en: "P2000", ru: "P2000", pt: "P2000", fr: "P2000", zh: "P2000" },
  weapon_P250: { en: "P250", ru: "P250", pt: "P250", fr: "P250", zh: "P250" },
  weapon_TEC9: { en: "Tec-9", ru: "Tec-9", pt: "Tec-9", fr: "Tec-9", zh: "Tec-9" },
  weapon_FIVESEVEN: { en: "Five-SeveN", ru: "Five-SeveN", pt: "Five-SeveN", fr: "Five-SeveN", zh: "Five-SeveN" },
  weapon_CZ75: { en: "CZ75-Auto", ru: "CZ75-Auto", pt: "CZ75-Auto", fr: "CZ75-Auto", zh: "CZ75-Auto" },
  weapon_ELITE: { en: "Dual Berettas", ru: "Berettas", pt: "Dual Berettas", fr: "Dual Berettas", zh: "双枪" },
  weapon_MAC10: { en: "MAC-10", ru: "MAC-10", pt: "MAC-10", fr: "MAC-10", zh: "MAC-10" },
  weapon_MP9: { en: "MP9", ru: "MP9", pt: "MP9", fr: "MP9", zh: "MP9" },
  weapon_P90: { en: "P90", ru: "P90", pt: "P90", fr: "P90", zh: "P90" },
  weapon_MP7: { en: "MP7", ru: "MP7", pt: "MP7", fr: "MP7", zh: "MP7" },
  weapon_MP5: { en: "MP5-SD", ru: "MP5-SD", pt: "MP5-SD", fr: "MP5-SD", zh: "MP5-SD" },
  weapon_UMP45: { en: "UMP-45", ru: "UMP-45", pt: "UMP-45", fr: "UMP-45", zh: "UMP-45" },
  weapon_BIZON: { en: "PP-Bizon", ru: "PP-Bizon", pt: "PP-Bizon", fr: "PP-Bizon", zh: "PP-野牛" },
  weapon_NOVA: { en: "Nova", ru: "Nova", pt: "Nova", fr: "Nova", zh: "Nova" },
  weapon_XM1014: { en: "XM1014", ru: "XM1014", pt: "XM1014", fr: "XM1014", zh: "XM1014" },
  weapon_MAG7: { en: "MAG-7", ru: "MAG-7", pt: "MAG-7", fr: "MAG-7", zh: "MAG-7" },
  weapon_SAWEDOFF: { en: "Sawed-Off", ru: "Sawed-Off", pt: "Sawed-Off", fr: "Sawed-Off", zh: "截短霰弹枪" },
  weapon_M249: { en: "M249", ru: "M249", pt: "M249", fr: "M249", zh: "M249" },
  weapon_NEGEV: { en: "Negev", ru: "Negev", pt: "Negev", fr: "Negev", zh: "内格夫" },

  events: { en: "Events", ru: "События", pt: "Eventos", fr: "Événements", zh: "事件" },

  manage_events_btn: { en: "Manage Events", ru: "Управление событиями", pt: "Gerenciar Eventos", fr: "Gérer les événements", zh: "管理事件" },
  event_manager_title: { en: "Event Catalog", ru: "Каталог событий", pt: "Catálogo de Eventos", fr: "Catalogue d'événements", zh: "事件目录" },
  event_manager_search: { en: "Search events...", ru: "Поиск событий...", pt: "Buscar eventos...", fr: "Rechercher...", zh: "搜索事件..." },
  event_manager_enabled: { en: "ACTIVE", ru: "АКТИВНО", pt: "ATIVO", fr: "ACTIF", zh: "已启用" },
  event_manager_disabled: { en: "INACTIVE", ru: "НЕАКТИВНО", pt: "INATIVO", fr: "INACTIF", zh: "未启用" },
  event_manager_subtitle: { en: "Toggle which reaction cards appear on your dashboard", ru: "Выберите, какие карточки отображать", pt: "Escolha quais eventos aparecem no dashboard", fr: "Choisissez les événements à afficher", zh: "切换仪表板上显示的反应卡" },
  event_add_weapon_btn: { en: "Add Weapon Event", ru: "Добавить оружие", pt: "Adicionar Evento de Arma", fr: "Ajouter événement arme", zh: "添加武器事件" },
  weapon_picker_search: { en: "Search weapons...", ru: "Поиск оружия...", pt: "Buscar armas...", fr: "Rechercher une arme...", zh: "搜索武器..." },
  weapon_category_melee: { en: "Melee & Special", ru: "Холодное/Спец", pt: "Corpo a Corpo/Especial", fr: "Mêlée & Spécial", zh: "近战与特殊" },
  weapon_category_grenades: { en: "Grenades", ru: "Гранаты", pt: "Granadas", fr: "Grenades", zh: "手雷" },
  weapon_category_snipers: { en: "Snipers", ru: "Снайперские", pt: "Snipers", fr: "Snipers", zh: "狙击步枪" },
  weapon_category_rifles: { en: "Rifles", ru: "Винтовки", pt: "Rifles", fr: "Fusils", zh: "步枪" },
  weapon_category_pistols: { en: "Pistols", ru: "Пистолеты", pt: "Pistolas", fr: "Pistolets", zh: "手枪" },
  weapon_category_smgs: { en: "SMGs", ru: "ПП", pt: "Submetralhadoras", fr: "PM", zh: "微型冲锋枪" },
  weapon_category_heavy: { en: "Heavy", ru: "Тяжелое", pt: "Pesado", fr: "Lourd", zh: "重型武器" },

  sound_mode_random: {
    en: "Random", ru: "Случайно", pt: "Aleatório", fr: "Aléatoire", zh: "随机"
  },
  sound_mode_sequence: {
    en: "Killstreak", ru: "Последовательно", pt: "Sequência", fr: "Killstreak", zh: "顺序"
  },
  sound_mode_desc_random: {
    en: "Picks a sound randomly. Prevents immediate repetition.",
    ru: "Выбирает звук случайно. Предотвращает повторы.",
    pt: "Escolhe um som aleatoriamente. Evita a repetição imediata.",
    fr: "Choisit un son au hasard. Évite les répétitions immédiates.",
    zh: "随机选择一个声音。防止立即重复。"
  },
  sound_mode_desc_sequence: {
    en: "Play sounds in order as your killstreak grows. Resets on death.",
    ru: "Играет звуки по порядку при серии убийств. Сброс при смерти.",
    pt: "Reproduz os sons em ordem conforme o killstreak cresce. Reseta ao morrer.",
    fr: "Joue les sons dans l'ordre de votre killstreak. Reset à la mort.",
    zh: "随着您的连杀增加按顺序播放。死亡时重置。"
  },
  settings_audio_output: { en: "Audio Output Device", ru: "Устройство вывода звука", pt: "Dispositivo de Saída de Áudio", fr: "Périphérique de sortie audio", zh: "音频输出设备" },
  audio_device_default: { en: "Default System Output", ru: "Системный вывод по умолчанию", pt: "Saída Padrão do Sistema", fr: "Sortie système par défaut", zh: "系统默认输出" },
  refresh_devices: { en: "Refresh Devices", ru: "Обновить устройства", pt: "Atualizar Dispositivos", fr: "Actualiser les périphériques", zh: "刷新设备" },
  settings_audio_output_desc: { 
    en: "Route all application sounds to a specific device.", 
    ru: "Направлять все звуки приложения на конкретное устройство.", 
    pt: "Roteia todos os sons do aplicativo para um dispositivo específico.", 
    fr: "Acheminer tous les sons vers un périphérique spécifique.", 
    zh: "将所有应用声音路由到特定设备。" 
  },
  settings_audio_test_btn: { en: "Test Logic", ru: "Тест звука", pt: "Testar Áudio", fr: "Tester la logique", zh: "测试声音" },
  settings_master_volume: { en: "Global Gain", ru: "Общая громкость", pt: "Volume Geral", fr: "Volume Global", zh: "主音量" },
  settings_master_volume_desc: { 
    en: "Global volume control for all audio triggers.", 
    ru: "Глобальное управление громкостью всех ответных звуков.", 
    pt: "Controle de volume global para todos os sons de reação.", 
    fr: "Contrôle global du volume pour tous les sons de réaction.", 
    zh: "所有反应声音的全局音量控制。" 
  },
  settings_normalization: { en: "Normalize Volume", ru: "Нормализовать громкость", pt: "Normalizar Volume", fr: "Normaliser le volume", zh: "音量标准化" },
  settings_normalization_desc: { 
    en: "Ensures consistent perceived loudness across all sound triggers.", 
    ru: "Поддерживает одинаковую громкость на слух для всех звуков.", 
    pt: "Mantém uma sonoridade percebida consistente em todos os sons.", 
    fr: "Assure un volume perçu constant sur tous vos triggers.", 
    zh: "在所有声音中保持一致的感知音量。" 
  },
  settings_audio_output_section: { en: "Output Configuration", ru: "Конфигурация вывода", pt: "Configuração de Saída", fr: "Périphérique de Sortie", zh: "输出配置" },
  settings_audio_enhancement_section: { en: "Signal Processing", ru: "Улучшение сигнала", pt: "Aprimoramento de Sinal", fr: "Traitement du Signal", zh: "信号增强" },
  settings_gsi_status_desc: { en: "GSI Signal Status", ru: "Статус пульса GSI", pt: "Status do Batimento GSI", fr: "État du Signal GSI", zh: "GSI 心跳状态" },
  settings_gsi_port_value: {
    en: "Local HTTP listener: port {port}. Uses 27532 first; tries 27533–27537 if busy. Use Relink/Repair after restart so CS2’s cfg matches.",
    ru: "Локальный HTTP: порт {port}. Сначала 27532, затем 27533–27537. После смены порта выполните повторное подключение.",
    pt: "HTTP local: porta {port}. Tenta 27532, depois 27533–27537. Religue/Repare após mudança.",
    fr: "Écoute HTTP locale : port {port}. Essaie 27532 puis 27533–27537. Reliez/réparez CS2 après changement.",
    zh: "本地 HTTP 端口：{port}。优先 27532，占用时尝试 27533–27537。变更后请重新链接或修复。"
  },
  settings_gsi_port_unavailable: {
    en: "GSI listener failed to start (all ports 27532–27537 may be in use). Restart the app or close conflicting tools.",
    ru: "Сервер GSI не запущен (порты 27532–27537 заняты). Перезапустите приложение.",
    pt: "O servidor GSI não iniciou (portas 27532–27537 podem estar ocupadas). Reinicie o app.",
    fr: "Le serveur GSI n’a pas démarré (ports 27532–27537 occupés). Redémarrez l’application.",
    zh: "GSI 服务未启动（端口 27532–27537 可能被占用）。请重启应用。"
  },
  settings_gsi_repair_title: { en: "Repair GSI Integration", ru: "Восстановить интеграцию GSI", pt: "Reparar GSI", fr: "Réparer l'intégration GSI", zh: "修复 GSI 集成" },
  settings_gsi_repair_desc: { 
    en: "Force override the CS2 configuration file if weapon detection fails.", 
    ru: "Принудительно перезаписать файл конфигурации CS2, если обнаружение оружия перестало работать.", 
    pt: "Força a sobrescrita do arquivo de configuração do CS2 se a detecção de armas parar de funcionar.", 
    fr: "Forcer la réécriture du fichier de configuration CS2 si les événements ne sont plus détectés.", 
    zh: "如果武器检测停止工作，则强制覆盖 CS2 配置文件。" 
  },
  tray_controls_label: { en: "Interface Controls", ru: "Управление", pt: "Controles", fr: "Contrôles", zh: "控制" },
  settings_tab_general: { en: "General", ru: "Общие", pt: "Geral", fr: "Général", zh: "通用" },
  settings_tab_audio: { en: "Audio Engine", ru: "Аудио", pt: "Áudio", fr: "Moteur Audio", zh: "音频" },
  settings_tab_sync: { en: "GSI & Maintenance", ru: "Обсл.", pt: "Sincronia e Manutenção", fr: "GSI & Maintenance", zh: "同步与维护" },
  tray_volume_label: { en: "App Volume", ru: "Громкость", pt: "Volume do App", fr: "Volume de l'app", zh: "应用音量" },
  tray_show: { en: "Show App", ru: "Показать приложение", pt: "Mostrar App", fr: "Afficher l'app", zh: "显示应用" },
  tray_quit: { en: "Quit", ru: "Выйти", pt: "Sair", fr: "Quitter", zh: "退出" },
  tray_mute: { en: "Mute Sounds", ru: "Выключить звуки", pt: "Silenciar Sons", fr: "Couper le son", zh: "静音声音" },
  tray_unmute: { en: "Unmute Sounds", ru: "Включить звуки", pt: "Включить звуки", fr: "Activer le son", zh: "取消静音" },

  tray_status_connected: { en: "CS2 Connected", ru: "CS2 Подключен", pt: "CS2 Conectado", fr: "CS2 Connecté", zh: "CS2 已连接" },
  tray_status_disconnected: { en: "CS2 Not Connected", ru: "CS2 Не подключен", pt: "CS2 Não conectado", fr: "CS2 Déconnecté", zh: "CS2 未连接" },

  gsi_restart_msg: {
    en: "GSI CONFIG UPDATED. YOU MUST RESTART COUNTER-STRIKE FOR CHANGES TO TAKE EFFECT.",
    ru: "КОНФИГУРАЦИЯ GSI ОБНОВЛЕНА. ВАМ НЕОБХОДИМО ПЕРЕЗАГРУЗИТЬ COUNTER-STRIKE, ЧТОБЫ ИЗМЕНЕНИЯ ВСТУПИЛИ В СИЛУ.",
    pt: "CONFIGURAÇÃO GSI ATUALIZADA. VOCÊ DEVE REINICIAR O COUNTER-STRIKE PARA QUE AS ALTERAÇÕES TENHAM EFEITO.",
    fr: "CONFIG GSI MISE À JOUR. VOUS DEVEZ REDÉMARRER COUNTER-STRIKE POUR QUE LES CHANGEMENTS PRENNENT EFFET.",
    zh: "GSI 配置已更新。您必须重启 CS2 才能生效。"
  },
  settings_minimize_to_tray: {
    en: "Minimize to tray when closed",
    ru: "Сворачивать в трей при закрытии",
    pt: "Minimizar para a bandeja ao fechar",
    fr: "Réduire dans la zone de notification",
    zh: "关闭时最小化到系统托盘"
  },
  settings_minimize_to_tray_desc: {
    en: "Hide the window instead of quitting when you click X",
    ru: "Скрывать окно вместо выхода при нажатии X",
    pt: "Ocultar a janela em vez de sair ao clicar em X",
    fr: "Masquer la fenêtre au lieu de quitter",
    zh: "点击 X 时隐藏窗口而不是退出"
  },
  toast_tray_education: {
    en: "App is still running in the background. Right-click the tray icon to quit.",
    ru: "Приложение все еще работает в фоновом режиме. Щелкните правой кнопкой мыши по значку в трее, чтобы выйти.",
    pt: "O app continua rodando em segundo plano. Clique com o botão direito no ícone da bandeja para sair.",
    fr: "L'application fonctionne toujours en arrière-plan. Faites un clic droit sur l'icône pour quitter.",
    zh: "应用仍正在后台运行。右键单击托盘图标即可退出。"
  },
  modal_quit_title: {
    en: "Completely Close?",
    ru: "Полностью закрыть?",
    pt: "Fechar Completamente?",
    fr: "Fermer complètement ?",
    zh: "确定完全关闭？"
  },
  modal_reset_desc: {
    en: "This will permanently reset all sound mappings, custom weapon events, and system settings to factory defaults. This action cannot be undone.",
    ru: "Это приведет к окончательному сбросу всех звуковых карт, настроек оружия и системных параметров. Это действие нельзя отменить.",
    pt: "Isso redefinirá permanentemente todos os mapeamentos de som, eventos de armas e configurações do sistema. Esta ação não pode ser desfeita.",
    fr: "Cela réinitialisera définitivement tous les sons, les événements d'armes et les paramètres système. Cette action est irréversible.",
    zh: "这将永久重置所有声音映射、自定义武器事件和系统设置。此操作无法撤销。"
  },
  modal_quit_desc: {
    en: "This will stop all background tracking and audio reactions.",
    ru: "Это остановит фоновое отслеживание и аудиореакции.",
    pt: "Isso interromperá todo o rastreamento em segundo plano e as reações de áudio.",
    fr: "Cela arrêtera tout le suivi en arrière-plan et les réactions audio.",
    zh: "这将停止所有后台追踪和音频反应。"
  },
  modal_quit_confirm: {
    en: "Yes, Quit",
    ru: "Да, выйти",
    pt: "Sim, Sair",
    fr: "Oui, quitter",
    zh: "确定退出"
  },
  modal_quit_cancel: {
    en: "Wait, go back",
    ru: "Нет, вернуться",
    pt: "Cancelar",
    fr: "Annuler",
    zh: "等待，返回"
  },
  modal_quit_dont_ask: {
    en: "Don't ask me again",
    ru: "Больше не спрашивать",
    pt: "Não perguntar novamente",
    fr: "Ne plus me demander",
    zh: "不再询问"
  },
  settings_audio_boost: {
    en: "Volume Boost Mode",
    ru: "Режим усиления громкости",
    pt: "Modo de Ganho Extra",
    fr: "Amplification du volume",
    zh: "音量增强模式"
  },
  settings_audio_boost_desc: {
    en: "Boosts all sounds beyond standard levels for low-volume audio setups.",
    ru: "Усиливает все звуки выше стандартных уровней для тихих аудиосистем.",
    pt: "Aumenta todos os sons além dos níveis padrão para setups de baixo volume.",
    fr: "Amplifie tous les sons au-delà des niveaux standards pour les installations à faible volume.",
    zh: "为低音量音频设置增强所有声音，超越标准水平。"
  },
  settings_audio_boost_amount: {
    en: "Boost Intensity",
    ru: "Интенсивность усиления",
    pt: "Intensidade do Ganho",
    fr: "Intensité du Boost",
    zh: "增强强度"
  },
  modal_boost_title: {
    en: "High Volume Mode",
    ru: "Режим высокой громкости",
    pt: "Modo de Alto Volume",
    fr: "Mode Volume Élevé",
    zh: "高音量模式"
  },
  modal_boost_desc: {
    en: "This will boost your sounds beyond normal levels and may result in very loud output. This may be uncomfortable depending on your audio setup.\n\nProceed with caution... and maybe lower your headset volume.",
    ru: "Это усилит ваши звуки выше нормального уровня, что может привести к очень громкому звуку. Это может быть некомфортно в зависимости от вашей аудиосистемы.\n\nДействуйте с осторожностью... и, возможно, убавьте громкость наушников.",
    pt: "Isso aumentará seus sons além dos níveis normais e pode resultar em uma saída muito alta. Isso pode ser desconfortável dependendo da sua configuração de áudio.\n\nProssiga com cautela... e talvez diminua o volume do seu headset.",
    fr: "Cela augmentera vos sons au-delà des niveaux normaux et peut entraîner une sortie très forte. Cela peut être inconfortable selon votre configuration audio.\n\nProcédez avec prudence... et baissez peut-être le volume de votre casque.",
    zh: "这将使您的声音增强至正常水平以上，并可能导致音量非常大。这可能会因您的音频设置而感到不适。\n\n请谨慎操作……或许可以调低耳机音量。"
  },
  modal_boost_proceed: {
    en: "Enable anyway",
    ru: "Все равно включить",
    pt: "Ativar mesmo assim",
    fr: "Activer quand même",
    zh: "仍然开启"
  },
  modal_boost_cancel: {
    en: "Cancel", ru: "Отмена", pt: "Cancelar", fr: "Annuler", zh: "取消"
  },
  event_GRENADE_HE_KILL: {
    en: "HE Grenade Kill",
    ru: "Убийство HE гранатой",
    pt: "Kill de Granada HE",
    fr: "Élimination Grenade HE",
    zh: "HE 手雷击杀"
  },
  event_GRENADE_FIRE_KILL: {
    en: "Fire Kill (Molotov/Inc)",
    ru: "Убийство огнем",
    pt: "Kill de Fogo (Molotov/Inc)",
    fr: "Élimination par le Feu",
    zh: "火焰击杀"
  },
  stability_normal: { en: "Stable", ru: "Стабильно", pt: "Estável", fr: "Stable", zh: "稳定" },
  stability_community: { en: "COMMUNITY", ru: "COMMUNITY", pt: "COMMUNITY", fr: "COMMUNAUTÉ", zh: "社区" },
  stability_unstable: { en: "UNSTABLE", ru: "НЕСТАБИЛЬНО", pt: "INSTÁVEL", fr: "INSTABLE", zh: "不稳定" },
  stability_low_confidence: { en: "LOW CONFIDENCE", ru: "НИЗКАЯ ТОЧНОСТЬ", pt: "BAIXA CONFIANÇA", fr: "CONFIANCE FAIBLE", zh: "低置信度" },
  stability_tooltip_desc: { 
    en: "Some community servers use custom plugins that can make game events harder to track reliably.", 
    ru: "Некоторые серверы сообщества используют плагины, которые могут мешать надежному отслеживанию игровых событий.", 
    pt: "Alguns servidores comunitários usam plugins personalizados que podem tornar os eventos de jogo mais difíceis de rastrear com precisão.", 
    fr: "Certains serveurs utilisent des plugins qui peuvent limiter la fiabilité du suivi des événements.", 
    zh: "部分社区服务器使用自定义插件，这可能导致游戏事件追踪不准确。" 
  },
  stability_hint_title: { en: "Unstable environment detected", ru: "Обнаружена нестабильная среда", pt: "Ambiente instável detectado", fr: "Environnement instable détecté", zh: "检测到不稳定环境" },
  stability_hint_desc: { en: "Fast-respawn or custom server detected. Some events may be less consistent.", ru: "Обнаружен сервер с быстрым возрождением или кастомный сервер. Некоторые события могут быть менее точными.", pt: "Servidor de fast-respawn ou customizado detectado. Alguns eventos podem ser inconsistentes.", fr: "Serveur Fast-respawn ou customisé détecté. Certains événements peuvent être moins précis.", zh: "检测到快速复活或自定义服务器。部分事件可能无法准确追踪。" },
  remove_weapon_tooltip: { en: "Remove Weapon Event", ru: "Удалить событие оружия", pt: "Remover Evento de Arma", fr: "Supprimer l'événement d'arme", zh: "移除武器事件" },
  test_logic_tooltip: { en: "Test Logic (Random/Sequence)", ru: "Тестовая логика", pt: "Testar Лógica", fr: "Tester la logique", zh: "测试逻辑" },
  
  settings_auto_trim: { 
    en: "AUTO-TRIM SILENCE", ru: "АВТО-ОБРЕЗКА ТИШИНЫ", pt: "AUTO-TRIM DE SILÊNCIO", fr: "ROGNAGE AUTO. DU SILENCE", zh: "自动修剪静音" 
  },
  settings_auto_trim_desc: {
    en: "Eliminates empty gaps at the start/end of sounds for instant reaction timing.",
    ru: "Удаляет пустые промежутки в начале и конце для мгновенной реакции.",
    pt: "Elimina lacunas vazias no início/fim dos sons para disparos instantâneos.",
    fr: "Supprime les silences au début/fin pour une réactivité instantanée.",
    zh: "消除声音开头和结尾处的空隙，提升反应瞬时性。"
  },
  settings_auto_trim_threshold: {
    en: "DEFAULT", ru: "ПО УМОЛЧАНИЮ", pt: "PADRÃO", fr: "PAR DÉFAUT", zh: "默认"
  },
  settings_auto_trim_mode: {
    en: "TRIM MODE", ru: "РЕЖИМ ОБРЕЗКИ", pt: "MODO DE RECORTE", fr: "MODE DE ROGNAGE", zh: "裁剪模式"
  },
  trim_mode_both: {
    en: "Start & End",
    ru: "Начало и конец",
    pt: "Início e fim",
    fr: "Début & Fin",
    zh: "开头与结尾"
  },
  trim_mode_start: {
    en: "Start Only",
    ru: "Только начало",
    pt: "Apenas início",
    fr: "Début uniquement",
    zh: "仅开头"
  },
  trim_mode_end: {
    en: "End Only",
    ru: "Только конец",
    pt: "Apenas fim",
    fr: "Fin uniquement",
    zh: "仅结尾"
  },
  trim_mode_start_desc: {
    en: "Eliminates silence only at the beginning of the file.",
    ru: "Удаляет тишину только в начале файла.",
    pt: "Elimina o silêncio apenas no início do arquivo.",
    fr: "Supprime le silence uniquement au début du fichier.",
    zh: "仅消除文件开头的静音。"
  },
  trim_mode_end_desc: {
    en: "Eliminates silence only at the end of the file.",
    ru: "Удаляет тишину только в конце файла.",
    pt: "Elimina o silêncio apenas no final do arquivo.",
    fr: "Supprime le silence uniquement à la fin du fichier.",
    zh: "仅消除文件末尾的静音。"
  },
  trim_mode_both_desc: {
    en: "Aggressive bi-directional trimming for instant response.",
    ru: "Агрессивная двусторонняя обрезка для мгновенной реакции.",
    pt: "Recorte bidirecional agressivo para resposta instantânea.",
    fr: "Rognage bi-directionnel agressif pour une réaction instantanée.",
    zh: "激进的双向修剪，实现瞬时响应。"
  },
  auto_trim_zone_1: { en: "Conservative", ru: "Осторожно", pt: "Conservador", fr: "Conservateur", zh: "保守" },
  auto_trim_zone_2: { en: "Recommended", ru: "Рекомендуется", pt: "Recomendado", fr: "Recommandé", zh: "推荐" },
  auto_trim_zone_3: { en: "Default", ru: "По умолчанию", pt: "Padrão", fr: "Par défaut", zh: "默认" },
  auto_trim_zone_4: { en: "Sensitive", ru: "Чувствительно", pt: "Sensível", fr: "Sensible", zh: "灵敏" },
  auto_trim_zone_5: { en: "Aggressive", ru: "Агрессивно", pt: "Agressivo", fr: "Agressif", zh: "激进" },
  badge_trimmed: { 
    en: "Trimmed {ms}ms", ru: "Обрезано {ms}мс", pt: "Trim {ms}ms", fr: "Trim {ms}ms", zh: "已修剪 {ms}ms" 
  },
  pitch_intensity_label: {
    en: "Pitch Variation",
    ru: "Вариация высоты",
    pt: "Variação de Pitch",
    fr: "Intensité du Pitch",
    zh: "音调变化"
  },
};

export const useTranslation = () => {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('preferred_lang') as Language;
    const isValid = LANGUAGES.some(l => l.code === saved);
    return isValid ? saved : 'en';
  });

  useEffect(() => {
    const detectLang = async () => {
      if (localStorage.getItem('preferred_lang')) return;
      try {
        const osLang = await invoke<string>('get_os_language');
        const normalized = osLang.toLowerCase();
        const exactMatch = LANGUAGES.find(l => normalized === l.code);
        if (exactMatch) {
          setLang(exactMatch.code);
          return;
        }
        const prefixMatch = LANGUAGES.find(l => normalized.startsWith(l.code));
        if (prefixMatch) {
          setLang(prefixMatch.code);
        } else {
          setLang('en');
        }
      } catch {
        setLang('en');
      }
    };
    detectLang();

    const unlisten = listen<Language>('lang-sync', (event) => {
      setLang(event.payload);
    });

    return () => { unlisten.then(f => f()); };
  }, []);

  const changeLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('preferred_lang', newLang);
    emit('lang-sync', newLang);
  };

  const t = (key: string) => {
    return translations[key]?.[lang] || key;
  };

  return { t, lang, setLang: changeLang, languages: LANGUAGES };
};
