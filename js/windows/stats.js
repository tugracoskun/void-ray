/**
 * Void Ray - Pencere: İstatistikler
 * * Oyun verilerini, sayaçları ve performans metriklerini gösteren pencere.
 * * GÜNCELLEME: DOM Caching (Önbellekleme) eklendi. Elementler her karede tekrar aranmaz.
 */

// Pencere Durumu
let statsOpen = false;

// DOM Elemanlarını saklamak için önbellek
let statsCache = {
    initialized: false,
    elements: {}
};

/**
 * İstatistik penceresini açar ve verileri günceller.
 */
function openStats() {
    statsOpen = true;
    const overlay = document.getElementById('stats-overlay');
    if(overlay) overlay.classList.add('open');
    
    // İlk render çağrısı (Yapıyı kurmak için)
    renderStats();
}

/**
 * İstatistik penceresini kapatır.
 */
function closeStats() {
    statsOpen = false;
    const overlay = document.getElementById('stats-overlay');
    if(overlay) overlay.classList.remove('open');
}

/**
 * İstatistik yapısını oluşturur ve elementleri önbelleğe alır.
 */
function initStatsDOM(windowEl) {
    windowEl.innerHTML = `
        <div class="stats-wireframe-header">
            <div class="stats-icon-box">≣</div>
            <div class="stats-title-group">
                <div class="stats-main-title">VERİ GÜNLÜĞÜ</div>
                <div class="stats-sub-title">UÇUŞ KAYITLARI VE METRİKLER</div>
            </div>
            <div class="stats-close-btn" onclick="closeStats()">✕</div>
        </div>
        
        <div class="stats-wireframe-content">
            <!-- GRUP 1: ZAMAN VE KEŞİF -->
            <div class="stats-group">
                <div class="stats-group-title">ZAMAN & KEŞİF</div>
                <div class="stats-row"><span class="stats-label">EVREN SÜRESİ</span><span id="stat-game-time" class="stats-value">00:00:00</span></div>
                <div class="stats-row"><span class="stats-label">HAREKET HALİNDE</span><span id="stat-move-time" class="stats-value">00:00:00</span></div>
                <div class="stats-row"><span class="stats-label">BEKLEME SÜRESİ</span><span id="stat-idle-time" class="stats-value">00:00:00</span></div>
                <div class="stats-row"><span class="stats-label">TOPLAM MESAFE</span><span id="stat-distance" class="stats-value highlight">0 km</span></div>
            </div>

            <!-- GRUP 2: EKONOMİ VE DEPO -->
            <div class="stats-group">
                <div class="stats-group-title">ENVANTER & EKONOMİ</div>
                <div class="stats-row"><span class="stats-label">TOPLANAN KAYNAK</span><span id="stat-resources" class="stats-value">0 ADET</span></div>
                <div class="stats-row"><span class="stats-label">KAZANILAN KRİSTAL</span><span id="stat-stardust" class="stats-value gold">0 ◆</span></div>
                <div class="stats-row"><span class="stats-label">HARCANAN KRİSTAL</span><span id="stat-spent" class="stats-value" style="opacity:0.7;">0 ◆</span></div>
                <div class="stats-row"><span class="stats-label">GEMİ DEPOSU</span><span id="stat-inventory" class="stats-value">0 / 0</span></div>
                <div class="stats-row"><span class="stats-label">MERKEZ DEPO</span><span id="stat-storage" class="stats-value">0 EŞYA</span></div>
            </div>

            <!-- GRUP 3: PERFORMANS -->
            <div class="stats-group">
                <div class="stats-group-title">MOTOR PERFORMANSI</div>
                <div class="stats-row"><span class="stats-label">VATOZ MAX HIZ</span><span id="stat-speed-player" class="stats-value highlight">0 KM/S</span></div>
                <div class="stats-row"><span class="stats-label">YANKI MAX HIZ</span><span id="stat-speed-echo" class="stats-value highlight">0 KM/S</span></div>
                <div class="stats-row"><span class="stats-label">TOPLAM ENERJİ TÜKETİMİ</span><span id="stat-energy" class="stats-value">0 BİRİM</span></div>
                <div class="stats-row"><span class="stats-label">OTOPİLOT KULLANIMI</span><span id="stat-ai-time" class="stats-value">00:00:00</span></div>
            </div>
        </div>
    `;

    // Elementleri önbelleğe al (Cache lookup)
    const ids = [
        'stat-game-time', 'stat-move-time', 'stat-idle-time', 'stat-distance',
        'stat-resources', 'stat-stardust', 'stat-spent', 'stat-inventory', 'stat-storage',
        'stat-speed-player', 'stat-speed-echo', 'stat-energy', 'stat-ai-time'
    ];

    ids.forEach(id => {
        statsCache.elements[id] = document.getElementById(id);
    });

    statsCache.initialized = true;
}

/**
 * İstatistik verilerini günceller.
 */
function renderStats() {
    if(!statsOpen) return;
    
    const windowEl = document.querySelector('#stats-overlay .stats-window');
    if(!windowEl) return;
    
    // 1. YAPI KONTROLÜ (Eğer içerik henüz oluşturulmadıysa oluştur)
    if (!statsCache.initialized) {
        initStatsDOM(windowEl);
    }
    
    // 2. VERİ HESAPLAMA
    const now = Date.now();
    const gameTime = now - (window.gameStartTime || now);
    
    // 3. HIZLI GÜNCELLEME (Cache kullanarak)
    updateCachedVal('stat-game-time', formatTime(gameTime));
    updateCachedVal('stat-move-time', formatTime(playerData.stats.timeMoving));
    updateCachedVal('stat-idle-time', formatTime(playerData.stats.timeIdle));
    updateCachedVal('stat-distance', Math.floor(playerData.stats.distance / 100) + " km");
    
    updateCachedVal('stat-resources', playerData.stats.totalResources + " ADET");
    updateCachedVal('stat-stardust', playerData.stats.totalStardust + " ◆");
    updateCachedVal('stat-spent', playerData.stats.totalSpentStardust + " ◆");
    updateCachedVal('stat-inventory', `${collectedItems.length} / ${GameRules.getPlayerCapacity()}`);
    updateCachedVal('stat-storage', centralStorage.length + " EŞYA");
    
    updateCachedVal('stat-speed-player', Math.floor(playerData.stats.maxSpeed * 10) + " KM/S");
    updateCachedVal('stat-speed-echo', Math.floor(playerData.stats.echoMaxSpeed * 10) + " KM/S");
    updateCachedVal('stat-energy', Math.floor(playerData.stats.totalEnergySpent) + " BİRİM");
    updateCachedVal('stat-ai-time', formatTime(playerData.stats.timeAI));
}

// Yardımcı Fonksiyon: Önbellekten güncelleme
function updateCachedVal(id, val) {
    const el = statsCache.elements[id];
    if(el) {
        // Gereksiz DOM yazımlarını önlemek için sadece değer değiştiyse güncelle
        if (el.innerText !== val) {
            el.innerText = val;
        }
    }
}