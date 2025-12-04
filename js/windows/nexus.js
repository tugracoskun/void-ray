/**
 * -------------------------------------------------------------------------
 * DEVELOPER NOTE: NEXUS (UI / WINDOW) MODULE
 * -------------------------------------------------------------------------
 * Bu dosya, Nexus istasyonunun "Kullanıcı Arayüzü" (Window) mantığını yönetir.
 * * Sorumlulukları:
 * - HTML elementlerinin (Market, Hangar, Sekmeler) yönetimi.
 * - Buton tıklamaları (Satın al, Sat, Geliştir).
 * - Market hesaplamaları ve Envanter etkileşimleri.
 * - DOM manipülasyonu.
 * * Kapsam Dışı (Burada OLMAMASI gerekenler):
 * - Canvas üzerine çizim kodları (draw).
 * - Fiziksel koordinatlar (x, y) veya çarpışma testleri.
 * - Oyun döngüsü (game loop) içindeki animasyonlar.
 * * İlgili Fiziksel Varlık Dosyası: js/entities/Nexus.js
 * -------------------------------------------------------------------------
 */

let nexusOpen = false;

/**
 * Oyuncunun Nexus ile etkileşime girebilecek mesafede olup olmadığını kontrol eder.
 * @returns {boolean} Menzil içindeyse true
 */
function isNearNexus() {
    if (typeof player === 'undefined' || typeof nexus === 'undefined') return false;
    
    // Nexus yarıçapı (varsayılan 300) + Etkileşim tamponu (200)
    const interactionRange = (nexus.radius || 300) + 200;
    const dist = Math.hypot(player.x - nexus.x, player.y - nexus.y);
    
    return dist <= interactionRange;
}

function enterNexus() { 
    // --- GÜVENLİK KONTROLÜ ---
    // Profil penceresinden veya dışarıdan çağrıldığında mesafe kontrolü yap
    if (!isNearNexus()) {
        showNotification({name: "ERİŞİM REDDEDİLDİ", type:{color:'#ef4444'}}, "Nexus menzili dışındasınız.");
        if(typeof audio !== 'undefined' && audio) audio.playError();
        return;
    }

    nexusOpen = true; 
    const overlay = document.getElementById('nexus-overlay');
    if (overlay) overlay.classList.add('open');
    switchNexusTab('market'); 
}

function exitNexus() { 
    nexusOpen = false; 
    const overlay = document.getElementById('nexus-overlay');
    if (overlay) overlay.classList.remove('open');
    hideTooltip();
}

function switchNexusTab(tabName) {
    document.querySelectorAll('.nexus-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nexus-content').forEach(c => c.classList.remove('active'));
    
    if(tabName === 'market') { 
        const tab1 = document.querySelector('.nexus-tab:nth-child(1)');
        if(tab1) tab1.classList.add('active'); 
        
        const contentMarket = document.getElementById('tab-market');
        if(contentMarket) contentMarket.classList.add('active'); 
        
        renderMarket(); 
    } else { 
        const tab2 = document.querySelector('.nexus-tab:nth-child(2)');
        if(tab2) tab2.classList.add('active'); 
        
        const contentUpgrades = document.getElementById('tab-upgrades');
        if(contentUpgrades) contentUpgrades.classList.add('active'); 
        
        renderUpgrades(); 
    }
}

