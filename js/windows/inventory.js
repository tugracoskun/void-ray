/**
 * Void Ray - Pencere: Envanter (Oyuncu)
 * * Vatoz (Void Ray) gemisinin kişisel envanter arayüzünü yönetir.
 * * Tasarım: Ultra-Kompakt (Pixel Perfect) - 5x10 Grid (50 Slot/Sayfa)
 */

// Pencere ve Sayfa Durumu
let inventoryOpen = false;
let currentInvPage = 1;
const TOTAL_PAGES = 3;
const SLOTS_PER_PAGE = 50; // 5 Sütun x 10 Satır

/**
 * Envanter ikonundaki sayacı ve doluluk durumunu günceller.
 */
function updateInventoryCount() {
    const badge = document.getElementById('inv-total-badge'); 
    const count = collectedItems.length;
    const capacity = GameRules.getPlayerCapacity();
    
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
 * Sayfa değiştirir ve envanteri yeniden çizer.
 */
window.switchInventoryPage = function(pageNum) {
    if (pageNum < 1 || pageNum > TOTAL_PAGES) return;
    currentInvPage = pageNum;
    renderInventory();
}

/**
 * Envanter penceresini ekrana çizer.
 */
function renderInventory() {
    const gridContainer = document.getElementById('inv-grid-content');
    if(!gridContainer) return;
    
    const invHeader = document.querySelector('.inv-header');
    
    const totalCapacity = GameRules.getPlayerCapacity();
    const count = collectedItems.length;
    
    const startSlotIndex = (currentInvPage - 1) * SLOTS_PER_PAGE;
    const capColor = count >= totalCapacity ? '#ef4444' : (count >= totalCapacity * 0.9 ? '#f59e0b' : '#94a3b8');
    
    // --- HEADER (Kompakt) ---
    if(invHeader) {
        invHeader.innerHTML = `
            <div class="inv-header-top">
                <div class="inv-title-main">KARGO</div>
                <div class="window-close-btn" onclick="closeInventory()">✕</div>
            </div>
            
            <div class="inv-info-row">
                <div class="inv-cap-text"><span style="color:${capColor}; font-weight:bold;">${count}</span> / ${totalCapacity}</div>
                
                <div class="inv-currency-box">
                    <span class="inv-currency-label">KRİSTAL</span>
                    <span class="inv-currency-val">${playerData.stardust}</span>
                </div>
            </div>
        `;
    }

    // --- GRID İÇERİĞİ ---
    gridContainer.innerHTML = '';
    // CSS'de repeat(5, 46px) olarak ayarlandı
    gridContainer.className = 'inventory-grid-container';

    // Bu sayfada gösterilecek 50 slotu oluştur
    for (let i = 0; i < SLOTS_PER_PAGE; i++) {
        const globalSlotIndex = startSlotIndex + i;
        
        // Kapasite aşımında slot çizme (sayfanın kalanını boş bırakma opsiyonel)
        if (globalSlotIndex >= totalCapacity) break;

        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        
        // Bu slotta bir eşya var mı?
        if (globalSlotIndex < collectedItems.length) {
            const item = collectedItems[globalSlotIndex];
            slot.classList.add('has-item');
            
            const itemBox = document.createElement('div');
            itemBox.className = 'item-box';
            itemBox.style.backgroundColor = item.type.color;
            if (item.name) itemBox.innerText = item.name.charAt(0).toUpperCase();
            
            slot.appendChild(itemBox);
            
            slot.onclick = () => { hideTooltip(); };
            slot.onmouseenter = (e) => showTooltip(e, item.name, item.type.xp);
            slot.onmousemove = (e) => moveTooltip(e);
            slot.onmouseleave = () => hideTooltip();
        } 
        
        gridContainer.appendChild(slot);
    }

    // --- FOOTER (PAGINATION) ---
    let footer = document.getElementById('inv-footer-controls');
    if (!footer) {
        footer = document.createElement('div');
        footer.id = 'inv-footer-controls';
        footer.className = 'inv-footer';
        gridContainer.parentNode.appendChild(footer);
    }

    let footerHTML = '';
    for(let p=1; p<=TOTAL_PAGES; p++) {
        const isActive = p === currentInvPage ? 'active' : '';
        footerHTML += `<div class="inv-page-btn ${isActive}" onclick="switchInventoryPage(${p})">${p}</div>`;
    }
    footer.innerHTML = footerHTML;
}

/**
 * Envanter penceresini kapatır.
 */
function closeInventory() { 
    inventoryOpen = false; 
    document.getElementById('inventory-overlay').classList.remove('open'); 
    hideTooltip(); 
}