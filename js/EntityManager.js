/**
 * Void Ray - Varlık Yöneticisi (Entity Manager)
 * * GÜNCELLEME: Solucan Delikleri (Wormholes) sisteme eklendi.
 * * GÜNCELLEME: Spatial Hash entegrasyonu ile O(n) performans.
 * * GÜNCELLEME: Izgara çizimi ve dinamik yıldız parlaklığı eklendi.
 */
class EntityManager {
    constructor() {
        this.planets = [];
        this.wormholes = []; // YENİ: Solucan delikleri listesi
        
        // --- OPTİMİZASYON: Spatial Hash ---
        // Hücre boyutu 2000: Ekran boyutundan biraz büyük, ideal sorgu alanı sağlar.
        this.grid = new SpatialHash(2000);
        
        // --- OPTİMİZASYON: Arka Plan Katmanı (Cached Canvas) ---
        this.bgCanvas = document.createElement('canvas');
        this.bgCtx = this.bgCanvas.getContext('2d');
        this.bgGenerated = false;
        
        this.lastToxicNotification = 0;
        this.lastToxicDamage = 0;
        
        // YENİ: Işınlanma sonrası anlık tekrar girmeyi önlemek için
        this.lastTeleportTime = 0;
    }

    /**
     * Başlangıçta gezegenleri ve solucan deliklerini oluşturur.
     */
    init() {
        this.planets = [];
        this.wormholes = [];
        this.grid.clear(); // Grid'i temizle

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
            this.grid.insert(p); // Gezegeni havuza ekle
        }

        // 2. Solucan Deliklerini Oluştur (YENİ)
        if (typeof Wormhole !== 'undefined') {
            for(let i=0; i < GAME_CONFIG.WORLD_GEN.WORMHOLE_COUNT; i++) {
                const w = new Wormhole();
                this.wormholes.push(w);
                // Not: Wormhole'lar SpatialHash'e eklenmiyor çünkü sayıları az,
                // ve ayrı bir döngüde kontrol edilmeleri daha hızlı olabilir veya
                // çarpışma mantıkları farklı. Ancak istenirse eklenebilir.
                // Şimdilik ayrı tutuyoruz.
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
            // Orijinal alpha değerini kaydet (Sonra parlaklık ile çarpılacak)
            const alpha = 0.2 + Math.random() * 0.6;
            
            this.bgCtx.globalAlpha = alpha;
            this.bgCtx.fillRect(x, y, size, size);
        }
        
        this.bgCtx.globalAlpha = 1.0;
        this.bgGenerated = true;
    }

    update(dt) {
        // A. Toplananları Temizle
        // Sadece 'collected' işaretlenmiş olanları Spatial Hash'ten sil
        for (let i = this.planets.length - 1; i >= 0; i--) {
            if (this.planets[i].collected) {
                this.grid.remove(this.planets[i]); // Grid'den çıkar
                this.planets.splice(i, 1); // Listeden çıkar
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
                this.grid.insert(newP); // Yeni gezegeni havuza ekle
            }
        }

        // C. Solucan Delikleri Animasyonu (YENİ)
        this.wormholes.forEach(w => w.update());

        // D. Çarpışma Kontrolleri (OPTİMİZE EDİLDİ)
        this.checkCollisions();

        window.planets = this.planets;
    }

    /**
     * Gezegen ve oyuncu etkileşimlerini kontrol eder.
     * TÜM gezegenleri gezmek yerine sadece oyuncunun etrafındakileri sorgular.
     */
    checkCollisions() {
        // 1. Gezegen Kontrolü
        // Oyuncunun tarama yarıçapı + en büyük gezegen boyutu kadar bir alanı sorgula
        const queryRange = player.scanRadius + 500;
        const nearbyPlanets = this.grid.query(player.x, player.y, queryRange);

        nearbyPlanets.forEach(p => {
            if(!p.collected) {
                 if(Utils.distEntity(player, p) < p.radius + 30 * player.scale) { 
                    this.handleCollision(p);
                } 
            }
        });

        // 2. Solucan Deliği Kontrolü (YENİ)
        const now = Date.now();
        if (now - this.lastTeleportTime > 2000) { // 2 saniye bekleme süresi (Cool-down)
            this.wormholes.forEach(w => {
                // Basit mesafe kontrolü (Solucan deliği yarıçapının içine girince)
                if (Utils.distEntity(player, w) < w.radius * 0.6) {
                    this.handleWormholeEntry(w);
                }
            });
        }
    }

