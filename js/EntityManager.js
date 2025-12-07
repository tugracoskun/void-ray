/**
 * Void Ray - Varlık Yöneticisi (Entity Manager)
 * * GÜNCELLEME: Spatial Hash entegrasyonu ile O(n) performans.
 * * Gezegenler artık 'this.grid' içinde saklanıyor ve sorgulanıyor.
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

    drawStars(ctx, width, height, target) {
        if(!this.bgGenerated || this.bgCanvas.width !== width || this.bgCanvas.height !== height) {
            this.generateStarBackground(width, height);
        }

        const parallaxSpeed = 0.9;
        let offsetX = -(target.x * parallaxSpeed) % width;
        let offsetY = -(target.y * parallaxSpeed) % height;
        
        if (offsetX > 0) offsetX -= width;
        if (offsetY > 0) offsetY -= height;

        ctx.drawImage(this.bgCanvas, offsetX, offsetY);
        ctx.drawImage(this.bgCanvas, offsetX + width, offsetY);
        ctx.drawImage(this.bgCanvas, offsetX, offsetY + height);
        ctx.drawImage(this.bgCanvas, offsetX + width, offsetY + height);
    }

    /**
     * Gezegenleri çizer.
     * OPTİMİZASYON: Sadece kamera görüş alanındaki hücreleri sorgular.
     */
    drawPlanets(ctx, player, echoRay, width, height, zoom) {
        const viewW = width / zoom; 
        const viewH = height / zoom; 
        
        // Ekranın kapladığı alan + biraz güvenlik payı (gezegen yarıçapı için)
        // Ekranın merkezini oyuncuya/kameraya göre hesaplamalıyız ama
        // draw fonksiyonu zaten transform edilmiş bir context ile çağrılıyor.
        // Ancak SpatialHash world coordinates ister.
        
        // Kamera merkezini (window.cameraFocus) kullanmak en doğrusu
        const centerX = window.cameraFocus ? window.cameraFocus.x : player.x;
        const centerY = window.cameraFocus ? window.cameraFocus.y : player.y;
        
        // Sorgulanacak alan (Görüş alanının yarısı + tampon)
        const rangeX = (viewW / 2) + 500; 
        
        // Sadece ekrandaki gezegenleri sorgula
        const visiblePlanets = this.grid.query(centerX, centerY, rangeX);

        visiblePlanets.forEach(p => { 
            const visibility = GameRules.getPlanetVisibility(p, player, echoRay);
            if (visibility === 0) return;
            
            p.draw(ctx, visibility); 
        });
    }
}