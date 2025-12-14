/**
 * Void Ray - Veri ve Konfigürasyon (Data Source)
 * GÜNCELLEME: Işık Atlaması seyahat hızı düşürüldü (Daha görünür olması için).
 */

const WORLD_SIZE = 120000; 

// Oyun dengesini sağlayan temel sayılar
const GAME_CONFIG = {
    LOCATIONS: {
        NEXUS:          { x: 3000, y: 3000 },
        STORAGE_CENTER: { x: 2400, y: 2400 },
        REPAIR_STATION: { x: 3600, y: 3200 },
        PLAYER_START:   { x: 3000, y: 3800 },
        PLAYER_RESPAWN: { x: 3600, y: 3200 }
    },
    
    WORLD_GEN: {
        PLANET_COUNT: 1200,
        STAR_COUNT: 5000,
        SAFE_ZONE_RADIUS: 2000,
        WORMHOLE_COUNT: 25
    },
    
    WORMHOLE: {
        RADIUS: 150,
        COLOR_CORE: "#8b5cf6",
        COLOR_OUTER: "#c4b5fd",
        TELEPORT_SAFE_DISTANCE: 5000,
        SPIN_SPEED: 0.05,
        GRAVITY_RADIUS: 3500,
        GRAVITY_FORCE: 180
    },

    CAMERA: {
        INITIAL_ZOOM: 0.2,
        DEFAULT_ZOOM: 1.0,
        LERP_SPEED: 0.05,
        ADAPTIVE_FACTOR: 30,
        MAX_OFFSET: 400
    },
    
    PLAYER: {
        BASE_XP: 150,
        BASE_HEALTH: 100,
        BASE_ENERGY: 100,
        BASE_CAPACITY: 150,
        CAPACITY_PER_LEVEL: 25,
        SCAN_RADIUS: 4000,
        RADAR_RADIUS: 10000,
        BASE_TAIL_COUNT: 20,
        BOOST_TAIL_COUNT: 50,
        // YENİ: Işık Atlaması Ayarları
        LIGHT_JUMP_EFFICIENCY: 750, // Birim/Enerji
        LIGHT_JUMP_CHARGE_TIME: 180, // 3 Saniye
        LIGHT_JUMP_CHARGE_DRAIN: 0.25, // Şarj sızıntısı
        LIGHT_JUMP_SPEED: 250, // GÜNCELLENDİ: 2000 -> 250 (Daha sinematik bir hız)
        ENERGY_COST: {
            BOOST: 0.05,
            MOVE: 0.002,
            REGEN: 0.01
        }
    },
    
    ECHO: {
        BASE_ENERGY: 100,
        BASE_CAPACITY: 80,
        CAPACITY_PER_LEVEL: 10,
        SCAN_RADIUS: 4000,
        RADAR_RADIUS: 10000,
        DRAIN_RATE: 0.005,
        OUT_OF_BOUNDS_DRAIN: 0.5,
        INTERACTION_DIST: 350,
        SIGNAL_INTERFERENCE_START: 0.6
    },
    
    PLANETS: {
        RADIUS: {
            LEGENDARY: 120,
            TOXIC: 500,
            LOST: 80,
            TARDIGRADE: 50,
            BASE: 40,
            VARIANCE: 60
        }
    },
    
    ECONOMY: {
        UPGRADE_COST_MULTIPLIER: 1.5,
        LEVEL_XP_MULTIPLIER: 1.5,
        XP_VARIANCE_MIN: 0.5,
        XP_VARIANCE_MAX: 1.5
    },
    
    LOOT_DISTRIBUTION: [
        { count: 0, weight: 20 },
        { count: 1, weight: 45 },
        { count: 2, weight: 25 },
        { count: 3, weight: 7 },
        { count: 4, weight: 3 }
    ]
};

const INTRO_SEQUENCE = [
    { time: 0, text: "Sistem başlatılıyor...", type: "system" },
    { time: 1000, text: "Optik sensörler kalibre ediliyor...", type: "info" },
    { time: 3500, text: "Hoş geldin, Pilot. Motorlar aktif.", type: "loot" }
];

