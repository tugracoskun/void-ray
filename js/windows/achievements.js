/**
 * Void Ray - Pencere: Başarımlar (Achievements)
 * * GÜNCELLEME: Başarımlar artık 'Profil Penceresi' içinde bir sekme olarak gösteriliyor.
 * * Bu dosya eski çağrıları yönlendirmek için bırakılmıştır.
 */

// Eski fonksiyonları profile.js'e yönlendir
function openAchievements() {
    if (typeof openProfile === 'function') {
        openProfile('achievements');
    }
}

function closeAchievements() {
    if (typeof closeProfile === 'function') {
        closeProfile();
    }
}

// renderAchievementsList fonksiyonu artık profile.js içinde 'renderAchievements' olarak tanımlı.
// Eski kodda doğrudan çağrılma ihtimaline karşı:
function renderAchievementsList() {
    console.warn("renderAchievementsList deprecated. Use renderAchievements in profile.js");
    if (typeof renderAchievements === 'function') {
        renderAchievements();
    }
}