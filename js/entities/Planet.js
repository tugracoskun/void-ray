/**
 * Void Ray - Varlık Sınıfı: GEZEGEN VE NESNE
 */
class Planet {
    constructor(x, y, type, lootContent = []) {
        // Global WORLD_SIZE, RARITY, LOOT_DB
        this.x = x !== undefined ? x : Math.random()*WORLD_SIZE; 
        this.y = y !== undefined ? y : Math.random()*WORLD_SIZE; 
        this.collected = false;
        
        if (type) { 
            this.type = type; 
            this.lootContent = lootContent; 
        } else { 
            const r = Math.random(); 
            if(r < 0.01) this.type = RARITY.TOXIC; 
            else if(r < 0.05) this.type = RARITY.LEGENDARY; 
            else if(r < 0.15) this.type = RARITY.EPIC;
            else if(r < 0.17) this.type = RARITY.TARDIGRADE; 
            else if(r < 0.50) this.type = RARITY.RARE; 
            else this.type = RARITY.COMMON; 
            this.lootContent = []; 
        }
        this.name = this.type.id === 'lost' ? "KAYIP KARGO" : LOOT_DB[this.type.id][Math.floor(Math.random()*LOOT_DB[this.type.id].length)];
        this.radius = this.type.id==='legendary'?120 : (this.type.id==='toxic'? 60 : (this.type.id==='lost' ? 80 : (this.type.id === 'tardigrade' ? 50 : 40+Math.random()*60)));
    }
    
    draw(ctx, visibility = 2) {
        if(this.collected) return;
        if(visibility === 0) return; 

        // Radar Teması (Kısmi Görüş)
        if(visibility === 1) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = "rgba(255, 255, 255, 0.15)"; 
            ctx.beginPath(); 
            ctx.arc(this.x, this.y, this.radius * 0.8, 0, Math.PI*2); 
            ctx.fill();
            
            ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"; 
            ctx.lineWidth = 2;
            ctx.stroke();
            return; 
        }

        // Normal Görünüm (Tam Görüş)
        ctx.shadowBlur=50; ctx.shadowColor=this.type.color;
        const grad = ctx.createRadialGradient(this.x-this.radius*0.3, this.y-this.radius*0.3, this.radius*0.1, this.x, this.y, this.radius);
        grad.addColorStop(0, this.type.color); grad.addColorStop(1, "#020617");
        ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        
        if(this.type.id === 'toxic') { const t = Date.now() * 0.002; ctx.strokeStyle = "rgba(132, 204, 22, 0.15)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius + 10 + Math.sin(t)*5, 0, Math.PI*2); ctx.stroke(); }
        if (this.type.id === 'lost') { ctx.strokeStyle = this.type.color; ctx.lineWidth = 3; const pulse = Math.sin(Date.now() * 0.005) * 10; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius + 20 + pulse, 0, Math.PI*2); ctx.stroke(); }
        if (this.type.id === 'tardigrade') { 
            ctx.strokeStyle = "rgba(199, 192, 174, 0.3)"; ctx.lineWidth = 2; 
            const wiggle = Math.sin(Date.now() * 0.01) * 3;
            ctx.beginPath(); ctx.ellipse(this.x, this.y, this.radius+5+wiggle, this.radius+5-wiggle, 0, 0, Math.PI*2); ctx.stroke();
        }
    }
}