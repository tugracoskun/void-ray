/**
 * Void Ray - Oyun Kuralları ve Mantığı (Logic Layer)
 * * Bu dosya, oyunun mantıksal hesaplamalarını ve formüllerini içerir.
 * * Veriler (konumlar, oranlar vb.) MUTLAKA data.js (GAME_CONFIG) üzerinden alınır.
 */

const GameRules = {
    // Performans için önbellek (Runtime'da hesaplanır)
    _cachedTotalWeight: null,

    // ==========================================
    // 1. KONUM ERİŞİMİ
    // ==========================================
    
    get LOCATIONS() {
        return GAME_CONFIG.LOCATIONS;
    },

    // ==========================================
    // 2. HESAPLAMA METOTLARI (MATEMATİKSEL)
    // ==========================================

    /**
     * Bir geliştirmenin o anki seviyesine göre maliyetini hesaplar.
     * Formül: Base * (Çarpan ^ Seviye)
     */
    calculateUpgradeCost: function(baseCost, currentLevel) {
        return Math.floor(baseCost * Math.pow(GAME_CONFIG.ECONOMY.UPGRADE_COST_MULTIPLIER, currentLevel));
    },

    /**
     * Bir sonraki level için gereken toplam XP'yi hesaplar.
     */
    calculateNextLevelXp: function(currentMaxXp) {
        return Math.floor(currentMaxXp * GAME_CONFIG.ECONOMY.LEVEL_XP_MULTIPLIER);
    },

    /**
     * data.js içindeki LOOT_DISTRIBUTION ağırlıklarına göre rastgele kaynak sayısı hesaplar.
     * @returns {number} Üretilecek kaynak sayısı
     */
    calculateLootCount: function() {
        const distribution = GAME_CONFIG.LOOT_DISTRIBUTION;

        // 1. Toplam ağırlığı hesapla (Eğer daha önce hesaplanmadıysa)
        if (this._cachedTotalWeight === null) {
            this._cachedTotalWeight = distribution.reduce((sum, item) => sum + item.weight, 0);
        }
        
        // 2. Rastgele sayı seç
        let random = Math.random() * this._cachedTotalWeight;
        
        // 3. Hangi dilime denk geldiğini bul
        for (const item of distribution) {
            if (random < item.weight) {
                return item.count;
            }
            random -= item.weight;
        }
        
        return 1; // Teorik olarak buraya ulaşılmaz ama fonksiyon yapısı gereği kalabilir
    },

    // ==========================================
    // 3. OYNANIŞ MANTIĞI (GAMEPLAY LOGIC)
    // ==========================================

    /**
     * Gezegenin türüne göre rastgele XP hesaplar.
     * Varyans değerleri data.js -> ECONOMY'den alınır.
     */
    calculatePlanetXp: function(type) {
        if (!type || !type.xp) return 0;

        const min = GAME_CONFIG.ECONOMY.XP_VARIANCE_MIN;
        const max = GAME_CONFIG.ECONOMY.XP_VARIANCE_MAX;
        
        // Örn: 0.5 ile 1.5 arasında rastgele bir çarpan
        const variance = Math.random() * (max - min) + min;
        
        return Math.floor(type.xp * variance);
    },

    /**
     * Oyuncunun güncel taşıma kapasitesini hesaplar.
     * Geliştirmeler (Upgrades) hesaba katılır.
     */
    getPlayerCapacity: function() {
        const base = GAME_CONFIG.PLAYER.BASE_CAPACITY;
        const perLevel = GAME_CONFIG.PLAYER.CAPACITY_PER_LEVEL;
        
        // playerData game.js'de tanımlıdır
        const added = (typeof playerData !== 'undefined' && playerData.upgrades) 
            ? (playerData.upgrades.playerCapacity * perLevel) 
            : 0;
        return base + added;
    },

    /**
     * Yankı'nın güncel taşıma kapasitesini hesaplar.
     */
    getEchoCapacity: function() {
        const base = GAME_CONFIG.ECHO.BASE_CAPACITY;
        const perLevel = GAME_CONFIG.ECHO.CAPACITY_PER_LEVEL;

        const added = (typeof playerData !== 'undefined' && playerData.upgrades) 
            ? (playerData.upgrades.echoCapacity * perLevel) 
            : 0;
        return base + added;
    },

    // ==========================================
    // 4. DURUM KONTROLLERİ (STATE CHECKS) - YENİ
    // ==========================================

    /**
     * Envanterin dolu olup olmadığını kontrol eder.
     * @param {number} currentCount - Mevcut eşya sayısı
     * @returns {boolean} Doluysa true
     */
    isInventoryFull: function(currentCount) {
        return currentCount >= this.getPlayerCapacity();
    },

    /**
     * Bir varlığın (gemi veya yankı) güvenli bölge sınırları içinde olup olmadığını kontrol eder.
     * @param {Object} entity - Kontrol edilecek varlık {x, y}
     * @param {Object} nexus - Nexus varlığı {x, y}
     * @returns {boolean} Güvenli bölgedeyse true
     */
    isInSafeZone: function(entity, nexus) {
        if (!entity || !nexus) return false;
        const dx = entity.x - nexus.x;
        const dy = entity.y - nexus.y;
        // Basit öklid mesafesi karesiyle kontrol (karekök almaktan daha hızlı)
        const distSq = dx*dx + dy*dy;
        const safeR = GAME_CONFIG.WORLD_GEN.SAFE_ZONE_RADIUS;
        return distSq < safeR * safeR;
    },

    /**
     * Yankı'nın birleşme mesafesinde olup olmadığını kontrol eder.
     * @param {number} distance - Oyuncu ile Yankı arasındaki mesafe
     * @returns {boolean} Birleşebilir ise true
     */
    canEchoMerge: function(distance) {
        return distance < GAME_CONFIG.ECHO.INTERACTION_DIST;
    },

    /**
     * Kamera mesafesine göre sinyal parazit (noise) oranını hesaplar.
     * @param {number} dist - Oyuncu ile Yankı arası mesafe
     * @param {number} maxRange - Maksimum sinyal menzili
     * @returns {number} 0.0 (Temiz) ile 1.0 (Kopuk) arası değer
     */
    calculateSignalInterference: function(dist, maxRange) {
        const threshold = GAME_CONFIG.ECHO.SIGNAL_INTERFERENCE_START;
        const interferenceStart = maxRange * threshold;
        
        if (dist <= interferenceStart) return 0;
        if (dist >= maxRange) return 1.0;
        
        return (dist - interferenceStart) / (maxRange - interferenceStart);
    },

    /**
     * İki varlığın etkileşime girip giremeyeceğini kontrol eder.
     * (Nexus girişi, Depo açma vb. için kullanılır)
     * @param {Object} source - Etkileşimi başlatan (Genelde Player)
     * @param {Object} target - Hedef (Nexus, Storage vb.)
     * @param {number} buffer - Hedef yarıçapına eklenecek ek mesafe (tolerans)
     */
    canInteract: function(source, target, buffer = 0) {
        if (!source || !target) return false;
        // Utils global bir araçtır, burada kullanılabilir
        const dist = Math.hypot(source.x - target.x, source.y - target.y);
        const targetRadius = target.radius || 0;
        return dist <= targetRadius + buffer;
    },

    /**
     * Gezegenin oyuncu ve yankıya göre görünürlük seviyesini hesaplar.
     * (Eskiden maps.js içindeydi, burası daha mantıklı)
     * @param {Planet} p - Gezegen nesnesi
     * @param {VoidRay} player - Oyuncu nesnesi
     * @param {EchoRay | null} echo - Yankı nesnesi
     * @returns {number} 0: Görünmez, 1: Radar (Sinyal), 2: Tarama (Tam Görüş)
     */
    getPlanetVisibility: function(p, player, echo) {
        let visibility = 0;
        
        // Utils kullanılabilir veya Math.hypot ile doğrudan hesaplanabilir
        const dPlayer = Math.hypot(player.x - p.x, player.y - p.y);
        
        // Oyuncu Tarama Alanı (Tam Görüş)
        if (dPlayer < player.scanRadius) return 2; 
        // Oyuncu Radar Alanı (Sinyal)
        else if (dPlayer < player.radarRadius) visibility = 1; 

        if (echo) {
            const dEcho = Math.hypot(echo.x - p.x, echo.y - p.y);
            // Yankı Tarama Alanı (Tam Görüş)
            if (dEcho < echo.scanRadius) return 2; 
            // Yankı Radar Alanı (Sinyal)
            else if (dEcho < echo.radarRadius) {
                if (visibility < 1) visibility = 1; 
            }
        }
        return visibility;
    }
};

// ==========================================
// 5. GLOBAL ALIAS (UYUMLULUK KATMANI)
// ==========================================
// Mevcut oyun kod tabanı (game.js, ui.js vb.) bu fonksiyonları doğrudan çağırdığı için,
// GameRules metotlarını global scope'a bağlıyoruz.

window.calculatePlanetXp = GameRules.calculatePlanetXp.bind(GameRules);
window.getPlayerCapacity = GameRules.getPlayerCapacity.bind(GameRules);
window.getEchoCapacity   = GameRules.getEchoCapacity.bind(GameRules);
// Yeni eklenenler için alias gerekirse buraya eklenebilir, 
// ancak yeni kodlarda GameRules.methodName şeklinde kullanmak daha temizdir.