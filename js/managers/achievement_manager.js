/**
 * Void Ray - Başarım Yöneticisi (Achievement Manager)
 * * Oyuncunun istatistiklerini izler ve belirli koşullar sağlandığında ödül verir.
 * * GÜNCELLEME: İlerleme takibi için 'target' ve 'getValue' eklendi.
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
        this.showPopup(ach);
        if (typeof audio !== 'undefined' && audio) audio.playChime({id: 'legendary'});
        if (typeof SaveManager !== 'undefined') SaveManager.save(true);
    },

    showPopup: function(ach) {
        const container = document.getElementById('ui-core');
        if (!container) return;

        const popup = document.createElement('div');
        // CSS stilleri achievement_manager.js'de inline olarak veya css dosyasında olabilir.
        // Önceki adımda inline eklemiştik, aynen koruyoruz.
        popup.className = 'achievement-popup';
        popup.innerHTML = `
            <div class="ach-icon">★</div>
            <div class="ach-content">
                <div class="ach-title">BAŞARIM AÇILDI</div>
                <div class="ach-name">${ach.title}</div>
                <div class="ach-desc">${ach.desc}</div>
            </div>
        `;
        
        popup.style.cssText = `
            position: absolute; top: 100px; right: -300px;
            background: rgba(16, 185, 129, 0.9);
            border: 1px solid #34d399;
            border-left: 4px solid #fff;
            padding: 15px; width: 280px;
            display: flex; gap: 15px; align-items: center;
            border-radius: 4px; z-index: 200;
            box-shadow: 0 5px 20px rgba(0,0,0,0.5);
            transition: right 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            backdrop-filter: blur(5px);
        `;
        
        const icon = popup.querySelector('.ach-icon');
        icon.style.cssText = "font-size: 2rem;";
        
        const title = popup.querySelector('.ach-title');
        title.style.cssText = "font-size: 0.7rem; color: #ecfdf5; letter-spacing: 1px; font-weight:bold;";
        
        const name = popup.querySelector('.ach-name');
        name.style.cssText = "font-size: 1.1rem; color: #fff; font-weight: 800; margin: 2px 0;";
        
        const desc = popup.querySelector('.ach-desc');
        desc.style.cssText = "font-size: 0.8rem; color: #d1fae5; line-height: 1.2;";

        container.appendChild(popup);

        setTimeout(() => { popup.style.right = '30px'; }, 100);
        setTimeout(() => {
            popup.style.right = '-350px';
            setTimeout(() => popup.remove(), 600);
        }, 4000);
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