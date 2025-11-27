/**
 * Void Ray - Kullanıcı Arayüzü (UI) Yönetimi
 * * Menüler, envanter ekranları, bildirimler ve HUD güncellemelerini yönetir.
 * * game.js içinden ayrıştırılmıştır.
 * * Grid (Kutu Kutu) envanter sistemi ve Global Tooltip eklendi.
 */

// Arayüz Durumları (Global Erişim İçin)
let inventoryOpen = false;
let echoInvOpen = false;
let nexusOpen = false;
let mapOpen = false;
let storageOpen = false;
let statsOpen = false;
let activeFilter = 'all';

// --- GLOBAL TOOLTIP YÖNETİMİ ---
// Tooltip elementini JS ile oluşturup body'ye ekliyoruz
const globalTooltip = document.createElement('div');
globalTooltip.id = 'global-tooltip';
document.body.appendChild(globalTooltip);

/**
 * Tooltip'i gösterir ve içeriğini doldurur.
 */
function showTooltip(e, name, xp) {
    globalTooltip.innerHTML = `
        <span class="tooltip-title">${name}</span>
        <span class="tooltip-xp">${xp} XP</span>
    `;
    globalTooltip.style.display = 'block';
    moveTooltip(e);
}

/**
 * Tooltip'i farenin konumuna göre hareket ettirir.
 */
function moveTooltip(e) {
    // Fare imlecinin biraz sağına ve altına konumlandır
    const x = e.clientX + 15;
    const y = e.clientY + 15;
    
    // Ekranın dışına taşmasını engellemek için basit kontrol (geliştirilebilir)
    globalTooltip.style.left = x + 'px';
    globalTooltip.style.top = y + 'px';
}

/**
 * Tooltip'i gizler.
 */
function hideTooltip() {
    globalTooltip.style.display = 'none';
}

// --- GENEL YARDIMCI FONKSİYONLAR ---

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
 * @param {HTMLElement} container - Gridin ekleneceği div
 * @param {Array} items - Eşya listesi
 * @param {number} capacity - Toplam slot sayısı
 * @param {Function} onClickAction - Tıklama olayı (item parametresi alır)
 * @param {boolean} isUnlimited - Depo gibi limitsiz alanlar için
 */
function renderGrid(container, items, capacity, onClickAction, isUnlimited = false) {
    container.innerHTML = '';
    container.className = 'inventory-grid-container';
    
    // Limitsiz ise en az mevcut item kadar + biraz boşluk göster
    const displayCount = isUnlimited ? Math.max(items.length + 20, 100) : capacity;

    for (let i = 0; i < displayCount; i++) {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        
        if (i < items.length) {
            const item = items[i];
            slot.classList.add('has-item');
            
            // Renkli kutu (İkon yerine)
            const itemBox = document.createElement('div');
            itemBox.className = 'item-box';
            itemBox.style.backgroundColor = item.type.color;
            
            // DÜZELTME: İSMİN BAŞ HARFİNİ EKLE
            if (item.name) {
                // İsmin ilk harfini al, büyük harfe çevir
                itemBox.innerText = item.name.charAt(0).toUpperCase();
            }
            
            slot.appendChild(itemBox);
            
            // Olaylar
            slot.onclick = () => {
                hideTooltip(); // Tıklayınca gizle ki takılı kalmasın
                onClickAction(item);
            };
            
            // Yeni JS tabanlı Tooltip olayları
            slot.onmouseenter = (e) => showTooltip(e, item.name, item.type.xp);
            slot.onmousemove = (e) => moveTooltip(e);
            slot.onmouseleave = () => hideTooltip();
        }
        
        container.appendChild(slot);
    }
}

// --- ENVANTER VE DEPO ARAYÜZÜ ---

function updateInventoryCount() {
    const badge = document.getElementById('inv-total-badge'); 
    const count = collectedItems.length;
    const capacity = getPlayerCapacity();
    
    if(badge) {
        badge.innerText = count; 
        badge.style.display = count > 0 ? 'flex' : 'none';
        
        if (count >= capacity) {
            badge.style.background = '#ef4444';
            badge.style.color = '#fff';
        } else if (count >= capacity * 0.9) {
            badge.style.background = '#f59e0b';
            badge.style.color = '#000';
        } else {
            badge.style.background = '#fff';
            badge.style.color = '#000';
        }
    }
    
    const elCountAll = document.getElementById('count-all');
    if(elCountAll) {
        elCountAll.innerText = count;
        document.getElementById('count-legendary').innerText = collectedItems.filter(i => i.type.id === 'legendary').length;
        document.getElementById('count-epic').innerText = collectedItems.filter(i => i.type.id === 'epic').length;
        document.getElementById('count-rare').innerText = collectedItems.filter(i => i.type.id === 'rare').length;
    }
}

