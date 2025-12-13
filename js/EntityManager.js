/**
 * Void Ray - Varlık Yöneticisi (Entity Manager)
 * * GÜNCELLEME: Solucan Delikleri (Wormholes) sisteme eklendi.
 * * GÜNCELLEME: Spatial Hash entegrasyonu ile O(n) performans.
 * * GÜNCELLEME: Izgara çizimi, dinamik yıldız parlaklığı ve YILDIZ KAYMASI eklendi.
 */
class EntityManager {
    constructor() {
        this.planets = [];
        this.wormholes = []; 
        
        // --- OPTİMİZASYON: Spatial Hash ---
        this.grid = new SpatialHash(2000);
        
        // --- OPTİMİZASYON: Arka Plan Katmanı (Cached Canvas) ---
        this.bgCanvas = document.createElement('canvas');
        this.bgCtx = this.bgCanvas.getContext('2d');
        this.bgGenerated = false;
        
        this.lastToxicNotification = 0;
        this.lastToxicDamage = 0;
        
        this.lastTeleportTime = 0;

        // --- YILDIZ KAYMASI (SHOOTING STAR) ---
        this.shootingStar = null; // Aktif kayan yıldız nesnesi
    }

    /**
     * Başlangıçta gezegenleri ve solucan deliklerini oluşturur.
     */
    init() {
        this.planets = [];
        this.wormholes = [];
        this.grid.clear(); 

        // 1. Gezegenleri Oluştur
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

        // 2. Solucan Deliklerini Oluştur
        if (typeof Wormhole !== 'undefined') {
            for(let i=0; i < GAME_CONFIG.WORLD_GEN.WORMHOLE_COUNT; i++) {
                const w = new Wormhole();
                this.wormholes.push(w);
            }
        }

        window.planets = this.planets;
    }

    /**
     * Arka plan yıldızlarını statik canvas üzerine bir kez çizer.
     */
    generateStarBackground(width, height) {
        this.bgCanvas.width = width;
        this.bgCanvas.height = height;
        this.bgCtx.clearRect(0, 0, width, height);
        this.bgCtx.fillStyle = "white";

        const starCount = GAME_CONFIG.WORLD_GEN.STAR_COUNT || 1000;
        
        for(let i=0; i < starCount; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 1.5;
            const alpha = 0.2 + Math.random() * 0.6;
            
            this.bgCtx.globalAlpha = alpha;
            this.bgCtx.fillRect(x, y, size, size);
        }
        
        this.bgCtx.globalAlpha = 1.0;
        this.bgGenerated = true;
    }

    update(dt) {
        // A. Toplananları Temizle
        for (let i = this.planets.length - 1; i >= 0; i--) {
            if (this.planets[i].collected) {
                this.grid.remove(this.planets[i]); 
                this.planets.splice(i, 1); 
            }
        }
        
        // B. Eksilenleri Tamamla (Respawn)
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

        // C. Solucan Delikleri Animasyonu
        this.wormholes.forEach(w => w.update());

        // D. Yıldız Kayması Mantığı (YENİ)
        this.updateShootingStar();

        // E. Çarpışma Kontrolleri
        this.checkCollisions();

        window.planets = this.planets;
    }

    /**
     * Yıldız kayması durumunu günceller veya yenisini oluşturur.
     */
    updateShootingStar() {
        if (this.shootingStar) {
            // Aktif bir kayan yıldız varsa hareket ettir
            this.shootingStar.x += this.shootingStar.vx;
            this.shootingStar.y += this.shootingStar.vy;
            this.shootingStar.life -= 0.015; // Yavaşça sön

            // Ömrü bittiyse sil
            if (this.shootingStar.life <= 0) {
                this.shootingStar = null;
            }
        } else {
            // Aktif yoksa, düşük bir ihtimalle oluştur (Örn: %0.1 şans)
            if (Math.random() < 0.001) {
                this.spawnShootingStar();
            }
        }
    }

    /**
     * Yeni bir kayan yıldız oluşturur.
     * Kamera konumuna göre oluşturulur ki oyuncu görebilsin.
     */
    spawnShootingStar() {
        if (!window.cameraFocus || !canvas) return;

        const viewW = canvas.width / currentZoom;
        const viewH = canvas.height / currentZoom;
        
        // Ekranın içinde veya biraz dışında rastgele başlangıç
        // Genellikle yukarıdan aşağıya veya çapraz
        const startX = window.cameraFocus.x + (Math.random() - 0.5) * viewW;
        const startY = window.cameraFocus.y + (Math.random() - 0.5) * viewH;

        // Rastgele açı ve hız
        const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.5; // Genelde sağ-aşağı yönlü
        const speed = 25 + Math.random() * 15; // Çok hızlı

        this.shootingStar = {
            x: startX,
            y: startY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            width: 100 + Math.random() * 100 // Kuyruk uzunluğu
        };
    }

