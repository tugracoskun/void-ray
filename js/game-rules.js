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
    }
};

// ==========================================
// 4. GLOBAL ALIAS (UYUMLULUK KATMANI)
// ==========================================
// Mevcut oyun kod tabanı (game.js, ui.js vb.) bu fonksiyonları doğrudan çağırdığı için,
// GameRules metotlarını global scope'a bağlıyoruz.

window.calculatePlanetXp = GameRules.calculatePlanetXp.bind(GameRules);
window.getPlayerCapacity = GameRules.getPlayerCapacity.bind(GameRules);
window.getEchoCapacity   = GameRules.getEchoCapacity.bind(GameRules);