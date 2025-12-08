/**
 * Void Ray - Kullanıcı Arayüzü (UI) Yönetimi
 */

// HUD Görünürlük Durumu
let isHudVisible = true;

// --- GLOBAL TOOLTIP YÖNETİMİ ---
const globalTooltip = document.createElement('div');
globalTooltip.id = 'global-tooltip';
document.body.appendChild(globalTooltip);

function showTooltip(e, name, xp) {
    if (!isHudVisible) return;
    globalTooltip.innerHTML = `<span class="tooltip-title">${name}</span><span class="tooltip-xp">${xp} XP</span>`;
    globalTooltip.style.display = 'block';
    moveTooltip(e);
}

window.showInfoTooltip = function(e, text) {
    if (!isHudVisible) return;
    globalTooltip.innerHTML = `<span class="tooltip-desc" style="color:#e2e8f0; font-size:0.75rem; letter-spacing:0.5px;">${text}</span>`;
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
    globalTooltip.style.left = Math.max(0, x) + 'px';
    globalTooltip.style.top = Math.max(0, y) + 'px';
}

window.hideTooltip = function() { globalTooltip.style.display = 'none'; };

// --- OLAY DİNLEYİCİLERİ (EVENT LISTENERS) ---
window.initUIListeners = function() {
    console.log("UI Olay Dinleyicileri başlatılıyor...");
    
    // OYUNCU SEVİYE ATLAMA
    window.eventBus.on('player:levelup', (data) => {
        showNotification({name: `EVRİM GEÇİRİLDİ: SEVİYE ${data.level}`, type: {color: '#fff'}}, "");
        
        // Ses efekti UI tepkisi olarak çalınır
        if(typeof audio !== 'undefined' && audio) audio.playEvolve();
    });
};

// --- GENEL YARDIMCI FONKSİYONLAR ---

/**
 * HUD üzerindeki bir butonun aktiflik durumunu (parlaklık) değiştirir.
 * @param {string} id - Buton elementinin ID'si
 * @param {boolean} isActive - Aktif mi pasif mi
 */
window.setHudButtonActive = function(id, isActive) {
    const btn = document.getElementById(id);
    if (btn) {
        if (isActive) btn.classList.add('active');
        else btn.classList.remove('active');
    }
};

window.toggleHUD = function() {
    isHudVisible = !isHudVisible;
    const hudContainer = document.getElementById('ui-hud');
    const panelsContainer = document.getElementById('ui-panels');
    
    if (hudContainer) hudContainer.classList.toggle('hidden-ui', !isHudVisible);
    if (panelsContainer) panelsContainer.classList.toggle('hidden-ui', !isHudVisible);
    
    if (!isHudVisible) hideTooltip();
    else showNotification({name: "ARAYÜZ AKTİF", type:{color:'#fff'}}, "");
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
    if(el) { el.classList.add('active'); setTimeout(() => el.classList.remove('active'), 1500); }
}

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
            if (item.name) itemBox.innerText = item.name.charAt(0).toUpperCase();
            slot.appendChild(itemBox);
            slot.onclick = () => { hideTooltip(); onClickAction(item); };
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

    if (aiMode === 'travel') { btn.innerText = 'SEYİR'; btn.style.color = '#ef4444'; btn.style.borderColor = '#ef4444'; } 
    else if (aiMode === 'base') { btn.innerText = 'ÜS'; btn.style.color = '#fbbf24'; btn.style.borderColor = '#fbbf24'; } 
    else if (aiMode === 'deposit') { btn.innerText = 'DEPO'; btn.style.color = '#a855f7'; btn.style.borderColor = '#a855f7'; } 
    else { btn.innerText = 'TOPLA'; btn.style.color = 'white'; btn.style.borderColor = 'transparent'; }
}

window.checkMobile = function() {
    const warning = document.getElementById('mobile-warning');
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 800;
    if (warning) warning.style.display = isMobile ? 'flex' : 'none';
}
window.closeMobileWarning = function() {
    const warning = document.getElementById('mobile-warning');
    if (warning) warning.style.display = 'none';
}

// --- ANA MENÜ VE BAŞLATMA YÖNETİMİ ---

window.initMainMenu = function() {
    const btnContinue = document.getElementById('btn-continue');
    const btnStart = document.getElementById('btn-start');
    
    if (btnContinue) {
        const newBtn = btnContinue.cloneNode(true);
        btnContinue.parentNode.replaceChild(newBtn, btnContinue);
    }
    if (btnStart) {
        const newBtn = btnStart.cloneNode(true);
        btnStart.parentNode.replaceChild(newBtn, btnStart);
    }

    const cleanBtnContinue = document.getElementById('btn-continue');
    const cleanBtnStart = document.getElementById('btn-start');

    if (typeof SaveManager !== 'undefined' && SaveManager.hasSave()) {
        if (cleanBtnContinue) {
            cleanBtnContinue.style.display = 'block';
            cleanBtnContinue.addEventListener('click', () => {
                startGameSession(true);
            });
        }
        
        if (cleanBtnStart) {
            cleanBtnStart.innerText = "YENİ YAŞAM DÖNGÜSÜ";
            cleanBtnStart.addEventListener('click', () => {
                if(confirm("Mevcut ilerleme silinecek. Emin misin?")) {
                    SaveManager.resetSave();
                    startGameSession(false);
                }
            });
        }
    } else {
        if (cleanBtnContinue) cleanBtnContinue.style.display = 'none';
        if (cleanBtnStart) {
            cleanBtnStart.innerText = "YAŞAM DÖNGÜSÜNÜ BAŞLAT";
            cleanBtnStart.addEventListener('click', () => {
                startGameSession(false);
            });
        }
    }
}

window.startGameSession = function(loadSave) {
    const mainMenu = document.getElementById('main-menu');
    if(mainMenu) mainMenu.classList.add('menu-hidden'); 
    
    const controlsWrapper = document.getElementById('menu-controls-wrapper');
    if (controlsWrapper) {
        controlsWrapper.classList.remove('menu-controls-visible');
        controlsWrapper.classList.add('menu-controls-hidden');
    }

    if(typeof init === 'function') init(); 
    
    if (loadSave && typeof SaveManager !== 'undefined') {
        SaveManager.load();
        SaveManager.init();
    } else if (typeof SaveManager !== 'undefined') {
        SaveManager.init();
    }

    if(audio) audio.init(); 
    if(typeof startLoop === 'function') startLoop(); 
}