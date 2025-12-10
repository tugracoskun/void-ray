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
    } 
    // 3. Yankı (Echo) Durumları
    else if (name.includes("YANKI DOĞDU") || name.includes("YANKI AYRILDI") || name.includes("YANKI: ŞARJ") || name.includes("DEPO") || name.includes("GÖRÜŞ:")) {
        msg = `Sistem: ${name}`;
        type = "info";
    } 
    // 4. Enerji Durumları
    else if (name.includes("ENERJİ") || name.includes("TARDİGRAD")) {
         msg = `${name} ${suffix}`;
         type = "info";
    } 
    // 5. Uyarılar ve Hatalar (Kırmızı)
    else if (name.includes("ZEHİR") || name.includes("TEHLİKE") || name.includes("YANKI ZEHİRLENDİ") || name.includes("DOLU") || name.includes("YETERSİZ") || name.includes("BAĞLANTI") || name.includes("BOŞ") || name.includes("ERİŞİM") || name.includes("HATA") || name.includes("SİNYAL KAYBI")) {
        msg = `UYARI: ${name} ${suffix}`;
        type = "alert";
    } 
    // 6. Özel Keşifler
    else if (name.includes("KAYIP KARGO")) {
        msg = `Keşif: ${name} bulundu!`;
        type = "info";
    } 
    // 7. Kaynak Toplama (Loot)
    else if (planet.type && (planet.type.id === 'common' || planet.type.id === 'rare' || planet.type.id === 'epic' || planet.type.id === 'legendary')) {
        msg = `Toplandı: ${name} ${suffix}`;
        type = "loot";
    } 
    // 8. Varsayılan
    else {
        msg = `${name} ${suffix}`;
        type = "info";
    }
    
    // Mesajı Chat Sistemine İlet
    // addChatMessage fonksiyonu js/windows/chat.js içindedir.
    if (typeof addChatMessage === 'function') {
        addChatMessage(msg, type, 'bilgi');
    } else {
        console.warn("Notification System: addChatMessage fonksiyonu bulunamadı. Mesaj:", msg);
    }
}

// Global erişim için window'a ata (Gerekirse)
window.showNotification = showNotification;