/**
 * Void Ray - Bildirim Sistemi (Notification System)
 * * Oyun içi olayları, toplamaları, uyarıları ve sistem mesajlarını işler.
 * * İşlenen mesajları Chat sistemine (addChatMessage) iletir.
 */

/**
 * Ekrana ve chat paneline bildirim gönderir.
 * Game logic tarafından global olarak kullanılır.
 * @param {Object} planet - Gezegen/Nesne objesi veya {name: "Mesaj"} formatında obje
 * @param {string} suffix - Mesajın sonuna eklenecek ek metin (örn: miktar, XP)
 */
function showNotification(planet, suffix) {
    let msg = "";
    let type = "loot";
    const name = planet.name || "";

    // 1. Sistem ve Otopilot Mesajları
    if (name === "ROTA OLUŞTURULDU" || name.includes("OTOMATİK")) {
        msg = `Sistem: ${name}`;
        type = "info";
    } 
    // 2. Seviye ve Evrim
    else if (name.includes("EVRİM GEÇİRİLDİ")) {
        msg = `Sistem: ${name}`;
        type = "info";
    } else if (name.includes("YANKI DOĞDU") || name.includes("YANKI AYRILDI") || name.includes("YANKI: ŞARJ") || name.includes("DEPO") || name.includes("GÖRÜŞ:")) {
        msg = `Sistem: ${name}`;
        type = "info";
    } else if (name.includes("ENERJİ") || name.includes("TARDİGRAD")) {
         msg = `${name} ${suffix}`;
         type = "info";
    } else if (name.includes("ZEHİR") || name.includes("TEHLİKE") || name.includes("YANKI ZEHİRLENDİ") || name.includes("DOLU") || name.includes("YETERSİZ") || name.includes("BAĞLANTI") || name.includes("BOŞ") || name.includes("ERİŞİM") || name.includes("HATA") || name.includes("SİNYAL KAYBI")) {
        msg = `UYARI: ${name} ${suffix}`;
        type = "alert";
    } else if (name.includes("KAYIP KARGO")) {
        msg = `Keşif: ${name} bulundu!`;
        type = "info";
    } else if (planet.type && (planet.type.id === 'common' || planet.type.id === 'rare' || planet.type.id === 'epic' || planet.type.id === 'legendary')) {
        msg = `Toplandı: ${name} ${suffix}`;
        type = "loot";
    } else {
        msg = `${name} ${suffix}`;
        type = "info";
    }
    
    // Chat Sistemine İlet
    if (typeof addChatMessage === 'function') {
        addChatMessage(msg, type, 'bilgi');
    }
}

/**
 * 2. GÖRSEL EFEKTLER (HUD OVERLAYS)
 */

/**
 * Ekranı yeşil renkte titreştirir (Zehir hasarı).
 */
function showToxicEffect() { 
    const el = document.getElementById('toxic-overlay'); 
    if(el) { 
        el.classList.add('active'); 
        setTimeout(() => el.classList.remove('active'), 1500); 
    }
}

/**
 * Ekranı kırmızı renkte titreştirir (Fiziksel hasar).
 */
function showDamageEffect() {
    const dmgOverlay = document.getElementById('damage-overlay');
    if(dmgOverlay) {
        dmgOverlay.classList.add('active');
        setTimeout(() => dmgOverlay.classList.remove('active'), 200);
    }
}

/**
 * 3. BAŞARIM POPUP'I
 * Sağ taraftan kayarak gelen başarım bildirimini gösterir.
 * @param {Object} ach - Başarım objesi {title, desc}
 */
function showAchievementPopup(ach) {
    const container = document.getElementById('ui-core');
    if (!container) return;

    const popup = document.createElement('div');
    // CSS sınıfları css/hud.css dosyasında tanımlandı.
    popup.className = 'achievement-popup';
    popup.innerHTML = `
        <div class="ach-icon">★</div>
        <div class="ach-content">
            <div class="ach-title">BAŞARIM AÇILDI</div>
            <div class="ach-name">${ach.title}</div>
            <div class="ach-desc">${ach.desc}</div>
        </div>
    `;
    
    container.appendChild(popup);

    // Animasyonu tetiklemek için bir kare bekle
    requestAnimationFrame(() => {
        popup.classList.add('visible');
    });

    // 4 saniye sonra kapat ve sil
    setTimeout(() => {
        popup.classList.remove('visible');
        setTimeout(() => popup.remove(), 600);
    }, 4000);
}

// Global erişimler
window.showNotification = showNotification;
window.showToxicEffect = showToxicEffect;
window.showDamageEffect = showDamageEffect;
window.showAchievementPopup = showAchievementPopup;