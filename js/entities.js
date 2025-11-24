/**
 * Void Ray - Varlık Sınıfları
 * * Bu dosya oyun dünyasındaki tüm etkileşimli nesnelerin (Oyuncu, Yankı, Gezegenler)
 * sınıflarını ve mantığını içerir.
 */

// -------------------------------------------------------------------------
// NEXUS (ÜS) SINIFI
// -------------------------------------------------------------------------
class Nexus {
    constructor() { 
        this.x = GameRules.LOCATIONS.NEXUS.x; 
        this.y = GameRules.LOCATIONS.NEXUS.y; 
        this.radius = 300; 
        this.rotation = 0; 
    }
    
    update() {this.rotation += 0.002;}
    
    
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rotation);
        ctx.beginPath(); ctx.arc(0,0, this.radius, 0, Math.PI*2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"; ctx.lineWidth = 20; ctx.stroke();
        ctx.strokeStyle = "rgba(56, 189, 248, 0.8)"; ctx.lineWidth = 2; ctx.stroke();
        for(let i=0; i<4; i++) { ctx.rotate(Math.PI/2); ctx.fillStyle = "rgba(15, 23, 42, 0.9)"; ctx.fillRect(-50, -this.radius, 100, 100); ctx.fillStyle = "rgba(56, 189, 248, 0.5)"; ctx.fillRect(-40, -this.radius+10, 80, 20); }
        ctx.beginPath(); ctx.arc(0,0, 80, 0, Math.PI*2); ctx.fillStyle = "#000"; ctx.fill();
        ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 5; ctx.stroke();
        ctx.shadowBlur = 50; ctx.shadowColor = "#38bdf8"; ctx.fillStyle = "#e0f2fe"; ctx.beginPath(); ctx.arc(0,0, 30, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }
}

// -------------------------------------------------------------------------
// STORAGE CENTER (DEPO MERKEZİ) SINIFI
// -------------------------------------------------------------------------
class StorageCenter {
    constructor() {
        this.x = GameRules.LOCATIONS.STORAGE_CENTER.x;
        this.y = GameRules.LOCATIONS.STORAGE_CENTER.y;
        this.radius = 200;
        this.rotation = 0;
    }

    update() {
        this.rotation -= 0.001;
        // Etkileşim mantığı game.js loop fonksiyonuna taşındı.
        // Burası sadece görsel güncelleme yapar.
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

        // Text
        ctx.save();
        ctx.rotate(-this.rotation); // Yazıyı düz tut
        ctx.fillStyle = "#e9d5ff";
        ctx.font = "bold 20px monospace";
        ctx.textAlign = "center";
        ctx.fillText("DEPO", 0, 8);
        ctx.restore();
        
        ctx.restore();
    }
}

// -------------------------------------------------------------------------
// REPAIR STATION (TAMİR İSTASYONU) SINIFI
// -------------------------------------------------------------------------
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

// -------------------------------------------------------------------------
// VOID RAY (OYUNCU) SINIFI
// -------------------------------------------------------------------------
class VoidRay {
    constructor() {
        this.x = GameRules.LOCATIONS.PLAYER_START.x; 
        this.y = GameRules.LOCATIONS.PLAYER_START.y;
        this.vx = 0; 
        this.vy = 0; 
        this.angle = -Math.PI/2;
        this.roll = 0; 
        this.wingState = 0; 
        this.wingPhase = 0;
        this.scale = 1; 
        this.level = 1; 
        this.xp = 0; 
        this.maxXp = 150; 
        this.energy = 100; 
        this.maxEnergy = 100;
        
        this.health = 100;
        this.maxHealth = 100;
        
        this.outOfBoundsTimer = 0; 
        
        this.tail = []; 
        for(let i=0; i<20; i++) this.tail.push({x:this.x, y:this.y});
        
        this.scanRadius = 4000;
        this.radarRadius = 10000; 
    }
    
    gainXp(amount) { 
        this.xp += amount; 
        if(this.xp >= this.maxXp) this.levelUp(); 
        this.updateUI(); 
    }
    
