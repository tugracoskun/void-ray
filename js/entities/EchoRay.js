/**
 * Void Ray - Varlık Sınıfı: ECHO RAY (YANKI)
 * * GÜNCELLEME: Gereksiz iz (trail) mantığı kaldırıldı.
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
        this.energy = GAME_CONFIG.ECHO.BASE_ENERGY;
        this.maxEnergy = GAME_CONFIG.ECHO.BASE_ENERGY;
        this.energyDisplayTimer = 0; 
        this.fullNotified = false;
        
        this.wingPhase = 0; 
        this.pendingMerge = false;
        
        this.scanRadius = GAME_CONFIG.ECHO.SCAN_RADIUS;
        this.radarRadius = GAME_CONFIG.ECHO.RADAR_RADIUS;

        this.colorLerp = 0; 
        this.baseColor = { r: 203, g: 213, b: 225 }; 
        this.targetColor = { r: 56, g: 189, b: 248 }; 
        this.debugTarget = null; // Anlık gidilen hedef
    }
    
    update() {
        const rangeMult = 1 + (playerData.upgrades.echoRange * 0.3);
        this.scanRadius = GAME_CONFIG.ECHO.SCAN_RADIUS * rangeMult;
        this.radarRadius = GAME_CONFIG.ECHO.RADAR_RADIUS * rangeMult;

        const durabilityMult = 1 + (playerData.upgrades.echoDurability * 0.5);
        let drain = GAME_CONFIG.ECHO.DRAIN_RATE / durabilityMult; 

        const targetLerp = this.attached ? 0.7 : 0.0;
        const lerpSpeed = 0.05; 
        this.colorLerp += (targetLerp - this.colorLerp) * lerpSpeed;

        const isOutOfBounds = this.x < 0 || this.x > WORLD_SIZE || this.y < 0 || this.y > WORLD_SIZE;
        if (isOutOfBounds) drain = GAME_CONFIG.ECHO.OUT_OF_BOUNDS_DRAIN; 
        
        if (this.mode !== 'recharge') this.energy = Math.max(0, this.energy - drain);
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
                if(isOutOfBounds) showNotification({name: "YANKI: RADYASYON HASARI ALIYOR! ÜSSE DÖNÜYOR", type:{color:'#ef4444'}}, "");
                else showNotification({name: "YANKI: ENERJİ BİTTİ, ÜSSE DÖNÜYOR", type:{color:'#fbbf24'}}, "");
                updateEchoDropdownUI();
            }
        }

        const badge = document.getElementById('echo-total-badge'); 
        const count = this.lootBag.length; 
        badge.innerText = count; 
        badge.style.display = count > 0 ? 'flex' : 'none';
        
        const echoCap = GameRules.getEchoCapacity();
        
        if (count >= echoCap) {
             badge.style.background = '#ef4444'; 
             if (this.mode !== 'deposit_storage' && this.mode !== 'recharge' && this.mode !== 'return') {
                 this.mode = 'deposit_storage';
                 showNotification({name: "YANKI DEPOSU DOLU: BOŞALTMAYA GİDİYOR", type:{color:'#a855f7'}}, "");
                 updateEchoDropdownUI();
             }
        } else {
            badge.style.background = '#67e8f9';
        }

        let targetX, targetY;
        this.debugTarget = null; 

        if (this.mode === 'recharge') {
            targetX = nexus.x; targetY = nexus.y;
            this.debugTarget = {x: nexus.x, y: nexus.y};
            const d = Utils.distEntity(this, nexus);
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
            const d = Utils.distEntity(this, storageCenter);
            if (d < 150) {
                depositToStorage(this.lootBag, "YANKI");
                this.mode = 'roam'; 
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
                
                const queryRange = 5000;
                const candidates = (entityManager && entityManager.grid) ? entityManager.grid.query(this.x, this.y, queryRange) : planets;

                for(let p of candidates) {
                    if(!p.collected && p.type.id !== 'toxic' && p.type.id !== 'lost') {
                        const distToMe = (p.x-this.x)**2 + (p.y-this.y)**2;
                        
                        let playerIsCloser = false;
                        if (typeof player !== 'undefined' && typeof autopilot !== 'undefined' && autopilot && typeof aiMode !== 'undefined' && aiMode === 'gather' && collectedItems.length < GameRules.getPlayerCapacity()) {
                            const distToPlayer = Utils.distEntity(p, player) ** 2;
                            if (distToPlayer <= distToMe) playerIsCloser = true;
                        }

                        if(!playerIsCloser && distToMe < minDist) { 
                            minDist = distToMe; 
                            nearest = p; 
                        }
                    }
                }
                
                if(nearest) { 
                    targetX = nearest.x; targetY = nearest.y; 
                    this.debugTarget = {x: nearest.x, y: nearest.y};
                } else {
                    targetX = player.x + Math.cos(Date.now() * 0.001) * 300;
                    targetY = player.y + Math.sin(Date.now() * 0.001) * 300;
                    this.debugTarget = {x: targetX, y: targetY};
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
                
                const dist = Utils.dist(targetX, targetY, this.x, this.y);
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

        const speedMult = 1 + (playerData.upgrades.echoSpeed * 0.15);
        const MAX_ECHO_SPEED = 8 * speedMult; 
        const currentSpeed = Math.hypot(this.vx, this.vy);
        
        if (currentSpeed > 0.5) this.wingPhase += 0.2;
        else this.wingPhase += 0.05;

        if (playerData.stats && currentSpeed > playerData.stats.echoMaxSpeed) {
            playerData.stats.echoMaxSpeed = currentSpeed;
        }

        if(currentSpeed > MAX_ECHO_SPEED) { this.vx = (this.vx/currentSpeed) * MAX_ECHO_SPEED; this.vy = (this.vy/currentSpeed) * MAX_ECHO_SPEED; }
        this.vx *= 0.96; this.vy *= 0.96; 
        
        if (!this.attached) {
            this.x += this.vx; this.y += this.vy;
            if (this.mode !== 'recharge' && this.mode !== 'deposit_storage') {
                const rangeMult = 1 + (playerData.upgrades.echoRange * 0.3);
                const pickupRange = 40 * rangeMult;
                
                if (this.lootBag.length < echoCap) {
                    const candidates = (entityManager && entityManager.grid) ? entityManager.grid.query(this.x, this.y, pickupRange + 100) : planets;

                    for(let p of candidates) { 
                        if(!p.collected && p.type.id !== 'toxic' && p.type.id !== 'lost') {
                            const d = Utils.distEntity(this, p);
                            if(d < p.radius + pickupRange) { 
                                p.collected = true; 
                                if(p.type.id === 'tardigrade') this.lootBag.push(p);
                                else {
                                    const count = GameRules.calculateLootCount();
                                    const availableSpace = echoCap - this.lootBag.length;
                                    const takeAmount = Math.min(count, availableSpace);
                                    for(let i=0; i<takeAmount; i++) this.lootBag.push(p); 
                                }
                                if(echoInvOpen) renderEchoInventory(); 
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
        
        const baseR = Math.round(this.baseColor.r + (this.targetColor.r - this.baseColor.r) * this.colorLerp);
        const baseG = Math.round(this.baseColor.g + (this.targetColor.g - this.baseColor.g) * this.colorLerp);
        const baseB = Math.round(this.baseColor.b + (this.targetColor.b - this.baseColor.b) * this.colorLerp);

        const gray = baseR * 0.3 + baseG * 0.59 + baseB * 0.11;
        const energyRatio = Math.max(0, Math.min(1, this.energy / this.maxEnergy));

        const finalR = Math.floor(gray + (baseR - gray) * energyRatio);
        const finalG = Math.floor(gray + (baseG - gray) * energyRatio);
        const finalB = Math.floor(gray + (baseB - gray) * energyRatio);

        const dynamicColor = `rgb(${finalR},${finalG},${finalB})`;

        if (this.mode === 'recharge' && Utils.distEntity(this, nexus) < 150) {
             const pulse = 0.5 + Math.sin(Date.now() * 0.005) * 0.5; 
             ctx.shadowBlur = 30 + pulse * 30; 
             ctx.shadowColor = "#cbd5e1"; 
             ctx.fillStyle = `rgba(203, 213, 225, ${0.5 + pulse * 0.5})`; 
        } else {
             ctx.shadowBlur = 20 * energyRatio; 
             ctx.shadowColor = dynamicColor;
        }

        if (window.gameSettings && window.gameSettings.developerMode && window.gameSettings.showHitboxes) {
            const collisionRadius = 25;
            ctx.save();
            ctx.beginPath();
            ctx.arc(0, 0, collisionRadius, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 0, 0, 0.7)"; ctx.lineWidth = 3; ctx.stroke();
            ctx.rotate(-(this.angle + Math.PI/2));
            ctx.fillStyle = "rgba(255, 0, 0, 0.8)"; ctx.font = "14px monospace"; ctx.textAlign = "center";
            ctx.fillText(`R: ${collisionRadius}`, 0, collisionRadius + 20);
            ctx.restore();
        }
        
        let wingTipY = 20; let wingTipX = 60; let wingFlap = Math.sin(this.wingPhase) * 5; 
        
        ctx.fillStyle = `rgba(${30 * (0.5 + energyRatio * 0.5)}, ${41 * (0.5 + energyRatio * 0.5)}, ${59 * (0.5 + energyRatio * 0.5)}, 0.95)`; 
        ctx.beginPath(); ctx.moveTo(0, -30); 
        ctx.bezierCurveTo(15, -10, wingTipX, wingTipY+wingFlap, 40, 40); 
        ctx.bezierCurveTo(20, 30, 10, 40, 0, 50); 
        ctx.bezierCurveTo(-10, 40, -20, 30, -40, 40); 
        ctx.bezierCurveTo(-wingTipX, wingTipY+wingFlap, -15, -10, 0, -30); 
        ctx.fill();
        
        ctx.strokeStyle = dynamicColor; ctx.lineWidth = 2; ctx.stroke(); 
        
        ctx.fillStyle = "#f1f5f9"; 
        if (this.mode !== 'recharge') { ctx.shadowBlur = 40 * energyRatio; ctx.shadowColor = dynamicColor; }
        ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill(); 

        if (this.energyDisplayTimer > 0) {
            ctx.globalAlpha = Math.min(1, this.energyDisplayTimer / 30); 
            ctx.fillStyle = "#334155"; ctx.fillRect(-20, -40, 40, 4);
            ctx.fillStyle = dynamicColor; 
            ctx.fillRect(-20, -40, 40 * (this.energy/100), 4);
            ctx.globalAlpha = 1;
        }
        
        ctx.restore();

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
                if (speed > 0.1) {
                    const thrustLen = 30; const tx = Math.cos(this.angle) * thrustLen; const ty = Math.sin(this.angle) * thrustLen;
                    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(tx, ty); ctx.strokeStyle = "#4ade80"; ctx.lineWidth = 2; ctx.stroke();
                    ctx.beginPath(); ctx.arc(tx, ty, 3, 0, Math.PI*2); ctx.fillStyle = "#4ade80"; ctx.fill();
                    ctx.fillStyle = "#4ade80"; ctx.fillText("T", tx + 5, ty + 5);
                }
                const headLen = 40; const hx = Math.cos(this.angle) * headLen; const hy = Math.sin(this.angle) * headLen;
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(hx, hy); ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"; ctx.lineWidth = 1; ctx.setLineDash([2, 4]); ctx.stroke(); ctx.setLineDash([]); 
            }
            if (window.gameSettings.showTargetVectors && this.debugTarget) {
                const relTx = this.debugTarget.x - this.x; const relTy = this.debugTarget.y - this.y;
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(relTx, relTy); ctx.strokeStyle = "rgba(255, 255, 255, 0.4)"; ctx.lineWidth = 1; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
                ctx.beginPath(); ctx.arc(relTx, relTy, 5, 0, Math.PI*2); ctx.fillStyle = "white"; ctx.fill();
                ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = "10px monospace"; ctx.fillText("TARGET", relTx + 8, relTy);
                const targetAngle = Math.atan2(relTy, relTx);
                let angleDiff = targetAngle - this.angle; while (angleDiff < -Math.PI) angleDiff += Math.PI * 2; while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                const angleDeg = (angleDiff * 180 / Math.PI).toFixed(1);
                const arcRadius = 30; ctx.beginPath(); ctx.arc(0, 0, arcRadius, this.angle, this.angle + angleDiff, angleDiff < 0);
                const absDeg = Math.abs(parseFloat(angleDeg));
                if (absDeg < 5) ctx.strokeStyle = "rgba(74, 222, 128, 0.8)"; else if (absDeg < 45) ctx.strokeStyle = "rgba(250, 204, 21, 0.8)"; else ctx.strokeStyle = "rgba(248, 113, 113, 0.8)"; 
                ctx.lineWidth = 2; ctx.stroke();
                ctx.fillStyle = "#fff"; ctx.fillText(`Δ: ${angleDeg}°`, 10, -10);
            }
            ctx.restore();
        }
    }
}