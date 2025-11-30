/**
 * Void Ray - Pencere: Yankı (Echo) Yönetimi
 * * Yankı dronunun envanterini, modlarını ve oyuncu ile etkileşimini yönetir.
 * * ui.js dosyasından ayrıştırılmıştır.
 */

// Pencere Durumu
let echoInvOpen = false;

function updateEchoDropdownUI() {
    document.querySelectorAll('.echo-menu-item').forEach(el => el.classList.remove('active-mode'));
    
    const rateDisp = document.getElementById('echo-rate-disp');
    if(rateDisp) {
        let rateText = "Normal";
        // playerData global (game.js)
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

    // renderGrid -> ui.js
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