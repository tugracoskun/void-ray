/**
 * Void Ray - Yapay Zeka Yöneticisi (AI Manager)
 * * Oto-pilot mantığını, hedef seçimini ve navigasyonu yönetir.
 * * Gemiyi bir "sanal pilot" gibi kontrol eder.
 */

// Sınıf adını 'AIPilotSystem' yaptık, böylece global 'AIManager' değişkeniyle çakışmayacak.
class AIPilotSystem {
    constructor() {
        this.active = false;      // Oto-pilot açık mı?
        this.mode = 'gather';     // Modlar: 'gather', 'base', 'deposit', 'travel'
        this.manualTarget = null; // Haritadan seçilen hedef
        this.scoutTarget = null;  // Rastgele keşif hedefi
        
        // Hedefleme için geçici değişkenler
        this.debugTarget = null;  // Çizim için (Target Vectors)
    }

    /**
     * AI Sistemini başlatır/durdurur.
     */
    toggle() {
        this.active = !this.active;
        if (!this.active) {
            this.manualTarget = null;
            this.scoutTarget = null;
            this.mode = 'gather';
            if(typeof addChatMessage === 'function') addChatMessage("Otopilot: Devre dışı. Manuel kontrol aktif.", "system", "genel");
        } else {
            if(typeof addChatMessage === 'function') addChatMessage("Otopilot: Devreye alındı.", "info", "genel");
        }
        
        // UI güncellemesi için global fonksiyonu tetikle
        if (typeof updateAIButton === 'function') updateAIButton();
    }

    /**
     * Belirli bir moda geçer.
     */
    setMode(newMode) {
        this.mode = newMode;
        if (!this.active) this.toggle(); // Mod değişirse otomatik aç
        
        let msg = "";
        switch(newMode) {
            case 'base': msg = "Üsse dönüş rotası hesaplanıyor."; break;
            case 'deposit': msg = "Otomatik aktarım protokolü."; break;
            case 'travel': msg = "Seyir moduna geçildi."; break;
            case 'gather': msg = "Toplama protokolü aktif."; break;
        }
        if(typeof addChatMessage === 'function') addChatMessage(`Otopilot: ${msg}`, "info", "genel");
        if (typeof updateAIButton === 'function') updateAIButton();
    }

    /**
     * Haritadan bir hedef belirlendiğinde çağrılır.
     */
    setManualTarget(x, y) {
        this.manualTarget = { x, y };
        this.setMode('travel');
        if(typeof showNotification === 'function') showNotification({name: "ROTA OLUŞTURULDU", type:{color:'#fff'}}, "");
    }

