/**
 * Void Ray - Varlık Yöneticisi (Entity Manager)
 * GÜNCELLEME: Çarpışma anında (Loot Drop) yeni item sistemini kullanacak şekilde güncellendi.
 * GÜNCELLEME 2: Wormhole için 'Güvenli İniş Protokolü' eklendi.
 */
class EntityManager {
    constructor() {
        this.planets = [];
        this.wormholes = []; 
        this.grid = new SpatialHash(2000);
        this.starLayers = [];
        
        this.layerConfig = [
            { count: 3000, speed: 0.001, sizeMin: 0.1, sizeMax: 0.4, alphaMin: 0.05, alphaMax: 0.2 },
            { count: 1500, speed: 0.01, sizeMin: 0.3, sizeMax: 0.6, alphaMin: 0.1, alphaMax: 0.3 },
            { count: 800,  speed: 0.03, sizeMin: 0.5, sizeMax: 0.8, alphaMin: 0.2, alphaMax: 0.4 },
            { count: 400,  speed: 0.08, sizeMin: 0.8, sizeMax: 1.1, alphaMin: 0.3, alphaMax: 0.5 },
            { count: 150,  speed: 0.18, sizeMin: 1.0, sizeMax: 1.3, alphaMin: 0.4, alphaMax: 0.7 },
            { count: 60,   speed: 0.40, sizeMin: 1.2, sizeMax: 1.8, alphaMin: 0.1, alphaMax: 0.3 }
        ];
        this.bgGenerated = false;
        
        this.lastToxicNotification = 0;
        this.lastToxicDamage = 0;
        this.lastTeleportTime = 0;
        this.shootingStar = null; 
    }

    init() {
        this.planets = [];
        this.wormholes = [];
        this.grid.clear(); 

        for(let i=0; i < GAME_CONFIG.WORLD_GEN.PLANET_COUNT; i++) {
            let px, py, d;
            do {
                px = Utils.random(WORLD_SIZE);
                py = Utils.random(WORLD_SIZE);
                d = Utils.dist(px, py, GameRules.LOCATIONS.NEXUS.x, GameRules.LOCATIONS.NEXUS.y);
            } while(d < GAME_CONFIG.WORLD_GEN.SAFE_ZONE_RADIUS);

            const p = new Planet(px, py);
            this.planets.push(p);
            this.grid.insert(p); 
        }

        if (typeof Wormhole !== 'undefined') {
            for(let i=0; i < GAME_CONFIG.WORLD_GEN.WORMHOLE_COUNT; i++) {
                const w = new Wormhole();
                this.wormholes.push(w);
            }
        }

        window.planets = this.planets;
    }

