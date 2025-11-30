/**
 * Void Ray - Kullanıcı Arayüzü (UI) Yönetimi
 * * Menüler, ortak araçlar (tooltip, grid), bildirimler ve diğer pencereleri yönetir.
 * * Ayrılan Modüller:
 * * - Oyuncu Envanteri (js/windows/inventory.js)
 * * - İstatistikler (js/windows/stats.js)
 * * - Ayarlar (js/windows/settings.js)
 * * - Depo (js/windows/storage.js)
 * * - Nexus (js/windows/nexus.js)
 */

// Arayüz Durumları (Global Erişim İçin)
let echoInvOpen = false;
let mapOpen = false;
// nexusOpen buradan kaldırıldı -> js/windows/nexus.js

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

// --- YANKI (ECHO) ARAYÜZÜ ---

function updateEchoDropdownUI() {
    document.querySelectorAll('.echo-menu-item').forEach(el => el.classList.remove('active-mode'));
    
    const rateDisp = document.getElementById('echo-rate-disp');
    if(rateDisp) {
        let rateText = "Normal";
        if(playerData.upgrades.echoSpeed >= 2) rateText = "Hızlı";
        if(playerData.upgrades.echoSpeed >= 4) rateText = "Turbo";
        rateDisp.innerText = "Toplama Hızı: " + rateText;
    }

    if (!echoRay) return;
    
    if (echoRay.attached) document.getElementById('menu-merge').classList.add('active-mode');
    else if (echoRay.mode === 'return') document.getElementById('menu-return').classList.add('active-mode');
    else if (echoRay.mode === 'recharge') { /* Şarj */ }
    else if (echoRay.mode === 'deposit_storage') { /* Depolama */ } 
    else document.getElementById('menu-roam').classList.add('active-mode');
}

function openEchoInventory() { 
    if(!echoRay) return; 
    
    if (!echoRay.attached) {
        showNotification({name: "BAĞLANTI YOK", type:{color:'#ef4444'}}, "Yankı envanterine erişmek için birleşin.");
        if(audio) audio.playToxic();
        return;
    }
    
    echoInvOpen = true; 
    document.getElementById('echo-inventory-overlay').classList.add('open'); 
    renderEchoInventory(); 
}

function closeEchoInventory() { 
    echoInvOpen = false; 
    document.getElementById('echo-inventory-overlay').classList.remove('open'); 
    hideTooltip();
}

function renderEchoInventory() {
    if(!echoRay || !echoInvOpen) return;
    
    const playerContainer = document.getElementById('echo-player-grid');
    const echoContainer = document.getElementById('echo-storage-grid');
    const playerCapLabel = document.getElementById('echo-player-cap');
    const echoCapLabel = document.getElementById('echo-storage-cap');

    const pCap = getPlayerCapacity();
    const eCap = getEchoCapacity();
    
    if(playerCapLabel) playerCapLabel.innerText = `${collectedItems.length} / ${pCap}`;
    if(echoCapLabel) echoCapLabel.innerText = `${echoRay.lootBag.length} / ${eCap}`;

    renderGrid(playerContainer, collectedItems, pCap, (item) => {
        transferToEcho(item);
    });

    renderGrid(echoContainer, echoRay.lootBag, eCap, (item) => {
        transferToPlayer(item);
    });
}

// Global Transfer Fonksiyonları (Yankı için)
window.transferToEcho = function(item) {
    if (!echoRay) return;
    if (echoRay.lootBag.length >= getEchoCapacity()) {
         showNotification({name: "YANKI DOLU!", type:{color:'#ef4444'}}, "");
         return;
    }
    const idx = collectedItems.indexOf(item);
    if (idx > -1) {
        collectedItems.splice(idx, 1);
        echoRay.lootBag.push(item);
        renderEchoInventory();
        updateInventoryCount();
    }
}

window.transferToPlayer = function(item) {
    if (collectedItems.length >= getPlayerCapacity()) {
         showNotification({name: "GEMİ DOLU!", type:{color:'#ef4444'}}, "");
         return;
    }
    const idx = echoRay.lootBag.indexOf(item);
    if (idx > -1) {
        echoRay.lootBag.splice(idx, 1);
        
        if (item.type.id === 'tardigrade') {
            player.energy = Math.min(player.energy + 50, player.maxEnergy);
            const xp = calculatePlanetXp(item.type);
            player.gainXp(xp);
            showNotification({name: "TARDİGRAD KULLANILDI", type:{color:'#C7C0AE'}}, "");
        } else {
            collectedItems.push(item);
        }
        
        renderEchoInventory();
        updateInventoryCount();
    }
}

window.transferAllToEcho = function() {
    if (!echoRay) return;
    const eCap = getEchoCapacity();
    let movedCount = 0;

    while (echoRay.lootBag.length < eCap && collectedItems.length > 0) {
        const item = collectedItems.shift();
        echoRay.lootBag.push(item);
        movedCount++;
    }

    if (movedCount > 0) {
        showNotification({name: `${movedCount} EŞYA AKTARILDI`, type:{color:'#67e8f9'}}, "");
        if (audio) audio.playCash();
    } else {
         if(collectedItems.length > 0) showNotification({name: "YANKI DOLU!", type:{color:'#ef4444'}}, "");
         else showNotification({name: "GEMİ BOŞ!", type:{color:'#ef4444'}}, "");
    }

    renderEchoInventory();
    updateInventoryCount();
};

window.transferAllToPlayer = function() {
    if (!echoRay) return;
    const pCap = getPlayerCapacity();
    let movedCount = 0;

    while (echoRay.lootBag.length > 0) {
        const nextItem = echoRay.lootBag[0];
        if (nextItem.type.id !== 'tardigrade' && collectedItems.length >= pCap) {
             showNotification({name: "GEMİ DOLU!", type:{color:'#ef4444'}}, "");
             break;
        }

        const item = echoRay.lootBag.shift();
        
        if (item.type.id === 'tardigrade') {
            player.energy = Math.min(player.energy + 50, player.maxEnergy);
            const xp = calculatePlanetXp(item.type);
            player.gainXp(xp);
            showNotification({name: "TARDİGRAD KULLANILDI", type:{color:'#C7C0AE'}}, "");
        } else {
            collectedItems.push(item);
            movedCount++;
        }
    }

    if (movedCount > 0) {
         showNotification({name: `${movedCount} EŞYA ALINDI`, type:{color:'#38bdf8'}}, "");
         if (audio) audio.playCash();
    }

    renderEchoInventory();
    updateInventoryCount();
};

// --- HARİTA ARAYÜZÜ ---

function openMap() {
    mapOpen = true;
    document.getElementById('big-map-overlay').classList.add('active');
}

function closeMap() {
    mapOpen = false;
    document.getElementById('big-map-overlay').classList.remove('active');
}

// --- NEXUS ARAYÜZÜ ---
// enterNexus, exitNexus, switchNexusTab, renderMarket, renderUpgrades kaldırıldı -> js/windows/nexus.js

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