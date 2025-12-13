/**
 * -------------------------------------------------------------------------
 * DEVELOPER NOTE: NEXUS (ENTITY / PHYSICAL OBJECT) MODULE
 * -------------------------------------------------------------------------
 * Bu dosya, Nexus istasyonunun "Fiziksel Varlık" (Entity) mantığını yönetir.
 * * Sorumlulukları:
 * - Uzaydaki konumu (x, y) ve yarıçapı.
 * - Çizim mantığı (draw fonksiyonu, Canvas API).
 * - Animasyon güncellemeleri (update fonksiyonu, dönme açısı vb.).
 * * Kapsam Dışı (Burada OLMAMASI gerekenler):
 * - HTML arayüzü, market butonları veya sekmeler.
 * - DOM etkileşimleri.
 * * İlgili UI Dosyası: js/windows/nexus.js
 * -------------------------------------------------------------------------
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
        // TEMA RENGİNİ AL
        // Varsayılan: Mavi (#38bdf8 / Sky-400)
        let themeColor = "#38bdf8";
        let glowColor = "rgba(56, 189, 248, 0.8)";
        
        if (window.gameSettings && window.gameSettings.themeColor) {
            themeColor = window.gameSettings.themeColor;
            
            // Glow için transparan versiyon
            if (typeof Utils !== 'undefined' && Utils.hexToRgba) {
                glowColor = Utils.hexToRgba(themeColor, 0.8);
            }
        }

        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rotation);
        
        // Dış Işın Çemberi
        ctx.beginPath(); ctx.arc(0,0, this.radius, 0, Math.PI*2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"; ctx.lineWidth = 20; ctx.stroke();
        ctx.strokeStyle = glowColor; ctx.lineWidth = 2; ctx.stroke();
        
        // Dış Kollar
        for(let i=0; i<4; i++) { 
            ctx.rotate(Math.PI/2); 
            ctx.fillStyle = "rgba(15, 23, 42, 0.9)"; 
            ctx.fillRect(-50, -this.radius, 100, 100); 
            
            // Kol detayları da temaya uysun
            ctx.fillStyle = (typeof Utils !== 'undefined' && Utils.hexToRgba) ? Utils.hexToRgba(themeColor, 0.5) : "rgba(56, 189, 248, 0.5)"; 
            ctx.fillRect(-40, -this.radius+10, 80, 20); 
        }
        
        // Merkez Çekirdek
        ctx.beginPath(); ctx.arc(0,0, 80, 0, Math.PI*2); ctx.fillStyle = "#000"; ctx.fill();
        ctx.strokeStyle = themeColor; ctx.lineWidth = 5; ctx.stroke();
        
        // Merkez Işığı
        ctx.shadowBlur = 50; ctx.shadowColor = themeColor; 
        ctx.fillStyle = "#e0f2fe"; // Merkez her zaman parlak beyazımsı kalabilir veya çok açık tema rengi olabilir
        ctx.beginPath(); ctx.arc(0,0, 30, 0, Math.PI*2); ctx.fill();
        
        ctx.restore();
    }
}