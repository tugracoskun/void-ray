/**
 * Void Ray - Varlık Yöneticisi (Entity Manager)
 * * Gezegenlerin ve yıldızların oluşturulması, yaşam döngüsü ve çizimini yönetir.
 * * Utils.js kullanılarak sadeleştirilmiştir.
 */
class EntityManager {
    constructor() {
        this.planets = [];
        this.stars = [];
        
        // Toxic gezegen hasar/bildirim zamanlayıcıları
        this.lastToxicNotification = 0;
        this.lastToxicDamage = 0;
    }

    /**
     * Başlangıçta gezegenleri ve yıldızları oluşturur.
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

        // 2. Yıldızları Oluştur
        this.stars = [];
        for(let i=0; i < GAME_CONFIG.WORLD_GEN.STAR_COUNT; i++) {
            this.stars.push({
                x: Utils.random(WORLD_SIZE), 
                y: Utils.random(WORLD_SIZE), 
                s: Utils.random(0, 2)
            });
        }
        
        window.planets = this.planets;
        window.stars = this.stars;
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
                        // Utils.playSound ile güvenli ses çağırma
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
                             // Parametreli ses çağırma örneği
                             Utils.playSound('playChime', {id:'legendary'}); 
                             showNotification({name: "KAYIP KARGO KURTARILDI!", type:{color:'#a855f7'}}, ""); 
                             if (p.lootContent && p.lootContent.length > 0) { 
                                 p.lootContent.forEach(item => { 
                                     if(addItemToInventory(item)) {
                                         const xp = calculatePlanetXp(item.type);
                                         player.gainXp(xp);
                                     }
                                 }); 
                             }
                         }
                    } else if (p.type.id === 'tardigrade') {
                        p.collected = true; 
                        Utils.playSound('playChime', p.type);
                        player.energy = Math.min(player.energy + 50, player.maxEnergy);
                        const xp = calculatePlanetXp(p.type);
                        showNotification({name: "TARDİGRAD YENDİ", type:{color:'#C7C0AE'}}, `(+%50 ENERJİ, +${xp} XP)`);
                        player.gainXp(xp);
                    } else { 
                        const lootCount = GameRules.calculateLootCount(); 
                        if (lootCount === 0) {
                            p.collected = true;
                            const xp = calculatePlanetXp(p.type);
                            player.gainXp(xp);
                            showNotification({ name: `+${xp} XP`, type: { color: '#94a3b8' } }, "(Veri Analizi)");
                        } else {
                            let addedCount = 0;
                            let totalXp = 0;
                            for(let i=0; i<lootCount; i++) { 
                                if(addItemToInventory(p)) { 
                                    addedCount++; 
                                    const xp = calculatePlanetXp(p.type);
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
     */
    drawStars(ctx, width, height, target) {
        ctx.fillStyle="white"; 
        this.stars.forEach(s => { 
            let sx = (s.x - target.x * 0.9) % width; 
            let sy = (s.y - target.y * 0.9) % height; 
            if(sx<0) sx+=width; if(sy<0) sy+=height; 
            
            // Rastgelelik için Utils kullanılabilir veya performans için inline bırakılabilir
            ctx.globalAlpha = 0.5 + Utils.random(0, 0.3); 
            ctx.fillRect(sx, sy, s.s, s.s); 
        }); 
        ctx.globalAlpha = 1;
    }

    /**
     * Gezegenleri çizer.
     */
    drawPlanets(ctx, player, echoRay, width, height, zoom) {
        const viewW = width / zoom; 
        const viewH = height / zoom; 
        
        this.planets.forEach(p => { 
            const visibility = getPlanetVisibility(p, player, echoRay);
            if (visibility === 0) return;
            
            if(p.x > player.x - viewW && p.x < player.x + viewW && p.y > player.y - viewH && p.y < player.y + viewH) { 
                p.draw(ctx, visibility); 
            } 
        });
    }
}