const MESSAGES = {
    ECHO: {
        SPAWN: "YANKI DOĞDU",
        DETACH: "YANKI AYRILDI",
        MERGE: "SİSTEMLER BİRLEŞTİ",
        MERGE_DESC: "Yankı deposuna erişilebilir.",
        COMING: "YANKI BİRLEŞMEK İÇİN GELİYOR...",
        LOST_SIGNAL: "SİNYAL KAYBI",
        LOST_SIGNAL_DESC: "Kamera Vatoz'a döndü.",
        RANGE_WARNING: "SİNYAL KAYBI: MENZİL DIŞI"
    },
    UI: {
        INVENTORY_FULL: "ENVANTER DOLU! NEXUS VEYA DEPOYA GİDİN.",
        ROUTE_CREATED: "ROTA OLUŞTURULDU",
        CAMERA_RESET: "KAMERA SIFIRLANDI",
        CAMERA_RESET_DESC: "Gemiye dönüldü.",
        SAFE_ZONE_ENTER: "GÜVENLİ BÖLGEYE VARILDI",
        SAFE_ZONE_ENTER_DESC: "Nexus Koruma Alanı",
        SAFE_ZONE_EXIT: "GÜVENLİ BÖLGEDEN AYRILDINIZ",
        SAFE_ZONE_EXIT_DESC: "Dikkatli Olun",
        WORMHOLE_ENTER: "SOLUCAN DELİĞİ TESPİT EDİLDİ",
        WORMHOLE_DESC: "Uzay-Zaman Atlaması Başlatılıyor...",
        // Işık Atlaması Mesajları
        JUMP_FAIL_ENERGY: "ENERJİ KRİTİK SEVİYEDE",
        JUMP_FAIL_UNPREDICTABLE: "ATLAMA ÖNGÖRÜLEMİYOR",
        JUMP_CANCELLED: "ATLAMA İPTAL EDİLDİ",
        // Aşamalar
        JUMP_PHASE_1: "ROTA HESAPLANIYOR...",
        JUMP_PHASE_2: "KOORDİNATLARA KİLİTLENİYOR...",
        JUMP_PHASE_3: "HİPER MOTORLAR ATEŞLENİYOR!"
    }
};

const INITIAL_PLAYER_DATA = {
    stardust: 0, 
    upgrades: { 
        playerSpeed: 0, playerTurn: 0, playerMagnet: 0, playerCapacity: 0,
        echoSpeed: 0, echoRange: 0, echoDurability: 0, echoCapacity: 0
    },
    equipment: {
        shield: null, engine: null, weaponL: null, weaponR: null, sensor: null, hull: null
    },
    stats: { 
        maxSpeed: 0, echoMaxSpeed: 0, totalResources: 0, distance: 0, 
        totalStardust: 0, totalSpentStardust: 0, totalEnergySpent: 0,
        timeIdle: 0, timeMoving: 0, timeAI: 0
    }
};

const RARITY = {
    COMMON:    { id: 'common',    name: 'Madde',         color: '#94a3b8', prob: 0.5, xp: 10, value: 10 },
    RARE:      { id: 'rare',      name: 'Kristal',       color: '#38bdf8', prob: 0.2, xp: 40, value: 30 },
    EPIC:      { id: 'epic',      name: 'Öz',            color: '#c084fc', prob: 0.1, xp: 100, value: 100 },
    LEGENDARY: { id: 'legendary', name: 'Yadigâr',       color: '#fbbf24', prob: 0.04, xp: 500, value: 400 },
    TOXIC:     { id: 'toxic',     name: 'Veri Sisi',     color: '#10b981', prob: 0.01, xp: 0, value: 0 },
    TARDIGRADE:{ id: 'tardigrade',name: 'Tardigrad Yuvası', color: '#C7C0AE', prob: 0.02, xp: 20, value: 0 }, 
    LOST:      { id: 'lost',      name: 'Kayıp Kargo',   color: '#a855f7', prob: 0, xp: 0, value: 0 }
};

