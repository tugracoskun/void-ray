/**
 * -------------------------------------------------------------------------
 * DEVELOPER NOTE: NEXUS (ENTITY / PHYSICAL OBJECT) MODULE
 * -------------------------------------------------------------------------
 * Bu dosya, Nexus istasyonunun "Fiziksel Varlık" (Entity) mantığını yönetir.
 * * GÜNCELLEME: Wireframe / Tech temasına uygun olarak yeniden tasarlandı.
 * * Organik şekiller yerine dönen geometrik katmanlar (Altıgen/Kare) kullanıldı.
 * -------------------------------------------------------------------------
 */

class Nexus {
    constructor() { 
        this.x = GameRules.LOCATIONS.NEXUS.x; 
        this.y = GameRules.LOCATIONS.NEXUS.y; 
        this.radius = 300; 
        this.rotation = 0; 
        this.corePulse = 0; // Çekirdek animasyonu için
    }
    
    update() {
        this.rotation += 0.003; // Ağır ve teknik dönüş
        this.corePulse += 0.05;
    }
    
    // Yardımcı: Çokgen Çizici (Wireframe estetiği için)
    drawPoly(ctx, x, y, radius, sides) {
        if (sides < 3) return;
        ctx.beginPath();
        const a = (Math.PI * 2) / sides;
        for (let i = 0; i < sides; i++) {
            ctx.lineTo(x + radius * Math.cos(a * i), y + radius * Math.sin(a * i));
        }
        ctx.closePath();
        ctx.stroke();
    }
    
    draw(ctx) {
        // TEMA RENGİNİ AL
        let themeColor = "#38bdf8";
        let glowColor = "rgba(56, 189, 248, 0.8)";
        let dimColor = "rgba(56, 189, 248, 0.2)";
        
        if (window.gameSettings && window.gameSettings.themeColor) {
            themeColor = window.gameSettings.themeColor;
            
            // Renk varyasyonlarını oluştur
            if (typeof Utils !== 'undefined' && Utils.hexToRgba) {
                glowColor = Utils.hexToRgba(themeColor, 0.8);
                dimColor = Utils.hexToRgba(themeColor, 0.2);
            }
        }

        ctx.save(); 
        ctx.translate(this.x, this.y); 
        
        // 1. EN DIŞ SABİT ÇEMBER (Radar/Sınır Çizgisi)
        // İnce, kesikli çizgi - Wireframe estetiği
        ctx.strokeStyle = dimColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([20, 15]);
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]); // Reset

        // 2. DIŞ DÖNEN ALTIGEN KATMANI (Ana İstasyon Gövdesi)
        ctx.save();
        ctx.rotate(this.rotation);
        
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = themeColor;
        
        // Ana Altıgen
        this.drawPoly(ctx, 0, 0, 180, 6);
        
        // İç Detay Altıgeni (Daha ince)
        ctx.strokeStyle = dimColor;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        this.drawPoly(ctx, 0, 0, 160, 6);
        
        // Köşe Bağlantıları (Tech Lines)
        for(let i=0; i<6; i++) {
            ctx.save();
            ctx.rotate((Math.PI/3) * i);
            ctx.strokeStyle = glowColor;
            ctx.lineWidth = 2;
            
            // İç-Dış bağlantı çizgileri
            ctx.beginPath();
            ctx.moveTo(160, 0); 
            ctx.lineTo(180, 0); 
            ctx.stroke();
            
            // Dışa uzanan iskele/panel (Dolu dikdörtgen yerine boş)
            ctx.fillStyle = dimColor;
            ctx.fillRect(180, -4, 15, 8);
            ctx.restore();
        }
        ctx.restore();

        // 3. İÇ TERS DÖNEN KARE KATMANI (Enerji Reaktörü)
        ctx.save();
        ctx.rotate(-this.rotation * 1.5); // Ters yöne ve biraz daha hızlı döner
        
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = themeColor;
        
        // Ana Kare (Elmas duruşu)
        this.drawPoly(ctx, 0, 0, 100, 4);
        
        // Kare Köşelerine Noktalar
        ctx.fillStyle = themeColor;
        for(let i=0; i<4; i++) {
            ctx.beginPath();
            ctx.arc(100 * Math.cos(i*Math.PI/2), 100 * Math.sin(i*Math.PI/2), 3, 0, Math.PI*2);
            ctx.fill();
        }
        
        ctx.restore();

        // 4. MERKEZ ÇEKİRDEK (Pulsating Core)
        const pulseScale = 1 + Math.sin(this.corePulse) * 0.05;
        
        ctx.save();
        ctx.scale(pulseScale, pulseScale);
        
        // Çekirdek Arka Planı (Siyah, arkadaki çizgileri maskelemek için)
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(0, 0, 40, 0, Math.PI * 2);
        ctx.fill();
        
        // Çekirdek Çerçevesi (Teknik Daire)
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 4;
        ctx.shadowBlur = 30;
        ctx.shadowColor = themeColor;
        ctx.stroke();
        
        // İç Işık Kaynağı
        ctx.fillStyle = "#e0f2fe"; // Merkez her zaman parlak beyaz/mavi
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // 5. DEKORATİF ÇAPRAZ ÇİZGİLER (HUD Hissiyatı)
        ctx.strokeStyle = dimColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        // 4 Yöne uzanan ince nişangah çizgileri
        ctx.moveTo(-220, 0); ctx.lineTo(-195, 0);
        ctx.moveTo(220, 0); ctx.lineTo(195, 0);
        ctx.moveTo(0, -220); ctx.lineTo(0, -195);
        ctx.moveTo(0, 220); ctx.lineTo(0, 195);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.restore();
    }
}