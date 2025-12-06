/**
 * Void Ray - Veri ve Konfigürasyon
 * Bu dosya oyunun tüm sabitlerini, ayarlarını ve içerik veritabanını içerir.
 * * DEĞİŞİKLİK RAPORU:
 * - LOCATIONS (Konumlar) buraya taşındı.
 * - LOOT_DISTRIBUTION (Ganimet oranları) buraya taşındı.
 * - Multipliers (Çarpanlar) buraya taşındı.
 */

// ==========================================
// 1. ÇEKİRDEK DÜNYA VE FİZİK AYARLARI
// ==========================================

const WORLD_SIZE = 120000; 

// Oyun dengesini sağlayan temel sayılar
const GAME_CONFIG = {
    // Sabit Konumlar (Harita Tasarımı)
    LOCATIONS: {
        NEXUS:          { x: 3000, y: 3000 },
        STORAGE_CENTER: { x: 2400, y: 2400 },
        REPAIR_STATION: { x: 3600, y: 3200 },
        PLAYER_START:   { x: 3000, y: 3800 },
        PLAYER_RESPAWN: { x: 3600, y: 3200 }
    },
    
    WORLD_GEN: {
        PLANET_COUNT: 1200,      // Toplam gezegen sayısı
        STAR_COUNT: 5000,        // Arka plan yıldız sayısı
        SAFE_ZONE_RADIUS: 2000   // Başlangıçta gezegen oluşmayacak güvenli alan yarıçapı
    },
    PLAYER: {
        BASE_XP: 150,            // Level atlamak için gereken taban XP
        BASE_HEALTH: 100,        // Başlangıç canı
        BASE_ENERGY: 100,        // Başlangıç enerjisi
        BASE_CAPACITY: 150,      // Başlangıç envanter kapasitesi
        CAPACITY_PER_LEVEL: 25,  // Yükseltme başına artan kapasite
        SCAN_RADIUS: 4000,       // Tarama (Görünürlük) menzili
        RADAR_RADIUS: 10000,     // Radar (Sinyal) menzili
        BASE_TAIL_COUNT: 20,     // Normal kuyruk uzunluğu
        BOOST_TAIL_COUNT: 50,    // Hızlanınca kuyruk uzunluğu
        ENERGY_COST: {
            BOOST: 0.05,         // Space tuşu tüketimi
            MOVE: 0.002,         // Hareket tüketimi
            REGEN: 0.01          // Enerji dolum hızı
        }
    },
    ECHO: {
        BASE_ENERGY: 100,
        BASE_CAPACITY: 80,       // Yankı başlangıç kapasitesi
        CAPACITY_PER_LEVEL: 10,  // Yankı yükseltme başına artan kapasite
        SCAN_RADIUS: 4000,
        RADAR_RADIUS: 10000,
        DRAIN_RATE: 0.005,       // Normal enerji tüketimi
        OUT_OF_BOUNDS_DRAIN: 0.5 // Radyasyon alanı tüketimi
    },
    PLANETS: {
        RADIUS: {
            LEGENDARY: 120,
            TOXIC: 500,
            LOST: 80,
            TARDIGRADE: 50,
            BASE: 40,            // Standart gezegen taban yarıçapı
            VARIANCE: 60         // Rastgele eklenebilecek ek yarıçap
        }
    },
    // Ekonomi ve İlerleme Çarpanları
    ECONOMY: {
        UPGRADE_COST_MULTIPLIER: 1.5, // Her seviyede fiyat artış oranı
        LEVEL_XP_MULTIPLIER: 1.5      // Her seviyede zorluk artış oranı
    },
    // Kaynak Düşme Olasılıkları (Ağırlıklı Dağılım)
    // count: Düşecek eşya sayısı, weight: Olasılık ağırlığı
    LOOT_DISTRIBUTION: [
        { count: 0, weight: 20 }, // %20 ihtimalle BOŞ (Sadece XP)
        { count: 1, weight: 45 }, // %45 ihtimalle 1 kaynak
        { count: 2, weight: 25 }, // %25 ihtimalle 2 kaynak
        { count: 3, weight: 7 },  // %7 ihtimalle 3 kaynak
        { count: 4, weight: 3 }   // %3 ihtimalle 4 kaynak (Jackpot!)
    ]
};

