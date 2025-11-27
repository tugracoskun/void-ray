/**
 * Void Ray - Kullanıcı Arayüzü (UI) Yönetimi
 * * Menüler, envanter ekranları, bildirimler ve HUD güncellemelerini yönetir.
 */

// Arayüz Durumları
let inventoryOpen = false;
let echoInvOpen = false;
let nexusOpen = false;
let mapOpen = false;
let storageOpen = false;
let statsOpen = false;
let activeFilter = 'all';

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
    const grid = document.getElementById('inv-grid-content');
    if(!grid) return;
    
    const invHeader = document.querySelector('.inv-header h2');
    const cap = getPlayerCapacity();
    const count = collectedItems.length;
    const color = count >= cap ? '#ef4444' : '#94a3b8';
    
    if(invHeader) {
        invHeader.innerHTML = `ENVANTER <span style="font-size:0.5em; vertical-align:middle; color:${color}; letter-spacing:1px; margin-left:10px;">${count} / ${cap}</span>`;
    }

    let filteredItems = collectedItems.filter(i => activeFilter === 'all' || i.type.id === activeFilter);
    
    if(filteredItems.length === 0) { 
        grid.innerHTML = '<div class="text-center text-gray-500 mt-20">Bu kategoride eşya yok.</div>'; 
        return; 
    }
    
    const grouped = {};
    filteredItems.forEach(item => {
        if (!grouped[item.name]) grouped[item.name] = { ...item, count: 0 };
        grouped[item.name].count++;
    });

    let html = `<table class="inv-table"><thead><tr><th>TÜR</th><th>İSİM</th><th>XP</th><th style="text-align:right">MİKTAR</th></tr></thead><tbody>`;
    Object.values(grouped).sort((a, b) => b.type.xp - a.type.xp).forEach(item => {
        html += `
            <tr>
                <td style="color:${item.type.color}">●</td>
                <td style="color:${item.type.color}">${item.name}</td>
                <td style="font-size:0.8rem; opacity:0.7">${item.type.xp} XP</td>
                <td style="text-align:right">x${item.count}</td>
            </tr>`;
    });
    html += '</tbody></table>';
    grid.innerHTML = html;
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
}

function renderEchoInventory() {
    if(!echoRay) return; 
    const grid = document.getElementById('echo-inv-grid-content');
    
    const headerTitle = document.querySelector('#echo-inventory-overlay h2');
    const cap = getEchoCapacity();
    if(headerTitle) headerTitle.innerHTML = `YANKI DEPOSU <span style="font-size:0.6em; color:#67e8f9; opacity:0.7;">(${echoRay.lootBag.length}/${cap})</span>`;

    if(echoRay.lootBag.length === 0) { 
        grid.innerHTML = '<div class="text-center text-cyan-500/50 mt-20">Depo boş.</div>'; 
        return; 
    }
    
    const grouped = {}; 
    echoRay.lootBag.forEach(item => { 
        if (!grouped[item.name]) grouped[item.name] = { ...item, count: 0 }; 
        grouped[item.name].count++; 
    });
    
    let html = `<table class="inv-table"><thead><tr><th>TÜR</th><th>İSİM</th><th>XP</th><th style="text-align:right">MİKTAR</th></tr></thead><tbody>`;
    Object.values(grouped).sort((a, b) => b.type.xp - a.type.xp).forEach(item => { 
        html += `<tr><td style="color:${item.type.color}">●</td><td style="color:${item.type.color}">${item.name}</td><td style="font-size:0.8rem; opacity:0.7">${item.type.xp} XP</td><td style="text-align:right">x${item.count}</td></tr>`; 
    });
    html += '</tbody></table>'; 
    grid.innerHTML = html;
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
}

function renderStorageUI() {
    if (!storageOpen) return;

    const shipList = document.getElementById('storage-ship-list');
    const centerList = document.getElementById('storage-center-list');
    const shipCap = document.getElementById('storage-ship-cap');
    const centerCount = document.getElementById('storage-center-count');

    shipCap.innerText = `${collectedItems.length} / ${getPlayerCapacity()}`;
    centerCount.innerText = `${centralStorage.length} EŞYA`;

    // Gemi Listesi
    shipList.innerHTML = '';
    const shipGrouped = {};
    collectedItems.forEach((item, index) => {
        if (!shipGrouped[item.name]) shipGrouped[item.name] = { ...item, count: 0, indices: [] };
        shipGrouped[item.name].count++;
        shipGrouped[item.name].indices.push(index);
    });

    Object.values(shipGrouped).forEach(grp => {
        shipList.innerHTML += `
            <div class="storage-item">
                <div class="flex items-center gap-2">
                    <span style="color:${grp.type.color}">●</span>
                    <span class="text-gray-300 text-sm">${grp.name}</span>
                </div>
                <div class="flex items-center gap-3">
                    <span class="text-gray-500 text-xs">x${grp.count}</span>
                    <button onclick="depositItem('${grp.name}')" class="storage-btn-s btn-deposit">DEPOLA</button>
                </div>
            </div>
        `;
    });

    // Merkez Depo Listesi
    centerList.innerHTML = '';
    const centerGrouped = {};
    centralStorage.forEach((item, index) => {
        if (!centerGrouped[item.name]) centerGrouped[item.name] = { ...item, count: 0 };
        centerGrouped[item.name].count++;
    });

    Object.values(centerGrouped).forEach(grp => {
        centerList.innerHTML += `
            <div class="storage-item">
                <div class="flex items-center gap-2">
                    <span style="color:${grp.type.color}">●</span>
                    <span class="text-gray-300 text-sm">${grp.name}</span>
                </div>
                <div class="flex items-center gap-3">
                    <span class="text-gray-500 text-xs">x${grp.count}</span>
                    <button onclick="withdrawItem('${grp.name}')" class="storage-btn-s btn-withdraw">AL</button>
                </div>
            </div>
        `;
    });
}

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