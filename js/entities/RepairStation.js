/**
 * Void Ray - Varlık Sınıfı: REPAIR STATION (TAMİR İSTASYONU)
 */
class RepairStation {
    constructor() {
        this.x = GameRules.LOCATIONS.REPAIR_STATION.x;
        this.y = GameRules.LOCATIONS.REPAIR_STATION.y;
        this.radius = 150;
        this.rotation = 0;
    }

    update() {
        this.rotation -= 0.005;
        // Oyuncu yakındaysa can yenile
        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        // player objesinin global scope'ta var olduğu varsayılır (game.js'de tanımlı)
        if (dist < 300 && player.health < player.maxHealth) {
            player.health = Math.min(player.maxHealth, player.health + 0.5);
        }
    }

    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rotation);
        
        // İstasyon Çizimi
        ctx.shadowBlur = 20; ctx.shadowColor = "#10b981";
        ctx.strokeStyle = "#10b981"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI*2); ctx.stroke();
        
        // Dönen Kollar
        for(let i=0; i<3; i++) {
            ctx.rotate((Math.PI*2)/3);
            ctx.fillStyle = "#064e3b"; ctx.fillRect(60, -10, 40, 20);
            ctx.fillStyle = "#34d399"; ctx.fillRect(90, -10, 10, 20);
        }
        
        // Merkez
        ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(0,0, 40, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#10b981"; ctx.font = "bold 20px monospace"; ctx.textAlign = "center"; 
        ctx.fillText("+", 0, 7);
        
        ctx.restore();
    }
}