    levelUp() {
        this.level++; 
        this.xp = 0; 
        this.maxXp = GameRules.calculateNextLevelXp(this.maxXp);
        this.scale += 0.1; 
        this.maxHealth += 20; // Seviye atlayınca can artışı
        this.health = this.maxHealth; // Canı fulle
        audio.playEvolve(); 
        showNotification({name: `EVRİM GEÇİRİLDİ: SEVİYE ${this.level}`, type:{color:'#fff'}}, "");
        if (!echoRay && (this.level === 3 || (this.level > 3 && this.level >= echoDeathLevel + 3))) spawnEcho(this.x, this.y);
    }
    
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        
        // Görsel Hasar Efekti
        const dmgOverlay = document.getElementById('damage-overlay');
        if(dmgOverlay) {
            dmgOverlay.classList.add('active');
            setTimeout(() => dmgOverlay.classList.remove('active'), 200);
        }

        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        // Ölüm Ekranını Göster
        document.getElementById('death-screen').classList.add('active');
        isPaused = true; 
        
        // 3 Saniye sonra yeniden doğ
        setTimeout(() => {
            this.respawn();
        }, 3000);
    }

    respawn() {
        // Durumu Sıfırla
        this.health = this.maxHealth;
        this.energy = this.maxEnergy;
        this.vx = 0;
        this.vy = 0;
        this.outOfBoundsTimer = 0;
        this.x = GameRules.LOCATIONS.PLAYER_RESPAWN.x; 
        this.y = GameRules.LOCATIONS.PLAYER_RESPAWN.y;
        
        // Arayüzü Temizle
        document.getElementById('death-screen').classList.remove('active');
        document.getElementById('radiation-overlay').classList.remove('active');
        document.getElementById('radiation-warning').style.display = 'none';
        
        // Oyunu Devam Ettir
        isPaused = false;
        showNotification({name: "SİSTEMLER YENİDEN BAŞLATILDI", type:{color:'#10b981'}}, "");
    }
    
    updateUI() {
        document.getElementById('level-val').innerText = this.level;
        document.getElementById('xp-fill').style.width = `${(this.xp/this.maxXp)*100}%`;
        document.getElementById('stardust-amount').innerText = playerData.stardust;
    }
    
    update(dt = 16) { 
        const spdMult = 1 + (playerData.upgrades.playerSpeed * 0.15);
        const turnMult = 1 + (playerData.upgrades.playerTurn * 0.2);
        const magnetMult = 1 + (playerData.upgrades.playerMagnet * 0.1);
        
        // Radar menzillerini yükseltmelere göre güncelle
        this.scanRadius = 4000 * magnetMult * (1 + this.scale * 0.1);
        this.radarRadius = 10000 * magnetMult * (1 + this.scale * 0.1);

        const BOOST = keys[" "] ? 0.6 : 0; 
        let ACCEL = 0.2 + BOOST;
        
        const MAX_SPEED = (keys[" "] ? 18 : 10) * (1 + this.scale * 0.05) * spdMult; 
        const TURN_SPEED = (0.05 / Math.sqrt(this.scale)) * turnMult; 
        
        // --- RADYASYON VE SINIR KONTROLÜ ---
        const isOutOfBounds = this.x < 0 || this.x > WORLD_SIZE || this.y < 0 || this.y > WORLD_SIZE;
        
        if (isOutOfBounds) {
            this.outOfBoundsTimer++;
            
            // 1. Hasar: Enerji yerine CAN azalıyor
            const damage = 0.2 + (this.outOfBoundsTimer * 0.005); // Zamanla artan hasar
            this.takeDamage(damage);

            // 2. Geri İtme Kuvveti (Pushback)
            // Eğer 2 saniyeden fazla (yaklaşık 120 frame) dışarıdaysa, merkeze doğru itmeye başla
            if (this.outOfBoundsTimer > 120) {
                const centerX = WORLD_SIZE / 2;
                const centerY = WORLD_SIZE / 2;
                const angleToCenter = Math.atan2(centerY - this.y, centerX - this.x);
                
                // Geri itme kuvveti zamanla artar
                const pushForce = 0.5 + (this.outOfBoundsTimer * 0.002); 
                this.vx += Math.cos(angleToCenter) * pushForce;
                this.vy += Math.sin(angleToCenter) * pushForce;
            }

            // Görsel Uyarılar
            document.getElementById('radiation-overlay').classList.add('active');
            document.getElementById('radiation-warning').style.display = 'block';
        } else {
            this.outOfBoundsTimer = Math.max(0, this.outOfBoundsTimer - 5);
            document.getElementById('radiation-overlay').classList.remove('active');
            document.getElementById('radiation-warning').style.display = 'none';
        }

        // Enerji Yönetimi
        if (keys[" "] && this.energy > 0 && !window.cinematicMode) {
                const cost = 0.05;
                this.energy = Math.max(0, this.energy - cost); 
                if(playerData.stats) playerData.stats.totalEnergySpent += cost;
        } else if (Math.hypot(this.vx, this.vy) > 2) {
                const cost = 0.002;
                this.energy = Math.max(0, this.energy - cost);
                if(playerData.stats) playerData.stats.totalEnergySpent += cost;
        } else {
                if (!isOutOfBounds) this.energy = Math.min(this.maxEnergy, this.energy + 0.01);
        }
        
        if (this.energy < 10 && !lowEnergyWarned) {
            lowEnergyWarned = true;
        } else if (this.energy > 15) {
            lowEnergyWarned = false;
        }

        if (this.energy <= 0 && keys[" "]) {
            ACCEL = 0.2; 
        }

        const energyBar = document.getElementById('energy-bar-fill');
        energyBar.style.width = (this.energy/this.maxEnergy*100) + '%';
        if(this.energy < 20) energyBar.style.background = '#ef4444';
        else energyBar.style.background = '#38bdf8';

        const healthBar = document.getElementById('health-bar-fill');
        const healthPct = (this.health / this.maxHealth) * 100;
        healthBar.style.width = healthPct + '%';
        if (healthPct < 30) healthBar.style.background = '#ef4444'; 
        else if (healthPct < 60) healthBar.style.background = '#f59e0b'; 
        else healthBar.style.background = '#10b981'; 

        let targetRoll = 0; let targetWingState = 0;

        // Uyarı Işıkları
        if (autopilot && (keys.w || keys.a || keys.s || keys.d)) {
            const aiBtn = document.getElementById('btn-ai-toggle');
            if (aiBtn && !aiBtn.classList.contains('warn-blink')) {
                aiBtn.classList.add('warn-blink');
            }
        } else {
            const aiBtn = document.getElementById('btn-ai-toggle');
            if (aiBtn && aiBtn.classList.contains('warn-blink')) {
                aiBtn.classList.remove('warn-blink');
            }
        }

        // Hareket Mantığı
        if (window.cinematicMode) {
            this.vx *= 0.95; 
            this.vy *= 0.95;
            this.wingPhase += 0.02; 
            targetWingState = 0; 
        } else if (autopilot) {
            let targetX, targetY, doThrust = true;
            
            // --- OTOPİLOT VE DEPO MANTIĞI ---
            const cap = getPlayerCapacity();
            
            if (collectedItems.length >= cap && aiMode !== 'deposit' && aiMode !== 'base') {
                aiMode = 'deposit'; 
                showNotification({name: "DEPO DOLU: OTOMATİK AKTARIM BAŞLATILIYOR", type:{color:'#a855f7'}}, "");
                updateAIButton();
            }

            if (aiMode === 'base') {
                 targetX = nexus.x; targetY = nexus.y;
                 const distToNexus = Math.hypot(this.x - nexus.x, this.y - nexus.y);
                 if(distToNexus < 400) doThrust = false;
            } 
            else if (aiMode === 'deposit') {
                targetX = storageCenter.x; targetY = storageCenter.y;
                const distToStorage = Math.hypot(this.x - storageCenter.x, this.y - storageCenter.y);
                
                if(distToStorage < 200) {
                    doThrust = false;
                    depositToStorage(collectedItems, "VATOZ");
                    aiMode = 'gather';
                    showNotification({name: "OTOMATİK AKTARIM TAMAMLANDI", type:{color:'#10b981'}}, "");
                    updateAIButton();
                }
            }
            else if (aiMode === 'travel' && manualTarget) {
                targetX = manualTarget.x; targetY = manualTarget.y;
                const distToTarget = Math.hypot(this.x - targetX, this.y - targetY);
                if(distToTarget < 200) {
                     doThrust = false; 
                     autopilot = false; manualTarget = null; 
                     showNotification({name: "HEDEFE ULAŞILDI", type:{color:'#fff'}}, "");
                     document.getElementById('btn-ai-toggle').classList.remove('active');
                     updateAIButton();
                }
            } else {
                // Gather Mode
                aiMode = 'gather';
                let nearest = null, minDist = Infinity;
                
                if (collectedItems.length < cap) {
                    for(let p of planets) {
                        if(!p.collected && p.type.id !== 'toxic') {
                            const d = (p.x-this.x)**2 + (p.y-this.y)**2;
                            if(d < minDist) { minDist = d; nearest = p; }
                        }
                    }
                }
                
                if(nearest) { targetX = nearest.x; targetY = nearest.y; } 
                else { targetX = this.x + Math.cos(this.angle)*1000; targetY = this.y + Math.sin(this.angle)*1000; }
            }

            if(targetX !== undefined) {
                const targetAngle = Math.atan2(targetY - this.y, targetX - this.x);
                let diff = targetAngle - this.angle;
                while (diff < -Math.PI) diff += Math.PI*2; while (diff > Math.PI) diff -= Math.PI*2;
                this.angle += diff * 0.1;
                
                if(doThrust) {
                    if(Math.abs(diff) < 1.0) {
                        this.vx += Math.cos(this.angle) * ACCEL;
                        this.vy += Math.sin(this.angle) * ACCEL;
                    } else { this.vx *= 0.95; this.vy *= 0.95; }
                } else { this.vx *= 0.9; this.vy *= 0.9; }
                this.wingPhase += 0.2; targetRoll = diff * 5 * 0.6;
            }
        } else {
            if (keys.a) { this.angle -= TURN_SPEED; targetRoll = -0.5 * 0.6; }
            if (keys.d) { this.angle += TURN_SPEED; targetRoll = 0.5 * 0.6; }
            if (keys.w || (keys[" "] && this.energy > 0)) {
                this.vx += Math.cos(this.angle) * ACCEL;
                this.vy += Math.sin(this.angle) * ACCEL;
                targetWingState = -0.8; this.wingPhase += 0.2;
            } else { this.wingPhase += 0.05; }
            if (keys.s) { this.vx *= 0.92; this.vy *= 0.92; targetWingState = 1.2; }
        }

        // Çekim Alanı
        planets.forEach(p => {
            if(!p.collected && p.type.id !== 'toxic') {
                const dx = p.x - this.x; const dy = p.y - this.y;
                const distSq = dx*dx + dy*dy;
                const magnetRange = 200 * (1 + playerData.upgrades.playerMagnet * 0.5);
                if(distSq < magnetRange**2 && distSq > p.radius**2) {
                    const force = (p.radius * 5) / distSq; 
                    this.vx += (dx / Math.sqrt(distSq)) * force;
                    this.vy += (dy / Math.sqrt(distSq)) * force;
                }
            }
        });

        const speed = Math.hypot(this.vx, this.vy);
        document.getElementById('speed-val').innerText = Math.floor(speed * 10); 
        
        // İstatistik Güncellemeleri
        if (playerData.stats) {
            if (speed > playerData.stats.maxSpeed) {
                playerData.stats.maxSpeed = speed;
            }
            playerData.stats.distance += speed;

            if (speed > 0.1) {
                playerData.stats.timeMoving += dt;
            } else {
                playerData.stats.timeIdle += dt;
            }
        }
        
        if (speed > MAX_SPEED) { 
            this.vx = (this.vx/speed)*MAX_SPEED; 
            this.vy = (this.vy/speed)*MAX_SPEED; 
        }
        
        this.vx *= 0.98; this.vy *= 0.98; 
        this.x += this.vx; this.y += this.vy;

        this.roll += (targetRoll - this.roll) * 0.05; this.wingState += (targetWingState - this.wingState) * 0.1;
        
        // Kuyruk Efekti
        let targetX = this.x - Math.cos(this.angle) * 20 * this.scale;
        let targetY = this.y - Math.sin(this.angle) * 20 * this.scale;
        this.tail[0].x += (targetX - this.tail[0].x) * 0.5; this.tail[0].y += (targetY - this.tail[0].y) * 0.5;
        for (let i = 1; i < this.tail.length; i++) {
            let prev = this.tail[i-1]; let curr = this.tail[i];
            let dx = prev.x - curr.x; let dy = prev.y - curr.y;
            let d = Math.sqrt(dx*dx + dy*dy); let a = Math.atan2(dy, dx);
            if(d > 5 * this.scale) { curr.x = prev.x - Math.cos(a) * 5 * this.scale; curr.y = prev.y - Math.sin(a) * 5 * this.scale; }
        }
        document.getElementById('coords').innerText = `${Math.floor(this.x)} : ${Math.floor(this.y)}`;
    }
    
    draw(ctx) {
        ctx.beginPath(); ctx.moveTo(this.tail[0].x, this.tail[0].y);
        for(let i=1; i<this.tail.length-1; i++) { let xc = (this.tail[i].x + this.tail[i+1].x) / 2; let yc = (this.tail[i].y + this.tail[i+1].y) / 2; ctx.quadraticCurveTo(this.tail[i].x, this.tail[i].y, xc, yc); }
        let grad = ctx.createLinearGradient(this.tail[0].x, this.tail[0].y, this.tail[this.tail.length-1].x, this.tail[this.tail.length-1].y);
        grad.addColorStop(0, "rgba(56, 189, 248, 0.9)"); grad.addColorStop(1, "transparent");
        ctx.strokeStyle = grad; ctx.lineWidth = 3 * this.scale; ctx.lineCap = 'round'; ctx.stroke();
        
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle + Math.PI/2); ctx.scale(this.scale, this.scale); 
        
        if (!window.cinematicMode) {
            const pulse = 20 + Math.sin(Date.now() * 0.01) * 10; 
            ctx.shadowBlur = 30 + pulse;
            ctx.shadowColor = "rgba(56, 189, 248, 0.8)"; 
        } else {
            ctx.shadowBlur = 10;
            ctx.shadowColor = "rgba(56, 189, 248, 0.2)";
        }

        let scaleX = 1 - Math.abs(this.roll) * 0.4; let shiftX = this.roll * 15; let wingTipY = 20 + (this.wingState * 15); let wingTipX = 60 - (this.wingState * 10); let wingFlap = Math.sin(this.wingPhase) * 5;
        
        ctx.fillStyle = "rgba(8, 15, 30, 0.95)";
        ctx.beginPath(); ctx.moveTo(0+shiftX, -30); ctx.bezierCurveTo(15+shiftX, -10, wingTipX+shiftX, wingTipY+wingFlap, 40*scaleX+shiftX, 40); ctx.bezierCurveTo(20+shiftX, 30, 10+shiftX, 40, 0+shiftX, 50); ctx.bezierCurveTo(-10+shiftX, 40, -20+shiftX, 30, -40*scaleX+shiftX, 40); ctx.bezierCurveTo(-wingTipX+shiftX, wingTipY+wingFlap, -15+shiftX, -10, 0+shiftX, -30); ctx.fill();
        
        ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 2; ctx.stroke(); 
        
        ctx.fillStyle = window.cinematicMode ? "#475569" : "#e0f2fe"; 
        
        if (!window.cinematicMode) {
            ctx.shadowBlur = 40; ctx.shadowColor = "#0ea5e9"; 
        }
        
        ctx.beginPath(); ctx.arc(0+shiftX, 0, 5, 0, Math.PI*2); ctx.fill(); 
        ctx.restore();
    }
}