function renderInventory() {
    const gridContainer = document.getElementById('inv-grid-content');
    if(!gridContainer) return;
    
    const invHeader = document.querySelector('.inv-header h2');
    const cap = getPlayerCapacity();
    const count = collectedItems.length;
    const color = count >= cap ? '#ef4444' : '#94a3b8';
    
    if(invHeader) {
        invHeader.innerHTML = `ENVANTER <span style="font-size:0.5em; vertical-align:middle; color:${color}; letter-spacing:1px; margin-left:10px;">${count} / ${cap}</span>`;
    }

    // Filtreleme mantığı
    let filteredItems = collectedItems.filter(i => activeFilter === 'all' || i.type.id === activeFilter);
    
    // Grid olarak render et
    const displayCapacity = activeFilter === 'all' ? cap : filteredItems.length;
    
    renderGrid(gridContainer, filteredItems, displayCapacity, (item) => {
        // Envanterdeki eşyaya tıklanınca yapılacak işlem (Şimdilik boş)
    });
}

function filterInventory(f) { 
    activeFilter = f; 
    document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active')); 
    if(event && event.currentTarget) event.currentTarget.classList.add('active'); 
    renderInventory(); 
}

function closeInventory() { 
    inventoryOpen = false; 
    document.getElementById('inventory-overlay').classList.remove('open'); 
    hideTooltip(); // Kapanırken tooltip'i de gizle
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
    if(!echoRay) return; 
    const gridContainer = document.getElementById('echo-inv-grid-content');
    
    const headerTitle = document.querySelector('#echo-inventory-overlay h2');
    const cap = getEchoCapacity();
    if(headerTitle) headerTitle.innerHTML = `YANKI DEPOSU <span style="font-size:0.6em; color:#67e8f9; opacity:0.7;">(${echoRay.lootBag.length}/${cap})</span>`;

    renderGrid(gridContainer, echoRay.lootBag, cap, (item) => {
        // Yankı envanterine tıklama (Boş)
    });
}

// --- DEPO MERKEZİ (STORAGE) ARAYÜZÜ ---

function openStorage() {
    storageOpen = true;
    document.getElementById('storage-overlay').classList.add('open');
    renderStorageUI();
}

function closeStorage() {
    storageOpen = false;
    document.getElementById('storage-overlay').classList.remove('open');
    hideTooltip();
}

function renderStorageUI() {
    if (!storageOpen) return;

    const shipListContainer = document.getElementById('storage-ship-list');
    const centerListContainer = document.getElementById('storage-center-list');
    const shipCap = document.getElementById('storage-ship-cap');
    const centerCount = document.getElementById('storage-center-count');

    shipCap.innerText = `${collectedItems.length} / ${getPlayerCapacity()}`;
    centerCount.innerText = `${centralStorage.length} EŞYA`;

    // Sol Taraf: Gemi Envanteri (Grid)
    renderGrid(shipListContainer, collectedItems, getPlayerCapacity(), (item) => {
        depositItem(item.name);
    });

    // Sağ Taraf: Merkez Depo (Grid - Limitsiz Görünüm)
    renderGrid(centerListContainer, centralStorage, 0, (item) => {
        withdrawItem(item.name);
    }, true);
}

// UI İşlemleri (Storage)
window.depositItem = function(name) {
    const index = collectedItems.findIndex(i => i.name === name);
    if (index !== -1) {
        const item = collectedItems.splice(index, 1)[0];
        centralStorage.push(item);
        renderStorageUI();
        updateInventoryCount();
    }
};

window.depositAllToStorage = function() {
    depositToStorage(collectedItems, "VATOZ"); 
};

window.withdrawItem = function(name) {
    if (collectedItems.length >= getPlayerCapacity()) {
        showNotification({name: "GEMİ DEPOSU DOLU!", type:{color:'#ef4444'}}, "");
        return;
    }
    const index = centralStorage.findIndex(i => i.name === name);
    if (index !== -1) {
        const item = centralStorage.splice(index, 1)[0];
        collectedItems.push(item);
        renderStorageUI();
        updateInventoryCount();
    }
};

