/**
 * Void Ray - Varlık Sınıfı: NEXUS (ÜS)
 */
class Nexus {
    constructor() { 
        this.x = GameRules.LOCATIONS.NEXUS.x; 
        this.y = GameRules.LOCATIONS.NEXUS.y; 
        this.radius = 300; 
        this.rotation = 0; 
    }
    
    update() {
        this.rotation += 0.002;
    }
    
    
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rotation);
        // Dış Işın Çemberi
        ctx.beginPath(); ctx.arc(0,0, this.radius, 0, Math.PI*2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"; ctx.lineWidth = 20; ctx.stroke();
        ctx.strokeStyle = "rgba(56, 189, 248, 0.8)"; ctx.lineWidth = 2; ctx.stroke();
        // Dış Kollar
        for(let i=0; i<4; i++) { 
            ctx.rotate(Math.PI/2); 
            ctx.fillStyle = "rgba(15, 23, 42, 0.9)"; 
            ctx.fillRect(-50, -this.radius, 100, 100); 
            ctx.fillStyle = "rgba(56, 189, 248, 0.5)"; 
            ctx.fillRect(-40, -this.radius+10, 80, 20); 
        }
        // Merkez Çekirdek
        ctx.beginPath(); ctx.arc(0,0, 80, 0, Math.PI*2); ctx.fillStyle = "#000"; ctx.fill();
        ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 5; ctx.stroke();
        // Merkez Işığı
        ctx.shadowBlur = 50; ctx.shadowColor = "#38bdf8"; ctx.fillStyle = "#e0f2fe"; ctx.beginPath(); ctx.arc(0,0, 30, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }
}