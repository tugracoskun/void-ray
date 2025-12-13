/**
 * Void Ray - Pencere: Ekipman (Equipment)
 * * Oyuncunun gemisine taktığı parçaları yönetir.
 * * GÜNCELLEME: Emojiler yerine HUD uyumlu semboller kullanıldı.
 */

let equipmentOpen = false;

// Ekipman Slot Tanımları (Emojiler yerine semboller)
const EQUIPMENT_SLOTS = {
    shield: { id: 'shield', label: 'KALKAN', icon: '⛨' },   // Kalkan Sembolü
    engine: { id: 'engine', label: 'MOTOR', icon: '▲' },    // Üçgen (İtici)
    weaponL: { id: 'weapon_l', label: 'SİLAH L', icon: '⌖' }, // Nişangah
    weaponR: { id: 'weapon_r', label: 'SİLAH R', icon: '⌖' }, // Nişangah
    sensor: { id: 'sensor', label: 'RADAR', icon: '◎' },    // Radar Dairesi
    hull: { id: 'hull', label: 'GÖVDE', icon: '⬢' }         // Altıgen (Gövde)
};

function toggleEquipment() {
    if (equipmentOpen) closeEquipment();
    else openEquipment();
}

function openEquipment() {
    equipmentOpen = true;
    const overlay = document.getElementById('equipment-overlay');
    if (overlay) overlay.classList.add('open');
    
    if (typeof setHudButtonActive === 'function') setHudButtonActive('btn-equip-icon', true);
    
    renderEquipment();
}

function closeEquipment() {
    equipmentOpen = false;
    const overlay = document.getElementById('equipment-overlay');
    if (overlay) overlay.classList.remove('open');
    
    if (typeof setHudButtonActive === 'function') setHudButtonActive('btn-equip-icon', false);
    hideTooltip();
}

function renderEquipment() {
    if (!equipmentOpen) return;

    // Slotları güncelle
    Object.keys(EQUIPMENT_SLOTS).forEach(key => {
        const slotData = EQUIPMENT_SLOTS[key];
        const slotEl = document.getElementById(`slot-${slotData.id}`);
        const iconEl = slotEl ? slotEl.querySelector('.slot-icon') : null;
        
        if (slotEl && iconEl) {
            // playerData.equipment verisinden kontrol et
            const item = playerData.equipment ? playerData.equipment[key] : null;
            
            if (item) {
                slotEl.classList.add('filled');
                // Eğer eşyanın özel bir ikonu varsa onu, yoksa varsayılan sembolü kullan
                iconEl.innerText = item.icon || slotData.icon; 
                
                // Hover tooltip
                slotEl.onmouseenter = (e) => showInfoTooltip(e, `${item.name}<br><span style='color:#a855f7'>${item.desc || 'Açıklama yok'}</span>`);
            } else {
                slotEl.classList.remove('filled');
                iconEl.innerText = slotData.icon;
                
                slotEl.onmouseenter = (e) => showInfoTooltip(e, `${slotData.label}: BOŞ`);
            }
            
            slotEl.onmouseleave = hideTooltip;
            
            // Tıklama ile slot işlemi (Gelecekte kuşanma/çıkarma)
            slotEl.onclick = () => {
                if (item) {
                    console.log("Eşya detayları:", item);
                } else {
                    console.log("Bu slot boş.");
                }
            };
        }
    });

    updateEquipmentStats();
}

function updateEquipmentStats() {
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if(el) el.innerText = val;
    };

    setVal('estat-atk', '0');
    setVal('estat-def', '0');
    setVal('estat-spd', Math.floor(playerData.stats.maxSpeed * 10));
    setVal('estat-nrg', Math.floor(player.maxEnergy));
}

// Global erişim
window.openEquipment = openEquipment;
window.closeEquipment = closeEquipment;
window.toggleEquipment = toggleEquipment;