window.withdrawAllFromStorage = function() {
    const cap = getPlayerCapacity();
    let moved = 0;
    while(centralStorage.length > 0 && collectedItems.length < cap) {
        collectedItems.push(centralStorage.pop());
        moved++;
    }
    if (moved > 0) showNotification({name: `${moved} EŞYA GEMİYE ALINDI`, type:{color:'#38bdf8'}}, "");
    else if (centralStorage.length > 0) showNotification({name: "GEMİ DEPOSU DOLU!", type:{color:'#ef4444'}}, "");
    
    renderStorageUI();
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

// --- İSTATİSTİK ARAYÜZÜ ---

function openStats() {
    statsOpen = true;
    document.getElementById('stats-overlay').classList.add('open');
    renderStats();
}

function closeStats() {
    statsOpen = false;
    document.getElementById('stats-overlay').classList.remove('open');
}

function renderStats() {
    if(!statsOpen) return;
    const table = document.getElementById('stats-table-content');
    
    const now = Date.now();
    const gameTime = now - gameStartTime;
    const distStr = Math.floor(playerData.stats.distance / 100) + " km";

    table.innerHTML = `
        <tr><th>EVREN SÜRESİ</th><td>${formatTime(gameTime)}</td></tr>
        <tr><th>HAREKET SÜRESİ</th><td>${formatTime(playerData.stats.timeMoving)}</td></tr>
        <tr><th>BEKLEME SÜRESİ</th><td>${formatTime(playerData.stats.timeIdle)}</td></tr>
        <tr><th>AI (OTOPİLOT) SÜRESİ</th><td>${formatTime(playerData.stats.timeAI)}</td></tr>
        <tr><th>VATOZ MAX HIZ</th><td>${Math.floor(playerData.stats.maxSpeed * 10)} KM/S</td></tr>
        <tr><th>YANKI MAX HIZ</th><td>${Math.floor(playerData.stats.echoMaxSpeed * 10)} KM/S</td></tr>
        <tr><th>TOPLAM MESAFE</th><td>${distStr}</td></tr>
        <tr><th>TOPLANAN KAYNAK</th><td>${playerData.stats.totalResources} ADET</td></tr>
        <tr><th>KAZANILAN KRİSTAL</th><td>${playerData.stats.totalStardust} ◆</td></tr>
        <tr><th>HARCANAN KRİSTAL</th><td>${playerData.stats.totalSpentStardust} ◆</td></tr>
        <tr><th>HARCANAN ENERJİ</th><td>${Math.floor(playerData.stats.totalEnergySpent)} BİRİM</td></tr>
        <tr><th>ENVANTER KAPASİTESİ</th><td>${collectedItems.length} / ${getPlayerCapacity()}</td></tr>
        <tr><th>DEPO (MERKEZ)</th><td>${centralStorage.length} EŞYA</td></tr>
    `;
}

// --- NEXUS ARAYÜZÜ ---

function enterNexus() { 
    nexusOpen = true; 
    document.getElementById('nexus-overlay').classList.add('open'); 
    switchNexusTab('market'); 
}

function exitNexus() { 
    nexusOpen = false; 
    document.getElementById('nexus-overlay').classList.remove('open'); 
}

function switchNexusTab(tabName) {
    document.querySelectorAll('.nexus-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nexus-content').forEach(c => c.classList.remove('active'));
    
    if(tabName === 'market') { 
        document.querySelector('.nexus-tab:nth-child(1)').classList.add('active'); 
        document.getElementById('tab-market').classList.add('active'); 
        renderMarket(); 
    } else { 
        document.querySelector('.nexus-tab:nth-child(2)').classList.add('active'); 
        document.getElementById('tab-upgrades').classList.add('active'); 
        renderUpgrades(); 
    }
}

function renderMarket() {
    const grid = document.getElementById('market-grid'); 
    grid.innerHTML = '';
    
    if(collectedItems.length === 0) { 
        grid.innerHTML = '<div class="col-span-full text-center text-gray-500 mt-10">Satılacak eşya yok.</div>'; 
        return; 
    }
    
    const grouped = {}; 
    collectedItems.forEach(item => { 
        if (!grouped[item.name]) grouped[item.name] = { ...item, count: 0 }; 
        grouped[item.name].count++; 
    });
    
    Object.values(grouped).forEach(item => {
        if(item.type.value > 0) {
            const totalVal = item.count * item.type.value;
            const div = document.createElement('div'); div.className = 'market-card';
            div.innerHTML = `<div class="text-2xl" style="color:${item.type.color}">●</div><div class="font-bold text-white">${item.name}</div><div class="text-sm text-gray-400">x${item.count}</div><div class="text-white font-mono text-lg opacity-80">${totalVal} <span class="text-xs">KRİSTAL</span></div><button class="sell-btn" onclick="sellItem('${item.name}', ${item.type.value}, ${item.count})">SAT</button>`;
            grid.appendChild(div);
        }
    });
}

function renderUpgrades() {
    const pList = document.getElementById('upg-player-list'); 
    const eList = document.getElementById('upg-echo-list'); 
    pList.innerHTML = ''; 
    eList.innerHTML = '';
    
    const createCard = (key, data, isEcho = false) => {
        const currentLvl = playerData.upgrades[key]; 
        const cost = GameRules.calculateUpgradeCost(data.baseCost, currentLvl);
        const isMax = currentLvl >= data.max;
        
        // YANKI BAĞLANTI KONTROLÜ
        let isDisabled = isMax || playerData.stardust < cost;
        let btnText = isMax ? 'MAX' : 'GELİŞTİR';
        let btnClass = 'buy-btn';

        // YANKI DURUMLARINI AYRIŞTIRMA
        if (isEcho) {
             if (!echoRay) {
                // Yankı henüz hiç doğmadı
                isDisabled = true;
                btnText = 'YANKI YOK';
                btnClass += ' disabled-echo'; 
             } else if (!echoRay.attached) {
                // Yankı var ama bağlı değil (Bağımsız uçuyor veya sabit duruyor)
                isDisabled = true;
                btnText = 'BAĞLI DEĞİL';
                btnClass += ' disabled-echo';
             }
        }

        let pips = ''; for(let i=0; i<data.max; i++) pips += `<div class="lvl-pip ${i<currentLvl?'filled':''}"></div>`;
        
        return `
        <div class="upgrade-item">
            <div class="upg-info">
                <h4>${data.name}</h4>
                <p>${data.desc}</p>
                <div class="upg-level">${pips}</div>
            </div>
            <button class="${btnClass}" ${isDisabled ? 'disabled' : ''} onclick="buyUpgrade('${key}')">
                ${btnText} ${(!isMax && btnText !== 'YANKI YOK' && btnText !== 'BAĞLI DEĞİL') ? `<span class="cost-text">${cost} ◆</span>` : ''}
            </button>
        </div>`;
    };
    
    ['playerSpeed', 'playerTurn', 'playerMagnet', 'playerCapacity'].forEach(k => pList.innerHTML += createCard(k, UPGRADES[k], false));
    ['echoSpeed', 'echoRange', 'echoDurability', 'echoCapacity'].forEach(k => eList.innerHTML += createCard(k, UPGRADES[k], true));
}

window.buyUpgrade = function(key) {
    if (key.startsWith('echo')) {
        if (!echoRay) {
             showNotification({name: "YANKI MEVCUT DEĞİL!", type:{color:'#ef4444'}}, "");
             return;
        }
        if (!echoRay.attached) {
            showNotification({name: "YANKI BAĞLI DEĞİL!", type:{color:'#ef4444'}}, "Yükseltme için birleşin.");
            audio.playToxic(); 
            return;
        }
    }

    const data = UPGRADES[key]; const currentLvl = playerData.upgrades[key]; if(currentLvl >= data.max) return;
    const cost = GameRules.calculateUpgradeCost(data.baseCost, currentLvl);
    if(playerData.stardust >= cost) { 
        playerData.stardust -= cost; 
        playerData.upgrades[key]++; 
        playerData.stats.totalSpentStardust += cost;
        audio.playCash(); player.updateUI(); renderUpgrades(); updateEchoDropdownUI(); updateInventoryCount(); 
    }
};

window.sellItem = function(name, unitPrice, count) {
    collectedItems = collectedItems.filter(i => i.name !== name);
    const totalEarned = count * unitPrice;
    playerData.stardust += totalEarned; 
    playerData.stats.totalStardust += totalEarned;
    audio.playCash(); player.updateUI(); updateInventoryCount(); renderMarket();
};

window.sellAll = function() {
    let total = 0; let toKeep = [];
    collectedItems.forEach(item => { if(item.type.value > 0) total += item.type.value; else toKeep.push(item); });
    if(total > 0) { 
        collectedItems = toKeep; 
        playerData.stardust += total; 
        playerData.stats.totalStardust += total;
        audio.playCash(); player.updateUI(); updateInventoryCount(); renderMarket(); showNotification({name: `${total} KRİSTAL KAZANILDI`, type:{color:'#fbbf24'}}, ""); 
    }
};

// --- AI ARAYÜZÜ ---

function updateAIButton() {
    const btn = document.getElementById('ai-mode-btn');
    const aiToggle = document.getElementById('btn-ai-toggle');
    const modeBtn = document.getElementById('ai-mode-btn');
    
    // Manuel müdahale uyarısını temizle
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