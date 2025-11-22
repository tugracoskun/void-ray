// --- OYUN AYARLARI VE SABİTLER ---
const WORLD_SIZE = 120000; 

const RARITY = {
    COMMON:    { id: 'common',    name: 'Madde',   color: '#94a3b8', prob: 0.5, xp: 10, value: 10 },
    RARE:      { id: 'rare',      name: 'Kristal',   color: '#38bdf8', prob: 0.2, xp: 40, value: 30 },
    EPIC:      { id: 'epic',      name: 'Öz',        color: '#c084fc', prob: 0.1, xp: 100, value: 100 },
    LEGENDARY: { id: 'legendary', name: 'Yadigâr',   color: '#fbbf24', prob: 0.04, xp: 500, value: 400 },
    TOXIC:     { id: 'toxic',     name: 'Zehir',     color: '#84cc16', prob: 0.01, xp: 0, value: 0 },
    TARDIGRADE:{ id: 'tardigrade',name: 'Tardigrad Yuvası', color: '#C7C0AE', prob: 0.02, xp: 20, value: 0 }, 
    LOST:      { id: 'lost',      name: 'Kayıp Kargo', color: '#a855f7', prob: 0, xp: 0, value: 0 }
};

const LOOT_DB = {
    common: ["Hidrojen", "Karbon Tozu", "Demir", "Silika"],
    rare: ["Buz Çekirdeği", "Safir", "İyonize Gaz"],
    epic: ["Nebula Özü", "Yıldız Parçası", "Plazma"],
    legendary: ["Zaman Kristali", "Kara Delik Kalıntısı"],
    toxic: ["Zehirli Gaz", "Asit Bulutu"],
    tardigrade: ["Tardigrad"],
    lost: ["KAYIP SİNYAL"]
};

const UPGRADES = {
    playerSpeed: { name: "İyon Motorları", desc: "Maksimum uçuş hızı.", baseCost: 100, max: 5 },
    playerTurn:  { name: "Manevra İticileri", desc: "Dönüş kabiliyeti.", baseCost: 150, max: 5 },
    playerMagnet:{ name: "Çekim Alanı", desc: "Eşya toplama mesafesi.", baseCost: 200, max: 5 },
    echoSpeed:   { name: "Yankı Hızı", desc: "Yankı'nın uçuş hızı.", baseCost: 150, max: 5 },
    echoRange:   { name: "Sensör Ağı", desc: "Yankı'nın toplama çapı.", baseCost: 250, max: 5 },
    echoDurability: { name: "Yankı Bataryası", desc: "Enerji tüketim verimliliği.", baseCost: 200, max: 5 }
};

const TIPS = [
    "Enerjinizi yenilemek için Tardigradlar çok değerlidir.",
    "Yankı, Nexus istasyonunda enerjisini yenileyebilir.",
    "Mor sinyaller değerli kayıp kargoları işaret eder.",
    "Zehirli bölgelerden (Yeşil) uzak durun, enerji tüketir.",
    "Space tuşu ile kısa süreli hızlanabilirsiniz (Enerji harcar)."
];