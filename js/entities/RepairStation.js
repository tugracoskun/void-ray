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
        // Utils güncellemesi:
        const dist = Utils.distEntity(player, this);
        // player objesinin global scope'ta var olduğu varsayılır (game.js'de tanımlı)
        if (dist < 300 && player.health < player.maxHealth) {
            player.health = Math.min(player.maxHealth, player.health + 0.5);
        }
    }

    draw(ctx) {
        // TEMA RENGİNİ AL (Tamir istasyonu genelde yeşildir ama dinamik olabilir)
        // Varsayılan: Yeşil (#10b981 / Emerald-500)
        // İsteğe bağlı: Repair station rengini sabit tutmak daha iyi olabilir (Yeşil=Sağlık).
        // Ancak talep "Canvas çizimlerinde statik renk kodları" olduğu için bunu da dinamik yapabiliriz veya
        // sadece Nexus gibi ana yapıları değiştirebiliriz.
        // Güvenlik ve sağlık çağrışımı için yeşil kalması daha UX dostu olabilir, ancak kullanıcı isteğine uyarak
        // tema rengiyle uyumlu hale getirelim.
        
        let themeColor = "#10b981"; // Varsayılan Yeşil
        
        // Eğer kullanıcı özellikle tamir istasyonunun da tema rengine uymasını isterse:
        // themeColor = window.gameSettings.themeColor || "#10b981"; 
        
        // Ancak genellikle sağlık birimleri yeşil kalır. Kullanıcı talebi Nexus.js ve RepairStation.js'yi 
        // örnek gösterdiği için buradaki sabit renkleri de değişkene bağlıyoruz.
        
        if (window.gameSettings && window.gameSettings.themeColor) {
             // Tamir istasyonu için tema rengini kullanmak yerine, tema rengine uyumlu bir varyasyon 
             // veya doğrudan tema rengini kullanabiliriz.
             themeColor = window.gameSettings.themeColor;
        }

        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rotation);
        
        // İstasyon Çizimi
        ctx.shadowBlur = 20; ctx.shadowColor = themeColor;
        ctx.strokeStyle = themeColor; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI*2); ctx.stroke();
        
        // Dönen Kollar
        for(let i=0; i<3; i++) {
            ctx.rotate((Math.PI*2)/3);
            
            // Koyu renk (gövde)
            ctx.fillStyle = (typeof Utils !== 'undefined' && Utils.hexToRgba) ? Utils.hexToRgba(themeColor, 0.2) : "#064e3b"; 
            ctx.fillRect(60, -10, 40, 20);
            
            // Açık renk (uçlar)
            ctx.fillStyle = (typeof Utils !== 'undefined' && Utils.hexToRgba) ? Utils.hexToRgba(themeColor, 0.8) : "#34d399";
            ctx.fillRect(90, -10, 10, 20);
        }
        
        // Merkez
        ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(0,0, 40, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = themeColor; ctx.font = "bold 20px monospace"; ctx.textAlign = "center"; 
        ctx.fillText("+", 0, 7);
        
        ctx.restore();
    }
}