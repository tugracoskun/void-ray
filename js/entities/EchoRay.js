/**
 * Void Ray - Varlık Sınıfı: ECHO RAY (YANKI)
 * * Bu sınıfın güncellenmesi, game.js'deki global değişkenlere (player, nexus, storageCenter, planets vb.)
 * * erişimi sürdürmek zorundadır.
 */
class EchoRay {
    constructor(x, y) { 
        this.x = x; 
        this.y = y; 
        this.vx = 0; 
        this.vy = 0; 
        this.angle = 0; 
        this.lootBag = []; 
        this.attached = false; 
        this.mode = 'roam'; 
        // CONFIG'DEN DEĞER AL
        this.energy = GAME_CONFIG.ECHO.BASE_ENERGY;
        this.maxEnergy = GAME_CONFIG.ECHO.BASE_ENERGY; // Maksimum enerji referansı
        this.energyDisplayTimer = 0; 
        this.fullNotified = false;
        
        this.wingPhase = 0; 
        this.pendingMerge = false;
        
        // CONFIG'DEN DEĞER AL
        this.scanRadius = GAME_CONFIG.ECHO.SCAN_RADIUS;
        this.radarRadius = GAME_CONFIG.ECHO.RADAR_RADIUS;

        // --- RENK YÖNETİMİ ---
        this.colorLerp = 0; // 0: Normal, 1: Tamamen Oyuncu Rengi
        
        // Varsayılan Yankı Rengi (Açık Gri / Metalik - #cbd5e1)
        this.baseColor = { r: 203, g: 213, b: 225 }; 
        
        // Hedef Renk (Oyuncu Mavisi - #38bdf8)
        // İleride oyuncu rengi değişirse burası güncellenebilir veya parametrik yapılabilir.
        this.targetColor = { r: 56, g: 189, b: 248 }; 
        
        // Debug için hedef takibi
        this.debugTarget = null;
    }
    