    /**
     * YENİ: Işınlanma Mantığı
     */
    handleWormholeEntry(wormhole) {
        // 1. Efektleri Tetikle
        triggerWormholeEffect();
        if (typeof audio !== 'undefined' && audio) audio.playChime({id: 'legendary'}); // Özel ses yoksa legendary sesi kullan
        
        showNotification({name: MESSAGES.UI.WORMHOLE_ENTER, type:{color: GAME_CONFIG.WORMHOLE.COLOR_CORE}}, MESSAGES.UI.WORMHOLE_DESC);

        // 2. Yeni Konum Belirle (Güvenli Alan)
        const margin = GAME_CONFIG.WORMHOLE.TELEPORT_SAFE_DISTANCE;
        const newX = Utils.random(margin, WORLD_SIZE - margin);
        const newY = Utils.random(margin, WORLD_SIZE - margin);

        // 3. Oyuncuyu Taşı
        player.x = newX;
        player.y = newY;
        
        // 4. Kuyruğu Temizle (Görsel sıçramayı önlemek için kuyruğu yeni konuma taşı)
        player.tail.forEach(t => { t.x = newX; t.y = newY; });
        
        // 5. Kamerayı Anında Odakla (Yumuşak geçiş istemiyoruz, anlık olmalı)
        if (window.cameraFocus) {
            window.cameraFocus.x = newX;
            window.cameraFocus.y = newY;
        }
        
        // 6. Otopilotu Kapat (Kafa karışıklığını önlemek için)
        if (typeof autopilot !== 'undefined' && autopilot) {
            autopilot = false;
            // Global güncelleme fonksiyonu varsa çağır
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

    /**
     * Sonsuz Uzay Izgarasını çizer.
     * Kamera hareketine göre kayan sanal çizgiler oluşturur.
     */
    drawGrid(ctx, width, height, cameraX, cameraY, zoom) {
        if (!window.gameSettings || !window.gameSettings.showGrid) return;

        const gridSize = 500; // Izgara kare boyutu
        const offsetX = cameraX % gridSize;
        const offsetY = cameraY % gridSize;
        
        // Görünür alanın sınırları
        const cols = width / zoom / gridSize + 2; 
        const rows = height / zoom / gridSize + 2;

        // Ekranda görünen dünya koordinat aralığını bul
        const startX = Math.floor((cameraX - (width / zoom) / 2) / gridSize) * gridSize;
        const startY = Math.floor((cameraY - (height / zoom) / 2) / gridSize) * gridSize;
        const endX = startX + (width / zoom) + gridSize;
        const endY = startY + (height / zoom) + gridSize;

        ctx.save();
        ctx.beginPath();
        
        // Tema rengini al ve şeffaflık ekle
        const themeColor = window.gameSettings.themeColor || '#94d8c3';
        ctx.strokeStyle = themeColor;
        ctx.globalAlpha = 0.08; // Çok silik (arka plan olduğu için)
        ctx.lineWidth = 1 / zoom; // Zoom ne olursa olsun çizgi kalınlığı sabit kalsın (veya ince kalsın)

        // Dikey Çizgiler
        for (let x = startX; x <= endX; x += gridSize) {
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
        }

        // Yatay Çizgiler
        for (let y = startY; y <= endY; y += gridSize) {
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
        }

        ctx.stroke();
        ctx.restore();
    }

    drawStars(ctx, width, height, target) {
        // Yıldızlar tamamen kapalıysa çizme
        if (window.gameSettings && !window.gameSettings.showStars) return;

        if(!this.bgGenerated || this.bgCanvas.width !== width || this.bgCanvas.height !== height) {
            this.generateStarBackground(width, height);
        }

        // Parlaklık Ayarını Uygula
        const brightness = (window.gameSettings.starBrightness !== undefined) 
            ? window.gameSettings.starBrightness / 100 
            : 1.0;

        // Eğer parlaklık 0 ise çizme
        if (brightness <= 0.01) return;

        const parallaxSpeed = 0.9;
        let offsetX = -(target.x * parallaxSpeed) % width;
        let offsetY = -(target.y * parallaxSpeed) % height;
        
        if (offsetX > 0) offsetX -= width;
        if (offsetY > 0) offsetY -= height;

        ctx.save();
        ctx.globalAlpha = brightness; // Parlaklığı uygula

        ctx.drawImage(this.bgCanvas, offsetX, offsetY);
        ctx.drawImage(this.bgCanvas, offsetX + width, offsetY);
        ctx.drawImage(this.bgCanvas, offsetX, offsetY + height);
        ctx.drawImage(this.bgCanvas, offsetX + width, offsetY + height);
        
        ctx.restore();
    }

    /**
     * Gezegenleri ve Solucan Deliklerini çizer.
     * OPTİMİZASYON: Sadece kamera görüş alanındaki hücreleri sorgular.
     */
    drawPlanets(ctx, player, echoRay, width, height, zoom) {
        const viewW = width / zoom; 
        const viewH = height / zoom; 
        
        const centerX = window.cameraFocus ? window.cameraFocus.x : player.x;
        const centerY = window.cameraFocus ? window.cameraFocus.y : player.y;
        
        const rangeX = (viewW / 2) + 500; 
        
        // 1. Solucan Deliklerini Çiz (Arkada Kalabilirler veya Önde)
        // Sayıları az olduğu için doğrudan döngüye alıyoruz.
        // Görünürlük kontrolü burada da yapılabilir (Radar menzili içinde mi?)
        this.wormholes.forEach(w => {
            const dist = Utils.distEntity(player, w);
            let visibility = 0;
            if (dist < player.scanRadius) visibility = 2; // Tam görüş
            else if (dist < player.radarRadius) visibility = 1; // Radar
            
            w.draw(ctx, visibility);
        });

        // 2. Gezegenleri Çiz
        const visiblePlanets = this.grid.query(centerX, centerY, rangeX);

        visiblePlanets.forEach(p => { 
            const visibility = GameRules.getPlanetVisibility(p, player, echoRay);
            if (visibility === 0) return;
            
            p.draw(ctx, visibility); 
        });
    }
}