/**
 * Void Ray - Parçacık Yönetim Sistemi
 * * Object Pool entegrasyonu yapıldı.
 */
class ParticleSystem {
    constructor() {
        // Ekranda aktif olan parçacıkların listesi
        this.activeParticles = [];

        // Nesne Havuzu: 
        // - factory: Yeni Particle üretir
        // - initialSize: Başlangıçta 50 tane üret
        // - maxSize: En fazla 1000 tane stokla (fazlası silinir)
        // DİKKAT: ObjectPool sınıfının yüklendiğinden emin olunmalı.
        if (typeof ObjectPool === 'undefined') {
            console.error("CRITICAL: ObjectPool sınıfı bulunamadı! js/ObjectPool.js yüklendi mi?");
            this.pool = { acquire: () => new Particle(), release: () => {} }; // Fallback
        } else {
            this.pool = new ObjectPool(() => new Particle(), 50, 1000);
        }
    }

    /**
     * Belirtilen konumda yeni parçacıklar oluşturur.
     */
    emit(x, y, color, count = 1) {
        for (let i = 0; i < count; i++) {
            // 1. Havuzdan bir tane al (yoksa yeni üretir)
            const p = this.pool.acquire();
            
            // 2. Parçacığı verilen koordinat ve renkle başlat (Eğer spawn metodu varsa)
            if (p.spawn) p.spawn(x, y, color);
            else {
                // Fallback (Eski Particle sınıfı varsa)
                p.x = x; p.y = y; p.color = color;
                p.vx = (Math.random()-0.5)*3; p.vy = (Math.random()-0.5)*3;
                p.life = 1.0; p.radius = Math.random()*5+3; p.growth = 0.15;
            }
            
            // 3. Aktif listeye ekle (Update döngüsü için)
            this.activeParticles.push(p);
        }
    }

    /**
     * Tüm parçacıkların fiziksel durumunu günceller.
     * Ömrü tükenen parçacıkları havuza iade eder.
     */
    update() {
        // Tersten döngü (splice işlemi diziyi bozmasın diye)
        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            const p = this.activeParticles[i];
            p.update();
            
            if (p.life <= 0) {
                // 1. Havuza geri ver (reset metodu otomatik çağrılır)
                this.pool.release(p);
                
                // 2. Aktif listeden çıkar
                this.activeParticles.splice(i, 1);
            }
        }
    }

    /**
     * Aktif parçacıkları ekrana çizer.
     */
    draw(ctx) {
        for (let i = 0; i < this.activeParticles.length; i++) {
            this.activeParticles[i].draw(ctx);
        }
    }

    /**
     * Aktif parçacık sayısını döndürür.
     */
    get count() {
        return this.activeParticles.length;
    }

    /**
     * Sistemi sıfırlar.
     */
    clear() {
        // Tüm aktif parçacıkları havuza iade et
        if (this.pool && this.pool.releaseAll) {
            this.pool.releaseAll(this.activeParticles);
        }
        this.activeParticles = [];
    }
}