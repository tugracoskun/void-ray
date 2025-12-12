/**
 * Void Ray - Varlık Yöneticisi (Entity Manager)
 * * GÜNCELLEME: Spatial Hash entegrasyonu ile O(n) performans.
 * * GÜNCELLEME: Izgara çizimi ve dinamik yıldız parlaklığı eklendi.
 */
class EntityManager {
    constructor() {
        this.planets = [];
        
        // --- OPTİMİZASYON: Spatial Hash ---
        // Hücre boyutu 2000: Ekran boyutundan biraz büyük, ideal sorgu alanı sağlar.
        this.grid = new SpatialHash(2000);
        
        // --- OPTİMİZASYON: Arka Plan Katmanı (Cached Canvas) ---
        this.bgCanvas = document.createElement('canvas');
        this.bgCtx = this.bgCanvas.getContext('2d');
        this.bgGenerated = false;
        
        this.lastToxicNotification = 0;
        this.lastToxicDamage = 0;
    }

    /**
     * Başlangıçta gezegenleri oluşturur.
     */
    init() {
        this.planets = [];
        this.grid.clear(); // Grid'i temizle

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

        // C. Çarpışma Kontrolleri (OPTİMİZE EDİLDİ)
        this.checkCollisions();

        window.planets = this.planets;
    }

    /**
     * Gezegen ve oyuncu etkileşimlerini kontrol eder.
     * TÜM gezegenleri gezmek yerine sadece oyuncunun etrafındakileri sorgular.
     */
    checkCollisions() {
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
        // Ekran genişliği kadar çizgi + kayma payı
        const cols = width / zoom / gridSize + 2; 
        const rows = height / zoom / gridSize + 2;

        // Başlangıç noktaları (Ekranın sol üst köşesinden başla, offset kadar kaydır)
        // Transform zaten game.js'de yapıldığı için, burada local koordinatlara göre çizim yapıyoruz.
        // Ancak game.js'deki transform "Merkez" odaklı.
        // O yüzden grid'i de merkezden hesaplamak daha kolay olabilir.
        
        // Aslında game.js'de ctx.translate(-window.cameraFocus.x, -window.cameraFocus.y) yapılıyor.
        // Bu, dünya koordinatlarında çizim yaptığımız anlamına gelir.
        // Bu yüzden dünya koordinatlarında grid çizebiliriz.
        
        // Ekranda görünen dünya koordinat aralığını bul
        const startX = Math.floor((cameraX - (width / zoom) / 2) / gridSize) * gridSize;
        const startY = Math.floor((cameraY - (height / zoom) / 2) / gridSize) * gridSize;
        const endX = startX + (width / zoom) + gridSize;
        const endY = startY + (height / zoom) + gridSize;

        ctx.save();
        ctx.beginPath();
        
        // Tema rengini al ve şeffaflık ekle
        const themeColor = window.gameSettings.themeColor || '#94d8c3';
        // Renk kodunu ayrıştırıp rgba yapmak yerine basitçe globalAlpha kullanabiliriz
        // ama hexToRgba varsa onu kullanmak daha iyi.
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
        // Varsayılan 100, 0 ile 100 arası.
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
     * Gezegenleri çizer.
     * OPTİMİZASYON: Sadece kamera görüş alanındaki hücreleri sorgular.
     */
    drawPlanets(ctx, player, echoRay, width, height, zoom) {
        const viewW = width / zoom; 
        const viewH = height / zoom; 
        
        const centerX = window.cameraFocus ? window.cameraFocus.x : player.x;
        const centerY = window.cameraFocus ? window.cameraFocus.y : player.y;
        
        const rangeX = (viewW / 2) + 500; 
        
        const visiblePlanets = this.grid.query(centerX, centerY, rangeX);

        visiblePlanets.forEach(p => { 
            const visibility = GameRules.getPlanetVisibility(p, player, echoRay);
            if (visibility === 0) return;
            
            p.draw(ctx, visibility); 
        });
    }
}