    generateStarLayers(width, height) {
        this.starLayers = [];
        this.layerConfig.forEach(config => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = "white";
            const baseCount = GAME_CONFIG.WORLD_GEN.STAR_COUNT || 5000;
            const densityMultiplier = baseCount / 5000;
            const finalCount = Math.floor(config.count * densityMultiplier);

            for(let i=0; i < finalCount; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const size = config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin);
                const alpha = config.alphaMin + Math.random() * (config.alphaMax - config.alphaMin);
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
            this.starLayers.push({ canvas: canvas, speed: config.speed });
        });
        this.bgGenerated = true;
    }

    update(dt) {
        for (let i = this.planets.length - 1; i >= 0; i--) {
            if (this.planets[i].collected) {
                this.grid.remove(this.planets[i]); 
                this.planets.splice(i, 1); 
            }
        }
        
        if (this.planets.length < GAME_CONFIG.WORLD_GEN.PLANET_COUNT) {
            const needed = GAME_CONFIG.WORLD_GEN.PLANET_COUNT - this.planets.length;
            for(let i=0; i<needed; i++) {
                let px, py, dNexus, dPlayer; 
                do { 
                    px = Utils.random(WORLD_SIZE); 
                    py = Utils.random(WORLD_SIZE); 
                    dPlayer = Utils.dist(px, py, player.x, player.y);
                    dNexus = Utils.dist(px, py, GameRules.LOCATIONS.NEXUS.x, GameRules.LOCATIONS.NEXUS.y);
                } while(dNexus < GAME_CONFIG.WORLD_GEN.SAFE_ZONE_RADIUS || dPlayer < 1500);
                
                const newP = new Planet(px, py);
                this.planets.push(newP);
                this.grid.insert(newP); 
            }
        }

        this.wormholes.forEach(w => w.update());
        this.updateShootingStar();
        this.checkCollisions();
        window.planets = this.planets;
    }

    updateShootingStar() {
        if (this.shootingStar) {
            this.shootingStar.x += this.shootingStar.vx;
            this.shootingStar.y += this.shootingStar.vy;
            this.shootingStar.life -= 0.015; 
            if (this.shootingStar.life <= 0) this.shootingStar = null;
        } else {
            if (Math.random() < 0.001) this.spawnShootingStar();
        }
    }

    spawnShootingStar() {
        if (!canvas) return;
        const side = Math.random(); 
        let startX, startY, angle;
        if (side < 0.5) {
            startX = Math.random() * canvas.width; startY = -50;
            angle = Math.PI / 4 + (Math.random() - 0.5) * 0.5; 
        } else {
            startX = canvas.width + 50; startY = Math.random() * (canvas.height / 2); 
            angle = Math.PI - (Math.PI / 4 + (Math.random() - 0.5) * 0.5); 
        }
        const speed = 15 + Math.random() * 10; 
        this.shootingStar = {
            x: startX, y: startY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            life: 1.0, width: 100 + Math.random() * 100
        };
    }

    checkCollisions() {
        const queryRange = player.scanRadius + 500;
        const nearbyPlanets = this.grid.query(player.x, player.y, queryRange);

        nearbyPlanets.forEach(p => {
            if(!p.collected) {
                 if(Utils.distEntity(player, p) < p.radius + 30 * player.scale) { 
                    this.handleCollision(p);
                } 
            }
        });

        const now = Date.now();
        if (now - this.lastTeleportTime > 2000) { 
            this.wormholes.forEach(w => {
                if (Utils.distEntity(player, w) < w.radius * 0.6) this.handleWormholeEntry(w);
            });
        }
    }

    // YENİ: Güvenli Işınlanma Noktası Bulucu
    findSafeTeleportLocation() {
        const margin = GAME_CONFIG.WORMHOLE.TELEPORT_SAFE_DISTANCE;
        let attempts = 0;
        const maxAttempts = 10;

        while(attempts < maxAttempts) {
            const rx = Utils.random(margin, WORLD_SIZE - margin);
            const ry = Utils.random(margin, WORLD_SIZE - margin);
            
            // Bölgedeki tehditleri kontrol et (1500 birim yarıçap)
            // SpatialHash grid'ini kullanarak o bölgedeki nesneleri sorgula
            const threats = this.grid.query(rx, ry, 1500);
            const hasToxic = threats.some(p => p.type.id === 'toxic');
            
            // Eğer zehirli bölge yoksa burası güvenlidir
            if (!hasToxic) {
                return { x: rx, y: ry };
            }
            
            attempts++;
        }
        
        // Eğer güvenli yer bulunamazsa (çok düşük ihtimal), haritanın ortasına güvenli bir mesafeye at
        return { 
            x: WORLD_SIZE / 2 + Utils.random(-1000, 1000), 
            y: WORLD_SIZE / 2 + Utils.random(-1000, 1000) 
        };
    }

    handleWormholeEntry(wormhole) {
        triggerWormholeEffect();
        if (typeof audio !== 'undefined' && audio) audio.playChime({id: 'legendary'}); 
        showNotification({name: MESSAGES.UI.WORMHOLE_ENTER, type:{color: GAME_CONFIG.WORMHOLE.COLOR_CORE}}, MESSAGES.UI.WORMHOLE_DESC);
        
        // GÜNCELLEME: Rastgele yerine güvenli nokta hesapla
        const newPos = this.findSafeTeleportLocation();
        
        // Konum Güncelleme
        player.x = newPos.x; 
        player.y = newPos.y;
        
        // Hız Sıfırlama: Işınlanma sonrası savrulmayı önler
        player.vx = 0; 
        player.vy = 0;
        
        // GÜNCELLEME: Kısa süreliğine Ghost Mode (Görünmezlik/Hasar Almama) ver
        // Bu sayede ani bir çarpışmadan korunur
        player.isGhost = true;
        player.currentAlpha = 0.5;
        // 3 saniye sonra ghost modu kapatmak için timeout kurabiliriz ama
        // oyun döngüsü idleTimer ile bunu zaten yönetiyor. 
        // Ani koruma için manuel olarak alpha'yı düşürmek görsel bir ipucu verir.
        
        // Kuyruk ve Kamera Güncelleme
        player.tail.forEach(t => { t.x = newPos.x; t.y = newPos.y; });
        if (window.cameraFocus) { window.cameraFocus.x = newPos.x; window.cameraFocus.y = newPos.y; }
        
        // Otopilot ve Görev Yönetimi
        if (typeof autopilot !== 'undefined' && autopilot) {
            if (typeof aiMode !== 'undefined' && aiMode === 'travel') {
                autopilot = false;
                if (typeof manualTarget !== 'undefined') manualTarget = null;
                showNotification({name: "SEYİR İPTAL EDİLDİ", type:{color:'#ef4444'}}, "Konum Değişti");
            } 
            else {
                if (player.scoutTarget) player.scoutTarget = null;
                showNotification({name: "SİSTEMLER YENİDEN HESAPLANIYOR", type:{color:'#38bdf8'}}, "Otopilot Devam Ediyor");
            }
            
            if (typeof updateAIButton === 'function') updateAIButton();
        }
        
        this.lastTeleportTime = Date.now();
    }

    handleCollision(p) {
        if(p.type.id === 'toxic') { 
            Utils.playSound('playToxic'); 
            if(echoRay && echoRay.attached) { 
                if (!window.gameSettings.godMode) {
                    window.echoRay = null; 
                    window.echoDeathLevel = player.level; 
                    document.getElementById('echo-wrapper-el').style.display = 'none'; 
                    if(typeof echoInvOpen !== 'undefined' && echoInvOpen) closeEchoInventory(); 
                    showNotification({name: "YANKI SİSTEMİ ÇÖKTÜ...", type:{color:'#ef4444'}}, "");
                } 
            } else { 
                const now = Date.now(); 
                if (now - this.lastToxicNotification > 2000) { 
                    showNotification({name: "KRİTİK VERİ HATASI", type:{color:'#00ff41'}}, "Holografik Hasar!"); 
                    this.lastToxicNotification = now; 
                } 
                if (now - this.lastToxicDamage > 500) { 
                    player.takeDamage(5); 
                    this.lastToxicDamage = now;
                }
            } 
        } else if (p.type.id === 'lost') { 
             // Kayıp Kargo özeldir, içinden birden fazla şey çıkabilir
             p.collected = true; 
             Utils.playSound('playChime', {id:'legendary'}); 
             showNotification({name: "KAYIP KARGO KURTARILDI!", type:{color:'#a855f7'}}, ""); 
             
             // İçinden rastgele 2-4 item at
             const dropCount = Utils.randomInt(2, 4);
             for(let i=0; i<dropCount; i++) {
                 // Kayıp kargodan çıkanlar genelde Rare veya Epic olur
                 const dropRarity = Math.random() < 0.3 ? RARITY.EPIC : RARITY.RARE;
                 const item = GameRules.generateRandomDrop(dropRarity);
                 addItemToInventory(item);
                 const xp = GameRules.calculatePlanetXp(p.type);
                 player.gainXp(xp);
             }
        } else if (p.type.id === 'tardigrade') {
            p.collected = true; 
            Utils.playSound('playChime', p.type);
            player.energy = Math.min(player.energy + 50, player.maxEnergy);
            const xp = GameRules.calculatePlanetXp(p.type);
            showNotification({name: "TARDİGRAD YENDİ", type:{color:'#C7C0AE'}}, `(+%50 ENERJİ, +${xp} XP)`);
            player.gainXp(xp);
        } else { 
            // Normal Gezegen Toplama
            const lootCount = GameRules.calculateLootCount(); 
            if (lootCount === 0) {
                p.collected = true;
                const xp = GameRules.calculatePlanetXp(p.type);
                player.gainXp(xp);
                showNotification({ name: `+${xp} XP`, type: { color: '#94a3b8' } }, "(Veri Analizi)");
            } else {
                let addedCount = 0;
                let totalXp = 0;
                let droppedItems = [];

                for(let i=0; i<lootCount; i++) { 
                    // YENİ: Gezegenden Item Drop üret
                    const item = GameRules.generateRandomDrop(p.type);
                    
                    if(addItemToInventory(item)) { 
                        addedCount++; 
                        droppedItems.push(item);
                        const xp = GameRules.calculatePlanetXp(p.type);
                        totalXp += xp;
                        player.gainXp(xp); 
                    } else { break; } 
                }

                if (addedCount > 0) { 
                    p.collected = true; 
                    Utils.playSound('playChime', p.type);
                    
                    // Bildirim Mantığı: Eğer ekipman düştüyse onun adını yaz, yoksa genel özet geç
                    const equipDrop = droppedItems.find(i => i.category === 'equipment');
                    if (equipDrop) {
                        showNotification({name: equipDrop.name, type: equipDrop.type}, "(EKİPMAN)");
                    } else {
                        // Sadece kaynak
                        const suffix = (addedCount > 1 ? `x${addedCount} ` : "") + `(+${totalXp} XP)`;
                        showNotification(p, suffix); 
                    }
                } 
            }
        } 
    }

    drawGrid(ctx, width, height, cameraX, cameraY, zoom) {
        if (!window.gameSettings || !window.gameSettings.showGrid) return;
        const gridSize = 500; 
        const cols = width / zoom / gridSize + 2; 
        const rows = height / zoom / gridSize + 2;
        const startX = Math.floor((cameraX - (width / zoom) / 2) / gridSize) * gridSize;
        const startY = Math.floor((cameraY - (height / zoom) / 2) / gridSize) * gridSize;
        const endX = startX + (width / zoom) + gridSize;
        const endY = startY + (height / zoom) + gridSize;

        ctx.save();
        ctx.beginPath();
        const themeColor = window.gameSettings.themeColor || '#94d8c3';
        ctx.strokeStyle = themeColor;
        ctx.globalAlpha = 0.08; 
        ctx.lineWidth = 1 / zoom; 

        for (let x = startX; x <= endX; x += gridSize) { ctx.moveTo(x, startY); ctx.lineTo(x, endY); }
        for (let y = startY; y <= endY; y += gridSize) { ctx.moveTo(startX, y); ctx.lineTo(endX, y); }
        ctx.stroke();
        ctx.restore();
    }

    drawStars(ctx, width, height, target) {
        if (window.gameSettings && !window.gameSettings.showStars) return;
        if(!this.bgGenerated || this.starLayers.length === 0 || this.starLayers[0].canvas.width !== width || this.starLayers[0].canvas.height !== height) {
            this.generateStarLayers(width, height);
        }
        const brightness = (window.gameSettings.starBrightness !== undefined) ? window.gameSettings.starBrightness / 100 : 1.0;
        if (brightness <= 0.01) return;

        ctx.save();
        ctx.globalAlpha = brightness;
        this.starLayers.forEach(layer => {
            let offsetX = -(target.x * layer.speed) % width;
            let offsetY = -(target.y * layer.speed) % height;
            if (offsetX > 0) offsetX -= width;
            if (offsetY > 0) offsetY -= height;
            ctx.drawImage(layer.canvas, offsetX, offsetY);
            ctx.drawImage(layer.canvas, offsetX + width, offsetY);
            ctx.drawImage(layer.canvas, offsetX, offsetY + height);
            ctx.drawImage(layer.canvas, offsetX + width, offsetY + height);
        });
        
        if (this.shootingStar) {
            const ss = this.shootingStar;
            ctx.globalAlpha = ss.life * brightness;
            const tailX = ss.x - ss.vx * (ss.width / 40); 
            const tailY = ss.y - ss.vy * (ss.width / 40);
            const grad = ctx.createLinearGradient(ss.x, ss.y, tailX, tailY);
            grad.addColorStop(0, "rgba(255, 255, 255, 1)");
            grad.addColorStop(1, "rgba(255, 255, 255, 0)");
            ctx.beginPath(); ctx.moveTo(ss.x, ss.y); ctx.lineTo(tailX, tailY);
            ctx.strokeStyle = grad; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.stroke();
            ctx.fillStyle = "white"; ctx.shadowColor = "white"; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.arc(ss.x, ss.y, 1.5, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
        }
        ctx.restore();
    }

    drawPlanets(ctx, player, echoRay, width, height, zoom) {
        const viewW = width / zoom; 
        const viewH = height / zoom; 
        const centerX = window.cameraFocus ? window.cameraFocus.x : player.x;
        const centerY = window.cameraFocus ? window.cameraFocus.y : player.y;
        const rangeX = (viewW / 2) + 500; 
        
        this.wormholes.forEach(w => {
            const dist = Utils.distEntity(player, w);
            let visibility = 0;
            if (dist < player.scanRadius) visibility = 2; 
            else if (dist < player.radarRadius) visibility = 1; 
            w.draw(ctx, visibility);
        });

        const visiblePlanets = this.grid.query(centerX, centerY, rangeX);
        visiblePlanets.forEach(p => { 
            const visibility = GameRules.getPlanetVisibility(p, player, echoRay);
            if (visibility === 0) return;
            p.draw(ctx, visibility); 
        });
    }
}