/**
 * Void Ray - Oyun Kuralları ve Mantığı
 * * Bu dosya, oyunun dengesini etkileyen olasılık hesaplamaları,
 * * kaynak dağılımları, harita konumları ve ekonomik formülleri içerir.
 */

const GameRules = {
    // --- HARİTA YAPILANDIRMASI ---
    LOCATIONS: {
        NEXUS:          { x: 3000, y: 3000 },
        STORAGE_CENTER: { x: 2400, y: 2400 },
        REPAIR_STATION: { x: 3600, y: 3200 },
        PLAYER_START:   { x: 3000, y: 3800 },
        PLAYER_RESPAWN: { x: 3600, y: 3200 }
    },

    // --- EKONOMİ VE GELİŞİM ---
    // Geliştirme maliyet çarpanı (Her seviyede fiyat 1.5 katına çıkar)
    UPGRADE_COST_MULTIPLIER: 1.5,
    
    // Level atlamak için gereken XP çarpanı (Her levelde zorluk 1.5 kat artar)
    LEVEL_XP_MULTIPLIER: 1.5,

    /**
     * Bir geliştirmenin o anki seviyesine göre maliyetini hesaplar.
     * @param {number} baseCost - Başlangıç maliyeti
     * @param {number} currentLevel - Mevcut seviye
     */
    calculateUpgradeCost: function(baseCost, currentLevel) {
        return Math.floor(baseCost * Math.pow(this.UPGRADE_COST_MULTIPLIER, currentLevel));
    },

    /**
     * Bir sonraki level için gereken toplam XP'yi hesaplar.
     * @param {number} currentMaxXp - Şu anki seviye için gereken XP
     */
    calculateNextLevelXp: function(currentMaxXp) {
        return Math.floor(currentMaxXp * this.LEVEL_XP_MULTIPLIER);
    },

    // --- GANİMET SİSTEMİ ---
    // Kaynak Düşme Olasılıkları (Ağırlıklı Dağılım)
    // Toplam: 100 birim üzerinden hesaplanmıştır.
    LOOT_DISTRIBUTION: [
        { count: 0, weight: 20 }, // %20 ihtimalle BOŞ (Sadece XP)
        { count: 1, weight: 45 }, // %45 ihtimalle 1 kaynak
        { count: 2, weight: 25 }, // %25 ihtimalle 2 kaynak
        { count: 3, weight: 7 },  // %7 ihtimalle 3 kaynak
        { count: 4, weight: 3 }   // %3 ihtimalle 4 kaynak (Jackpot!)
    ],

    /**
     * Tanımlı ağırlıklara göre rastgele kaynak sayısı (loot) hesaplar.
     * @returns {number} Üretilecek kaynak sayısı (0-4 arası)
     */
    calculateLootCount: function() {
        // Toplam ağırlığı hesapla
        const totalWeight = this.LOOT_DISTRIBUTION.reduce((sum, item) => sum + item.weight, 0);
        
        // 0 ile toplam ağırlık arasında rastgele bir sayı seç
        let random = Math.random() * totalWeight;
        
        // Ağırlıklara göre hangi dilime denk geldiğini bul
        for (const item of this.LOOT_DISTRIBUTION) {
            if (random < item.weight) {
                return item.count;
            }
            random -= item.weight;
        }
        
        return 1; // Hata durumunda varsayılan
    }
};