const LOOT_DB = {
    common: ["Hidrojen", "Karbon Tozu", "Demir", "Silika"],
    rare: ["Buz Çekirdeği", "Safir", "İyonize Gaz"],
    epic: ["Nebula Özü", "Yıldız Parçası", "Plazma"],
    legendary: ["Zaman Kristali", "Kara Delik Kalıntısı"],
    toxic: ["Statik Gürültü", "Bozuk Sektör"], 
    tardigrade: ["Tardigrad"],
    lost: ["KAYIP SİNYAL"]
};

// --- RPG EŞYA SİSTEMİ (TEKNİK SEMBOLLER) ---
const ITEM_TYPES = {
    WEAPON: { id: 'weapon', label: 'Lazer Modülü', icon: '⌖' }, // Crosshair (Nişangah)
    ENGINE: { id: 'engine', label: 'İyon Motoru', icon: '▲' }, // Üçgen (İtici)
    SHIELD: { id: 'shield', label: 'Enerji Kalkanı', icon: '◊' }, // Eşkenar Dörtgen (Kalkan Alanı)
    SENSOR: { id: 'sensor', label: 'Radar Ünitesi', icon: '◎' }, // İç İçe Daire (Radar)
    HULL:   { id: 'hull',   label: 'Nano Kaplama',  icon: '⬢' }  // Altıgen (Gövde Yapısı)
};

const RPG_ITEMS = {
    weapon: ["Foton Işını", "Plazma Topu", "Kuantum Lazeri", "Anti-Madde Projektörü", "Void Kesicisi"],
    engine: ["Warp Sürücüsü", "İyon İticisi", "Füzyon Reaktörü", "Karanlık Madde Motoru", "Hiper Sürücü"],
    shield: ["Manyetik Kalkan", "Plazma Bariyeri", "Saptırıcı Kalkan", "Ayna Alan Üreteci"],
    sensor: ["Derin Uzay Radarı", "Spektral Tarayıcı", "Biyo-Sensör", "Uzun Menzil Dizisi"],
    hull:   ["Titanyum Zırh", "Karbon Fiber Gövde", "Reaktif Zırh", "Kristal Kaplama"]
};

// Efsunlar (Bonuslar)
const BONUS_TYPES = [
    // Hız ve Hareket
    { id: 'thrust', name: 'İtici Güç', unit: '%', min: 2, max: 20, weight: 25 },
    { id: 'maneuver', name: 'Manevra Kabiliyeti', unit: '%', min: 5, max: 30, weight: 20 },
    
    // Enerji ve Verimlilik
    { id: 'energy_max', name: 'Max Enerji', unit: '', min: 20, max: 200, weight: 25 },
    { id: 'energy_regen', name: 'Enerji Yenilenmesi', unit: '%', min: 5, max: 25, weight: 20 },
    { id: 'fuel_save', name: 'Yakıt Tasarrufu', unit: '%', min: 5, max: 30, weight: 15 },
    
    // Keşif ve Radar
    { id: 'radar_range', name: 'Radar Menzili', unit: 'km', min: 1, max: 10, weight: 20 },
    { id: 'scan_speed', name: 'Tarama Hızı', unit: '%', min: 5, max: 40, weight: 15 },
    
    // Ganimet ve Ekonomi
    { id: 'magnet', name: 'Çekim Alanı', unit: '%', min: 5, max: 50, weight: 25 },
    { id: 'xp_gain', name: 'Veri Analizi (XP)', unit: '%', min: 5, max: 30, weight: 20 },
    { id: 'cargo', name: 'Kargo Kapasitesi', unit: '', min: 10, max: 100, weight: 20 },
    
    // Dayanıklılık ve Direnç
    { id: 'hull_hp', name: 'Gövde Bütünlüğü', unit: '', min: 50, max: 500, weight: 30 },
    { id: 'shield_cap', name: 'Kalkan Kapasitesi', unit: '', min: 20, max: 200, weight: 20 },
    { id: 'gravity_res', name: 'Çekim Direnci', unit: '%', min: 5, max: 25, weight: 15 },
    { id: 'rad_res', name: 'Radyasyon Koruması', unit: '%', min: 5, max: 30, weight: 15 }
];

