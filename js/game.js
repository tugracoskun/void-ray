/**
 * Void Ray - Oyun Motoru ve Durum Yönetimi
 * * Bu dosya oyunun ana döngüsünü ve durum yönetimini kontrol eder.
 * * Varlık (Entity) sınıfları artık ayrı dosyalardan yüklenmektedir.
 */

// -------------------------------------------------------------------------
// GLOBAL DEĞİŞKENLER VE OYUN DURUMU
// -------------------------------------------------------------------------

let playerData = { 
    stardust: 0, 
    upgrades: { 
        playerSpeed: 0, 
        playerTurn: 0, 
        playerMagnet: 0, 
        playerCapacity: 0,
        echoSpeed: 0, 
        echoRange: 0, 
        echoDurability: 0,
        echoCapacity: 0
    },
    stats: { 
        maxSpeed: 0, 
        echoMaxSpeed: 0, 
        totalResources: 0, 
        distance: 0, 
        totalStardust: 0,
        totalSpentStardust: 0,
        totalEnergySpent: 0,
        timeIdle: 0,
        timeMoving: 0,
        timeAI: 0
    }
};

let lastToxicNotification = 0; 
let currentZoom = 1.0, targetZoom = 1.0;
let isPaused = false;
let animationId = null;
let manualTarget = null; 
let gameStartTime = 0;
let lastFrameTime = 0;
window.cinematicMode = false; 

// Grafik Bağlamları (Canvas Contexts)
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const mmCanvas = document.getElementById('minimap-canvas');
const mmCtx = mmCanvas.getContext('2d');
const bmCanvas = document.getElementById('big-map-canvas');
const bmCtx = document.getElementById('big-map-canvas').getContext('2d'); // Güncellendi

// Varlıklar ve Koleksiyonlar
let width, height;
// Player, echoRay, nexus, repairStation, storageCenter, audio artık global scope'ta tanımlanan sınıflardan oluşturulacak.
let player, echoRay = null, nexus = null, repairStation = null, storageCenter = null, audio; 
let planets = [], stars = [], collectedItems = [], particles = [];
let centralStorage = [];

// Arayüz Durumları
let inventoryOpen = false, echoInvOpen = false, nexusOpen = false, mapOpen = false, storageOpen = false;
let statsOpen = false;
let activeFilter = 'all';

// Otopilot ve Yapay Zeka
let autopilot = false;
let aiMode = 'gather'; // gather | base | travel | deposit
let echoDeathLevel = 0;
let lowEnergyWarned = false;

// NOT: 'keys' nesnesi controls.js içinde tanımlanmıştır.

// -------------------------------------------------------------------------
// YARDIMCI FONKSİYONLAR
// -------------------------------------------------------------------------

// Kapasite Hesaplama Fonksiyonları
function getPlayerCapacity() {
    // Taban: 150 (Sabit İstek), Seviye Başına: +25
    return 150 + (playerData.upgrades.playerCapacity * 25);
}

function getEchoCapacity() {
    // Taban: 80 (Sabit İstek), Seviye Başına: +10
    return 80 + (playerData.upgrades.echoCapacity * 10);
}

/**
 * Belirtilen koordinatlarda yeni bir Yankı (EchoRay) oluşturur.
 */
function spawnEcho(x, y) { 
    // EchoRay sınıfı artık entities/EchoRay.js'de
    echoRay = new EchoRay(x, y); 
    document.getElementById('echo-wrapper-el').style.display = 'flex'; 
    showNotification({name: "YANKI DOĞDU", type:{color:'#67e8f9'}}, ""); 
}

/**
 * Eşyaları merkez depoya aktarır (OTOMATİK İŞLEM İÇİN).
 */
function depositToStorage(sourceArray, sourceName) {
    if (sourceArray.length === 0) return;
    
    const count = sourceArray.length;
    const itemsToStore = sourceArray.filter(i => i.type.id !== 'tardigrade');
    
    itemsToStore.forEach(item => centralStorage.push(item));
    sourceArray.length = 0;
    
    audio.playCash(); 
    showNotification({name: `${sourceName}: ${count} EŞYA DEPOYA AKTARILDI`, type:{color:'#a855f7'}}, "");
    
    updateInventoryCount();
    if(inventoryOpen) renderInventory();
    if(echoInvOpen) renderEchoInventory();
    if(storageOpen) renderStorageUI();
}

