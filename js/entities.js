/**
 * Oyun Varlıkları (Entities)
 * Nexus, VoidRay (Oyuncu), EchoRay (Yankı), Gezegenler ve Parçacık efektlerini içerir.
 */

// Nexus Sınıfı
class Nexus {
    constructor() { this.x = WORLD_SIZE/2; this.y = WORLD_SIZE/2; this.radius = 300; this.rotation = 0; }
    update() {
        this.rotation += 0.002;
        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        
        if (dist < this.radius + 200 && !nexusOpen) { 
            document.getElementById('merge-prompt').innerText = "[E] NEXUS'A GİRİŞ YAP";
            document.getElementById('merge-prompt').className = 'visible';
            if(keys.e && !window.cinematicMode) { enterNexus(); keys.e = false; }
        } else if (nexusOpen || (echoRay && !echoRay.attached && Math.hypot(player.x-echoRay.x, player.y-echoRay.y) < 300)) {
            if(nexusOpen) document.getElementById('merge-prompt').className = '';
        } else {
             document.getElementById('merge-prompt').className = '';
        }
    }
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

// VoidRay (Oyuncu) Sınıfı
class VoidRay {
    constructor() {
        this.x = WORLD_SIZE/2 + 600; this.y = WORLD_SIZE/2 + 600;
        this.vx = 0; this.vy = 0; this.angle = -Math.PI/2;
        this.roll = 0; this.wingState = 0; this.wingPhase = 0;
        this.scale = 1; this.level = 1; this.xp = 0; this.maxXp = 150; 
        this.energy = 100; this.maxEnergy = 100;
        this.tail = []; for(let i=0; i<20; i++) this.tail.push({x:this.x, y:this.y});
        
        // Radar Yapılandırması
        this.scanRadius = 4000; 
        this.radarRadius = 10000; 
    }
    
