// --- OYUN AYARLARI VE SABİTLER ---
const WORLD_SIZE = 120000; 

// OYUN KONFİGÜRASYONU (SAYILAR BURADAN YÖNETİLİR)
const GAME_CONFIG = {
    WORLD_GEN: {
        PLANET_COUNT: 1200,      // Toplam gezegen sayısı
        STAR_COUNT: 5000,        // Arka plan yıldız sayısı
        SAFE_ZONE_RADIUS: 2000   // Başlangıçta gezegen oluşmayacak güvenli alan yarıçapı
    },
    PLAYER: {
        BASE_XP: 150,            // Level atlamak için gereken taban XP
        BASE_HEALTH: 100,        // Başlangıç canı
        BASE_ENERGY: 100,        // Başlangıç enerjisi
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
    }
};

const RARITY = {
    COMMON:    { id: 'common',    name: 'Madde',   color: '#94a3b8', prob: 0.5, xp: 10, value: 10 },
    RARE:      { id: 'rare',      name: 'Kristal',   color: '#38bdf8', prob: 0.2, xp: 40, value: 30 },
    EPIC:      { id: 'epic',      name: 'Öz',        color: '#c084fc', prob: 0.1, xp: 100, value: 100 },
    LEGENDARY: { id: 'legendary', name: 'Yadigâr',   color: '#fbbf24', prob: 0.04, xp: 500, value: 400 },
    TOXIC:     { id: 'toxic',     name: 'Veri Sisi', color: '#10b981', prob: 0.01, xp: 0, value: 0 }, // İsim ve renk güncellendi
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
    playerCapacity: { name: "Kargo Genişletme", desc: "Envanter kapasitesini artırır (+10).", baseCost: 300, max: 5 },
    
    echoSpeed:   { name: "Yankı Hızı", desc: "Yankı'nın uçuş hızı.", baseCost: 150, max: 5 },
    echoRange:   { name: "Sensör Ağı", desc: "Yankı'nın toplama çapı.", baseCost: 250, max: 5 },
    echoDurability: { name: "Yankı Bataryası", desc: "Enerji tüketim verimliliği.", baseCost: 200, max: 5 },
    echoCapacity: { name: "Yankı Deposu", desc: "Yankı'nın taşıma kapasitesi (+5).", baseCost: 250, max: 5 }
};

const TIPS = [
    "Enerjinizi yenilemek için Tardigradlar çok değerlidir.",
    "Yankı, Nexus istasyonunda enerjisini yenileyebilir.",
    "Mor sinyaller değerli kayıp kargoları işaret eder.",
    "Veri Sislerinden (Yeşil Bulutlar) uzak durun, gemiye zarar verir.",
    "Space tuşu ile kısa süreli hızlanabilirsiniz (Enerji harcar).",
    "Envanteriniz dolarsa Nexus'ta satış yapın veya kapasiteyi artırın."
];

// --- HARİTA VE GÖRÜNÜM AYARLARI ---
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