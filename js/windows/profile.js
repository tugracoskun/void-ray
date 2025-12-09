/**
 * Void Ray - Pencere: Profil (Profile)
 * * Oyuncu seviyesi, XP durumu ve BAŞARIMLARI içerir.
 * * Profil ve Başarımlar tek bir pencerede birleştirilmiştir.
 */

let profileOpen = false;
let activeProfileTab = 'summary';

/**
 * Profil penceresini açar/kapatır (Toggle).
 */
window.toggleProfile = function() {
    if (profileOpen) {
        closeProfile();
    } else {
        openProfile();
    }
};

/**
 * Profil penceresini açar.
 * @param {string} tab - Açılacak sekme ('summary' veya 'achievements')
 */
function openProfile(tab = 'summary') {
    profileOpen = true;
    const overlay = document.getElementById('profile-overlay');
    if (overlay) overlay.classList.add('open');
    
    // Butonu aktif yap
    if (typeof setHudButtonActive === 'function') setHudButtonActive('btn-profile-icon', true);
    
    // İstenen sekmeye geç
    switchProfileTab(tab);
    
    renderProfile();
}

function closeProfile() {
    profileOpen = false;
    const overlay = document.getElementById('profile-overlay');
    if (overlay) overlay.classList.remove('open');
    
    // Buton aktifliğini kaldır
    if (typeof setHudButtonActive === 'function') setHudButtonActive('btn-profile-icon', false);
    
    hideTooltip();
}

function switchProfileTab(tabName) {
    activeProfileTab = tabName;
    
    // Buton stillerini güncelle
    document.querySelectorAll('.profile-tab-btn').forEach(t => t.classList.remove('active'));
    const activeBtn = document.getElementById(`p-tab-btn-${tabName}`);
    if(activeBtn) activeBtn.classList.add('active');
    
    // İçerik görünürlüğünü güncelle
    document.querySelectorAll('.profile-tab-content').forEach(c => c.style.display = 'none');
    const activeContent = document.getElementById(`p-tab-${tabName}`);
    if(activeContent) activeContent.style.display = 'block';
    
    // Eğer başarım sekmesi açıldıysa listeyi render et
    if (tabName === 'achievements') {
        renderAchievements();
    }
}

