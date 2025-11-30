/**
 * Void Ray - Pencere: İstatistikler
 * * Oyun verilerini, sayaçları ve performans metriklerini gösteren pencere.
 * * ui.js dosyasındaki formatTime fonksiyonunu kullanır.
 */

// Pencere Durumu
let statsOpen = false;

/**
 * İstatistik penceresini açar ve verileri günceller.
 */
function openStats() {
    statsOpen = true;
    document.getElementById('stats-overlay').classList.add('open');
    renderStats();
}

/**
 * İstatistik penceresini kapatır.
 */
function closeStats() {
    statsOpen = false;
    document.getElementById('stats-overlay').classList.remove('open');
}

/**
 * İstatistik tablosunu anlık verilerle doldurur.
 */
function renderStats() {
    if(!statsOpen) return;
    const table = document.getElementById('stats-table-content');
    if(!table) return;
    
    // gameStartTime ve playerData global değişkenlerdir (game.js)
    const now = Date.now();
    const gameTime = now - gameStartTime;
    const distStr = Math.floor(playerData.stats.distance / 100) + " km";

    // formatTime fonksiyonu ui.js içinden gelir
    table.innerHTML = `
        <tr><th>EVREN SÜRESİ</th><td>${formatTime(gameTime)}</td></tr>
        <tr><th>HAREKET SÜRESİ</th><td>${formatTime(playerData.stats.timeMoving)}</td></tr>
        <tr><th>BEKLEME SÜRESİ</th><td>${formatTime(playerData.stats.timeIdle)}</td></tr>
        <tr><th>AI (OTOPİLOT) SÜRESİ</th><td>${formatTime(playerData.stats.timeAI)}</td></tr>
        <tr><th>VATOZ MAX HIZ</th><td>${Math.floor(playerData.stats.maxSpeed * 10)} KM/S</td></tr>
        <tr><th>YANKI MAX HIZ</th><td>${Math.floor(playerData.stats.echoMaxSpeed * 10)} KM/S</td></tr>
        <tr><th>TOPLAM MESAFE</th><td>${distStr}</td></tr>
        <tr><th>TOPLANAN KAYNAK</th><td>${playerData.stats.totalResources} ADET</td></tr>
        <tr><th>KAZANILAN KRİSTAL</th><td>${playerData.stats.totalStardust} ◆</td></tr>
        <tr><th>HARCANAN KRİSTAL</th><td>${playerData.stats.totalSpentStardust} ◆</td></tr>
        <tr><th>HARCANAN ENERJİ</th><td>${Math.floor(playerData.stats.totalEnergySpent)} BİRİM</td></tr>
        <tr><th>ENVANTER KAPASİTESİ</th><td>${collectedItems.length} / ${getPlayerCapacity()}</td></tr>
        <tr><th>DEPO (MERKEZ)</th><td>${centralStorage.length} EŞYA</td></tr>
    `;
}