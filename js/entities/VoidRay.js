/**
 * Void Ray - Varlık Sınıfı: VOID RAY (OYUNCU)
 * * Bu sınıfın güncellenmesi, game.js'deki global değişkenlere (keys, collectedItems, autopilot vb.)
 * * erişimi sürdürmek zorundadır.
 */
class VoidRay {
    constructor() {
        // Global değişkenler game.js'den alınır.
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
        
        // CONFIG'DEN DEĞERLER ALINIYOR
        this.maxXp = GAME_CONFIG.PLAYER.BASE_XP; 
        this.energy = GAME_CONFIG.PLAYER.BASE_ENERGY; 
        this.maxEnergy = GAME_CONFIG.PLAYER.BASE_ENERGY;
        this.health = GAME_CONFIG.PLAYER.BASE_HEALTH;
        this.maxHealth = GAME_CONFIG.PLAYER.BASE_HEALTH;
        
        this.outOfBoundsTimer = 0; 
        
        // Kuyruk Ayarları
        this.baseTailCount = GAME_CONFIG.PLAYER.BASE_TAIL_COUNT;
        this.boostTailCount = GAME_CONFIG.PLAYER.BOOST_TAIL_COUNT; // Boost sırasında kuyruk uzasın
        this.tail = []; 
        for(let i=0; i<this.baseTailCount; i++) this.tail.push({x:this.x, y:this.y});
        
        this.scanRadius = GAME_CONFIG.PLAYER.SCAN_RADIUS;
        this.radarRadius = GAME_CONFIG.PLAYER.RADAR_RADIUS; 
        
        // --- GHOST MODE (GÖRÜNMEZLİK) ---
        this.idleTimer = 0;
        this.isGhost = false;
        this.currentAlpha = 1.0; // Yumuşak geçiş için mevcut opaklık
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
        
        // Boyut artışı kaldırıldı
        // this.scale += 0.1; 
        
        this.maxHealth += 20; // Seviye atlayınca can artışı
        this.health = this.maxHealth; // Canı fulle
        
        // Global fonksiyonlar
        if(typeof audio !== 'undefined' && audio) audio.playEvolve(); 
        showNotification({name: `EVRİM GEÇİRİLDİ: SEVİYE ${this.level}`, type:{color:'#fff'}}, "");
        
        // Global değişkenler
        if (!echoRay && (this.level === 3 || (this.level > 3 && this.level >= echoDeathLevel + 3))) spawnEcho(this.x, this.y);
    }
    
    takeDamage(amount) {
        // --- GOD MODE KONTROLÜ ---
        if (window.gameSettings && window.gameSettings.godMode) return;

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
        const deathScreen = document.getElementById('death-screen');
        if(deathScreen) deathScreen.classList.add('active');
        // Global değişken
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
        this.isGhost = false;
        this.idleTimer = 0;
        this.currentAlpha = 1.0;
        
        // Arayüzü Temizle
        const deathScreen = document.getElementById('death-screen');
        if(deathScreen) deathScreen.classList.remove('active');
        
        const radOverlay = document.getElementById('radiation-overlay');
        if(radOverlay) radOverlay.classList.remove('active');
        
        const radWarn = document.getElementById('radiation-warning');
        if(radWarn) radWarn.style.display = 'none';
        
        // Oyunu Devam Ettir
        // Global değişkenler
        isPaused = false;
        showNotification({name: "SİSTEMLER YENİDEN BAŞLATILDI", type:{color:'#10b981'}}, "");
    }
    
    updateUI() {
        // Global değişkenler
        const lvlVal = document.getElementById('level-val');
        if(lvlVal) lvlVal.innerText = this.level;
        
        const xpFill = document.getElementById('xp-fill');
        if(xpFill) xpFill.style.width = `${(this.xp/this.maxXp)*100}%`;
        
        const dustAmt = document.getElementById('stardust-amount');
        if(dustAmt) dustAmt.innerText = playerData.stardust;
    }
    
