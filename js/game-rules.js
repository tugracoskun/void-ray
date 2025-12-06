/**
 * Void Ray - Oyun Kuralları ve Mantığı
 * * Bu dosya, oyunun dengesini etkileyen olasılık hesaplamaları,
 * * kaynak dağılımları, harita konumları ve ekonomik formülleri içerir.
 */

const GameRules = {
    // ==========================================
    // 1. SABİT KONUMLAR VE KONFİGÜRASYON
    // ==========================================
    
    LOCATIONS: {
        NEXUS:          { x: 3000, y: 3000 },
        STORAGE_CENTER: { x: 2400, y: 2400 },
        REPAIR_STATION: { x: 3600, y: 3200 },
        PLAYER_START:   { x: 3000, y: 3800 },
        PLAYER_RESPAWN: { x: 3600, y: 3200 }
    },

    // Ekonomi Çarpanları
    UPGRADE_COST_MULTIPLIER: 1.5, // Her seviyede fiyat artış oranı
    LEVEL_XP_MULTIPLIER: 1.5,     // Her seviyede zorluk artış oranı

    // ==========================================
    // 2. GANİMET (LOOT) VERİLERİ
    // ==========================================

    // Kaynak Düşme Olasılıkları (Ağırlıklı Dağılım)
    LOOT_DISTRIBUTION: [
        { count: 0, weight: 20 }, // %20 ihtimalle BOŞ (Sadece XP)
        { count: 1, weight: 45 }, // %45 ihtimalle 1 kaynak
        { count: 2, weight: 25 }, // %25 ihtimalle 2 kaynak
        { count: 3, weight: 7 },  // %7 ihtimalle 3 kaynak
        { count: 4, weight: 3 }   // %3 ihtimalle 4 kaynak (Jackpot!)
    ],

    // Performans için önbellek (Runtime'da hesaplanır)
    _cachedTotalWeight: null,

    // ==========================================
    // 3. HESAPLAMA METOTLARI
    // ==========================================

    /**
     * Bir geliştirmenin o anki seviyesine göre maliyetini hesaplar.
     * Formül: Base * (Çarpan ^ Seviye)
     */
    calculateUpgradeCost: function(baseCost, currentLevel) {
        return Math.floor(baseCost * Math.pow(this.UPGRADE_COST_MULTIPLIER, currentLevel));
    },

    /**
     * Bir sonraki level için gereken toplam XP'yi hesaplar.
     */
    calculateNextLevelXp: function(currentMaxXp) {
        return Math.floor(currentMaxXp * this.LEVEL_XP_MULTIPLIER);
    },

    /**
     * Tanımlı ağırlıklara göre rastgele kaynak sayısı (loot) hesaplar.
     * * OPTİMİZE EDİLDİ: Toplam ağırlık sadece ilk çağrıda hesaplanır.
     * @returns {number} Üretilecek kaynak sayısı (0-4 arası)
     */
    calculateLootCount: function() {
        // 1. Toplam ağırlığı hesapla (Eğer daha önce hesaplanmadıysa)
        if (this._cachedTotalWeight === null) {
            this._cachedTotalWeight = this.LOOT_DISTRIBUTION.reduce((sum, item) => sum + item.weight, 0);
        }
        
        // 2. Rastgele sayı seç
        let random = Math.random() * this._cachedTotalWeight;
        
        // 3. Hangi dilime denk geldiğini bul
        for (const item of this.LOOT_DISTRIBUTION) {
            if (random < item.weight) {
                return item.count;
            }
            random -= item.weight;
        }
        
        return 1; // Fallback (Hata durumunda varsayılan)
    }
};

// ==========================================
// 4. GLOBAL YARDIMCI FONKSİYONLAR
// ==========================================
// Bu fonksiyonlar game.js ve ui.js gibi dosyalardan doğrudan çağrıldığı için
// global kapsamda (window) tutulmuştur.

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
 * Taban: 150, Seviye Başına: +25
 * * GÜVENLİK: playerData henüz yüklenmediyse varsayılan değer döner.
 */
function getPlayerCapacity() {
    const base = 150;
    const added = (typeof playerData !== 'undefined' && playerData.upgrades) 
        ? (playerData.upgrades.playerCapacity * 25) 
        : 0;
    return base + added;
}

/**
 * Yankı'nın güncel taşıma kapasitesini hesaplar.
 * Taban: 80, Seviye Başına: +10
 * * GÜVENLİK: playerData kontrolü eklendi.
 */
function getEchoCapacity() {
    const base = 80;
    const added = (typeof playerData !== 'undefined' && playerData.upgrades) 
        ? (playerData.upgrades.echoCapacity * 10) 
        : 0;
    return base + added;
}