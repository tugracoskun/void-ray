/**
 * Void Ray - Kayıt Yöneticisi (Save Manager) - Gelişmiş Sürüm
 * * Özellikler: Base64 Şifreleme, Dışa/İçe Aktarma, Versiyon Kontrolü, Başarım Entegrasyonu
 */

const SaveManager = {
    SAVE_KEY: 'void_ray_save_v1',
    AUTO_SAVE_INTERVAL: 30000, // 30 Saniye
    CURRENT_VERSION: 1.1,
    
    saveIntervalId: null,

    init: function() {
        console.log("SaveManager başlatılıyor...");
        this.load();

        if (this.saveIntervalId) clearInterval(this.saveIntervalId);
        this.saveIntervalId = setInterval(() => this.save(true), this.AUTO_SAVE_INTERVAL);

        window.addEventListener('beforeunload', () => this.save(true));
        
        window.exportSave = this.exportSave.bind(this);
        window.importSave = this.importSave.bind(this);
    },

    hasSave: function() {
        return !!localStorage.getItem(this.SAVE_KEY);
    },

    save: function(silent = false) {
        if (!player) return;

        const saveData = {
            meta: {
                timestamp: Date.now(),
                version: this.CURRENT_VERSION,
                gameTime: (Date.now() - (window.gameStartTime || Date.now()))
            },
            player: {
                level: player.level,
                xp: player.xp,
                health: player.health,
                energy: player.energy,
                x: Math.round(player.x),
                y: Math.round(player.y)
            },
            globalData: playerData,
            inventory: collectedItems,
            storage: centralStorage,
            echo: echoRay ? {
                active: true,
                lootBag: echoRay.lootBag,
                mode: echoRay.mode,
                x: Math.round(echoRay.x),
                y: Math.round(echoRay.y)
            } : { active: false },
            
            // BAŞARIMLARI KAYDET
            achievements: (typeof AchievementManager !== 'undefined') ? AchievementManager.getUnlockedIds() : [],
            
            // REHBER KAYDI (YENİ)
            tutorial: (typeof TutorialManager !== 'undefined') ? TutorialManager.getExportData() : []
        };

        try {
            const json = JSON.stringify(saveData);
            
            const encoded = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g,
                function toSolidBytes(match, p1) {
                    return String.fromCharCode('0x' + p1);
            }));

            localStorage.setItem(this.SAVE_KEY, encoded);
            
            if (!silent) showNotification({name: "İLERLEME KAYDEDİLDİ", type:{color:'#10b981'}}, "");
            else console.log(`[AutoSave] Veri boyutu: ${(encoded.length/1024).toFixed(2)} KB`);

        } catch (e) {
            console.error("Kayıt başarısız:", e);
            if (e.name === 'QuotaExceededError') {
                showNotification({name: "KAYIT HATASI", type:{color:'#ef4444'}}, "Disk alanı dolu!");
            }
        }
    },

    load: function() {
        const encoded = localStorage.getItem(this.SAVE_KEY);
        if (!encoded) return false;

        try {
            let json;
            if (encoded.trim().startsWith('{')) {
                json = encoded; 
            } else {
                json = decodeURIComponent(atob(encoded).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
            }

            const data = JSON.parse(json);
            
            // Player
            if (data.player) {
                player.level = data.player.level || 1;
                player.xp = data.player.xp || 0;
                
                player.maxXp = GAME_CONFIG.PLAYER.BASE_XP;
                for (let i = 1; i < player.level; i++) {
                    player.maxXp = GameRules.calculateNextLevelXp(player.maxXp);
                    player.maxHealth += 20;
                }
                
                player.health = data.player.health ?? player.maxHealth;
                player.energy = data.player.energy ?? player.maxEnergy;

                if (data.player.x && data.player.y) {
                    player.x = data.player.x;
                    player.y = data.player.y;
                    
                    if(player.tail) player.tail.forEach(t => { t.x = player.x; t.y = player.y; });
                    if (window.cameraFocus) {
                        window.cameraFocus.x = player.x;
                        window.cameraFocus.y = player.y;
                    }
                }
            }

            if (data.globalData) Object.assign(playerData, data.globalData);

            if (data.inventory) { collectedItems.length = 0; data.inventory.forEach(i => collectedItems.push(i)); }
            if (data.storage) { centralStorage.length = 0; data.storage.forEach(i => centralStorage.push(i)); }

            if (data.echo && data.echo.active) {
                let sx = data.echo.x ?? player.x;
                let sy = data.echo.y ?? player.y + 100;

                if (!echoRay) spawnEcho(sx, sy);
                else { echoRay.x = sx; echoRay.y = sy; }

                if (echoRay) {
                    echoRay.lootBag = data.echo.lootBag || [];
                    echoRay.mode = (data.echo.mode === 'return' || data.echo.mode === 'deposit_storage') ? 'roam' : data.echo.mode;
                }
            }

            // BAŞARIMLARI YÜKLE
            if (data.achievements && typeof AchievementManager !== 'undefined') {
                AchievementManager.loadUnlockedIds(data.achievements);
            }
            
            // REHBER YÜKLE (YENİ)
            if (data.tutorial && typeof TutorialManager !== 'undefined') {
                TutorialManager.loadProgress(data.tutorial);
            }

            player.updateUI();
            updateInventoryCount();
            if (typeof updateEchoDropdownUI === 'function') updateEchoDropdownUI();
            
            console.log("Kayıt başarıyla yüklendi.");
            return true;

        } catch (e) {
            console.error("Kayıt dosyası bozuk veya uyumsuz:", e);
            showNotification({name: "KAYIT BOZUK", type:{color:'#ef4444'}}, "Veri kurtarılamadı.");
            return false;
        }
    },

    resetSave: function() {
        localStorage.removeItem(this.SAVE_KEY);
        // localStorage.removeItem('void_ray_tutorial'); // Eski varsa sil
        if (typeof TutorialManager !== 'undefined') TutorialManager.reset();
        console.log("Kayıt silindi.");
    },

    exportSave: function() {
        this.save(true);
        const data = localStorage.getItem(this.SAVE_KEY);
        if(!data) return "Kayıt bulunamadı.";
        
        navigator.clipboard.writeText(data).then(() => {
            showNotification({name: "KAYIT KOPYALANDI", type:{color:'#38bdf8'}}, "Panoya yapıştırabilirsin.");
        }).catch(err => {
            console.log("Kayıt Kodu:", data);
            showNotification({name: "KONSOLA BAKIN", type:{color:'#fbbf24'}}, "Kodu oradan kopyalayın.");
        });
        return "Kayıt kodu panoya kopyalandı (veya konsola yazıldı).";
    },

    importSave: function(encodedString) {
        if (!encodedString) return "Lütfen kayıt kodunu parametre olarak girin: importSave('kod')";
        
        try {
            const testJson = decodeURIComponent(atob(encodedString).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            JSON.parse(testJson); 

            localStorage.setItem(this.SAVE_KEY, encodedString);
            showNotification({name: "KAYIT İÇE AKTARILDI", type:{color:'#10b981'}}, "Sayfa yenileniyor...");
            setTimeout(() => location.reload(), 1500);
            return "Başarılı.";
        } catch (e) {
            return "HATA: Geçersiz kayıt kodu.";
        }
    }
};

window.SaveManager = SaveManager;