function renderMarket() {
    const grid = document.getElementById('market-grid'); 
    if (!grid) return;
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
    if (pList) pList.innerHTML = ''; 
    if (eList) eList.innerHTML = '';
    
    const createCard = (key, data, isEcho = false) => {
        const currentLvl = playerData.upgrades[key]; 
        const cost = GameRules.calculateUpgradeCost(data.baseCost, currentLvl);
        const isMax = currentLvl >= data.max;
        
        let isDisabled = isMax || playerData.stardust < cost;
        let btnText = isMax ? 'MAX' : 'GELİŞTİR';
        let btnClass = 'buy-btn';

        if (isEcho) {
             if (!echoRay) {
                isDisabled = true;
                btnText = 'YANKI YOK';
                btnClass += ' disabled-echo'; 
             } else if (!echoRay.attached) {
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
    
    if (pList) ['playerSpeed', 'playerTurn', 'playerMagnet', 'playerCapacity'].forEach(k => pList.innerHTML += createCard(k, UPGRADES[k], false));
    if (eList) ['echoSpeed', 'echoRange', 'echoDurability', 'echoCapacity'].forEach(k => eList.innerHTML += createCard(k, UPGRADES[k], true));
}

// --- GLOBAL UI AKSİYONLARI ---

window.buyUpgrade = function(key) {
    // --- GÜVENLİK KONTROLÜ ---
    if (!isNearNexus()) {
        showNotification({name: "BAĞLANTI KOPTU", type:{color:'#ef4444'}}, "İşlem sırasında uzaklaştınız.");
        exitNexus(); // Pencereyi zorla kapat
        return;
    }

    if (key.startsWith('echo')) {
        if (!echoRay) {
             showNotification({name: "YANKI MEVCUT DEĞİL!", type:{color:'#ef4444'}}, "");
             if(audio) audio.playError(); // HATA SESİ
             return;
        }
        if (!echoRay.attached) {
            showNotification({name: "YANKI BAĞLI DEĞİL!", type:{color:'#ef4444'}}, "Yükseltme için birleşin.");
            if(audio) audio.playError(); // HATA SESİ (Eskiden playToxic idi)
            return;
        }
    }

    const data = UPGRADES[key]; const currentLvl = playerData.upgrades[key]; if(currentLvl >= data.max) return;
    const cost = GameRules.calculateUpgradeCost(data.baseCost, currentLvl);
    
    if(playerData.stardust >= cost) { 
        playerData.stardust -= cost; 
        playerData.upgrades[key]++; 
        playerData.stats.totalSpentStardust += cost;
        if(audio) audio.playCash(); 
        player.updateUI(); 
        renderUpgrades(); 
        updateEchoDropdownUI(); 
        updateInventoryCount(); 
    } else {
        // Para yetersiz
        showNotification({name: "YETERSİZ KRİSTAL!", type:{color:'#ef4444'}}, "");
        if(audio) audio.playError(); // HATA SESİ
    }
};

window.sellItem = function(name, unitPrice, count) {
    // --- GÜVENLİK KONTROLÜ ---
    if (!isNearNexus()) {
        showNotification({name: "BAĞLANTI KOPTU", type:{color:'#ef4444'}}, "İşlem sırasında uzaklaştınız.");
        exitNexus();
        return;
    }

    const newItems = collectedItems.filter(i => i.name !== name);
    collectedItems.length = 0;
    newItems.forEach(i => collectedItems.push(i));

    const totalEarned = count * unitPrice;
    playerData.stardust += totalEarned; 
    playerData.stats.totalStardust += totalEarned;
    if(audio) audio.playCash(); 
    player.updateUI(); 
    updateInventoryCount(); 
    renderMarket();
};

window.sellAll = function() {
    // --- GÜVENLİK KONTROLÜ ---
    if (!isNearNexus()) {
        showNotification({name: "BAĞLANTI KOPTU", type:{color:'#ef4444'}}, "İşlem sırasında uzaklaştınız.");
        exitNexus();
        return;
    }

    let total = 0; let toKeep = [];
    collectedItems.forEach(item => { if(item.type.value > 0) total += item.type.value; else toKeep.push(item); });
    if(total > 0) { 
        collectedItems.length = 0;
        toKeep.forEach(i => collectedItems.push(i));
        
        playerData.stardust += total; 
        playerData.stats.totalStardust += total;
        if(audio) audio.playCash(); 
        player.updateUI(); 
        updateInventoryCount(); 
        renderMarket(); 
        showNotification({name: `${total} KRİSTAL KAZANILDI`, type:{color:'#fbbf24'}}, ""); 
    }
};