function renderProfile() {
    if (!profileOpen) return;

    if (typeof player !== 'undefined') {
        player.updateUI(); // Bu fonksiyon zaten genel UI elementlerini günceller
        
        // Yeni Profil Elementlerini Doldur
        
        // 1. Level / XP
        const xpCurr = document.getElementById('xp-current');
        const xpMax = document.getElementById('xp-max');
        if(xpCurr) xpCurr.innerText = Math.floor(player.xp);
        if(xpMax) xpMax.innerText = Math.floor(player.maxXp);

        // YENİ: XP BAR GÜNCELLEMESİ
        const xpBar = document.getElementById('profile-xp-fill');
        if (xpBar) {
            const percentage = Math.min(100, Math.max(0, (player.xp / player.maxXp) * 100));
            xpBar.style.width = `${percentage}%`;
        }

        // 2. Statü (Upgrades)
        // playerData.upgrades -> { playerSpeed, playerTurn, playerMagnet, playerCapacity }
        if(playerData && playerData.upgrades) {
            const setStat = (id, val) => {
                const el = document.getElementById(id);
                if(el) el.innerText = val;
            };
            setStat('stat-lvl-speed', playerData.upgrades.playerSpeed);
            setStat('stat-lvl-turn', playerData.upgrades.playerTurn);
            setStat('stat-lvl-magnet', playerData.upgrades.playerMagnet);
            setStat('stat-lvl-cap', playerData.upgrades.playerCapacity);
        }

        // 3. Durum (Vitals)
        // player.health, player.energy
        const hpText = document.getElementById('val-hp-text');
        const epText = document.getElementById('val-ep-text');
        if(hpText) hpText.innerText = `${Math.floor(player.health)}/${Math.floor(player.maxHealth)}`;
        if(epText) epText.innerText = `${Math.floor(player.energy)}/${Math.floor(player.maxEnergy)}`;

        // 4. Özellikler (Attributes)
        // formatTime ui.js'den gelir
        if (playerData && playerData.stats) {
            const setAttr = (id, val) => {
                const el = document.getElementById(id);
                if(el) el.innerText = val;
            };
            
            // Hız (Fiziksel hızın 10 katı HUD hızıdır)
            const speed = Math.floor(Math.hypot(player.vx, player.vy) * 10);
            setAttr('attr-speed', speed);
            setAttr('attr-echo-speed', Math.floor(playerData.stats.echoMaxSpeed * 10));
            setAttr('p-stat-dist', Math.floor(playerData.stats.distance / 100) + " km");
            setAttr('p-stat-loot', playerData.stats.totalResources);
            setAttr('p-stat-dust', playerData.stats.totalStardust);
            
            const gameTime = (Date.now() - (window.gameStartTime || Date.now()));
            if(typeof formatTime === 'function') {
                setAttr('p-stat-time', formatTime(gameTime));
            }
        }
        
        // Rütbe
        const rankEl = document.getElementById('profile-rank-text');
        if (rankEl) {
            let rank = "ACEMİ PİLOT";
            if (player.level > 2) rank = "GEZGİN";
            if (player.level > 5) rank = "YILDIZ AVCISI";
            if (player.level > 10) rank = "VOID SÜVARİSİ";
            if (player.level > 20) rank = "EVRENİN HAKİMİ";
            rankEl.innerText = rank;
        }
    }
    
    if (activeProfileTab === 'achievements') {
        renderAchievements();
    }
}

/**
 * Başarım listesini Profil Penceresi içine çizer.
 */
function renderAchievements() {
    if (typeof AchievementManager === 'undefined') return;

    const listContainer = document.getElementById('profile-achievements-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    AchievementManager.achievements.forEach(ach => {
        const isUnlocked = ach.unlocked;
        
        // Değerleri Hesapla
        let currentVal = ach.getValue ? ach.getValue() : 0;
        let targetVal = ach.target || 1;
        
        if (isUnlocked) currentVal = targetVal;
        
        const pct = Math.min(100, Math.max(0, (currentVal / targetVal) * 100));
        
        const displayCurrent = ach.format ? ach.format(currentVal) : Math.floor(currentVal);
        const displayTarget = ach.format ? ach.format(targetVal) : targetVal;

        const item = document.createElement('div');
        item.className = `achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`;
        
        const icon = isUnlocked ? '★' : '☆'; 
        const titleClass = isUnlocked ? 'text-emerald-400' : 'text-gray-500';
        const descClass = isUnlocked ? 'text-gray-300' : 'text-gray-600';
        const barColor = isUnlocked ? '#10b981' : '#334155'; 
        
        item.innerHTML = `
            <div class="ach-list-icon">${icon}</div>
            <div class="ach-list-info">
                <div class="ach-header-row">
                    <div class="ach-list-title ${titleClass}">${ach.title}</div>
                    <div class="ach-progress-text">${displayCurrent} / ${displayTarget}</div>
                </div>
                <div class="ach-list-desc ${descClass}">${ach.desc}</div>
                
                <div class="ach-progress-bg">
                    <div class="ach-progress-fill" style="width: ${pct}%; background-color: ${barColor};"></div>
                </div>
            </div>
            ${isUnlocked ? '<div class="ach-check">✔</div>' : ''}
        `;
        
        listContainer.appendChild(item);
    });
    
    const total = AchievementManager.achievements.length;
    const unlockedCount = AchievementManager.achievements.filter(a => a.unlocked).length;
    const progressEl = document.getElementById('ach-progress-text');
    if (progressEl) progressEl.innerText = `${unlockedCount} / ${total} TAMAMLANDI`;
}