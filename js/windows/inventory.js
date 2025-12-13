/**
 * Void Ray - Pencere: Envanter (Oyuncu)
 * GÜNCELLEME: Tıklama ile eşya kuşanma (Equip) özelliği eklendi.
 */

let inventoryOpen = false;
let currentInvPage = 1;
const TOTAL_PAGES = 3;
const SLOTS_PER_PAGE = 50; 

function updateInventoryCount() {
    const badge = document.getElementById('inv-total-badge'); 
    const count = collectedItems.length;
    const capacity = GameRules.getPlayerCapacity();
    
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
}

window.switchInventoryPage = function(pageNum) {
    if (pageNum < 1 || pageNum > TOTAL_PAGES) return;
    currentInvPage = pageNum;
    renderInventory();
}

function renderInventory() {
    if (typeof setHudButtonActive === 'function') setHudButtonActive('btn-inv-icon', true);

    const gridContainer = document.getElementById('inv-grid-content');
    if(!gridContainer) return;
    
    const invHeader = document.querySelector('.inv-header');
    const totalCapacity = GameRules.getPlayerCapacity();
    const count = collectedItems.length;
    const startSlotIndex = (currentInvPage - 1) * SLOTS_PER_PAGE;
    const capColor = count >= totalCapacity ? '#ef4444' : (count >= totalCapacity * 0.9 ? '#f59e0b' : '#94a3b8');
    
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

    // --- GRID OLUŞTURMA ---
    // ui.js içerisindeki renderGrid fonksiyonunu kullanıyoruz.
    renderGrid(gridContainer, collectedItems.slice(startSlotIndex, startSlotIndex + SLOTS_PER_PAGE), SLOTS_PER_PAGE, (item) => {
        // --- YENİ: EŞYA TIKLAMA MANTIĞI ---
        if (item.category === 'equipment') {
            // Eğer eşya bir ekipmansa ve equipItem fonksiyonu varsa çağır
            if (typeof equipItem === 'function') {
                equipItem(item);
            } else {
                console.error("equipItem fonksiyonu bulunamadı! js/windows/equipment.js yüklü mü?");
            }
        } else {
            // Kaynak ise bilgi ver
            showNotification({name: "HAMMADDE", type: {color: '#94a3b8'}}, "Nexus'ta satılabilir.");
        }
    });

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

function closeInventory() { 
    inventoryOpen = false; 
    document.getElementById('inventory-overlay').classList.remove('open'); 
    if (typeof setHudButtonActive === 'function') setHudButtonActive('btn-inv-icon', false);
    hideTooltip(); 
}