    /**
     * Her oyun döngüsünde (frame) gemiyi kontrol eder.
     * @param {VoidRay} player - Kontrol edilecek gemi
     * @param {number} dt - Delta time
     */
    update(player, dt) {
        if (!this.active || !player) return;

        // Kullanıcı araya girerse (WASD) AI'yı uyar/durdur
        if (keys.w || keys.a || keys.s || keys.d) {
            // İsteğe bağlı: AI'yı kapatabiliriz veya sadece uyarı verebiliriz.
            // Şimdilik UI'da yanıp sönme efekti controls.js içinde yapılıyor.
        }

        // 1. Kapasite Kontrolü (Doluysa boşaltmaya git)
        const cap = GameRules.getPlayerCapacity();
        if (collectedItems.length >= cap && this.mode !== 'deposit' && this.mode !== 'base') {
            this.setMode('deposit');
            if(typeof showNotification === 'function') showNotification({name: "DEPO DOLU: OTOMATİK AKTARIM", type:{color:'#a855f7'}}, "");
        }

        // 2. Hedef Belirleme Mantığı
        let targetX, targetY;
        let doThrust = true;

        if (this.mode === 'base') {
            // Hedef: Nexus
            targetX = nexus.x; targetY = nexus.y;
            if (Utils.distEntity(player, nexus) < 400) doThrust = false;
            this.scoutTarget = null;
        } 
        else if (this.mode === 'deposit') {
            // Hedef: Depo Merkezi
            targetX = storageCenter.x; targetY = storageCenter.y;
            if (Utils.distEntity(player, storageCenter) < 200) {
                doThrust = false;
                // Depoya aktar
                if (typeof depositToStorage === 'function') {
                    depositToStorage(collectedItems, "VATOZ");
                }
                this.setMode('gather');
                if(typeof showNotification === 'function') showNotification({name: "OTOMATİK AKTARIM TAMAMLANDI", type:{color:'#10b981'}}, "");
            }
            this.scoutTarget = null;
        }
        else if (this.mode === 'travel' && this.manualTarget) {
            // Hedef: Oyuncunun Seçtiği Nokta
            targetX = this.manualTarget.x; targetY = this.manualTarget.y;
            if (Utils.dist(player.x, player.y, targetX, targetY) < 200) {
                doThrust = false;
                this.toggle(); // Hedefe varınca kapat
                if(typeof showNotification === 'function') showNotification({name: "HEDEFE ULAŞILDI", type:{color:'#fff'}}, "");
            }
        } 
        else {
            // Hedef: Kaynak Toplama (Gather)
            this.mode = 'gather'; // Emin olmak için set et
            
            // En yakın kaynağı bul
            const nearest = this.findNearestResource(player);
            
            if (nearest) {
                targetX = nearest.x; targetY = nearest.y;
                this.scoutTarget = null;
            } else {
                // Kaynak yoksa rastgele keşif (Scout)
                if (!this.scoutTarget || Utils.dist(player.x, player.y, this.scoutTarget.x, this.scoutTarget.y) < 300) {
                    this.pickNewScoutTarget();
                }
                targetX = this.scoutTarget.x;
                targetY = this.scoutTarget.y;
            }
        }

        // 3. Fiziksel Kontrol (Gemiyi Hedefe Yönlendir)
        if (targetX !== undefined) {
            this.debugTarget = { x: targetX, y: targetY }; // Gizmos çizimi için
            
            // Açı hesapla
            const targetAngle = Math.atan2(targetY - player.y, targetX - player.x);
            
            // Yumuşak dönüş
            let diff = targetAngle - player.angle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            player.angle += diff * 0.1;

            // İtici Güç (Thrust)
            if (doThrust) {
                // Hedefe bakıyorsak gaz ver
                // player.getStatBonus fonksiyonu VoidRay.js içinde tanımlı
                const thrustBonus = (typeof player.getStatBonus === 'function') ? player.getStatBonus('thrust') : 0;
                const accel = (keys[" "] ? 0.6 : 0.2) + (thrustBonus / 200);
                
                if (Math.abs(diff) < 1.0) {
                    player.vx += Math.cos(player.angle) * accel;
                    player.vy += Math.sin(player.angle) * accel;
                } else {
                    // Dönüyorsak yavaşla
                    player.vx *= 0.95;
                    player.vy *= 0.95;
                }
            } else {
                // Hedefe vardık veya duruyoruz
                player.vx *= 0.9;
                player.vy *= 0.9;
            }

            // Görsel Efektler (Kanat hareketi vb.)
            player.wingPhase += 0.2;
            // Roll efekti (Dönüşe göre yatış)
            const targetRoll = diff * 5 * 0.6;
            player.roll += (targetRoll - player.roll) * 0.05;
        }
    }

    /**
     * Yakındaki en uygun kaynağı bulur.
     */
    findNearestResource(player) {
        if (collectedItems.length >= GameRules.getPlayerCapacity()) return null;

        let nearest = null;
        let minDist = Infinity;
        const scanRange = player.radarRadius;

        // Grid sisteminden adayları çek
        const candidates = (entityManager && entityManager.grid) 
            ? entityManager.grid.query(player.x, player.y, scanRange) 
            : planets;

        for (let p of candidates) {
            if (!p.collected && p.type.id !== 'toxic') {
                const distToMe = (p.x - player.x) ** 2 + (p.y - player.y) ** 2;
                
                if (distToMe < scanRange ** 2) {
                    // Eğer Yankı (Echo) bu kaynağa daha yakınsa, ona bırak
                    let echoIsCloser = false;
                    if (typeof echoRay !== 'undefined' && echoRay && echoRay.mode === 'roam' && echoRay.lootBag.length < GameRules.getEchoCapacity()) {
                        const distToEcho = (p.x - echoRay.x) ** 2 + (p.y - echoRay.y) ** 2;
                        if (distToEcho < distToMe) echoIsCloser = true;
                    }

                    if (!echoIsCloser && distToMe < minDist) {
                        minDist = distToMe;
                        nearest = p;
                    }
                }
            }
        }
        return nearest;
    }

    pickNewScoutTarget() {
        const margin = 5000;
        const safeSize = WORLD_SIZE - margin;
        this.scoutTarget = {
            x: Utils.random(margin, safeSize),
            y: Utils.random(margin, safeSize)
        };
    }
}

// Global Erişim (İsim değişikliği burada önemli)
window.AIManager = new AIPilotSystem();