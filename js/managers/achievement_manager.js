/**
 * Void Ray - Başarım Yöneticisi (Achievement Manager)
 * * Oyuncunun istatistiklerini izler ve belirli koşullar sağlandığında ödül verir.
 * * GÜNCELLEME: İlerleme takibi için 'target' ve 'getValue' eklendi.
 * * GÜNCELLEME (UI): CSS sınıf tabanlı popup tasarımı.
 */

const AchievementManager = {
    achievements: [
        { 
            id: 'first_steps', 
            title: 'İLK ADIM', 
            desc: 'İlk kaynağını topla.', 
            target: 1,
            getValue: () => playerData.stats.totalResources,
            unlocked: false 
        },
        { 
            id: 'traveler', 
            title: 'GEZGİN', 
            desc: '1000 km mesafe kat et.', 
            target: 100000, // 1 birim = 0.01 metre varsayımıyla (oyun içi scale)
            getValue: () => playerData.stats.distance,
            format: (v) => Math.floor(v / 100) + ' km', // Gösterim formatı
            unlocked: false 
        },
        { 
            id: 'rich', 
            title: 'KRİSTAL AVCISI', 
            desc: 'Toplam 500 kristal kazan.', 
            target: 500, 
            getValue: () => playerData.stats.totalStardust,
            unlocked: false 
        },
        { 
            id: 'speeder', 
            title: 'IŞIK HIZI', 
            desc: '150 km/s hıza ulaş.', 
            target: 15, // Fiziksel hız (HUD'da x10 gösterilir)
            getValue: () => playerData.stats.maxSpeed,
            format: (v) => Math.floor(v * 10) + ' km/s',
            unlocked: false 
        },
        { 
            id: 'hoarder', 
            title: 'DEPO MEMURU', 
            desc: 'Merkez depoda 50 eşya biriktir.', 
            target: 50, 
            getValue: () => centralStorage.length,
            unlocked: false 
        },
        { 
            id: 'level_5', 
            title: 'EVRİM', 
            desc: 'Seviye 5\'e ulaş.', 
            target: 5, 
            getValue: () => player.level,
            unlocked: false 
        },
        { 
            id: 'echo_master', 
            title: 'SÜRÜ LİDERİ', 
            desc: 'Yankı dronun tüm geliştirmelerini tamamla.', 
            target: 20, // 4 özellik * 5 seviye = 20 toplam seviye
            getValue: () => {
                if(!playerData || !playerData.upgrades) return 0;
                return Object.keys(playerData.upgrades)
                    .filter(k => k.startsWith('echo'))
                    .reduce((sum, k) => sum + playerData.upgrades[k], 0);
            },
            unlocked: false 
        }
    ],

    init: function() {
        console.log("AchievementManager başlatılıyor...");
        setInterval(() => this.check(), 5000);
    },

    check: function() {
        if (!playerData.stats) return;

        this.achievements.forEach(ach => {
            if (!ach.unlocked) {
                const currentVal = ach.getValue();
                if (currentVal >= ach.target) {
                    this.unlock(ach);
                }
            }
        });
    },

    unlock: function(ach) {
        ach.unlocked = true;
        if (typeof showAchievementPopup === 'function') {
            showAchievementPopup(ach);
        } else {
            console.warn("showAchievementPopup fonksiyonu bulunamadı (notifications.js yüklü mü?)");
        }
        
        if (typeof audio !== 'undefined' && audio) audio.playChime({id: 'legendary'});
        if (typeof SaveManager !== 'undefined') SaveManager.save(true);
    },

    getUnlockedIds: function() {
        return this.achievements.filter(a => a.unlocked).map(a => a.id);
    },

    loadUnlockedIds: function(ids) {
        if (!Array.isArray(ids)) return;
        this.achievements.forEach(ach => {
            if (ids.includes(ach.id)) {
                ach.unlocked = true;
            }
        });
    }
};

window.AchievementManager = AchievementManager;