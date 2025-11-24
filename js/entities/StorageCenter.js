/**
 * Void Ray - Varlık Sınıfı: STORAGE CENTER (DEPO MERKEZİ)
 */
class StorageCenter {
    constructor() {
        this.x = GameRules.LOCATIONS.STORAGE_CENTER.x;
        this.y = GameRules.LOCATIONS.STORAGE_CENTER.y;
        this.radius = 200;
        this.rotation = 0;
    }

    update() {
        this.rotation -= 0.001;
    }

    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rotation);
        
        // Altıgen Taban
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            ctx.lineTo(this.radius * Math.cos(i * Math.PI / 3), this.radius * Math.sin(i * Math.PI / 3));
        }
        ctx.closePath();
        ctx.strokeStyle = "rgba(168, 85, 247, 0.5)"; // Morumsu
        ctx.lineWidth = 10;
        ctx.stroke();
        ctx.fillStyle = "rgba(10, 10, 20, 0.9)";
        ctx.fill();

        // İç Detaylar (Konteynerler)
        ctx.fillStyle = "rgba(168, 85, 247, 0.1)";
        ctx.fillRect(-80, -80, 160, 160);
        
        ctx.strokeStyle = "#a855f7";
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(-80, -80, 160, 160);
        ctx.setLineDash([]);
        
        ctx.restore();
    }
}