/**
 * Void Ray - Varlık Yöneticisi (Entity Manager)
 * * GÜNCELLEME: Yıldızlar artık 'Canvas Layering' tekniği ile çiziliyor.
 * * Statik arka plan ayrı bir canvas üzerinde önbelleğe alınarak performans artırıldı.
 */
class EntityManager {
    constructor() {
        this.planets = [];
        // Yıldızlar artık dizi olarak tutulmuyor, canvas'a işleniyor.
        
        // --- OPTİMİZASYON: Arka Plan Katmanı (Cached Canvas) ---
        this.bgCanvas = document.createElement('canvas');
        this.bgCtx = this.bgCanvas.getContext('2d');
        this.bgGenerated = false;
        
        // Toxic gezegen hasar/bildirim zamanlayıcıları
        this.lastToxicNotification = 0;
        this.lastToxicDamage = 0;
    }

    /**
     * Başlangıçta gezegenleri oluşturur.
     */
    init() {
        // 1. Gezegenleri Oluştur
        this.planets = [];
        for(let i=0; i < GAME_CONFIG.WORLD_GEN.PLANET_COUNT; i++) {
            let px, py, d;
            do {
                px = Utils.random(WORLD_SIZE);
                py = Utils.random(WORLD_SIZE);
                // Utils ile mesafe hesabı
                d = Utils.dist(px, py, GameRules.LOCATIONS.NEXUS.x, GameRules.LOCATIONS.NEXUS.y);
            } while(d < GAME_CONFIG.WORLD_GEN.SAFE_ZONE_RADIUS);

            this.planets.push(new Planet(px, py));
        }

        // Yıldız dizisi oluşturmaya gerek kalmadı, generateStarBackground() bunu halledecek.
        window.planets = this.planets;
    }

    /**
     * Arka plan yıldızlarını statik canvas üzerine bir kez çizer.
     */
    generateStarBackground(width, height) {
        // Canvas boyutunu ayarla
        this.bgCanvas.width = width;
        this.bgCanvas.height = height;
        
        // Temizle
        this.bgCtx.clearRect(0, 0, width, height);
        this.bgCtx.fillStyle = "white";

        // Yıldızları oluştur (Her frame yerine sadece bir kez çalışır)
        const starCount = GAME_CONFIG.WORLD_GEN.STAR_COUNT || 1000;
        
        for(let i=0; i < starCount; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 1.5; // Biraz daha küçük ve net yıldızlar
            const alpha = 0.2 + Math.random() * 0.6;
            
            this.bgCtx.globalAlpha = alpha;
            this.bgCtx.fillRect(x, y, size, size);
        }
        
        this.bgCtx.globalAlpha = 1.0;
        this.bgGenerated = true;
        console.log("Arka plan (Yıldızlar) önbelleğe alındı.");
    }

    /**
     * Varlıkların mantıksal güncellemelerini yapar.
     */
    update(dt) {
        // A. Toplananları Temizle
        this.planets = this.planets.filter(p => !p.collected);
        
        // B. Eksilenleri Tamamla (Respawn)
        if (this.planets.length < GAME_CONFIG.WORLD_GEN.PLANET_COUNT) {
            const needed = GAME_CONFIG.WORLD_GEN.PLANET_COUNT - this.planets.length;
            for(let i=0; i<needed; i++) {
                let px, py, dNexus, dPlayer; 
                do { 
                    px = Utils.random(WORLD_SIZE); 
                    py = Utils.random(WORLD_SIZE); 
                    
                    // Utils ile varlık tabanlı ve koordinat tabanlı mesafe
                    dPlayer = Utils.dist(px, py, player.x, player.y);
                    dNexus = Utils.dist(px, py, GameRules.LOCATIONS.NEXUS.x, GameRules.LOCATIONS.NEXUS.y);
                    
                } while(dNexus < GAME_CONFIG.WORLD_GEN.SAFE_ZONE_RADIUS || dPlayer < 1500);
                this.planets.push(new Planet(px, py));
            }
        }

        // C. Çarpışma Kontrolleri
        this.checkCollisions();

        window.planets = this.planets;
    }

    /**
     * Gezegen ve oyuncu etkileşimlerini kontrol eder.
     */
    checkCollisions() {
        this.planets.forEach(p => {
            if(!p.collected) {
                 // Utils.distEntity ile temiz mesafe kontrolü
                 if(Utils.distEntity(player, p) < p.radius + 30 * player.scale) { 
                    
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
                                } else { 
                                    break; 
                                } 
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
            }
        });
    }

    /**
     * Yıldızları çizer.
     * OPTİMİZASYON: Tek tek çizmek yerine önbelleğe alınmış canvas'ı kullanır.
     * Sonsuz döngü (infinite scroll) için 4 parça halinde döşenir.
     */
    drawStars(ctx, width, height, target) {
        // Eğer ekran boyutu değiştiyse veya henüz oluşturulmadıysa yeniden oluştur
        if(!this.bgGenerated || this.bgCanvas.width !== width || this.bgCanvas.height !== height) {
            this.generateStarBackground(width, height);
        }

        // Paralaks Etkisi: Yıldızlar oyuncudan daha yavaş hareket etmeli (0.9 oranında takip)
        const parallaxSpeed = 0.9;
        
        // Modulo operatörü ile kaydırma miktarını hesapla (0 ile width/height arasında tut)
        // Negatif değerler için width/height ekleyerek pozitif yapıyoruz
        let offsetX = -(target.x * parallaxSpeed) % width;
        let offsetY = -(target.y * parallaxSpeed) % height;
        
        if (offsetX > 0) offsetX -= width;
        if (offsetY > 0) offsetY -= height;

        // Önbelleğe alınmış resmi 4 kez çizerek ekranı tam kapla (Tiling)
        // Bu sayede kesintisiz sonsuz kaydırma efekti oluşur
        ctx.drawImage(this.bgCanvas, offsetX, offsetY);
        ctx.drawImage(this.bgCanvas, offsetX + width, offsetY);
        ctx.drawImage(this.bgCanvas, offsetX, offsetY + height);
        ctx.drawImage(this.bgCanvas, offsetX + width, offsetY + height);
    }

    /**
     * Gezegenleri çizer.
     */
    drawPlanets(ctx, player, echoRay, width, height, zoom) {
        const viewW = width / zoom; 
        const viewH = height / zoom; 
        
        this.planets.forEach(p => { 
            const visibility = GameRules.getPlanetVisibility(p, player, echoRay);
            if (visibility === 0) return;
            
            if(p.x > player.x - viewW && p.x < player.x + viewW && p.y > player.y - viewH && p.y < player.y + viewH) { 
                p.draw(ctx, visibility); 
            } 
        });
    }
}