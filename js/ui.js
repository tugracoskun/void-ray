/**
 * Void Ray - Kullanıcı Arayüzü (UI) Yönetimi
 * * Menüler, ortak araçlar (tooltip, grid), bildirimler ve diğer pencereleri yönetir.
 * * Ayrılan Modüller:
 * * - Oyuncu Envanteri (js/windows/inventory.js)
 * * - Yankı Envanteri (js/windows/echo.js)
 * * - Harita Penceresi (js/windows/map.js)
 * * - İstatistikler (js/windows/stats.js)
 * * - Ayarlar (js/windows/settings.js)
 * * - Depo (js/windows/storage.js)
 * * - Nexus (js/windows/nexus.js)
 */

// HUD Görünürlük Durumu
let isHudVisible = true;

// --- GLOBAL TOOLTIP YÖNETİMİ ---
const globalTooltip = document.createElement('div');
globalTooltip.id = 'global-tooltip';
document.body.appendChild(globalTooltip);

/**
 * Eşya ve XP için Tooltip gösterir.
 */
function showTooltip(e, name, xp) {
    if (!isHudVisible) return;
    globalTooltip.innerHTML = `
        <span class="tooltip-title">${name}</span>
        <span class="tooltip-xp">${xp} XP</span>
    `;
    globalTooltip.style.display = 'block';
    moveTooltip(e);
}

/**
 * Ayarlar ve Bilgilendirme için Basit Tooltip
 */
window.showInfoTooltip = function(e, text) {
    if (!isHudVisible) return;
    globalTooltip.innerHTML = `
        <span class="tooltip-desc" style="color:#e2e8f0; font-size:0.75rem; letter-spacing:0.5px;">${text}</span>
    `;
    globalTooltip.style.display = 'block';
    moveTooltip(e);
};

function moveTooltip(e) {
    const width = globalTooltip.offsetWidth;
    const height = globalTooltip.offsetHeight;
    const offset = 15;
    let x = e.clientX + offset;
    let y = e.clientY + offset;
    
    if (x + width > window.innerWidth) x = e.clientX - width - offset;
    if (y + height > window.innerHeight) y = e.clientY - height - offset;

    x = Math.max(0, x);
    y = Math.max(0, y);

    globalTooltip.style.left = x + 'px';
    globalTooltip.style.top = y + 'px';
}

window.hideTooltip = function() {
    globalTooltip.style.display = 'none';
};

// --- GENEL YARDIMCI FONKSİYONLAR ---

window.toggleHUD = function() {
    isHudVisible = !isHudVisible;
    const hudContainer = document.getElementById('ui-hud');
    const panelsContainer = document.getElementById('ui-panels');
    
    if (hudContainer) {
        if (isHudVisible) hudContainer.classList.remove('hidden-ui');
        else hudContainer.classList.add('hidden-ui');
    }
    
    if (panelsContainer) {
        if (isHudVisible) panelsContainer.classList.remove('hidden-ui');
        else panelsContainer.classList.add('hidden-ui');
    }
    
    if (!isHudVisible) hideTooltip();
    
    if (isHudVisible) {
        showNotification({name: "ARAYÜZ AKTİF", type:{color:'#fff'}}, "");
    }
}

function formatTime(ms) {
    if(!ms) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

function startTipsCycle() {
    let tipIdx = 0;
    const tipEl = document.getElementById('tip-text');
    if (!tipEl) return;
    
    setInterval(() => {
        tipEl.style.opacity = 0;
        setTimeout(() => {
            tipIdx = (tipIdx + 1) % TIPS.length;
            tipEl.innerText = TIPS[tipIdx];
            tipEl.style.opacity = 1;
        }, 1000);
    }, 5000);
}

function showToxicEffect() { 
    const el = document.getElementById('toxic-overlay'); 
    if(el) {
        el.classList.add('active'); 
        setTimeout(() => el.classList.remove('active'), 1500); 
    }
}

// --- GRID (IZGARA) OLUŞTURUCU YARDIMCI ---
/**
 * HTML container içine envanter ızgarası çizer.
 * Diğer modüller tarafından kullanılır.
 */
function renderGrid(container, items, capacity, onClickAction, isUnlimited = false) {
    if (!container) return;
    container.innerHTML = '';
    container.className = 'inventory-grid-container';
    
    const displayCount = isUnlimited ? Math.max(items.length + 20, 100) : capacity;

    for (let i = 0; i < displayCount; i++) {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        
        if (i < items.length) {
            const item = items[i];
            slot.classList.add('has-item');
            
            const itemBox = document.createElement('div');
            itemBox.className = 'item-box';
            itemBox.style.backgroundColor = item.type.color;
            
            if (item.name) {
                itemBox.innerText = item.name.charAt(0).toUpperCase();
            }
            
            slot.appendChild(itemBox);
            
            slot.onclick = () => {
                hideTooltip();
                onClickAction(item);
            };
            
            slot.onmouseenter = (e) => showTooltip(e, item.name, item.type.xp);
            slot.onmousemove = (e) => moveTooltip(e);
            slot.onmouseleave = () => hideTooltip();
        }
        
        container.appendChild(slot);
    }
}

function updateAIButton() {
    const btn = document.getElementById('ai-mode-btn');
    const aiToggle = document.getElementById('btn-ai-toggle');
    const modeBtn = document.getElementById('ai-mode-btn');
    
    aiToggle.classList.remove('warn-blink');

    if(!autopilot) {
            aiToggle.classList.remove('active'); 
            modeBtn.classList.remove('visible');
            return;
    }

    aiToggle.classList.add('active'); 
    modeBtn.classList.add('visible');

    if (aiMode === 'travel') { 
        btn.innerText = 'SEYİR'; 
        btn.style.color = '#ef4444'; 
        btn.style.borderColor = '#ef4444'; 
    } else if (aiMode === 'base') { 
        btn.innerText = 'ÜS'; 
        btn.style.color = '#fbbf24'; 
        btn.style.borderColor = '#fbbf24'; 
    } else if (aiMode === 'deposit') {
        btn.innerText = 'DEPO'; 
        btn.style.color = '#a855f7'; 
        btn.style.borderColor = '#a855f7'; 
    } else { 
        btn.innerText = 'TOPLA'; 
        btn.style.color = 'white'; 
        btn.style.borderColor = 'transparent'; 
    }
}

// --- MOBİL CİHAZ KONTROLÜ (YENİ) ---
window.checkMobile = function() {
    const warning = document.getElementById('mobile-warning');
    if (!warning) return;

    // Basit mobil kontrolü: UserAgent veya ekran genişliği
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 800;
    
    if (isMobile) {
        warning.style.display = 'flex';
        console.log("Mobil cihaz algılandı.");
    } else {
        warning.style.display = 'none';
    }
}

window.closeMobileWarning = function() {
    const warning = document.getElementById('mobile-warning');
    if (warning) {
        warning.style.display = 'none';
        
        // Kullanıcı devam et dediğinde tam ekran modunu önerebiliriz veya
        // kontroller hakkında ipucu verebiliriz (Gelecek geliştirme)
    }
}