    update(dt = 16) { 
        // Global değişkenler
        const spdMult = 1 + (playerData.upgrades.playerSpeed * 0.15);
        const turnMult = 1 + (playerData.upgrades.playerTurn * 0.2);
        const magnetMult = 1 + (playerData.upgrades.playerMagnet * 0.1);
        
        // Radar menzillerini yükseltmelere göre güncelle (Config'den taban değerleri alarak)
        // Scale artık değişmediği için menziller sadece upgrade ile artacak
        this.scanRadius = GAME_CONFIG.PLAYER.SCAN_RADIUS * magnetMult;
        this.radarRadius = GAME_CONFIG.PLAYER.RADAR_RADIUS * magnetMult;

        const BOOST = keys[" "] ? 0.6 : 0; // Global keys nesnesi
        let ACCEL = 0.2 + BOOST;
        
        const MAX_SPEED = (keys[" "] ? 18 : 10) * spdMult; 
        const TURN_SPEED = 0.05 * turnMult; 
        
        // --- RADYASYON VE SINIR KONTROLÜ ---
        // Global WORLD_SIZE
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

            // Görsel Uyarılar (God Mode değilse)
            if (!window.gameSettings || !window.gameSettings.godMode) {
                const radOverlay = document.getElementById('radiation-overlay');
                if(radOverlay) radOverlay.classList.add('active');
                
                const radWarn = document.getElementById('radiation-warning');
                if(radWarn) radWarn.style.display = 'block';
            }
        } else {
            this.outOfBoundsTimer = Math.max(0, this.outOfBoundsTimer - 5);
            const radOverlay = document.getElementById('radiation-overlay');
            if(radOverlay) radOverlay.classList.remove('active');
            
            const radWarn = document.getElementById('radiation-warning');
            if(radWarn) radWarn.style.display = 'none';
        }

        // Boost durumu kontrolü
        const isBoosting = keys[" "] && this.energy > 0 && !window.cinematicMode;

        // Enerji Yönetimi
        // Global keys ve lowEnergyWarned
        if (isBoosting) {
                const cost = GAME_CONFIG.PLAYER.ENERGY_COST.BOOST;
                // God Mode kontrolü
                if (!window.gameSettings || !window.gameSettings.godMode) {
                    this.energy = Math.max(0, this.energy - cost); 
                }
                if(playerData.stats) playerData.stats.totalEnergySpent += cost;
        } else if (Math.hypot(this.vx, this.vy) > 2) {
                const cost = GAME_CONFIG.PLAYER.ENERGY_COST.MOVE;
                // God Mode kontrolü
                if (!window.gameSettings || !window.gameSettings.godMode) {
                    this.energy = Math.max(0, this.energy - cost);
                }
                if(playerData.stats) playerData.stats.totalEnergySpent += cost;
        } else {
                if (!isOutOfBounds) this.energy = Math.min(this.maxEnergy, this.energy + GAME_CONFIG.PLAYER.ENERGY_COST.REGEN);
        }
        
        if (this.energy < 10 && !lowEnergyWarned) {
            lowEnergyWarned = true;
        } else if (this.energy > 15) {
            lowEnergyWarned = false;
        }

        if (this.energy <= 0 && keys[" "]) {
            ACCEL = 0.2; 
        }

        // UI Güncelleme (game.js'de tanımlı DOM elementleri)
        const energyBar = document.getElementById('energy-bar-fill');
        if(energyBar) {
            energyBar.style.width = (this.energy/this.maxEnergy*100) + '%';
            if(this.energy < 20) energyBar.style.background = '#ef4444';
            else energyBar.style.background = '#38bdf8';
        }

        const healthBar = document.getElementById('health-bar-fill');
        if(healthBar) {
            const healthPct = (this.health / this.maxHealth) * 100;
            healthBar.style.width = healthPct + '%';
            if (healthPct < 30) healthBar.style.background = '#ef4444'; 
            else if (healthPct < 60) healthBar.style.background = '#f59e0b'; 
            else healthBar.style.background = '#10b981'; 
        }

        let targetRoll = 0; let targetWingState = 0;

        // Uyarı Işıkları
        // Global autopilot, keys
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

        // --- GHOST MODE & HAREKET MANTIĞI ---
        const isInputActive = keys.w || keys.a || keys.s || keys.d || keys[" "];
        const currentSpeed = Math.hypot(this.vx, this.vy);
        
        let targetAlpha = 1.0;

        // Eğer otopilot kapalıysa, girdi yoksa ve hız çok düşükse sayacı artır
        if (!autopilot && !isInputActive && currentSpeed < 0.5) {
            this.idleTimer++;
            // 2 saniye (120 frame) bekle, sonra ghost moduna geç
            if (this.idleTimer > 120) {
                if (!this.isGhost) {
                     this.isGhost = true;
                     if(playerData.stats) playerData.stats.timeIdle += dt;
                }
                
                // Nefes alma efekti (Sine dalgası)
                // 0.10 ile 0.25 arasında gidip gelir
                const breath = (Math.sin(Date.now() * 0.003) + 1) * 0.5; // 0 ile 1 arası
                targetAlpha = 0.10 + (breath * 0.15); 
            }
        } else {
            // Hareket başladıysa veya tuşa basıldıysa
            if (this.isGhost) {
                this.isGhost = false;
            }
            this.idleTimer = 0;
            targetAlpha = 1.0;
        }

