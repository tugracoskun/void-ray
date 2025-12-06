/**
 * Void Ray - Oyun Kuralları ve Mantığı
 * * Bu dosya, oyunun mantıksal hesaplamalarını ve formüllerini içerir.
 * * Veriler (konumlar, oranlar vb.) data.js dosyasından alınır.
 * * GÜNCELLEME:
 * - Statik veriler (LOCATIONS, LOOT_DISTRIBUTION) buradan kaldırıldı.
 * - Artık GAME_CONFIG üzerinden verilere erişiyor.
 */

const GameRules = {
    // ==========================================
    // 1. KONUM ERİŞİMİ (DATA REFERANSI)
    // ==========================================
    
    // Artık data.js'den gelen referansı kullanıyoruz
    get LOCATIONS() {
        return GAME_CONFIG.LOCATIONS;
    },

    // ==========================================
    // 2. HESAPLAMA METOTLARI
    // ==========================================

    // Performans için önbellek (Runtime'da hesaplanır)
    _cachedTotalWeight: null,

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
        
        return 1; // Fallback (Hata durumunda varsayılan)
    }
};

// ==========================================
// 3. GLOBAL YARDIMCI FONKSİYONLAR
// ==========================================
// Bu fonksiyonlar logic (mantık) içerdiği için burada kalmaya devam ediyor,
// ancak parametrelerini data.js'den alıyorlar.

/**
 * Gezegenin türüne göre rastgele XP hesaplar.
 * Taban XP değerinin %50'si ile %150'si arasında değişir.
 */
function calculatePlanetXp(type) {
    if (!type || !type.xp) return 0;
    const variance = 0.5 + Math.random(); // 0.5 ile 1.5 arası çarpan
    return Math.floor(type.xp * variance);
}

/**
 * Oyuncunun güncel taşıma kapasitesini hesaplar.
 * GAME_CONFIG referansı kullanılır.
 */
function getPlayerCapacity() {
    const base = GAME_CONFIG.PLAYER.BASE_CAPACITY;
    const perLevel = GAME_CONFIG.PLAYER.CAPACITY_PER_LEVEL;
    
    const added = (typeof playerData !== 'undefined' && playerData.upgrades) 
        ? (playerData.upgrades.playerCapacity * perLevel) 
        : 0;
    return base + added;
}

/**
 * Yankı'nın güncel taşıma kapasitesini hesaplar.
 * GAME_CONFIG referansı kullanılır.
 */
function getEchoCapacity() {
    const base = GAME_CONFIG.ECHO.BASE_CAPACITY;
    const perLevel = GAME_CONFIG.ECHO.CAPACITY_PER_LEVEL;

    const added = (typeof playerData !== 'undefined' && playerData.upgrades) 
        ? (playerData.upgrades.echoCapacity * perLevel) 
        : 0;
    return base + added;
}