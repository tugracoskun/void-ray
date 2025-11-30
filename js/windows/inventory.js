/**
 * Void Ray - Pencere: Envanter (Oyuncu)
 * * Vatoz (Void Ray) gemisinin kişisel envanter arayüzünü yönetir.
 * * ui.js dosyasındaki renderGrid altyapısını kullanır.
 */

// Pencere Durumu
let inventoryOpen = false;

/**
 * Envanter ikonundaki sayacı ve doluluk durumunu günceller.
 */
function updateInventoryCount() {
    const badge = document.getElementById('inv-total-badge'); 
    // collectedItems ve getPlayerCapacity game.js ve game-rules.js üzerinden gelir
    const count = collectedItems.length;
    const capacity = getPlayerCapacity();
    
    if(badge) {
        badge.innerText = count; 
        badge.style.display = count > 0 ? 'flex' : 'none';
        
        if (count >= capacity) {
            badge.style.background = '#ef4444'; // Kırmızı (Dolu)
            badge.style.color = '#fff';
        } else if (count >= capacity * 0.9) {
            badge.style.background = '#f59e0b'; // Turuncu (Dolmak üzere)
            badge.style.color = '#000';
        } else {
            badge.style.background = '#fff'; // Beyaz (Normal)
            badge.style.color = '#000';
        }
    }
}

/**
 * Envanter penceresini ekrana çizer.
 */
function renderInventory() {
    const gridContainer = document.getElementById('inv-grid-content');
    if(!gridContainer) return;
    
    const invHeader = document.querySelector('.inv-header h2');
    const cap = getPlayerCapacity();
    const count = collectedItems.length;
    const color = count >= cap ? '#ef4444' : '#94a3b8';
    
    // Başlığı güncelle
    if(invHeader) {
        invHeader.innerHTML = `ENVANTER <span style="font-size:0.5em; vertical-align:middle; color:${color}; letter-spacing:1px; margin-left:10px;">${count} / ${cap}</span>`;
    }

    // Grid yapısını oluştur (renderGrid fonksiyonu ui.js içinden gelir)
    renderGrid(gridContainer, collectedItems, cap, (item) => {
        // İleride buraya tıklama ile detay görme veya hızlı kullanım eklenebilir.
        // Şimdilik envanterdeki eşyaya tıklanınca bir işlem yapmıyoruz.
    });
}

/**
 * Envanter penceresini kapatır.
 */
function closeInventory() { 
    inventoryOpen = false; 
    document.getElementById('inventory-overlay').classList.remove('open'); 
    hideTooltip(); // Tooltip açıksa kapat
}