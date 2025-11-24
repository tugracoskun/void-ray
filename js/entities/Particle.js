/**
 * Void Ray - Varlık Sınıfı: PARÇACIK EFEKTLERİ
 */
class Particle {
    constructor(x, y, color) { 
        this.x = x; 
        this.y = y; 
        this.color = color; 
        this.vx = (Math.random()-0.5)*3; 
        this.vy = (Math.random()-0.5)*3; 
        this.life = 1.0; 
        this.radius = Math.random() * 5 + 3; 
        this.growth = 0.15; 
    }
    
    update() { 
        this.x+=this.vx; 
        this.y+=this.vy; 
        this.life-=0.015; 
        this.radius += this.growth; 
    }
    
    draw(ctx) { 
        ctx.globalAlpha = this.life * 0.6; 
        ctx.fillStyle=this.color; 
        ctx.beginPath(); 
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2); 
        ctx.fill(); 
        ctx.globalAlpha = 1; 
    }
}