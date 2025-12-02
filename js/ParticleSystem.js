/**
 * Void Ray - Parçacık Yönetim Sistemi
 * * Tüm parçacık efektlerinin (patlamalar, motor izleri vb.) merkezi kontrolü.
 * * game.js içindeki manuel döngülerden ayrıştırılmıştır.
 */
class ParticleSystem {
    constructor() {
        this.pool = [];
    }

    /**
     * Belirtilen konumda yeni parçacıklar oluşturur.
     * @param {number} x - Başlangıç X koordinatı
     * @param {number} y - Başlangıç Y koordinatı
     * @param {string} color - Parçacık rengi (HEX veya RGBA)
     * @param {number} count - Oluşturulacak parça sayısı (Varsayılan: 1)
     */
    emit(x, y, color, count = 1) {
        for (let i = 0; i < count; i++) {
            // Particle sınıfı js/entities/Particle.js dosyasından gelir
            this.pool.push(new Particle(x, y, color));
        }
    }

    /**
     * Tüm parçacıkların fiziksel durumunu günceller.
     * Ömrü tükenen parçacıkları havuzdan temizler.
     */
    update() {
        for (let i = this.pool.length - 1; i >= 0; i--) {
            const p = this.pool[i];
            p.update();
            
            if (p.life <= 0) {
                this.pool.splice(i, 1);
            }
        }
    }

    /**
     * Aktif parçacıkları ekrana çizer.
     * @param {CanvasRenderingContext2D} ctx - Çizim bağlamı
     */
    draw(ctx) {
        for (let i = 0; i < this.pool.length; i++) {
            this.pool[i].draw(ctx);
        }
    }

    /**
     * Aktif parçacık sayısını döndürür (FPS ve Debug için).
     */
    get count() {
        return this.pool.length;
    }

    /**
     * Sistemi sıfırlar (Örn: Oyun yeniden başladığında).
     */
    clear() {
        this.pool = [];
    }
}