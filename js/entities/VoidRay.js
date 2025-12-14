/**
 * Void Ray - Varlık Sınıfı: VOID RAY (OYUNCU)
 * * GÜNCELLEME: AI çağrısı window.AIManager üzerinden güvenli hale getirildi.
 */
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
        
        this.maxXp = GAME_CONFIG.PLAYER.BASE_XP; 
        
        // Başlangıç değerlerini ata (Update döngüsünde güncellenecek)
        this.energy = GAME_CONFIG.PLAYER.BASE_ENERGY; 
        this.maxEnergy = GAME_CONFIG.PLAYER.BASE_ENERGY;
        this.health = GAME_CONFIG.PLAYER.BASE_HEALTH;
        this.maxHealth = GAME_CONFIG.PLAYER.BASE_HEALTH;
        
        this.outOfBoundsTimer = 0; 
        
        this.baseTailCount = GAME_CONFIG.PLAYER.BASE_TAIL_COUNT;
        this.boostTailCount = GAME_CONFIG.PLAYER.BOOST_TAIL_COUNT; 
        this.tail = []; 
        for(let i=0; i<this.baseTailCount; i++) this.tail.push({x:this.x, y:this.y});
        
        this.scanRadius = GAME_CONFIG.PLAYER.SCAN_RADIUS;
        this.radarRadius = GAME_CONFIG.PLAYER.RADAR_RADIUS; 
        
        this.idleTimer = 0;
        this.isGhost = false;
        this.currentAlpha = 1.0; 

        // AI Hedefleri (Görsel çizim referansları)
        this.debugTarget = null; 
        this.scoutTarget = null; 
        
        // Çekim Uyarı Durumu
        this.gravityPull = null; 
    }
    
    getStatBonus(statId) {
        let total = 0;
        if (typeof playerData !== 'undefined' && playerData.equipment) {
            Object.values(playerData.equipment).forEach(item => {
                if (item && item.stats) {
                    item.stats.forEach(stat => {
                        if (stat.id === statId) total += stat.val;
                    });
                }
            });
        }
        return total;
    }

    gainXp(amount) { 
        const xpBonus = this.getStatBonus('xp_gain');
        const finalAmount = amount * (1 + xpBonus / 100);
        this.xp += finalAmount; 
        if(this.xp >= this.maxXp) this.levelUp(); 
        this.updateUI(); 
    }
    
    levelUp() {
        this.level++; 
        this.xp = 0; 
        this.maxXp = GameRules.calculateNextLevelXp(this.maxXp);
        this.health = this.maxHealth; 
        window.eventBus.emit('player:levelup', { level: this.level });
        if (!echoRay && (this.level === 3 || (this.level > 3 && this.level >= echoDeathLevel + 3))) spawnEcho(this.x, this.y);
    }
    
    takeDamage(amount) {
        if (window.gameSettings && window.gameSettings.godMode) return;
        this.health = Math.max(0, this.health - amount);
        if (typeof showDamageEffect === 'function') showDamageEffect();
        if (this.health <= 0) this.die();
    }

    die() {
        const deathScreen = document.getElementById('death-screen');
        if(deathScreen) deathScreen.classList.add('active');
        isPaused = true; 
        setTimeout(() => this.respawn(), 3000);
    }

    respawn() {
        this.updateStats();
        this.health = this.maxHealth;
        this.energy = this.maxEnergy;
        this.vx = 0; this.vy = 0;
        this.outOfBoundsTimer = 0;
        this.x = GameRules.LOCATIONS.PLAYER_RESPAWN.x; 
        this.y = GameRules.LOCATIONS.PLAYER_RESPAWN.y;
        this.isGhost = false; this.idleTimer = 0; this.currentAlpha = 1.0; 
        this.debugTarget = null; 
        
        // AI Sıfırla (Güvenli Erişim)
        if (window.AIManager && window.AIManager.active) {
            window.AIManager.toggle(); 
        }
        
        const deathScreen = document.getElementById('death-screen');
        if(deathScreen) deathScreen.classList.remove('active');
        const radOverlay = document.getElementById('radiation-overlay');
        if(radOverlay) radOverlay.classList.remove('active');
        const radWarn = document.getElementById('radiation-warning');
        if(radWarn) radWarn.style.display = 'none';
        
        isPaused = false;
        showNotification({name: "SİSTEMLER YENİDEN BAŞLATILDI", type:{color:'#10b981'}}, "");
    }
    
    updateUI() {
        const lvlVal = document.getElementById('level-val');
        if(lvlVal) lvlVal.innerText = this.level;
        const xpFill = document.getElementById('xp-fill');
        if(xpFill) xpFill.style.width = `${(this.xp/this.maxXp)*100}%`;
        const dustAmt = document.getElementById('stardust-amount');
        if(dustAmt) dustAmt.innerText = playerData.stardust;
    }

    updateStats() {
        const baseMaxHealth = GAME_CONFIG.PLAYER.BASE_HEALTH + ((this.level - 1) * 20);
        const baseMaxEnergy = GAME_CONFIG.PLAYER.BASE_ENERGY;
        const bonusHP = this.getStatBonus('hull_hp');
        const bonusEnergy = this.getStatBonus('energy_max');
        const newMaxHealth = baseMaxHealth + bonusHP;
        const newMaxEnergy = baseMaxEnergy + bonusEnergy;

        if (this.maxHealth !== newMaxHealth) {
            const ratio = this.health / this.maxHealth;
            this.maxHealth = newMaxHealth;
            this.health = this.maxHealth * ratio;
        } else {
            this.maxHealth = newMaxHealth;
        }

        if (this.maxEnergy !== newMaxEnergy) {
            this.maxEnergy = newMaxEnergy;
            if (this.energy > this.maxEnergy) this.energy = this.maxEnergy;
        } else {
            this.maxEnergy = newMaxEnergy;
        }
    }
    
    update(dt = 16) { 
        this.updateStats();

        // Bonuslar
        const bonusSpeedPct = this.getStatBonus('thrust');
        const bonusTurnPct = this.getStatBonus('maneuver');
        const bonusMagnetPct = this.getStatBonus('magnet');
        const bonusRadarKm = this.getStatBonus('radar_range');
        const bonusEnergyRegenPct = this.getStatBonus('energy_regen');
        const bonusRadResPct = this.getStatBonus('rad_res');
        const bonusGravityResPct = this.getStatBonus('gravity_res');
        const bonusFuelSavePct = this.getStatBonus('fuel_save');

        const spdMult = (1 + (playerData.upgrades.playerSpeed * 0.15)) * (1 + bonusSpeedPct / 100);
        const turnMult = (1 + (playerData.upgrades.playerTurn * 0.2)) * (1 + bonusTurnPct / 100);
        const magnetMult = (1 + (playerData.upgrades.playerMagnet * 0.1)) * (1 + bonusMagnetPct / 100);
        
        this.scanRadius = GAME_CONFIG.PLAYER.SCAN_RADIUS * magnetMult;
        this.radarRadius = (GAME_CONFIG.PLAYER.RADAR_RADIUS + (bonusRadarKm * 1000)) * magnetMult;

        const isBoosting = keys[" "] && this.energy > 0 && !window.cinematicMode;
        const BOOST = isBoosting ? 0.6 : 0; 
        let ACCEL = (0.2 + BOOST) * (1 + bonusSpeedPct / 200);
        
        const MAX_SPEED = (keys[" "] ? 18 : 10) * spdMult; 
        const TURN_SPEED = 0.05 * turnMult; 
        
        // --- RADYASYON ---
        const isOutOfBounds = this.x < 0 || this.x > WORLD_SIZE || this.y < 0 || this.y > WORLD_SIZE;
        if (isOutOfBounds) {
            this.outOfBoundsTimer++;
            let damage = GameRules.calculateRadiationDamage(this.outOfBoundsTimer);
            if (bonusRadResPct > 0) damage *= Math.max(0.1, 1 - (bonusRadResPct / 100));
            this.takeDamage(damage);

            if (this.outOfBoundsTimer > 120) {
                const centerX = WORLD_SIZE / 2;
                const centerY = WORLD_SIZE / 2;
                const angleToCenter = Math.atan2(centerY - this.y, centerX - this.x);
                const pushForce = GameRules.calculateVoidPushForce(this.outOfBoundsTimer);
                this.vx += Math.cos(angleToCenter) * pushForce;
                this.vy += Math.sin(angleToCenter) * pushForce;
            }
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

        // --- ENERJİ ---
        const fuelConsumptionMult = Math.max(0.1, 1 - (bonusFuelSavePct / 100));
        if (isBoosting) {
            const cost = GAME_CONFIG.PLAYER.ENERGY_COST.BOOST * fuelConsumptionMult;
            if (!window.gameSettings || !window.gameSettings.godMode) this.energy = Math.max(0, this.energy - cost); 
            if(playerData.stats) playerData.stats.totalEnergySpent += cost;
        } else if (Math.hypot(this.vx, this.vy) > 2) {
            const cost = GAME_CONFIG.PLAYER.ENERGY_COST.MOVE * fuelConsumptionMult;
            if (!window.gameSettings || !window.gameSettings.godMode) this.energy = Math.max(0, this.energy - cost);
            if(playerData.stats) playerData.stats.totalEnergySpent += cost;
        } else {
            if (!isOutOfBounds) {
                const regenAmount = GAME_CONFIG.PLAYER.ENERGY_COST.REGEN * (1 + bonusEnergyRegenPct / 100);
                this.energy = Math.min(this.maxEnergy, this.energy + regenAmount);
            }
        }
        
        if (this.energy < 10 && !lowEnergyWarned) lowEnergyWarned = true;
        else if (this.energy > 15) lowEnergyWarned = false;
        if (this.energy <= 0 && isBoosting) ACCEL = 0.2; 

        // UI Barlar
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

        // --- KONTROL MANTIĞI ---
        let targetRoll = 0; let targetWingState = 0;
        const isInputActive = keys.w || keys.a || keys.s || keys.d || keys[" "];
        const currentSpeed = Math.hypot(this.vx, this.vy);
        
        // --- 1. OTO-PİLOT KONTROLÜ (AIManager) ---
        // AIManager'ın varlığını kontrol et
        if (window.AIManager && window.AIManager.active && !window.cinematicMode) {
            // Kontrolü tamamen Manager'a devret
            window.AIManager.update(this, dt);
            
            // Görsel Debug verilerini al
            this.scoutTarget = window.AIManager.scoutTarget;
            this.debugTarget = window.AIManager.debugTarget;
            
            // AI aktifken buton uyarısı (Eğer oyuncu tuşlara basarsa)
            if (keys.w || keys.a || keys.s || keys.d) {
                const aiBtn = document.getElementById('btn-ai-toggle');
                if (aiBtn && !aiBtn.classList.contains('warn-blink')) aiBtn.classList.add('warn-blink');
            } else {
                const aiBtn = document.getElementById('btn-ai-toggle');
                if (aiBtn && aiBtn.classList.contains('warn-blink')) aiBtn.classList.remove('warn-blink');
            }
        } 
        // --- 2. MANUEL KONTROL ---
        else {
            if (window.cinematicMode) {
                this.vx *= 0.95; this.vy *= 0.95;
                this.wingPhase += 0.02; targetWingState = 0; 
            } else {
                if (keys.a) { this.angle -= TURN_SPEED; targetRoll = -0.5 * 0.6; }
                if (keys.d) { this.angle += TURN_SPEED; targetRoll = 0.5 * 0.6; }
                if (keys.w || isBoosting) {
                    this.vx += Math.cos(this.angle) * ACCEL; this.vy += Math.sin(this.angle) * ACCEL;
                    targetWingState = -0.8; this.wingPhase += 0.2;
                } else { this.wingPhase += 0.05; }
                if (keys.s) { this.vx *= 0.92; this.vy *= 0.92; targetWingState = 1.2; }
                
                // Manuel modda scout target'ı temizle
                this.scoutTarget = null;
                this.debugTarget = null;
            }
        }

        // --- IDLE / GHOST MODU ---
        let targetAlpha = 1.0;
        // AIManager kontrolü
        const isAIActive = window.AIManager ? window.AIManager.active : false;
        
        if (!isAIActive && !isInputActive && currentSpeed < 0.5) {
            this.idleTimer++;
            if (this.idleTimer > 120) {
                if (!this.isGhost) {
                     this.isGhost = true;
                     if(playerData.stats) playerData.stats.timeIdle += dt;
                }
                const breath = (Math.sin(Date.now() * 0.003) + 1) * 0.5; 
                targetAlpha = 0.10 + (breath * 0.15); 
            }
        } else {
            if (this.isGhost) this.isGhost = false;
            this.idleTimer = 0;
            targetAlpha = 1.0;
        }
        this.currentAlpha += (targetAlpha - this.currentAlpha) * 0.02;

        // --- YERÇEKİMİ ---
        if (entityManager && entityManager.grid) {
            const gravityQueryRange = 3000;
            const nearbyPlanets = entityManager.grid.query(this.x, this.y, gravityQueryRange);
            nearbyPlanets.forEach(p => { 
                if(!p.collected && p.type.id !== 'toxic') {
                    const dx = p.x - this.x; const dy = p.y - this.y;
                    const distSq = dx*dx + dy*dy;
                    let magnetMult = (1 + (playerData.upgrades.playerMagnet * 0.5));
                    const gravityRadius = p.radius * 4 * magnetMult;
                    if(distSq < gravityRadius**2 && distSq > p.radius**2) {
                        let force = (p.radius * 5) / distSq;
                        if (bonusGravityResPct > 0) force *= Math.max(0.1, 1 - (bonusGravityResPct / 100));
                        this.vx += (dx / Math.sqrt(distSq)) * force;
                        this.vy += (dy / Math.sqrt(distSq)) * force;
                    }
                }
            });
        }

        // --- SOLUCAN DELİĞİ ---
        this.gravityPull = null; 
        if (typeof entityManager !== 'undefined' && entityManager.wormholes) {
            const wGravityRadius = (GAME_CONFIG.WORMHOLE && GAME_CONFIG.WORMHOLE.GRAVITY_RADIUS) || 3500;
            const wGravityForce = (GAME_CONFIG.WORMHOLE && GAME_CONFIG.WORMHOLE.GRAVITY_FORCE) || 180;
            entityManager.wormholes.forEach(w => {
                const dx = w.x - this.x; const dy = w.y - this.y;
                const distSq = dx*dx + dy*dy;
                if (distSq < wGravityRadius * wGravityRadius && distSq > 100) { 
                    const dist = Math.sqrt(distSq);
                    let force = wGravityForce / dist; 
                    if (bonusGravityResPct > 0) force *= Math.max(0.1, 1 - (bonusGravityResPct / 100));
                    this.vx += (dx / dist) * force;
                    this.vy += (dy / dist) * force;
                    if (!this.gravityPull || force > this.gravityPull.force) {
                        this.gravityPull = { angle: Math.atan2(dy, dx), force: force };
                    }
                }
            });
        }

        // --- FİZİK GÜNCELLEME ---
        const speed = Math.hypot(this.vx, this.vy);
        const speedEl = document.getElementById('speed-val');
        if(speedEl) speedEl.innerText = Math.floor(speed * 10); 
        
        if (playerData.stats) {
            if (speed > playerData.stats.maxSpeed) playerData.stats.maxSpeed = speed;
            playerData.stats.distance += speed;
            if (speed > 0.1) playerData.stats.timeMoving += dt;
            else playerData.stats.timeIdle += dt;
        }
        
        if (speed > MAX_SPEED) { this.vx = (this.vx/speed)*MAX_SPEED; this.vy = (this.vy/speed)*MAX_SPEED; }
        
        this.vx *= 0.98; this.vy *= 0.98; 
        this.x += this.vx; this.y += this.vy;

        this.roll += (targetRoll - this.roll) * 0.05; this.wingState += (targetWingState - this.wingState) * 0.1;
        
        // Kuyruk
        const targetCount = isBoosting ? this.boostTailCount : this.baseTailCount;
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

        let tX = this.x - Math.cos(this.angle) * 20 * this.scale;
        let tY = this.y - Math.sin(this.angle) * 20 * this.scale;
        this.tail[0].x += (tX - this.tail[0].x) * 0.5; this.tail[0].y += (tY - this.tail[0].y) * 0.5;
        for (let i = 1; i < this.tail.length; i++) {
            let prev = this.tail[i-1]; let curr = this.tail[i];
            let dx = prev.x - curr.x; let dy = prev.y - curr.y;
            let d = Utils.dist(prev.x, prev.y, curr.x, curr.y); let a = Math.atan2(dy, dx);
            if(d > 5 * this.scale) { curr.x = prev.x - Math.cos(a) * 5 * this.scale; curr.y = prev.y - Math.sin(a) * 5 * this.scale; }
        }
        const coordsEl = document.getElementById('coords');
        if(coordsEl) coordsEl.innerText = `${Math.floor(this.x)} : ${Math.floor(this.y)}`;
    }
    
    // Çizim fonksiyonu
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.currentAlpha;
        let baseHue = 199; let baseSat = 100;
        if (window.gameSettings) {
            if (typeof window.gameSettings.themeHue !== 'undefined') baseHue = window.gameSettings.themeHue;
            if (typeof window.gameSettings.themeSat !== 'undefined') baseSat = window.gameSettings.themeSat;
        }
        const energyRatio = Math.max(0, Math.min(1, this.energy / this.maxEnergy));
        const saturation = Math.floor(energyRatio * baseSat); 
        const lightness = 60; const alpha = 0.9;
        const dynamicStroke = `hsla(${baseHue}, ${saturation}%, ${lightness}%, ${alpha})`;
        const dynamicShadow = `hsla(${baseHue}, ${saturation}%, ${lightness}%, 0.8)`;
        const dynamicLight = `hsla(${baseHue}, ${saturation}%, 50%, 1)`; 
        const isHidden = window.gameSettings && window.gameSettings.hidePlayer;

        if (!isHidden) {
            ctx.beginPath(); ctx.moveTo(this.tail[0].x, this.tail[0].y);
            for(let i=1; i<this.tail.length-1; i++) { let xc = (this.tail[i].x + this.tail[i+1].x) / 2; let yc = (this.tail[i].y + this.tail[i+1].y) / 2; ctx.quadraticCurveTo(this.tail[i].x, this.tail[i].y, xc, yc); }
            let grad = ctx.createLinearGradient(this.tail[0].x, this.tail[0].y, this.tail[this.tail.length-1].x, this.tail[this.tail.length-1].y);
            grad.addColorStop(0, dynamicStroke); grad.addColorStop(1, "transparent");
            ctx.strokeStyle = grad; ctx.lineWidth = 3 * this.scale; ctx.lineCap = 'round'; ctx.stroke();
        }
        
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle + Math.PI/2); ctx.scale(this.scale, this.scale); 
        
        if (window.gameSettings && window.gameSettings.developerMode) {
            if (window.gameSettings.showHitboxes) {
                const collisionRadius = 30; 
                ctx.save();
                ctx.beginPath();
                ctx.arc(0, 0, collisionRadius, 0, Math.PI * 2);
                ctx.strokeStyle = "rgba(255, 0, 0, 0.7)"; ctx.lineWidth = 2; ctx.stroke();
                ctx.rotate(-(this.angle + Math.PI/2));
                ctx.fillStyle = "rgba(255, 0, 0, 0.8)"; ctx.font = "10px monospace"; ctx.textAlign = "center";
                ctx.fillText(`R: ${collisionRadius}`, 0, collisionRadius + 15);
                ctx.restore();
            }
        }

        if (!isHidden) {
            if (!window.cinematicMode) {
                const pulse = 20 + Math.sin(Date.now() * 0.01) * 10 * energyRatio; 
                const shadowIntensity = Math.max(0.3, this.currentAlpha); 
                ctx.shadowBlur = (30 + pulse) * shadowIntensity; ctx.shadowColor = dynamicShadow; 
            } else {
                ctx.shadowBlur = 10; ctx.shadowColor = `hsla(199, ${saturation}%, ${lightness}%, 0.2)`;
            }
            let scaleX = 1 - Math.abs(this.roll) * 0.4; let shiftX = this.roll * 15; let wingTipY = 20 + (this.wingState * 15); let wingTipX = 60 - (this.wingState * 10); let wingFlap = Math.sin(this.wingPhase) * 5;
            ctx.fillStyle = `hsla(${baseHue}, ${saturation * 0.3}%, 10%, 0.95)`; 
            ctx.beginPath(); ctx.moveTo(0+shiftX, -30); ctx.bezierCurveTo(15+shiftX, -10, wingTipX+shiftX, wingTipY+wingFlap, 40*scaleX+shiftX, 40); ctx.bezierCurveTo(20+shiftX, 30, 10+shiftX, 40, 0+shiftX, 50); ctx.bezierCurveTo(-10+shiftX, 40, -20+shiftX, 30, -40*scaleX+shiftX, 40); ctx.bezierCurveTo(-wingTipX+shiftX, wingTipY+wingFlap, -15+shiftX, -10, 0+shiftX, -30); ctx.fill();
            ctx.strokeStyle = dynamicLight; ctx.lineWidth = 2; ctx.stroke(); 
            ctx.fillStyle = window.cinematicMode ? "#475569" : "#e0f2fe"; 
            if (!window.cinematicMode) { ctx.shadowBlur = 40 * Math.max(0.3, this.currentAlpha); ctx.shadowColor = dynamicShadow; }
            ctx.beginPath(); ctx.arc(0+shiftX, 0, 5, 0, Math.PI*2); ctx.fill(); 
        }
        ctx.restore();

        if (this.gravityPull && !isHidden) {
            ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.gravityPull.angle);
            ctx.strokeStyle = "rgba(167, 139, 250, 0.9)"; ctx.lineWidth = 2; ctx.shadowBlur = 5; ctx.shadowColor = "rgba(139, 92, 246, 0.8)";
            const time = Date.now() / 200; const offset = (time % 1) * 15; 
            for(let i=0; i<3; i++) { const xDist = 60 + (i * 12) + offset; ctx.beginPath(); ctx.moveTo(xDist, -6); ctx.lineTo(xDist + 8, 0); ctx.lineTo(xDist, 6); ctx.stroke(); }
            ctx.restore();
        }

        if (window.gameSettings && window.gameSettings.showShipBars && !isHidden) {
            ctx.save(); ctx.translate(this.x, this.y);
            const barW = 60; const barH = 6; const offset = -60;
            ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(-barW/2, offset, barW, barH * 2 + 2); 
            const hpPct = this.health / this.maxHealth;
            ctx.fillStyle = hpPct > 0.5 ? "#10b981" : (hpPct > 0.2 ? "#f59e0b" : "#ef4444");
            ctx.fillRect(-barW/2 + 1, offset + 1, (barW - 2) * hpPct, barH);
            const epPct = this.energy / this.maxEnergy;
            ctx.fillStyle = dynamicLight; 
            ctx.fillRect(-barW/2 + 1, offset + barH + 1, (barW - 2) * epPct, barH);
            ctx.restore();
        }

        if (window.gameSettings && window.gameSettings.developerMode) {
            ctx.save(); ctx.translate(this.x, this.y); 
            if (window.gameSettings.showVectors) {
                const speed = Math.hypot(this.vx, this.vy);
                if (speed > 0.1) {
                    const speedScale = 20; 
                    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(this.vx * speedScale, this.vy * speedScale);
                    ctx.strokeStyle = "yellow"; ctx.lineWidth = 2; ctx.stroke();
                    ctx.beginPath(); ctx.arc(this.vx * speedScale, this.vy * speedScale, 3, 0, Math.PI*2); ctx.fillStyle = "yellow"; ctx.fill();
                    ctx.fillStyle = "yellow"; ctx.font = "10px monospace"; ctx.fillText("V", this.vx * speedScale + 5, this.vy * speedScale + 5);
                }
                if (typeof keys !== 'undefined' && (keys.w || keys[" "] || (window.AIManager && window.AIManager.active))) {
                    const thrustLen = 40; const tx = Math.cos(this.angle) * thrustLen; const ty = Math.sin(this.angle) * thrustLen;
                    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(tx, ty); ctx.strokeStyle = "#4ade80"; ctx.lineWidth = 2; ctx.stroke();
                    ctx.beginPath(); ctx.arc(tx, ty, 3, 0, Math.PI*2); ctx.fillStyle = "#4ade80"; ctx.fill();
                    ctx.fillStyle = "#4ade80"; ctx.fillText("T", tx + 5, ty + 5);
                }
                const headLen = 60; const hx = Math.cos(this.angle) * headLen; const hy = Math.sin(this.angle) * headLen;
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(hx, hy); ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"; ctx.lineWidth = 1; ctx.setLineDash([2, 4]); ctx.stroke(); ctx.setLineDash([]); 
            }
            if (window.gameSettings.showTargetVectors && this.debugTarget) {
                 const relTx = this.debugTarget.x - this.x; const relTy = this.debugTarget.y - this.y;
                 const targetAngle = Math.atan2(relTy, relTx);
                 ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(relTx, relTy); ctx.strokeStyle = "rgba(56, 189, 248, 0.4)"; ctx.lineWidth = 1; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
                 ctx.beginPath(); ctx.arc(relTx, relTy, 5, 0, Math.PI*2); ctx.fillStyle = "rgba(56, 189, 248, 0.8)"; ctx.fill();
                 ctx.fillStyle = "rgba(56, 189, 248, 0.8)"; ctx.font = "10px monospace"; ctx.fillText("AI TARGET", relTx + 8, relTy);
                 let hDiff = targetAngle - this.angle; while (hDiff < -Math.PI) hDiff += Math.PI * 2; while (hDiff > Math.PI) hDiff -= Math.PI * 2;
                 const hDeg = (hDiff * 180 / Math.PI).toFixed(1);
                 const arcRadius = 40; ctx.beginPath(); ctx.arc(0, 0, arcRadius, this.angle, this.angle + hDiff, hDiff < 0);
                 const absHDeg = Math.abs(parseFloat(hDeg));
                 let hColor; if (absHDeg < 5) hColor = "rgba(74, 222, 128, 0.8)"; else if (absHDeg < 45) hColor = "rgba(250, 204, 21, 0.8)"; else hColor = "rgba(248, 113, 113, 0.8)"; 
                 ctx.strokeStyle = hColor; ctx.lineWidth = 3; ctx.stroke();
                 ctx.fillStyle = hColor; ctx.font = "bold 12px monospace"; ctx.fillText(`HEAD: ${hDeg}°`, 45, -20); 
            }
            ctx.restore();
        }
        ctx.restore();
    }
}