// -------------------------------------------------------------------------
// STORAGE UI MANTIĞI
// -------------------------------------------------------------------------

function openStorage() {
    storageOpen = true;
    document.getElementById('storage-overlay').classList.add('open');
    renderStorageUI();
}

function closeStorage() {
    storageOpen = false;
    document.getElementById('storage-overlay').classList.remove('open');
}

// --- HARİTA YÖNETİMİ ---
function openMap() {
    mapOpen = true;
    document.getElementById('big-map-overlay').classList.add('active');
}

function closeMap() {
    mapOpen = false;
    document.getElementById('big-map-overlay').classList.remove('active');
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

// Tekil Depolama
window.depositItem = function(name) {
    const index = collectedItems.findIndex(i => i.name === name);
    if (index !== -1) {
        const item = collectedItems.splice(index, 1)[0];
        centralStorage.push(item);
        renderStorageUI();
        updateInventoryCount();
    }
};

// Hepsini Depolama
window.depositAllToStorage = function() {
    depositToStorage(collectedItems, "VATOZ"); 
};

// Tekil Çekme
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

// Hepsini Çekme
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

// -------------------------------------------------------------------------
// ARAYÜZ (UI) YÖNETİMİ
// -------------------------------------------------------------------------

function updateInventoryCount() {
    const badge = document.getElementById('inv-total-badge'); 
    const count = collectedItems.length;
    const capacity = getPlayerCapacity();
    
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
    
    document.getElementById('count-all').innerText = count;
    document.getElementById('count-legendary').innerText = collectedItems.filter(i => i.type.id === 'legendary').length;
    document.getElementById('count-epic').innerText = collectedItems.filter(i => i.type.id === 'epic').length;
    document.getElementById('count-rare').innerText = collectedItems.filter(i => i.type.id === 'rare').length;
}

function addItemToInventory(planet) { 
    const currentCount = collectedItems.length;
    const capacity = getPlayerCapacity();

    if (currentCount >= capacity) {
        if (!autopilot) {
            showNotification({name: "ENVANTER DOLU! NEXUS VEYA DEPOYA GİDİN.", type:{color:'#ef4444'}}, "");
        }
        return false; 
    }

    collectedItems.push(planet); 
    playerData.stats.totalResources++; 
    updateInventoryCount(); 
    if(inventoryOpen) renderInventory();
    return true; 
}

function updateEchoDropdownUI() {
    document.querySelectorAll('.echo-menu-item').forEach(el => el.classList.remove('active-mode'));
    
    let rateText = "Normal";
    if(playerData.upgrades.echoSpeed >= 2) rateText = "Hızlı";
    if(playerData.upgrades.echoSpeed >= 4) rateText = "Turbo";
    document.getElementById('echo-rate-disp').innerText = "Toplama Hızı: " + rateText;

    if (!echoRay) return;
    
    if (echoRay.attached) document.getElementById('menu-merge').classList.add('active-mode');
    else if (echoRay.mode === 'return') document.getElementById('menu-return').classList.add('active-mode');
    else if (echoRay.mode === 'recharge') { /* Şarj */ }
    else if (echoRay.mode === 'deposit_storage') { /* Depolama */ } 
    else document.getElementById('menu-roam').classList.add('active-mode');
}

function setEchoMode(mode) {
    if(!echoRay) return;
    if (mode === 'roam' && echoRay.attached) { 
        echoRay.attached = false; 
        showNotification({name: "YANKI AYRILDI", type:{color:'#67e8f9'}}, ""); 
    }
    if (mode === 'return') echoRay.attached = false; 
    echoRay.mode = mode; 
    updateEchoDropdownUI();
}

/**
 * Oyuncu ve Yankı yeterince yakınsa birleşme işlemini gerçekleştirir.
 */
function echoManualMerge() {
    if(!echoRay) return;
    const dist = Math.hypot(player.x - echoRay.x, player.y - echoRay.y);
    
    if (dist < 350) {
         if (echoRay.lootBag.length > 0) {
            let itemsToTransfer = [];
            let itemsKept = [];
            let playerCap = getPlayerCapacity();
            let currentLoad = collectedItems.length;

            echoRay.lootBag.forEach(p => { 
                if(p.type.id === 'tardigrade') {
                    player.energy = Math.min(player.energy + 50, player.maxEnergy);
                    showNotification({name: "YANKI: TARDİGRAD GETİRDİ (+%50 ENERJİ)", type:{color:'#C7C0AE'}}, "");
                    player.gainXp(p.type.xp);
                } else {
                    if (currentLoad < playerCap) {
                        itemsToTransfer.push(p);
                        currentLoad++;
                    } else {
                        itemsKept.push(p);
                    }
                }
            });

            itemsToTransfer.forEach(item => {
                 collectedItems.push(item);
                 playerData.stats.totalResources++;
                 player.gainXp(item.type.xp);
            });

            echoRay.lootBag = itemsKept;

            if(itemsToTransfer.length > 0) {
                showNotification({name: `YANKI: ${itemsToTransfer.length} EŞYA AKTARILDI`, type:{color:'#38bdf8'}}, "");
            }

            if(itemsKept.length > 0) {
                 showNotification({name: "UYARI: OYUNCU ENVANTERİ DOLU!", type:{color:'#ef4444'}}, "Bazı eşyalar Yankı'da kaldı.");
            }
            
            updateInventoryCount();
            if(echoInvOpen) renderEchoInventory();
        }
        
        audio.playEvolve(); 
        echoRay.attached = true; 
        echoRay.mode = 'roam'; 
        updateEchoDropdownUI();
    } else { 
        showNotification({name: "YANKI ÇOK UZAK, ÇAĞIRILIYOR...", type:{color:'#fbbf24'}}, ""); 
        setEchoMode('return'); 
    }
}

// Pencere Açma/Kapama İşlemleri
function openEchoInventory() { if(!echoRay) return; echoInvOpen = true; document.getElementById('echo-inventory-overlay').classList.add('open'); renderEchoInventory(); }
function closeEchoInventory() { echoInvOpen = false; document.getElementById('echo-inventory-overlay').classList.remove('open'); }
function closeInventory() { inventoryOpen = false; document.getElementById('inventory-overlay').classList.remove('open'); }

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

function renderInventory() {
    const grid = document.getElementById('inv-grid-content');
    
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
    event.currentTarget.classList.add('active'); 
    renderInventory(); 
}

// -------------------------------------------------------------------------
// İSTATİSTİK PANELİ
// -------------------------------------------------------------------------

function formatTime(ms) {
    if(!ms) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

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

// -------------------------------------------------------------------------
// OTOPİLOT VE AI YÖNETİMİ
// -------------------------------------------------------------------------

function cycleAIMode() {
    if(!autopilot) {
        autopilot = true;
        aiMode = 'gather';
    } else {
        if (aiMode === 'gather') aiMode = 'base';
        else if (aiMode === 'base') autopilot = false;
        else aiMode = 'gather';
    }
    updateAIButton();
}

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

// -------------------------------------------------------------------------
// NEXUS (ÜS) VE PAZAR SİSTEMİ
// -------------------------------------------------------------------------

function enterNexus() { nexusOpen = true; document.getElementById('nexus-overlay').classList.add('open'); switchNexusTab('market'); }
function exitNexus() { nexusOpen = false; document.getElementById('nexus-overlay').classList.remove('open'); }

function switchNexusTab(tabName) {
    document.querySelectorAll('.nexus-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nexus-content').forEach(c => c.classList.remove('active'));
    if(tabName === 'market') { document.querySelector('.nexus-tab:nth-child(1)').classList.add('active'); document.getElementById('tab-market').classList.add('active'); renderMarket(); } 
    else { document.querySelector('.nexus-tab:nth-child(2)').classList.add('active'); document.getElementById('tab-upgrades').classList.add('active'); renderUpgrades(); }
}

function renderMarket() {
    const grid = document.getElementById('market-grid'); grid.innerHTML = '';
    
    if(collectedItems.length === 0) { grid.innerHTML = '<div class="col-span-full text-center text-gray-500 mt-10">Satılacak eşya yok.</div>'; return; }
    const grouped = {}; collectedItems.forEach(item => { if (!grouped[item.name]) grouped[item.name] = { ...item, count: 0 }; grouped[item.name].count++; });
    Object.values(grouped).forEach(item => {
        if(item.type.value > 0) {
            const totalVal = item.count * item.type.value;
            const div = document.createElement('div'); div.className = 'market-card';
            div.innerHTML = `<div class="text-2xl" style="color:${item.type.color}">●</div><div class="font-bold text-white">${item.name}</div><div class="text-sm text-gray-400">x${item.count}</div><div class="text-white font-mono text-lg opacity-80">${totalVal} <span class="text-xs">KRİSTAL</span></div><button class="sell-btn" onclick="sellItem('${item.name}', ${item.type.value}, ${item.count})">SAT</button>`;
            grid.appendChild(div);
        }
    });
}

function sellItem(name, unitPrice, count) {
    collectedItems = collectedItems.filter(i => i.name !== name);
    const totalEarned = count * unitPrice;
    playerData.stardust += totalEarned; 
    playerData.stats.totalStardust += totalEarned;
    audio.playCash(); player.updateUI(); updateInventoryCount(); renderMarket();
}

function sellAll() {
    let total = 0; let toKeep = [];
    collectedItems.forEach(item => { if(item.type.value > 0) total += item.type.value; else toKeep.push(item); });
    if(total > 0) { 
        collectedItems = toKeep; 
        playerData.stardust += total; 
        playerData.stats.totalStardust += total;
        audio.playCash(); player.updateUI(); updateInventoryCount(); renderMarket(); showNotification({name: `${total} KRİSTAL KAZANILDI`, type:{color:'#fbbf24'}}, ""); 
    }
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
    // YANKI KONTROLÜ
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
        audio.playCash(); player.updateUI(); renderUpgrades(); updateEchoDropdownUI(); updateInventoryCount(); // Kapasite değişince badge güncelle
    }
};

function showToxicEffect() { const el = document.getElementById('toxic-overlay'); el.classList.add('active'); setTimeout(() => el.classList.remove('active'), 1500); }

// -------------------------------------------------------------------------
// OYUN DÖNGÜSÜ VE BAŞLATMA
// -------------------------------------------------------------------------

function init() {
    // Varlık Sınıfları artık global scope'ta tanımlı olduğu için new ile oluşturulur.
    player = new VoidRay(); 
    nexus = new Nexus(); 
    repairStation = new RepairStation(); 
    storageCenter = new StorageCenter(); 
    audio = new ZenAudio();
    planets = []; 
    gameStartTime = Date.now(); 
    lastFrameTime = Date.now(); 
    
    // Planet sınıfı da entities/Planet.js'den geliyor.
    for(let i=0; i<1200; i++) planets.push(new Planet());
    
    stars = []; for(let i=0; i<5000; i++) stars.push({x:Math.random()*WORLD_SIZE, y:Math.random()*WORLD_SIZE, s:Math.random()*2});
    
    player.updateUI(); updateInventoryCount(); isPaused = false;
    startTipsCycle();
    
    // HARİTA DİNLEYİCİSİ (Callback ile state yönetimi)
    const bmCanvasEl = document.getElementById('big-map-canvas');
    if (bmCanvasEl && typeof initMapListeners === 'function') {
        initMapListeners(bmCanvasEl, WORLD_SIZE, (worldX, worldY) => {
            manualTarget = {x: worldX, y: worldY};
            autopilot = true;
            aiMode = 'travel';
            document.getElementById('btn-ai-toggle').classList.add('active');
            updateAIButton();
            showNotification({name: "ROTA OLUŞTURULDU", type:{color:'#fff'}}, "");
        });
    }

    currentZoom = 0.2; 
    targetZoom = 1.0;  
    window.cinematicMode = true; 

    addChatMessage("Sistem başlatılıyor...", "system", "genel");
    setTimeout(() => addChatMessage("Optik sensörler kalibre ediliyor...", "info", "genel"), 1000);
    setTimeout(() => addChatMessage("Hoş geldin, Pilot. Motorlar aktif.", "loot", "genel"), 3500);
}

function startTipsCycle() {
    let tipIdx = 0;
    const tipEl = document.getElementById('tip-text');
    setInterval(() => {
        tipEl.style.opacity = 0;
        setTimeout(() => {
            tipIdx = (tipIdx + 1) % TIPS.length;
            tipEl.innerText = TIPS[tipIdx];
            tipEl.style.opacity = 1;
        }, 1000);
    }, 5000);
}

function startLoop() {
    if(animationId) cancelAnimationFrame(animationId);
    loop();
}

function loop() {
    if(!isPaused) {
        const now = Date.now();
        const dt = now - lastFrameTime;
        lastFrameTime = now;

        let zoomSpeed = 0.1;
        if (window.cinematicMode) {
            zoomSpeed = 0.02;
            if (Math.abs(targetZoom - currentZoom) < 0.01) {
                window.cinematicMode = false;
            }
        }
        currentZoom += (targetZoom - currentZoom) * zoomSpeed;

        player.update(dt);
        if(echoRay) echoRay.update(); 
        nexus.update();
        repairStation.update();
        storageCenter.update();

        if(autopilot) {
            playerData.stats.timeAI += dt;
        }

        if(statsOpen) {
            renderStats();
        }

        // Gezegen Spawn Mantığı (Değişmedi)
        planets = planets.filter(p => !p.collected);
        if (planets.length < 1200) {
            const needed = 1200 - planets.length;
            for(let i=0; i<needed; i++) {
                let px, py, d; do { px = Math.random() * WORLD_SIZE; py = Math.random() * WORLD_SIZE; d = Math.hypot(px - player.x, py - player.y); } while(d < 2000);
                // Planet sınıfı entities/Planet.js'den geliyor.
                planets.push(new Planet(px, py));
            }
        }

        // Tuş Kontrolleri (keys nesnesi controls.js'den gelir)
        if (keys.Escape) { 
            if (inventoryOpen) closeInventory();
            else if (echoInvOpen) closeEchoInventory();
            else if (nexusOpen) exitNexus();
            else if (storageOpen) closeStorage(); 
            else if (mapOpen) closeMap();
            else if (statsOpen) closeStats();
            else if (document.getElementById('sound-panel').classList.contains('open')) document.getElementById('sound-panel').classList.remove('open');
            else togglePause();
            keys.Escape = false;
        }

        // Çizim (Değişmedi)
        ctx.fillStyle = "#020204"; ctx.fillRect(0,0,width,height);
        ctx.fillStyle="white"; stars.forEach(s => { let sx = (s.x - player.x * 0.9) % width; let sy = (s.y - player.y * 0.9) % height; if(sx<0) sx+=width; if(sy<0) sy+=height; ctx.globalAlpha = 0.7; ctx.fillRect(sx, sy, s.s, s.s); }); ctx.globalAlpha = 1;

        ctx.save(); ctx.translate(width/2, height/2); ctx.scale(currentZoom, currentZoom); ctx.translate(-player.x, -player.y);
        nexus.draw(ctx);
        repairStation.draw(ctx); 
        storageCenter.draw(ctx); 
        
        // Particle sınıfı entities/Particle.js'den geliyor.
        for(let i=particles.length-1; i>=0; i--) { particles[i].update(); particles[i].draw(ctx); if(particles[i].life<=0) particles.splice(i,1); }
        
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(16, 185, 129, 0.2)"; 
        ctx.beginPath(); ctx.arc(player.x, player.y, player.scanRadius, 0, Math.PI*2); ctx.stroke();
        
        ctx.strokeStyle = "rgba(245, 158, 11, 0.15)"; 
        ctx.beginPath(); ctx.arc(player.x, player.y, player.radarRadius, 0, Math.PI*2); ctx.stroke();

        if(echoRay) {
            ctx.strokeStyle = "rgba(16, 185, 129, 0.2)"; ctx.beginPath(); ctx.arc(echoRay.x, echoRay.y, echoRay.scanRadius, 0, Math.PI*2); ctx.stroke();
            ctx.strokeStyle = "rgba(245, 158, 11, 0.15)"; ctx.beginPath(); ctx.arc(echoRay.x, echoRay.y, echoRay.radarRadius, 0, Math.PI*2); ctx.stroke();
            
            // --- YANKI DÖNÜŞ ÇİZGİSİ ---
            if (echoRay.mode === 'return') {
                const distToEcho = Math.hypot(player.x - echoRay.x, player.y - echoRay.y);
                
                // Mesafe scanRadius'tan küçükse (yeşil alan içindeyse) opasiteyi düşür
                let lineAlpha = 0.4;
                if (distToEcho < player.scanRadius) {
                    // İçeri girdikçe (mesafe azaldıkça) görünürlük azalır
                    lineAlpha = Math.max(0, (distToEcho / player.scanRadius) * 0.4);
                }

                if (lineAlpha > 0.05) { // Çok silikse çizme
                    ctx.beginPath();
                    // Yankıdan oyuncuya doğru çizelim ki akış yönü mantıklı olsun
                    ctx.moveTo(echoRay.x, echoRay.y);
                    ctx.lineTo(player.x, player.y);
                    
                    ctx.strokeStyle = MAP_CONFIG.colors.echo; 
                    ctx.lineWidth = 2;
                    ctx.setLineDash([15, 10]); // Kesik Çizgi
                    
                    // Animasyon
                    ctx.lineDashOffset = -Date.now() / 50; 

                    ctx.globalAlpha = lineAlpha;
                    ctx.stroke();
                    
                    // Temizlik
                    ctx.globalAlpha = 1.0;
                    ctx.setLineDash([]);
                    ctx.lineDashOffset = 0;
                }
            }
        }

        planets.forEach(p => { 
            // maps.js'den gelen getPlanetVisibility kullanılıyor.
            const visibility = getPlanetVisibility(p, player, echoRay);
            if (visibility === 0) return;
            const viewW = width / currentZoom; const viewH = height / currentZoom; 
            if(p.x > player.x - viewW && p.x < player.x + viewW && p.y > player.y - viewH && p.y < player.y + viewH) { 
                p.draw(ctx, visibility); 
            } 
            if(!p.collected) { 
                 if(Math.hypot(player.x-p.x, player.y-p.y) < p.radius + 30*player.scale) { 
                    if(p.type.id === 'toxic') { 
                        audio.playToxic(); showToxicEffect(); 
                        // Particle sınıfı entities/Particle.js'den geliyor.
                        for(let i=0; i<30; i++) particles.push(new Particle(p.x, p.y, '#84cc16')); 
                        if(echoRay && echoRay.attached) { echoRay = null; echoDeathLevel = player.level; document.getElementById('echo-wrapper-el').style.display = 'none'; if(echoInvOpen) closeEchoInventory(); showNotification({name: "YANKI ZEHİRLENDİ...", type:{color:'#ef4444'}}, ""); } 
                        else { 
                            const now = Date.now(); 
                            if (now - lastToxicNotification > 2000) { showNotification({name: "ZARARLI GAZ TESPİT EDİLDİ", type:{color:'#84cc16'}}, ""); lastToxicNotification = now; } 
                            player.takeDamage(5);
                        } 
                    } else if (p.type.id === 'lost') { 
                         if (addItemToInventory(p)) { 
                             p.collected = true; 
                             audio.playChime({id:'legendary'}); 
                             showNotification({name: "KAYIP KARGO KURTARILDI!", type:{color:'#a855f7'}}, ""); 
                             if (p.lootContent && p.lootContent.length > 0) { p.lootContent.forEach(item => { if(addItemToInventory(item)) player.gainXp(item.type.xp); }); }
                         }
                    } else if (p.type.id === 'tardigrade') {
                        p.collected = true; audio.playChime(p.type); 
                        player.energy = Math.min(player.energy + 50, player.maxEnergy);
                        showNotification({name: "TARDİGRAD YENDİ", type:{color:'#C7C0AE'}}, `(+%50 ENERJİ, +${p.type.xp} XP)`);
                        player.gainXp(p.type.xp);
                    } else { 
                        const lootCount = GameRules.calculateLootCount(); 
                        
                        // YENİ MANTIK: Hiç kaynak çıkmasa bile XP ver
                        if (lootCount === 0) {
                            p.collected = true;
                            // XP kazan
                            player.gainXp(p.type.xp);
                            showNotification({
                                name: `+${p.type.xp} XP`, 
                                type: { color: '#94a3b8' } // Gri renk
                            }, "(Veri Analizi)");
                        } else {
                            let addedCount = 0;
                            for(let i=0; i<lootCount; i++) { 
                                if(addItemToInventory(p)) { 
                                    addedCount++; 
                                    player.gainXp(p.type.xp); 
                                } else { 
                                    break; 
                                } 
                            }
                            if (addedCount > 0) { 
                                p.collected = true; 
                                audio.playChime(p.type); 
                                // Diğer toplamalarda da XP göster
                                const totalXp = addedCount * p.type.xp;
                                const suffix = (addedCount > 1 ? `x${addedCount} ` : "") + `(+${totalXp} XP)`;
                                showNotification(p, suffix); 
                            } 
                        }
                    } 
                } 
            } 
        });

        if(echoRay) echoRay.draw(ctx);
        player.draw(ctx); ctx.restore();
        
        // --- PROMPT VE İNDİKATÖR KISMI (CONFIG KULLANIMI) ---
        const promptEl = document.getElementById('merge-prompt');
        const distNexus = Math.hypot(player.x - nexus.x, player.y - nexus.y);
        const distStorage = Math.hypot(player.x - storageCenter.x, player.y - storageCenter.y);
        
        let showNexusPrompt = (distNexus < nexus.radius + 200) && !nexusOpen;
        let showStoragePrompt = (distStorage < storageCenter.radius + 200) && !storageOpen;

        if (showNexusPrompt) { promptEl.innerText = "[E] NEXUS'A GİRİŞ YAP"; promptEl.className = 'visible'; if (keys.e) { if(document.activeElement !== document.getElementById('chat-input')) { enterNexus(); keys.e = false; } } } 
        else if (showStoragePrompt) { promptEl.innerText = "[E] DEPO YÖNETİMİ"; promptEl.className = 'visible'; if (keys.e) { if(document.activeElement !== document.getElementById('chat-input')) { openStorage(); keys.e = false; } } }
        else if (echoRay && !nexusOpen && !storageOpen && !mapOpen) {
            const distEcho = Math.hypot(player.x - echoRay.x, player.y - echoRay.y);
            if (!echoRay.attached && distEcho < 300) { 
                promptEl.innerText = "[F] BİRLEŞ"; promptEl.className = 'visible'; if(keys.f) { if(document.activeElement !== document.getElementById('chat-input')) { echoManualMerge(); keys.f = false; } } 
            } else if (echoRay.attached) { 
                promptEl.className = ''; if(keys.f) { if(document.activeElement !== document.getElementById('chat-input')) { echoRay.attached = false; echoRay.mode = 'roam'; updateEchoDropdownUI(); keys.f = false; showNotification({name: "YANKI AYRILDI", type:{color:'#67e8f9'}}, ""); } } 
            } else { promptEl.className = ''; }
        } else { promptEl.className = ''; }

        // CONFIG'TEN RENK KULLANIMI
        if(echoRay && !echoRay.attached) {
            drawTargetIndicator(ctx, player, {width, height, zoom: currentZoom}, echoRay, MAP_CONFIG.colors.echo);
        }
        drawTargetIndicator(ctx, player, {width, height, zoom: currentZoom}, nexus, MAP_CONFIG.colors.nexus);
        drawTargetIndicator(ctx, player, {width, height, zoom: currentZoom}, repairStation, MAP_CONFIG.colors.repair);
        drawTargetIndicator(ctx, player, {width, height, zoom: currentZoom}, storageCenter, MAP_CONFIG.colors.storage);

        const entities = { player, echoRay, nexus, repairStation, storageCenter, planets };
        const state = { manualTarget };
        
        drawMiniMap(mmCtx, entities, state);
        if(mapOpen) drawBigMap(bmCtx, bmCanvas, WORLD_SIZE, entities, state);

    } else { /* Paused logic */ }
    animationId = requestAnimationFrame(loop);
}

// Olay Dinleyicileri (Event Listeners - Kalanlar)
function togglePause() { isPaused = true; document.getElementById('pause-overlay').classList.add('active'); }
function resumeGame() { isPaused = false; document.getElementById('pause-overlay').classList.remove('active'); }
function quitToMain() { 
    document.getElementById('pause-overlay').classList.remove('active'); 
    document.getElementById('death-screen').classList.remove('active'); 
    document.getElementById('main-menu').classList.remove('menu-hidden'); 
    isPaused = true; 
    if(animationId) cancelAnimationFrame(animationId); 
}

// Pencere Boyutlandırma (Bu görsel bir olay olduğu için burada kalabilir)
function resize() { width = window.innerWidth; height = window.innerHeight; canvas.width = width; canvas.height = height; mmCanvas.width = 180; mmCanvas.height = 180; bmCanvas.width = window.innerWidth; bmCanvas.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();

// --- KONTROLCÜLERİ BAŞLAT ---
// Controls.js içindeki fonksiyonu çağırarak dinleyicileri aktif ediyoruz
initControls();