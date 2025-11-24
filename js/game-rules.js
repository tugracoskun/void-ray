/**
 * Void Ray - Oyun Kuralları ve Mantığı
 * * Bu dosya, oyunun dengesini etkileyen olasılık hesaplamaları,
 * * kaynak dağılımları ve diğer çekirdek mekanik kurallarını içerir.
 */

const GameRules = {
    // Kaynak Düşme Olasılıkları (Ağırlıklı Dağılım)
    // Toplam: 100 birim üzerinden hesaplanmıştır.
    LOOT_DISTRIBUTION: [
        { count: 1, weight: 60 }, // %60 ihtimalle 1 kaynak
        { count: 2, weight: 25 }, // %25 ihtimalle 2 kaynak
        { count: 3, weight: 10 }, // %10 ihtimalle 3 kaynak
        { count: 4, weight: 5 }   // %5 ihtimalle 4 kaynak (Jackpot!)
    ],

    /**
     * Tanımlı ağırlıklara göre rastgele kaynak sayısı (loot) hesaplar.
     * @returns {number} Üretilecek kaynak sayısı (1-4 arası)
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