// -------------------------------------------------------------------------
// ECHO RAY (YANKI) SINIFI
// -------------------------------------------------------------------------
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
        this.energy = 100;
        this.energyDisplayTimer = 0; 
        this.fullNotified = false;
        
        // Radar Yapılandırması
        this.scanRadius = 4000;
        this.radarRadius = 10000;
    }
    
    update() {
        const rangeMult = 1 + (playerData.upgrades.echoRange * 0.3);
        
        this.scanRadius = 4000 * rangeMult;
        this.radarRadius = 10000 * rangeMult;

        const durabilityMult = 1 + (playerData.upgrades.echoDurability * 0.5);
        let drain = 0.005 / durabilityMult; 

        // --- YANKI SINIR KONTROLÜ ---
        const isOutOfBounds = this.x < 0 || this.x > WORLD_SIZE || this.y < 0 || this.y > WORLD_SIZE;
        if (isOutOfBounds) {
            drain = 0.5; // Radyasyon altında pil çok hızlı biter
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

        const badge = document.getElementById('echo-total-badge'); 
        const count = this.lootBag.length; 
        badge.innerText = count; 
        badge.style.display = count > 0 ? 'flex' : 'none';
        
        // Kapasite Kontrolü
        const echoCap = getEchoCapacity();
        
        if (count >= echoCap) {
             badge.style.background = '#ef4444'; // Dolu ise kırmızı
             
             // Eğer doluysa ve şarj veya zaten depoya gitmiyorsa
             if (this.mode !== 'deposit_storage' && this.mode !== 'recharge' && this.mode !== 'return') {
                 // Otomatik olarak depoya gönder
                 this.mode = 'deposit_storage';
                 showNotification({name: "YANKI DEPOSU DOLU: BOŞALTMAYA GİDİYOR", type:{color:'#a855f7'}}, "");
                 updateEchoDropdownUI();
             }
        } else {
            badge.style.background = '#67e8f9';
        }

        let targetX, targetY;

        // --- HEDEF BELİRLEME MANTIĞI ---
        if (this.mode === 'recharge') {
            targetX = nexus.x; targetY = nexus.y;
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
            // Depo merkezine git
            targetX = storageCenter.x; targetY = storageCenter.y;
            const d = Math.hypot(this.x - storageCenter.x, this.y - storageCenter.y);
            if (d < 150) {
                // Depoya boşalt
                depositToStorage(this.lootBag, "YANKI");
                this.mode = 'roam'; // Göreve dön
                showNotification({name: "YANKI DEPOYU BOŞALTTI", type:{color:'#67e8f9'}}, "");
                updateEchoDropdownUI();
            }
        } else if (this.attached || this.mode === 'return') {
            const target = this.attached ? player.tail[player.tail.length - 1] : player;
            targetX = target.x; targetY = target.y;
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
                if(nearest) { targetX = nearest.x; targetY = nearest.y; }
            } else {
                targetX = player.x + Math.cos(Date.now() * 0.001) * 300;
                targetY = player.y + Math.sin(Date.now() * 0.001) * 300;
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
                if (dist < 100 && this.mode !== 'roam') {
                     this.vx *= 0.8; this.vy *= 0.8;
                } else {
                     const thrust = (this.mode === 'recharge' || this.mode === 'deposit_storage') ? 0.8 : 0.5;
                     this.vx += Math.cos(targetA) * thrust; this.vy += Math.sin(targetA) * thrust;
                }
            }
        } else {
             this.angle += (Math.random()-0.5)*0.1; this.vx += Math.cos(this.angle)*0.1; this.vy += Math.sin(this.angle)*0.1;
        }

        const speedMult = 1 + (playerData.upgrades.echoSpeed * 0.15);
        const MAX_ECHO_SPEED = 8 * speedMult; 
        const currentSpeed = Math.hypot(this.vx, this.vy);
        
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
                    for(let p of planets) {
                        if(!p.collected && p.type.id !== 'toxic' && p.type.id !== 'lost') {
                            const d = Math.hypot(this.x-p.x, this.y-p.y);
                            if(d < p.radius + pickupRange) { 
                                p.collected = true; 
                                if(p.type.id === 'tardigrade') {
                                    this.lootBag.push(p);
                                } else {
                                    const count = GameRules.calculateLootCount(); 
                                    // Kapasiteye sığacak kadar al
                                    const availableSpace = echoCap - this.lootBag.length;
                                    const takeAmount = Math.min(count, availableSpace);
                                    
                                    for(let i=0; i<takeAmount; i++) this.lootBag.push(p); 
                                }
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
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle + Math.PI/2); ctx.scale(0.6, 0.6); 
        
        if (this.mode === 'recharge' && Math.hypot(this.x - nexus.x, this.y - nexus.y) < 150) {
             const pulse = 0.5 + Math.sin(Date.now() * 0.005) * 0.5; 
             ctx.shadowBlur = 30 + pulse * 30; 
             ctx.shadowColor = "#67e8f9"; 
             ctx.fillStyle = `rgba(103, 232, 249, ${0.5 + pulse * 0.5})`; 
        } else {
             ctx.shadowBlur = 20; ctx.shadowColor = "#67e8f9"; ctx.fillStyle = "rgba(10, 20, 40, 0.9)";
        }
        
        ctx.beginPath(); ctx.moveTo(0, -25); ctx.lineTo(30, 30); ctx.lineTo(0, 40); ctx.lineTo(-30, 30); ctx.fill();
        ctx.strokeStyle = "#67e8f9"; ctx.lineWidth = 3; ctx.stroke();
        if(this.mode === 'return' && !this.attached) { ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI*2); ctx.strokeStyle = "rgba(103, 232, 249, 0.3)"; ctx.stroke(); }
        
        if (this.energyDisplayTimer > 0) {
            ctx.globalAlpha = Math.min(1, this.energyDisplayTimer / 30); 
            ctx.fillStyle = "#334155"; ctx.fillRect(-20, -40, 40, 4);
            ctx.fillStyle = "#67e8f9"; ctx.fillRect(-20, -40, 40 * (this.energy/100), 4);
            ctx.globalAlpha = 1;
        }
        
        ctx.restore();
    }
}

// -------------------------------------------------------------------------
// GEZEGEN VE NESNE SINIFI
// -------------------------------------------------------------------------
class Planet {
    constructor(x, y, type, lootContent = []) {
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

// -------------------------------------------------------------------------
// PARÇACIK EFEKTLERİ SINIFI
// -------------------------------------------------------------------------
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