    /**
     * Gezegen ve oyuncu etkileşimlerini kontrol eder.
     */
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
                if (Utils.distEntity(player, w) < w.radius * 0.6) {
                    this.handleWormholeEntry(w);
                }
            });
        }
    }

    handleWormholeEntry(wormhole) {
        triggerWormholeEffect();
        if (typeof audio !== 'undefined' && audio) audio.playChime({id: 'legendary'}); 
        
        showNotification({name: MESSAGES.UI.WORMHOLE_ENTER, type:{color: GAME_CONFIG.WORMHOLE.COLOR_CORE}}, MESSAGES.UI.WORMHOLE_DESC);

        const margin = GAME_CONFIG.WORMHOLE.TELEPORT_SAFE_DISTANCE;
        const newX = Utils.random(margin, WORLD_SIZE - margin);
        const newY = Utils.random(margin, WORLD_SIZE - margin);

        player.x = newX;
        player.y = newY;
        
        player.tail.forEach(t => { t.x = newX; t.y = newY; });
        
        if (window.cameraFocus) {
            window.cameraFocus.x = newX;
            window.cameraFocus.y = newY;
        }
        
        if (typeof autopilot !== 'undefined' && autopilot) {
            autopilot = false;
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
            } 
            else { 
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
             if (addItemToInventory(p)) { 
                 p.collected = true; 
                 Utils.playSound('playChime', {id:'legendary'}); 
                 showNotification({name: "KAYIP KARGO KURTARILDI!", type:{color:'#a855f7'}}, ""); 
                 if (p.lootContent && p.lootContent.length > 0) { 
                     p.lootContent.forEach(item => { 
                         if(addItemToInventory(item)) {
                             const xp = GameRules.calculatePlanetXp(item.type);
                             player.gainXp(xp);
                         }
                     }); 
                 }
             }
        } else if (p.type.id === 'tardigrade') {
            p.collected = true; 
            Utils.playSound('playChime', p.type);
            player.energy = Math.min(player.energy + 50, player.maxEnergy);
            const xp = GameRules.calculatePlanetXp(p.type);
            showNotification({name: "TARDİGRAD YENDİ", type:{color:'#C7C0AE'}}, `(+%50 ENERJİ, +${xp} XP)`);
            player.gainXp(xp);
        } else { 
            const lootCount = GameRules.calculateLootCount(); 
            if (lootCount === 0) {
                p.collected = true;
                const xp = GameRules.calculatePlanetXp(p.type);
                player.gainXp(xp);
                showNotification({ name: `+${xp} XP`, type: { color: '#94a3b8' } }, "(Veri Analizi)");
            } else {
                let addedCount = 0;
                let totalXp = 0;
                for(let i=0; i<lootCount; i++) { 
                    if(addItemToInventory(p)) { 
                        addedCount++; 
                        const xp = GameRules.calculatePlanetXp(p.type);
                        totalXp += xp;
                        player.gainXp(xp); 
                    } else { break; } 
                }
                if (addedCount > 0) { 
                    p.collected = true; 
                    Utils.playSound('playChime', p.type);
                    const suffix = (addedCount > 1 ? `x${addedCount} ` : "") + `(+${totalXp} XP)`;
                    showNotification(p, suffix); 
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

        for (let x = startX; x <= endX; x += gridSize) {
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
        }

        for (let y = startY; y <= endY; y += gridSize) {
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
        }

        ctx.stroke();
        ctx.restore();
    }

    drawStars(ctx, width, height, target) {
        if (window.gameSettings && !window.gameSettings.showStars) return;

        if(!this.bgGenerated || this.bgCanvas.width !== width || this.bgCanvas.height !== height) {
            this.generateStarBackground(width, height);
        }

        const brightness = (window.gameSettings.starBrightness !== undefined) 
            ? window.gameSettings.starBrightness / 100 
            : 1.0;

        if (brightness <= 0.01) return;

        const parallaxSpeed = 0.9;
        let offsetX = -(target.x * parallaxSpeed) % width;
        let offsetY = -(target.y * parallaxSpeed) % height;
        
        if (offsetX > 0) offsetX -= width;
        if (offsetY > 0) offsetY -= height;

        ctx.save();
        ctx.globalAlpha = brightness;

        ctx.drawImage(this.bgCanvas, offsetX, offsetY);
        ctx.drawImage(this.bgCanvas, offsetX + width, offsetY);
        ctx.drawImage(this.bgCanvas, offsetX, offsetY + height);
        ctx.drawImage(this.bgCanvas, offsetX + width, offsetY + height);
        
        // --- YILDIZ KAYMASI ÇİZİMİ ---
        // Yıldız kayması arka planda ama yıldızların önünde veya arkasında olabilir.
        // Burada çizmek en mantıklısı çünkü parallax'tan etkilenmemeli (kamera ile beraber hareket etmemeli, dünya koordinatlarında veya ekran koordinatlarında olmalı).
        // Ancak spawn mantığını "Dünya Koordinatı" değil "Kamera/Ekran Koordinatı" olarak kurguladık.
        // Bu yüzden translate işlemi (game.js'de) yapılmadan önce çizilirse ekran koordinatı olur.
        // Ancak bu fonksiyon translate işlemi yapılmadan önce çağrılıyor.
        // Fakat spawnShootingStar dünya koordinatlarını değil, o anki kamera odağına göre spawn yapıyor.
        // Çizimi parallax'tan bağımsız yapalım.
        
        if (this.shootingStar) {
            const ss = this.shootingStar;
            // Ekranda doğru yerde görünmesi için parallax offsetini TERSİNE çevirmemiz veya
            // direkt olarak dünya koordinatlarında çizmemiz lazım.
            // game.js'de drawStars çağrıldığında henüz translate (kamera odaklama) yapılmamış oluyor.
            // Bu yüzden "Göreli" koordinat hesaplamalıyız.
            
            // Basitlik için: Spawn ederken "Ekran Koordinatı" değil "Dünya Koordinatı" olarak kaydettik (window.cameraFocus.x + ...).
            // Bu yüzden şu anki çizim bağlamında (henüz translate yok) manuel hesaplama yapmalıyız.
            
            const screenX = (ss.x - target.x) * currentZoom + width/2; // Basit projeksiyon (game.js ile uyumlu olmalı)
            // Ancak game.js'de parallax var. drawStars arka planı parallaxlı çiziyor.
            // Kayan yıldız da arka planın bir parçası gibi davranmalı.
            
            // HACK: Kayan yıldızı doğrudan arka planın üzerine, parallax'tan etkilenerek çizmek yerine
            // "Kamera ile hareket eden bir ışık" gibi değil, "Uzayda kayıp giden" bir ışık gibi çizelim.
            // drawStars fonksiyonu parallax uyguluyor (offsetX, offsetY).
            // Kayan yıldızı bu parallax'ın üzerine bindirmek zor olabilir.
            
            // ALTERNATİF: Kayan yıldızı game.js'deki ana draw döngüsünde "drawPlanets"ten önce çizdirmek.
            // Ama kod bütünlüğü için burada çizmek istiyoruz.
            
            // Çözüm: Kayan yıldızı "Dünya" koordinatında değil, "Ekran" koordinatında (paralaxlı) hayal edelim.
            // offsetX/Y zaten background'u kaydırıyor.
            // Biz shootingStar'ı sadece ekranın üzerinden geçirsek yeterli (Atmosferik efekt).
            // Yani ss.x ve ss.y aslında ekranın sol üst köşesine göre (0,0) konumlar olsun.
            
            // spawnShootingStar'ı revize edelim: Ekran koordinatları (0..width, 0..height) verelim.
            // Ancak yukarıdaki spawnShootingStar'da `window.cameraFocus.x` eklemiştim.
            // Onu kaldıralım, sadece `width` ve `height` kullanalım. (Aşağıda revize edilecek)
            
            // Eğer ss koordinatları ekran koordinatı ise:
            ctx.globalAlpha = ss.life * brightness;
            
            // Kuyruk
            const tailX = ss.x - ss.vx * (ss.width / 40); // Hız vektörünün tersi
            const tailY = ss.y - ss.vy * (ss.width / 40);
            
            const grad = ctx.createLinearGradient(ss.x, ss.y, tailX, tailY);
            grad.addColorStop(0, "rgba(255, 255, 255, 1)");
            grad.addColorStop(1, "rgba(255, 255, 255, 0)");
            
            ctx.beginPath();
            ctx.moveTo(ss.x, ss.y);
            ctx.lineTo(tailX, tailY);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 2;
            ctx.lineCap = "round";
            ctx.stroke();
            
            // Baş kısmı parlaması
            ctx.fillStyle = "white";
            ctx.shadowColor = "white";
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(ss.x, ss.y, 1.5, 0, Math.PI*2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }
    
    // --- DÜZELTME: Spawn fonksiyonunu EKRAN koordinatlarına göre ayarlayalım ---
    spawnShootingStar() {
        if (!canvas) return;
        
        // Ekran sınırları içinde veya biraz dışında rastgele bir nokta
        // Genelde yukarıdan veya sağdan gelmesi estetik durur.
        
        const side = Math.random(); // 0-1
        let startX, startY, angle;
        
        if (side < 0.5) {
            // Üstten gel
            startX = Math.random() * canvas.width;
            startY = -50;
            angle = Math.PI / 4 + (Math.random() - 0.5) * 0.5; // Aşağı sağ/sol
        } else {
            // Sağdan gel
            startX = canvas.width + 50;
            startY = Math.random() * (canvas.height / 2); // Üst yarı
            angle = Math.PI - (Math.PI / 4 + (Math.random() - 0.5) * 0.5); // Sola aşağı
        }

        const speed = 15 + Math.random() * 10; // Piksel/Frame hızı

        this.shootingStar = {
            x: startX,
            y: startY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            width: 100 + Math.random() * 100
        };
    }

    /**
     * Gezegenleri ve Solucan Deliklerini çizer.
     */
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