/**
 * Void Ray - Varlık Sınıfı: PARÇACIK EFEKTLERİ
 * * Object Pool uyumlu hale getirilmiştir.
 */
class Particle {
    constructor() { 
        // Hafızada yer ayrılırken varsayılan değerler atanır.
        this.x = 0; 
        this.y = 0; 
        this.color = '#fff'; 
        this.vx = 0; 
        this.vy = 0; 
        this.life = 0; 
        this.radius = 0; 
        this.growth = 0; 
    }
    
    /**
     * Havuzdan çekildiğinde nesneyi "canlandırmak" için kullanılır.
     */
    spawn(x, y, color) {
        this.x = x; 
        this.y = y; 
        this.color = color; 
        
        // Rastgele hareket vektörleri her seferinde yeniden hesaplanmalı
        this.vx = (Math.random() - 0.5) * 3; 
        this.vy = (Math.random() - 0.5) * 3; 
        
        this.life = 1.0; 
        this.radius = Math.random() * 5 + 3; 
        this.growth = 0.15; 
    }

    /**
     * ObjectPool.js içindeki release() fonksiyonu tarafından çağrılır.
     * Nesne havuza geri dönerken temizlik yapar.
     */
    reset() {
        this.x = -1000; // Ekran dışına al
        this.y = -1000;
        this.life = 0;
        this.vx = 0;
        this.vy = 0;
    }
    
    update() { 
        this.x += this.vx; 
        this.y += this.vy; 
        this.life -= 0.015; 
        this.radius += this.growth; 
    }
    
    draw(ctx) { 
        if (this.life <= 0) return; 

        ctx.globalAlpha = Math.max(0, this.life * 0.6); 
        ctx.fillStyle = this.color; 
        ctx.beginPath(); 
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2); 
        ctx.fill(); 
        ctx.globalAlpha = 1; 
    }
}