    gainXp(amount) { this.xp += amount; if(this.xp >= this.maxXp) this.levelUp(); this.updateUI(); }
    levelUp() {
        this.level++; this.xp = 0; this.maxXp *= 1.5; this.scale += 0.1; 
        audio.playEvolve(); showNotification({name: `EVRİM GEÇİRİLDİ: SEVİYE ${this.level}`, type:{color:'#fff'}}, "");
        if (!echoRay && (this.level === 3 || (this.level > 3 && this.level >= echoDeathLevel + 3))) spawnEcho(this.x, this.y);
    }
    updateUI() {
        document.getElementById('level-val').innerText = this.level;
        document.getElementById('xp-fill').style.width = `${(this.xp/this.maxXp)*100}%`;
        document.getElementById('stardust-amount').innerText = playerData.stardust;
    }
    update(dt = 16) { 
        const spdMult = 1 + (playerData.upgrades.playerSpeed * 0.15);
        const turnMult = 1 + (playerData.upgrades.playerTurn * 0.2);
        
        // Yükseltmelere göre değerlerin güncellenmesi
        const magnetMult = 1 + (playerData.upgrades.playerMagnet * 0.1);
        
        this.scanRadius = 4000 * magnetMult * (1 + this.scale * 0.1);
        this.radarRadius = 10000 * magnetMult * (1 + this.scale * 0.1);

        const BOOST = keys[" "] ? 0.6 : 0; 
        let ACCEL = 0.2 + BOOST;
        
        const MAX_SPEED = (keys[" "] ? 18 : 10) * (1 + this.scale * 0.05) * spdMult; 
        const TURN_SPEED = (0.05 / Math.sqrt(this.scale)) * turnMult; 
        
        if (keys[" "] && this.energy > 0 && !window.cinematicMode) {
             const cost = 0.05;
             this.energy = Math.max(0, this.energy - cost); 
             if(playerData.stats) playerData.stats.totalEnergySpent += cost;
        } else if (Math.hypot(this.vx, this.vy) > 2) {
             const cost = 0.002;
             this.energy = Math.max(0, this.energy - cost);
             if(playerData.stats) playerData.stats.totalEnergySpent += cost;
        } else {
             this.energy = Math.min(this.maxEnergy, this.energy + 0.01);
        }
        
        if (this.energy < 10 && !lowEnergyWarned) {
            lowEnergyWarned = true;
        } else if (this.energy > 15) {
            lowEnergyWarned = false;
        }

        if (this.energy <= 0 && keys[" "]) {
            ACCEL = 0.2; 
        }

        const bar = document.getElementById('energy-bar-fill');
        bar.style.width = (this.energy/this.maxEnergy*100) + '%';
        if(this.energy < 20) bar.style.background = '#ef4444';
        else bar.style.background = '#38bdf8';

        let targetRoll = 0; let targetWingState = 0;

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

        if (window.cinematicMode) {
            this.vx *= 0.95; 
            this.vy *= 0.95;
            this.wingPhase += 0.02; 
            targetWingState = 0; 
        } else if (autopilot) {
            let targetX, targetY, doThrust = true;
            if (aiMode === 'base') {
                 targetX = nexus.x; targetY = nexus.y;
                 const distToNexus = Math.hypot(this.x - nexus.x, this.y - nexus.y);
                 if(distToNexus < 400) doThrust = false;
            } else if (aiMode === 'travel' && manualTarget) {
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
                aiMode = 'gather';
                let nearest = null, minDist = Infinity;
                for(let p of planets) {
                    if(!p.collected && p.type.id !== 'toxic') {
                        const d = (p.x-this.x)**2 + (p.y-this.y)**2;
                        if(d < minDist) { minDist = d; nearest = p; }
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
        
        // İstatistiklerin Güncellenmesi
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
        
        // Motor Görsel Efektleri
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

// EchoRay (Yankı) Sınıfı
class EchoRay {
    constructor(x, y) { 
        this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.angle = 0; 
        this.lootBag = []; this.attached = false; this.mode = 'roam'; 
        this.energy = 100;
        this.energyDisplayTimer = 0; 
        // Radar Yapılandırması
        this.scanRadius = 4000;
        this.radarRadius = 10000;
    }
    update() {
        const rangeMult = 1 + (playerData.upgrades.echoRange * 0.3);
        
        // Yükseltmelere göre değerlerin güncellenmesi
        this.scanRadius = 4000 * rangeMult;
        this.radarRadius = 10000 * rangeMult;

        const durabilityMult = 1 + (playerData.upgrades.echoDurability * 0.5);
        const drain = 0.005 / durabilityMult; 
        
        if (this.mode !== 'recharge') {
            this.energy = Math.max(0, this.energy - drain);
        }

        if (this.energyDisplayTimer > 0) this.energyDisplayTimer--;

        if (this.energy < 10 && this.mode !== 'recharge' && !this.attached) {
            const fuelIndex = this.lootBag.findIndex(i => i.name === 'Nebula Özü');
            if (fuelIndex !== -1) {
                this.lootBag.splice(fuelIndex, 1);
                this.energy = 100;
                showNotification({name: "YANKI: NEBULA ÖZÜ TÜKETTİ (+%100 ENERJİ)", type:{color:'#c084fc'}}, "");
                if(echoInvOpen) renderEchoInventory();
            } else {
                this.mode = 'recharge';
                showNotification({name: "YANKI: ENERJİ BİTTİ, ÜSSE DÖNÜYOR", type:{color:'#fbbf24'}}, "");
                updateEchoDropdownUI();
            }
        }

        const badge = document.getElementById('echo-total-badge'); const count = this.lootBag.length; badge.innerText = count; badge.style.display = count > 0 ? 'flex' : 'none';
        
        let targetX, targetY;

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
        } else if (this.attached || this.mode === 'return') {
            const target = this.attached ? player.tail[player.tail.length - 1] : player;
            targetX = target.x; targetY = target.y;
        } else {
            let nearest = null, minDist = Infinity;
            for(let p of planets) {
                if(!p.collected && p.type.id !== 'toxic' && p.type.id !== 'lost') {
                    const d = (p.x-this.x)**2 + (p.y-this.y)**2;
                    if(d < minDist) { minDist = d; nearest = p; }
                }
            }
            if(nearest) { targetX = nearest.x; targetY = nearest.y; }
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
                     const thrust = (this.mode === 'recharge') ? 0.8 : 0.5;
                     this.vx += Math.cos(targetA) * thrust; this.vy += Math.sin(targetA) * thrust;
                }
            }
        } else {
             this.angle += (Math.random()-0.5)*0.1; this.vx += Math.cos(this.angle)*0.1; this.vy += Math.sin(this.angle)*0.1;
        }

        const speedMult = 1 + (playerData.upgrades.echoSpeed * 0.15);
        const MAX_ECHO_SPEED = 8 * speedMult; 
        const currentSpeed = Math.hypot(this.vx, this.vy);
        
        // İstatistiklerin Güncellenmesi
        if (playerData.stats) {
            if (currentSpeed > playerData.stats.echoMaxSpeed) {
                playerData.stats.echoMaxSpeed = currentSpeed;
            }
        }

        if(currentSpeed > MAX_ECHO_SPEED) { this.vx = (this.vx/currentSpeed) * MAX_ECHO_SPEED; this.vy = (this.vy/currentSpeed) * MAX_ECHO_SPEED; }
        this.vx *= 0.96; this.vy *= 0.96; 
        
        if (!this.attached) {
            this.x += this.vx; this.y += this.vy;
            if (this.mode !== 'recharge') {
                const rangeMult = 1 + (playerData.upgrades.echoRange * 0.3);
                const pickupRange = 40 * rangeMult;
                for(let p of planets) {
                    if(!p.collected && p.type.id !== 'toxic' && p.type.id !== 'lost') {
                        const d = Math.hypot(this.x-p.x, this.y-p.y);
                        if(d < p.radius + pickupRange) { 
                            p.collected = true; 
                            if(p.type.id === 'tardigrade') {
                                this.lootBag.push(p);
                            } else {
                                const count = Math.floor(Math.random() * 4) + 1; 
                                for(let i=0; i<count; i++) this.lootBag.push(p); 
                            }
                            if(echoInvOpen) renderEchoInventory(); 
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

// Planet (Gezegen/Nesne) Sınıfı
class Planet {
    constructor(x, y, type, lootContent = []) {
        this.x = x !== undefined ? x : Math.random()*WORLD_SIZE; this.y = y !== undefined ? y : Math.random()*WORLD_SIZE; this.collected = false;
        if (type) { this.type = type; this.lootContent = lootContent; } 
        else { 
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
    
    // Çizim Fonksiyonu
    draw(ctx, visibility = 2) {
        if(this.collected) return;
        if(visibility === 0) return; 

        // Radar Menzili (Kısmi Görünürlük)
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

        // Tarama Menzili (Tam Görünürlük)
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

// Particle (Parçacık) Sınıfı
class Particle {
    constructor(x, y, color) { this.x = x; this.y = y; this.color = color; this.vx = (Math.random()-0.5)*3; this.vy = (Math.random()-0.5)*3; this.life = 1.0; this.radius = Math.random() * 5 + 3; this.growth = 0.15; }
    update() { this.x+=this.vx; this.y+=this.vy; this.life-=0.015; this.radius += this.growth; }
    draw(ctx) { ctx.globalAlpha = this.life * 0.6; ctx.fillStyle=this.color; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1; }
}