const UPGRADES = {
    playerSpeed: { name: "İyon Motorları", desc: "Maksimum uçuş hızı.", baseCost: 100, max: 5 },
    playerTurn:  { name: "Manevra İticileri", desc: "Dönüş kabiliyeti.", baseCost: 150, max: 5 },
    playerMagnet:{ name: "Çekim Alanı", desc: "Eşya toplama mesafesi.", baseCost: 200, max: 5 },
    playerCapacity: { name: "Kargo Genişletme", desc: "Envanter kapasitesini artırır.", baseCost: 300, max: 5 },
    
    echoSpeed:   { name: "Yankı Hızı", desc: "Yankı'nın uçuş hızı.", baseCost: 150, max: 5 },
    echoRange:   { name: "Sensör Ağı", desc: "Yankı'nın toplama çapı.", baseCost: 250, max: 5 },
    echoDurability: { name: "Yankı Bataryası", desc: "Enerji tüketim verimliliği.", baseCost: 200, max: 5 },
    echoCapacity: { name: "Yankı Deposu", desc: "Yankı'nın taşıma kapasitesini artırır.", baseCost: 250, max: 5 }
};

const TIPS = [
    "Enerjinizi yenilemek için Tardigradlar çok değerlidir.",
    "Solucan delikleri (Mor Girdaplar) sizi haritanın rastgele bir yerine fırlatır.",
    "Nadir gezegenlerden Efsunlu Eşyalar düşebilir!",
    "Efsunlu motorlar İtici Güç bonusu ile geminizi hızlandırır.",
    "Space tuşu ile kısa süreli hızlanabilirsiniz (Enerji harcar).",
    "Envanteriniz dolarsa Nexus'ta satış yapın veya kapasiteyi artırın.",
    "[J] tuşu ile Işık Atlamasını başlatabilir, tekrar basarak iptal edebilirsiniz."
];

const MAP_CONFIG = {
    grid: { major: 20000, minor: 5000, rings: [5000, 10000] },
    minimap: { size: 180, bg: "rgba(0, 0, 0, 0.8)", border: "rgba(255,255,255,0.1)", scanColor: "rgba(16, 185, 129, 0.4)", radius: 90 },
    bigmap: { bgOverlay: "rgba(0,0,0,0.4)", gridColor: "rgba(255,255,255,0.1)", margin: 50 },
    colors: {
        player: "#38bdf8", nexus: "#ffffff", repair: "#10b981", storage: "#a855f7",
        echo: "#67e8f9", wormhole: "#8b5cf6", target: "#ef4444",
        scanArea: "rgba(16, 185, 129, 0.05)", radarArea: "rgba(251, 191, 36, 0.03)", radarStroke: "rgba(251, 191, 36, 0.6)"
    },
    zoom: { min: 0.5, max: 1.5, speed: 0.001 }
};

const DEFAULT_GAME_SETTINGS = {
    showNexusArrow: true, showRepairArrow: false, showStorageArrow: false, showEchoArrow: true, 
    hudOpacity: 1.0, windowOpacity: 1.0, hudHoverEffect: false, showShipBars: false,
    cameraOffsetX: 0, cameraOffsetY: 0, adaptiveCamera: false, smoothCameraTransitions: true,
    developerMode: false, enableConsole: false, showGravityFields: false, showHitboxes: false,
    showVectors: false, showTargetVectors: false, showFps: false, godMode: false, hidePlayer: false,
    enableCRT: false, crtIntensity: 50, showStars: true, starBrightness: 100, showGrid: false,
    themeColor: '#94d8c3', themeHue: 162, themeSat: 47
};