        // Opaklık değerini hedefe doğru yumuşat (Yavaş geçiş için 0.02)
        this.currentAlpha += (targetAlpha - this.currentAlpha) * 0.02;

        // Hareket Mantığı
        // Global autopilot, aiMode, nexus, storageCenter, planets, collectedItems, manualTarget, updateAIButton, depositToStorage, showNotification, getPlayerCapacity
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
                     const aiToggle = document.getElementById('btn-ai-toggle');
                     if(aiToggle) aiToggle.classList.remove('active');
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
            // Manuel Kontrol
            if (keys.a) { this.angle -= TURN_SPEED; targetRoll = -0.5 * 0.6; }
            if (keys.d) { this.angle += TURN_SPEED; targetRoll = 0.5 * 0.6; }
            if (keys.w || isBoosting) {
                this.vx += Math.cos(this.angle) * ACCEL;
                this.vy += Math.sin(this.angle) * ACCEL;
                targetWingState = -0.8; this.wingPhase += 0.2;
            } else { this.wingPhase += 0.05; }
            if (keys.s) { this.vx *= 0.92; this.vy *= 0.92; targetWingState = 1.2; }
        }

        // Çekim Alanı
        planets.forEach(p => { // Global planets
            if(!p.collected && p.type.id !== 'toxic') {
                const dx = p.x - this.x; const dy = p.y - this.y;
                const distSq = dx*dx + dy*dy;
                
                // ORANTILI ÇEKİM FİZİĞİ
                // Gezegenin yarıçapının 4 katı kadar bir alandan çeker
                const magnetMult = 1 + (playerData.upgrades.playerMagnet * 0.5);
                const gravityRadius = p.radius * 4 * magnetMult;

                if(distSq < gravityRadius**2 && distSq > p.radius**2) {
                    const force = (p.radius * 5) / distSq; 
                    this.vx += (dx / Math.sqrt(distSq)) * force;
                    this.vy += (dy / Math.sqrt(distSq)) * force;
                }
            }
        });

        const speed = Math.hypot(this.vx, this.vy);
        const speedEl = document.getElementById('speed-val');
        if(speedEl) speedEl.innerText = Math.floor(speed * 10); 
        
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
        
        // Kuyruk Efekti - Dinamik Uzama/Kısalma
        const targetCount = isBoosting ? this.boostTailCount : this.baseTailCount;
        
        // Hedef uzunluğa yumuşak geçiş (Her karede 2 parça ekle/çıkar)
        const transitionSpeed = 2;
        
        if (this.tail.length < targetCount) {
             for(let k=0; k<transitionSpeed; k++) {
                 if (this.tail.length >= targetCount) break;
                 const last = this.tail[this.tail.length - 1];
                 this.tail.push({x: last.x, y: last.y});
             }
        } else if (this.tail.length > targetCount) {
             for(let k=0; k<transitionSpeed; k++) {
                 if (this.tail.length <= targetCount) break;
                 this.tail.pop();
             }
        }

        let targetX = this.x - Math.cos(this.angle) * 20 * this.scale;
        let targetY = this.y - Math.sin(this.angle) * 20 * this.scale;
        this.tail[0].x += (targetX - this.tail[0].x) * 0.5; this.tail[0].y += (targetY - this.tail[0].y) * 0.5;
        for (let i = 1; i < this.tail.length; i++) {
            let prev = this.tail[i-1]; let curr = this.tail[i];
            let dx = prev.x - curr.x; let dy = prev.y - curr.y;
            let d = Math.sqrt(dx*dx + dy*dy); let a = Math.atan2(dy, dx);
            if(d > 5 * this.scale) { curr.x = prev.x - Math.cos(a) * 5 * this.scale; curr.y = prev.y - Math.sin(a) * 5 * this.scale; }
        }
        const coordsEl = document.getElementById('coords');
        if(coordsEl) coordsEl.innerText = `${Math.floor(this.x)} : ${Math.floor(this.y)}`;
    }
    
    draw(ctx) {
        // --- GHOST MODE (GÖRÜNMEZLİK EFEKTİ) ---
        ctx.save();
        // Opaklık artık yumuşak geçişli currentAlpha değerinden alınıyor
        ctx.globalAlpha = this.currentAlpha;

        // --- ENERJİYE GÖRE DOYGUNLUK HESAPLAMA ---
        // Enerji %0 ise doygunluk 0 (gri), %100 ise doygunluk 100 (canlı mavi)
        const energyRatio = Math.max(0, Math.min(1, this.energy / this.maxEnergy));
        const saturation = Math.floor(energyRatio * 90); // 0 ile 90 arasında değişir (çok canlıdan griye)
        const lightness = 60; // Sabit parlaklık
        const alpha = 0.9;
        
        // Dinamik Renkler (HSL: Hue 199 = Sky Blue)
        const dynamicStroke = `hsla(199, ${saturation}%, ${lightness}%, ${alpha})`;
        const dynamicShadow = `hsla(199, ${saturation}%, ${lightness}%, 0.8)`;
        const dynamicLight = `hsla(199, ${saturation}%, 50%, 1)`; // Merkez ışık biraz daha koyu/doygun olabilir

        ctx.beginPath(); ctx.moveTo(this.tail[0].x, this.tail[0].y);
        for(let i=1; i<this.tail.length-1; i++) { let xc = (this.tail[i].x + this.tail[i+1].x) / 2; let yc = (this.tail[i].y + this.tail[i+1].y) / 2; ctx.quadraticCurveTo(this.tail[i].x, this.tail[i].y, xc, yc); }
        
        // Kuyruk rengi de enerjiye bağlı solmalı
        let grad = ctx.createLinearGradient(this.tail[0].x, this.tail[0].y, this.tail[this.tail.length-1].x, this.tail[this.tail.length-1].y);
        grad.addColorStop(0, dynamicStroke); 
        grad.addColorStop(1, "transparent");
        
        ctx.strokeStyle = grad; ctx.lineWidth = 3 * this.scale; ctx.lineCap = 'round'; ctx.stroke();
        
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle + Math.PI/2); ctx.scale(this.scale, this.scale); 
        
        // --- GÖRSEL DEBUG: HİTBOX VE VEKTÖRLER ---
        if (window.gameSettings && window.gameSettings.developerMode) {
            // 1. HITBOX (Çarpışma Sınırı)
            if (window.gameSettings.showHitboxes) {
                // NOT: Gerçek çarpışma yarıçapı scale ile çarpılmalı mı? 
                // VoidRay.js'de collision genellikle 'radius + 30*scale' gibi hesaplanıyor.
                // Burada görselleştirme için yaklaşık bir değer kullanıyoruz.
                const collisionRadius = 30; // Yaklaşık gövde yarıçapı
                
                ctx.save();
                ctx.beginPath();
                ctx.arc(0, 0, collisionRadius, 0, Math.PI * 2);
                ctx.strokeStyle = "rgba(255, 0, 0, 0.7)"; // Kırmızı
                ctx.lineWidth = 2;
                ctx.stroke();

                // Hitbox değeri (Dönmemesi için rotasyonu ters çeviriyoruz)
                // Mevcut rotasyon: this.angle + Math.PI/2
                // Tersini uyguluyoruz: -(this.angle + Math.PI/2)
                ctx.rotate(-(this.angle + Math.PI/2));
                
                ctx.fillStyle = "rgba(255, 0, 0, 0.8)";
                ctx.font = "10px monospace";
                ctx.textAlign = "center";
                // Rotasyon sıfırlandığı için x,y koordinatları geminin merkezine göre ve düzdür
                ctx.fillText(`R: ${collisionRadius}`, 0, collisionRadius + 15);

                ctx.restore();
            }
        }

        if (!window.cinematicMode) {
            const pulse = 20 + Math.sin(Date.now() * 0.01) * 10 * energyRatio; // Pulse şiddeti de enerjiye bağlı
            // Gölge de opaklığa göre azalsın ama tamamen yok olmasın
            const shadowIntensity = Math.max(0.3, this.currentAlpha); 
            ctx.shadowBlur = (30 + pulse) * shadowIntensity; 
            ctx.shadowColor = dynamicShadow; 
        } else {
            ctx.shadowBlur = 10;
            ctx.shadowColor = `hsla(199, ${saturation}%, ${lightness}%, 0.2)`;
        }

        let scaleX = 1 - Math.abs(this.roll) * 0.4; let shiftX = this.roll * 15; let wingTipY = 20 + (this.wingState * 15); let wingTipX = 60 - (this.wingState * 10); let wingFlap = Math.sin(this.wingPhase) * 5;
        
        // Gövde dolgusu (Çok hafif enerjiye tepki verebilir ama genelde koyu kalmalı)
        ctx.fillStyle = `hsla(220, ${saturation * 0.3}%, 10%, 0.95)`; 
        
        ctx.beginPath(); ctx.moveTo(0+shiftX, -30); ctx.bezierCurveTo(15+shiftX, -10, wingTipX+shiftX, wingTipY+wingFlap, 40*scaleX+shiftX, 40); ctx.bezierCurveTo(20+shiftX, 30, 10+shiftX, 40, 0+shiftX, 50); ctx.bezierCurveTo(-10+shiftX, 40, -20+shiftX, 30, -40*scaleX+shiftX, 40); ctx.bezierCurveTo(-wingTipX+shiftX, wingTipY+wingFlap, -15+shiftX, -10, 0+shiftX, -30); ctx.fill();
        
        ctx.strokeStyle = dynamicLight; ctx.lineWidth = 2; ctx.stroke(); 
        
        ctx.fillStyle = window.cinematicMode ? "#475569" : "#e0f2fe"; // Merkez nokta sabit kalabilir veya hafif renk değiştirebilir
        
        if (!window.cinematicMode) {
            // Gölge opaklığa göre
            ctx.shadowBlur = 40 * Math.max(0.3, this.currentAlpha); 
            ctx.shadowColor = dynamicShadow; 
        }
        
        ctx.beginPath(); ctx.arc(0+shiftX, 0, 5, 0, Math.PI*2); ctx.fill(); 
        ctx.restore();

        // --- HIZ VEKTÖRÜNÜ GLOBAL KOORDİNAT SİSTEMİNDE ÇİZME ---
        if (window.gameSettings && window.gameSettings.developerMode && window.gameSettings.showVectors) {
            ctx.save();
            ctx.translate(this.x, this.y); // Gemi merkezine git
            
            // 1. HIZ VEKTÖRÜ (VELOCITY) - SARI
            // Hız eşiği kontrolü
            const speed = Math.hypot(this.vx, this.vy);
            if (speed > 0.1) {
                const speedScale = 20; 
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(this.vx * speedScale, this.vy * speedScale);
                ctx.strokeStyle = "yellow";
                ctx.lineWidth = 2;
                ctx.stroke();

                // Sarı Ok Ucu
                const tipX = this.vx * speedScale;
                const tipY = this.vy * speedScale;
                ctx.beginPath();
                ctx.arc(tipX, tipY, 3, 0, Math.PI*2);
                ctx.fillStyle = "yellow";
                ctx.fill();
                
                // Etiket (Hız)
                ctx.fillStyle = "yellow";
                ctx.font = "10px monospace";
                ctx.fillText("V", tipX + 5, tipY + 5);
            }

            // 2. İTME VEKTÖRÜ (THRUST) - YEŞİL
            // Eğer W tuşuna basılıyorsa veya otopilot hareket ediyorsa
            // Mevcut açı (this.angle) yönünde bir ok çiz
            // Not: keys global bir değişkendir
            if (typeof keys !== 'undefined' && (keys.w || keys[" "] || autopilot)) {
                const thrustLen = 40; // Sabit uzunluk çünkü itme kuvveti genelde sabittir
                const tx = Math.cos(this.angle) * thrustLen;
                const ty = Math.sin(this.angle) * thrustLen;
                
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(tx, ty);
                ctx.strokeStyle = "#4ade80"; // Yeşil
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Yeşil Ok Ucu
                ctx.beginPath();
                ctx.arc(tx, ty, 3, 0, Math.PI*2);
                ctx.fillStyle = "#4ade80";
                ctx.fill();
                
                // Etiket (Thrust)
                ctx.fillStyle = "#4ade80";
                ctx.fillText("T", tx + 5, ty + 5);
            }

            // 3. YÖNELİM ÇİZGİSİ (HEADING) - MAVİ/BEYAZ KESİKLİ
            const headLen = 60;
            const hx = Math.cos(this.angle) * headLen;
            const hy = Math.sin(this.angle) * headLen;
            
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(hx, hy);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 4]); // Kesikli çizgi
            ctx.stroke();
            ctx.setLineDash([]); // Normale dön

            ctx.restore();
        }
        
        ctx.restore();
    }
}