// ==========================================
// 2. İÇERİK, EKONOMİ VE GANİMET SİSTEMİ
// ==========================================

const RARITY = {
    COMMON:    { id: 'common',    name: 'Madde',   color: '#94a3b8', prob: 0.5, xp: 10, value: 10 },
    RARE:      { id: 'rare',      name: 'Kristal',   color: '#38bdf8', prob: 0.2, xp: 40, value: 30 },
    EPIC:      { id: 'epic',      name: 'Öz',        color: '#c084fc', prob: 0.1, xp: 100, value: 100 },
    LEGENDARY: { id: 'legendary', name: 'Yadigâr',   color: '#fbbf24', prob: 0.04, xp: 500, value: 400 },
    TOXIC:     { id: 'toxic',     name: 'Veri Sisi', color: '#10b981', prob: 0.01, xp: 0, value: 0 },
    TARDIGRADE:{ id: 'tardigrade',name: 'Tardigrad Yuvası', color: '#C7C0AE', prob: 0.02, xp: 20, value: 0 }, 
    LOST:      { id: 'lost',      name: 'Kayıp Kargo', color: '#a855f7', prob: 0, xp: 0, value: 0 }
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

// ==========================================
// 3. UI METİNLERİ VE YARDIMCI BİLGİLER
// ==========================================

const TIPS = [
    "Enerjinizi yenilemek için Tardigradlar çok değerlidir.",
    "Yankı, Nexus istasyonunda enerjisini yenileyebilir.",
    "Mor sinyaller değerli kayıp kargoları işaret eder.",
    "Veri Sislerinden (Yeşil Bulutlar) uzak durun, gemiye zarar verir.",
    "Space tuşu ile kısa süreli hızlanabilirsiniz (Enerji harcar).",
    "Envanteriniz dolarsa Nexus'ta satış yapın veya kapasiteyi artırın."
];

// ==========================================
// 4. GÖRSELLEŞTİRME VE KULLANICI AYARLARI
// ==========================================

// Harita ve Minimap Renk/Grid Ayarları
const MAP_CONFIG = {
    grid: {
        major: 20000,    // Ana grid çizgileri
        minor: 5000,     // Ara grid çizgileri
        rings: [5000, 10000] // Oyuncu etrafındaki mesafe halkaları
    },
    minimap: {
        size: 180,           // Piksel cinsinden boyut
        bg: "rgba(0, 0, 0, 0.8)",
        border: "rgba(255,255,255,0.1)",
        scanColor: "rgba(16, 185, 129, 0.4)", // Yeşilimsi
        radius: 90           // size / 2
    },
    bigmap: {
        bgOverlay: "rgba(0,0,0,0.4)",
        gridColor: "rgba(255,255,255,0.1)",
        margin: 50
    },
    colors: {
        player: "#38bdf8",     // Açık Mavi
        nexus: "#ffffff",      // Beyaz
        repair: "#10b981",     // Yeşil
        storage: "#a855f7",    // Mor
        echo: "#67e8f9",       // Turkuaz
        target: "#ef4444",     // Kırmızı
        scanArea: "rgba(16, 185, 129, 0.05)",
        radarArea: "rgba(251, 191, 36, 0.03)",
        radarStroke: "rgba(251, 191, 36, 0.6)"
    },
    zoom: {
        min: 0.5,
        max: 1.5,
        speed: 0.001
    }
};

// Varsayılan Oyun Ayarları (Başlangıç Değerleri)
const DEFAULT_GAME_SETTINGS = {
    showNexusArrow: true,
    showRepairArrow: false,
    showStorageArrow: false,
    showEchoArrow: true, 
    hudOpacity: 1.0,
    hudHoverEffect: false,
    showShipBars: false,
    cameraOffsetX: 0, 
    cameraOffsetY: 0,
    adaptiveCamera: false,
    smoothCameraTransitions: true,
    developerMode: false,
    showGravityFields: false,
    showHitboxes: false,
    showVectors: false,
    showTargetVectors: false,
    showFps: false,
    godMode: false,
    hidePlayer: false
};