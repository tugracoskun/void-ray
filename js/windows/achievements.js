/**
 * Void Ray - Pencere: Başarımlar (Achievements)
 * * Oyuncunun kazandığı ve henüz kazanmadığı başarımları listeler.
 */

let achievementsOpen = false;

function openAchievements() {
    achievementsOpen = true;
    const overlay = document.getElementById('achievements-overlay');
    if (overlay) overlay.classList.add('open');
    renderAchievementsList();
}

function closeAchievements() {
    achievementsOpen = false;
    const overlay = document.getElementById('achievements-overlay');
    if (overlay) overlay.classList.remove('open');
}

/**
 * Başarım listesini çizer.
 */
function renderAchievementsList() {
    if (!achievementsOpen || typeof AchievementManager === 'undefined') return;

    const listContainer = document.getElementById('achievements-list');
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
        
        // İKON GÜNCELLEMESİ: Kilit yerine Boş Yıldız (Diğer ikonlarla uyumlu)
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