    update() {
        // Global değişkenler ve fonksiyonlar
        const rangeMult = 1 + (playerData.upgrades.echoRange * 0.3);
        
        this.scanRadius = GAME_CONFIG.ECHO.SCAN_RADIUS * rangeMult;
        this.radarRadius = GAME_CONFIG.ECHO.RADAR_RADIUS * rangeMult;

        const durabilityMult = 1 + (playerData.upgrades.echoDurability * 0.5);
        let drain = GAME_CONFIG.ECHO.DRAIN_RATE / durabilityMult; 

        // --- RENK GEÇİŞ MANTIĞI ---
        // Eğer bağlıysa oyuncu rengine yaklaş (ama tam aynısı olma, örn: 0.7)
        // Değilse kendi rengine dön (0.0)
        const targetLerp = this.attached ? 0.7 : 0.0;
        const lerpSpeed = 0.05; // Renk değişim hızı (daha düşük = daha yumuşak)

        this.colorLerp += (targetLerp - this.colorLerp) * lerpSpeed;

        // --- YANKI SINIR KONTROLÜ ---
        // Global WORLD_SIZE
        const isOutOfBounds = this.x < 0 || this.x > WORLD_SIZE || this.y < 0 || this.y > WORLD_SIZE;
        if (isOutOfBounds) {
            drain = GAME_CONFIG.ECHO.OUT_OF_BOUNDS_DRAIN; // Radyasyon altında pil çok hızlı biter
        }
        
        if (this.mode !== 'recharge') {
            this.energy = Math.max(0, this.energy - drain);
        }

        if (this.energyDisplayTimer > 0) this.energyDisplayTimer--;

        // Enerji kontrolü
        if (this.energy < 10 && this.mode !== 'recharge' && !this.attached) {
            const fuelIndex = this.lootBag.findIndex(i => i.name === 'Nebula Özü');
            if (fuelIndex !== -1) {
                this.lootBag.splice(fuelIndex, 1);
                this.energy = 100;
                // Global fonksiyonlar
                showNotification({name: "YANKI: NEBULA ÖZÜ TÜKETTİ (+%100 ENERJİ)", type:{color:'#c084fc'}}, "");
                if(echoInvOpen) renderEchoInventory();
            } else {
                this.mode = 'recharge';
                if(isOutOfBounds) {
                    showNotification({name: "YANKI: RADYASYON HASARI ALIYOR! ÜSSE DÖNÜYOR", type:{color:'#ef4444'}}, "");
                } else {
                    showNotification({name: "YANKI: ENERJİ BİTTİ, ÜSSE DÖNÜYOR", type:{color:'#fbbf24'}}, "");
                }
                updateEchoDropdownUI();
            }
        }

        // Global DOM elementleri
        const badge = document.getElementById('echo-total-badge'); 
        const count = this.lootBag.length; 
        badge.innerText = count; 
        badge.style.display = count > 0 ? 'flex' : 'none';
        
        // Kapasite Kontrolü
        const echoCap = getEchoCapacity();
        
        if (count >= echoCap) {
             badge.style.background = '#ef4444'; // Dolu ise kırmızı
             
             if (this.mode !== 'deposit_storage' && this.mode !== 'recharge' && this.mode !== 'return') {
                 this.mode = 'deposit_storage';
                 showNotification({name: "YANKI DEPOSU DOLU: BOŞALTMAYA GİDİYOR", type:{color:'#a855f7'}}, "");
                 updateEchoDropdownUI();
             }
        } else {
            badge.style.background = '#67e8f9';
        }

        let targetX, targetY;
        this.debugTarget = null; // Her frame sıfırla

        // --- HEDEF BELİRLEME MANTIĞI ---
        // Global nexus, storageCenter, player, planets
        if (this.mode === 'recharge') {
            targetX = nexus.x; targetY = nexus.y;
            this.debugTarget = {x: nexus.x, y: nexus.y};
            
            const d = Math.hypot(this.x - nexus.x, this.y - nexus.y);
            if (d < 100) { 
                this.vx *= 0.5; this.vy *= 0.5; 
                this.energy = Math.min(100, this.energy + 0.05); 
                if(this.energy >= 100) {
                    this.mode = 'roam';
                    showNotification({name: "YANKI: ŞARJ TAMAMLANDI", type:{color:'#67e8f9'}}, "");
                    updateEchoDropdownUI();
                }
            }
        } else if (this.mode === 'deposit_storage') {
            targetX = storageCenter.x; targetY = storageCenter.y;
            this.debugTarget = {x: storageCenter.x, y: storageCenter.y};

            const d = Math.hypot(this.x - storageCenter.x, this.y - storageCenter.y);
            if (d < 150) {
                // Global fonksiyon
                depositToStorage(this.lootBag, "YANKI");
                this.mode = 'roam'; // Göreve dön
                showNotification({name: "YANKI DEPOYU BOŞALTTI", type:{color:'#67e8f9'}}, "");
                updateEchoDropdownUI();
            }
        } else if (this.attached || this.mode === 'return') {
            const target = this.attached ? player.tail[player.tail.length - 1] : player;
            targetX = target.x; targetY = target.y;
            this.debugTarget = {x: target.x, y: target.y};
        } else {
            // Roam (Toplama) Modu
            if (this.lootBag.length < echoCap) {
                let nearest = null, minDist = Infinity;
                for(let p of planets) {
                    if(!p.collected && p.type.id !== 'toxic' && p.type.id !== 'lost') {
                        const d = (p.x-this.x)**2 + (p.y-this.y)**2;
                        if(d < minDist) { minDist = d; nearest = p; }
                    }
                }
                if(nearest) { 
                    targetX = nearest.x; targetY = nearest.y; 
                    this.debugTarget = {x: nearest.x, y: nearest.y};
                }
            } else {
                targetX = player.x + Math.cos(Date.now() * 0.001) * 300;
                targetY = player.y + Math.sin(Date.now() * 0.001) * 300;
                this.debugTarget = {x: targetX, y: targetY};
            }
        }

        if (targetX !== undefined) {
            if (this.attached) {
                 this.x += (targetX - this.x) * 0.1; this.y += (targetY - this.y) * 0.1; this.angle = player.angle;
            } else {
                const targetA = Math.atan2(targetY - this.y, targetX - this.x);
                let diff = targetA - this.angle; while (diff < -Math.PI) diff += Math.PI*2; while (diff > Math.PI) diff -= Math.PI*2;
                this.angle += diff * 0.1;
                
                const dist = Math.hypot(targetX - this.x, targetY - this.y);
                const stopDistance = (this.mode === 'return') ? 250 : 100;

                if (dist < stopDistance && this.mode !== 'roam') {
                     this.vx *= 0.8; this.vy *= 0.8;
                } else {
                     const thrust = (this.mode === 'recharge' || this.mode === 'deposit_storage') ? 0.8 : 0.5;
                     this.vx += Math.cos(targetA) * thrust; this.vy += Math.sin(targetA) * thrust;
                }
            }
        } else {
             this.angle += (Math.random()-0.5)*0.1; this.vx += Math.cos(this.angle)*0.1; this.vy += Math.sin(this.angle)*0.1;
        }

        // Global playerData
        const speedMult = 1 + (playerData.upgrades.echoSpeed * 0.15);
        const MAX_ECHO_SPEED = 8 * speedMult; 
        const currentSpeed = Math.hypot(this.vx, this.vy);
        
        if (currentSpeed > 0.5) {
            this.wingPhase += 0.2;
        } else {
            this.wingPhase += 0.05;
        }

        if (playerData.stats) {
            if (currentSpeed > playerData.stats.echoMaxSpeed) {
                playerData.stats.echoMaxSpeed = currentSpeed;
            }
        }

        if(currentSpeed > MAX_ECHO_SPEED) { this.vx = (this.vx/currentSpeed) * MAX_ECHO_SPEED; this.vy = (this.vy/currentSpeed) * MAX_ECHO_SPEED; }
        this.vx *= 0.96; this.vy *= 0.96; 
        
        if (!this.attached) {
            this.x += this.vx; this.y += this.vy;
            if (this.mode !== 'recharge' && this.mode !== 'deposit_storage') {
                const rangeMult = 1 + (playerData.upgrades.echoRange * 0.3);
                const pickupRange = 40 * rangeMult;
                
                // Toplama döngüsü, sadece kapasite varsa çalışır
                if (this.lootBag.length < echoCap) {
                    for(let p of planets) { // Global planets
                        if(!p.collected && p.type.id !== 'toxic' && p.type.id !== 'lost') {
                            const d = Math.hypot(this.x-p.x, this.y-p.y);
                            if(d < p.radius + pickupRange) { 
                                p.collected = true; 
                                if(p.type.id === 'tardigrade') {
                                    this.lootBag.push(p);
                                } else {
                                    const count = GameRules.calculateLootCount(); // Global GameRules
                                    // Kapasiteye sığacak kadar al
                                    const availableSpace = echoCap - this.lootBag.length;
                                    const takeAmount = Math.min(count, availableSpace);
                                    
                                    for(let i=0; i<takeAmount; i++) this.lootBag.push(p); 
                                }
                                // Global echoInvOpen, renderEchoInventory
                                if(echoInvOpen) renderEchoInventory(); 
                                
                                // Döngü içinde kapasite dolarsa çık
                                if (this.lootBag.length >= echoCap) break;
                            }
                        }
                    }
                }
            }
        }
    }
    
