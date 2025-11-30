/**
 * Void Ray - Pencere: Depo Merkezi (Storage)
 * * Oyuncunun ve AI'nın eşya depoladığı, sınırsız kapasiteli merkez.
 * * game.js ve ui.js içindeki depo mantığı buraya taşınmıştır.
 */

let storageOpen = false;

function openStorage() {
    storageOpen = true;
    const overlay = document.getElementById('storage-overlay');
    if (overlay) overlay.classList.add('open');
    renderStorageUI();
}

function closeStorage() {
    storageOpen = false;
    const overlay = document.getElementById('storage-overlay');
    if (overlay) overlay.classList.remove('open');
    hideTooltip();
}

/**
 * Depo arayüzünü (Grid) çizer.
 */
function renderStorageUI() {
    if (!storageOpen) return;

    const shipListContainer = document.getElementById('storage-ship-list');
    const centerListContainer = document.getElementById('storage-center-list');
    const shipCap = document.getElementById('storage-ship-cap');
    const centerCount = document.getElementById('storage-center-count');

    // Kapasite bilgilerini güncelle
    if (shipCap) shipCap.innerText = `${collectedItems.length} / ${getPlayerCapacity()}`;
    if (centerCount) centerCount.innerText = `${centralStorage.length} EŞYA`;

    // renderGrid fonksiyonu ui.js içinden gelir
    renderGrid(shipListContainer, collectedItems, getPlayerCapacity(), (item) => {
        depositItem(item.name);
    });

    // Merkez depo sınırsız olduğu için isUnlimited: true
    renderGrid(centerListContainer, centralStorage, 0, (item) => {
        withdrawItem(item.name);
    }, true);
}

/**
 * Bir dizi eşyayı topluca depoya aktarır.
 * (Hem Otopilot AI hem de manuel butonlar tarafından kullanılır)
 */
function depositToStorage(sourceArray, sourceName) {
    if (sourceArray.length === 0) return;
    
    const count = sourceArray.length;
    // Tardigradlar depolanmaz, gemide kalır veya harcanır. Burada filtreliyoruz.
    const itemsToStore = sourceArray.filter(i => i.type.id !== 'tardigrade');
    
    // Eşyaları merkez depoya ekle
    itemsToStore.forEach(item => centralStorage.push(item));
    
    // Kaynak dizisini boşalt (Referans üzerinden çalıştığı için orijinal dizi boşalır)
    sourceArray.length = 0;
    
    if(audio) audio.playCash(); 
    showNotification({name: `${sourceName}: ${count} EŞYA DEPOYA AKTARILDI`, type:{color:'#a855f7'}}, "");
    
    // İlgili tüm UI'ları güncelle
    updateInventoryCount();
    if (typeof inventoryOpen !== 'undefined' && inventoryOpen) renderInventory();
    if (typeof echoInvOpen !== 'undefined' && echoInvOpen) renderEchoInventory();
    if (storageOpen) renderStorageUI();
}

// --- GLOBAL UI AKSİYONLARI (Pencere içindeki butonlar için) ---

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
    
    // Kapasite dolana kadar veya depo bitene kadar çek
    while(centralStorage.length > 0 && collectedItems.length < cap) {
        collectedItems.push(centralStorage.pop());
        moved++;
    }
    
    if (moved > 0) showNotification({name: `${moved} EŞYA GEMİYE ALINDI`, type:{color:'#38bdf8'}}, "");
    else if (centralStorage.length > 0) showNotification({name: "GEMİ DEPOSU DOLU!", type:{color:'#ef4444'}}, "");
    
    renderStorageUI();
    updateInventoryCount();
};