    draw(ctx) { 
        ctx.save(); 
        ctx.translate(this.x, this.y); 
        ctx.rotate(this.angle + Math.PI/2); 
        ctx.scale(0.6, 0.6); 
        
        // --- DİNAMİK RENK HESAPLAMA ---
        // 1. Mod'a göre temel RGB rengini hesapla (Orijinal Kod)
        const baseR = Math.round(this.baseColor.r + (this.targetColor.r - this.baseColor.r) * this.colorLerp);
        const baseG = Math.round(this.baseColor.g + (this.targetColor.g - this.baseColor.g) * this.colorLerp);
        const baseB = Math.round(this.baseColor.b + (this.targetColor.b - this.baseColor.b) * this.colorLerp);

        // 2. Enerjiye göre doygunluk (Saturation) hesapla
        // Gri tonlamalı değer (Luminance)
        const gray = baseR * 0.3 + baseG * 0.59 + baseB * 0.11;
        
        // Enerji oranı (0.0 ile 1.0 arası)
        const energyRatio = Math.max(0, Math.min(1, this.energy / this.maxEnergy));

        // Gri ile Renk arasında enerjiye göre geçiş yap
        // Enerji 0 ise tamamen gri, 100 ise tamamen canlı renk
        const finalR = Math.floor(gray + (baseR - gray) * energyRatio);
        const finalG = Math.floor(gray + (baseG - gray) * energyRatio);
        const finalB = Math.floor(gray + (baseB - gray) * energyRatio);

        const dynamicColor = `rgb(${finalR},${finalG},${finalB})`;

        // Global nexus
        if (this.mode === 'recharge' && Math.hypot(this.x - nexus.x, this.y - nexus.y) < 150) {
             const pulse = 0.5 + Math.sin(Date.now() * 0.005) * 0.5; 
             ctx.shadowBlur = 30 + pulse * 30; 
             ctx.shadowColor = "#cbd5e1"; // Gri parıltı (Şarj olurken nötr renk)
             ctx.fillStyle = `rgba(203, 213, 225, ${0.5 + pulse * 0.5})`; 
        } else {
             ctx.shadowBlur = 20 * energyRatio; // Enerji azsa gölge de azalsın
             ctx.shadowColor = dynamicColor;
        }

        // --- GÖRSEL DEBUG: HİTBOX ---
        if (window.gameSettings && window.gameSettings.developerMode && window.gameSettings.showHitboxes) {
            const collisionRadius = 25;
            ctx.save();
            ctx.beginPath();
            ctx.arc(0, 0, collisionRadius, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 0, 0, 0.7)"; 
            ctx.lineWidth = 3; // Scale 0.6 olduğu için kalın çizdik
            ctx.stroke();

            // Hitbox değeri (Dönmemesi için rotasyonu ters çeviriyoruz)
            // Mevcut rotasyon: this.angle + Math.PI/2
            // Tersini uyguluyoruz: -(this.angle + Math.PI/2)
            ctx.rotate(-(this.angle + Math.PI/2));
            
            ctx.fillStyle = "rgba(255, 0, 0, 0.8)";
            ctx.font = "14px monospace"; // Küçük scale için fontu büyüttük
            ctx.textAlign = "center";
            ctx.fillText(`R: ${collisionRadius}`, 0, collisionRadius + 20);

            ctx.restore();
        }
        
        // Kanat animasyonu değerleri
        let wingTipY = 20; 
        let wingTipX = 60; 
        let wingFlap = Math.sin(this.wingPhase) * 5; 
        
        // Gövde (Koyu Uzay Grisi - Hafifçe renk tonu alabilir ama şimdilik sabit tutuyoruz)
        // Gövde de biraz enerjiye göre tepki verebilir
        ctx.fillStyle = `rgba(${30 * (0.5 + energyRatio * 0.5)}, ${41 * (0.5 + energyRatio * 0.5)}, ${59 * (0.5 + energyRatio * 0.5)}, 0.95)`; 
        
        ctx.beginPath(); 
        ctx.moveTo(0, -30); 
        // Sağ Kanat Eğrisi
        ctx.bezierCurveTo(15, -10, wingTipX, wingTipY+wingFlap, 40, 40); 
        ctx.bezierCurveTo(20, 30, 10, 40, 0, 50); 
        // Sol Kanat Eğrisi (Simetrik)
        ctx.bezierCurveTo(-10, 40, -20, 30, -40, 40); 
        ctx.bezierCurveTo(-wingTipX, wingTipY+wingFlap, -15, -10, 0, -30); 
        ctx.fill();
        
        // Kenar Çizgileri (DİNAMİK RENK)
        ctx.strokeStyle = dynamicColor; 
        ctx.lineWidth = 2; 
        ctx.stroke(); 
        
        // Lamba / Göz (Daha parlak beyaz/gri)
        ctx.fillStyle = "#f1f5f9"; 
        
        if (this.mode !== 'recharge') {
             ctx.shadowBlur = 40 * energyRatio; 
             ctx.shadowColor = dynamicColor; // Göz parlaması da dinamik
        }
        
        ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill(); 

        // Enerji Barı
        if (this.energyDisplayTimer > 0) {
            ctx.globalAlpha = Math.min(1, this.energyDisplayTimer / 30); 
            ctx.fillStyle = "#334155"; ctx.fillRect(-20, -40, 40, 4);
            ctx.fillStyle = dynamicColor; // Bar rengi de dinamik
            ctx.fillRect(-20, -40, 40 * (this.energy/100), 4);
            ctx.globalAlpha = 1;
        }
        
        ctx.restore();

        // --- GÖRSEL DEBUG: VEKTÖRLER VE HEDEF ---
        if (window.gameSettings && window.gameSettings.developerMode && window.gameSettings.showVectors) {
            ctx.save();
            ctx.translate(this.x, this.y);
            
            // 1. HIZ VEKTÖRÜ (Sarı)
            const speedScale = 20;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(this.vx * speedScale, this.vy * speedScale);
            ctx.strokeStyle = "yellow";
            ctx.lineWidth = 2;
            ctx.stroke();

            // 2. HEDEF ÇİZGİSİ (Beyaz/Yeşil)
            if (this.debugTarget) {
                // Hedef global koordinat sisteminde. Biz şu an (this.x, this.y) merkezindeyiz.
                // O yüzden hedefin bize göre bağıl konumunu bulmalıyız.
                const relTx = this.debugTarget.x - this.x;
                const relTy = this.debugTarget.y - this.y;
                
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(relTx, relTy);
                ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                
                // Hedef noktası
                ctx.beginPath();
                ctx.arc(relTx, relTy, 5, 0, Math.PI*2);
                ctx.fillStyle = "white";
                ctx.fill();
            }

            ctx.restore();
        }
    }
}