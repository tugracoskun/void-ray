/**
 * Void Ray - Kontrol Sistemi
 * * Klavye, Fare ve UI etkileşimlerini yönetir.
 * * Dependency: game.js içindeki global değişkenlere (autopilot, player vb.) erişir.
 */

// Tuş Durumları (Global erişim için)
const keys = { w:false, a:false, s:false, d:false, " ":false, f:false, q:false, e:false, m:false, Escape:false };

/**
 * Tüm olay dinleyicilerini başlatır.
 * Bu fonksiyon game.js'in en altında çağrılır.
 */
function initControls() {
    
    // --- KLAVYE GİRDİLERİ (KEYDOWN) ---
    window.addEventListener('keydown', e => { 
        // Chat input açıkken oyun kontrollerini devre dışı bırak
        if(document.activeElement === document.getElementById('chat-input')) {
            if(e.key === "Escape") {
                document.getElementById('chat-input').blur(); 
            }
            return; 
        }

        if(e.code === "Space") e.preventDefault(); 
        
        // Tuş durumunu güncelle
        if(e.key === "Escape") keys.Escape = true; 
        else if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true; 
        else if(e.code === "Space") keys[" "] = true; 
        else if(keys.hasOwnProperty(e.code)) keys[e.code] = true; 
        
        // Q Tuşu: Otopilot Toggle
        if(e.key.toLowerCase() === 'q') { 
            if (!autopilot) {
                autopilot = true;
                aiMode = 'gather';
                addChatMessage("Otopilot: Toplama protokolü devreye alındı.", "info", "genel");
            } else if (aiMode === 'gather' || aiMode === 'travel' || aiMode === 'deposit') {
                aiMode = 'base';
                addChatMessage("Otopilot: Üsse dönüş rotası hesaplanıyor.", "info", "genel");
            } else {
                autopilot = false;
                manualTarget = null;
                addChatMessage("Otopilot: Devre dışı. Manuel kontrol aktif.", "system", "genel");
            }
            updateAIButton();
            keys.q = false; // Basılı kalmasını engelle
        }

        // M Tuşu: Harita Toggle
        if(e.key.toLowerCase() === 'm') { 
            if(document.activeElement === document.getElementById('chat-input')) return;
            // Artık game.js'deki fonksiyonları kullanıyor
            if (mapOpen) closeMap();
            else openMap();
            
            keys.m = false; 
        }
        
        // I Tuşu: Envanter Toggle
        if(e.key.toLowerCase() === 'i') { 
            inventoryOpen = !inventoryOpen; 
            document.getElementById('inventory-overlay').classList.toggle('open'); 
            if(inventoryOpen) renderInventory(); 
        } 
    });

    // --- KLAVYE GİRDİLERİ (KEYUP) ---
    window.addEventListener('keyup', e => { 
        if(e.key === "Escape") keys.Escape = false; 
        else if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false; 
        else if(e.code === "Space") keys[" "] = false; 
        else if(keys.hasOwnProperty(e.code)) keys[e.code] = false; 
    });

    // --- FARE TEKERLEĞİ (ZOOM) ---
    window.addEventListener('wheel', e => { 
        if (e.target.closest('#chat-content')) return; // Chatte scroll yaparken zoom yapma
        if (window.cinematicMode) return;
        
        // HARİTA KONTROLÜ: Harita açıksa oyun zoomunu engelle
        if (typeof mapOpen !== 'undefined' && mapOpen) return;

        e.preventDefault(); 
        // CONFIG Kullanımı (data.js'den)
        targetZoom += e.deltaY * -MAP_CONFIG.zoom.speed; 
        targetZoom = Math.min(Math.max(MAP_CONFIG.zoom.min, targetZoom), MAP_CONFIG.zoom.max); 
    }, { passive: false });

    // --- CANVAS TIKLAMALARI (Echo Ray Etkileşimi) ---
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        canvas.addEventListener('mousedown', (e) => {
            if (!echoRay) return;
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            
            // Yankı'nın ekran koordinatlarını hesapla
            const screenX = (echoRay.x - player.x) * currentZoom + width/2;
            const screenY = (echoRay.y - player.y) * currentZoom + height/2;
            
            const dist = Math.hypot(mx - screenX, my - screenY);
            if (dist < 40 * currentZoom) {
                echoRay.energyDisplayTimer = 240; // Enerji barını göster
            }
        });
    }

    // --- ARAYÜZ BUTONLARI ---
    
    // Başla Butonu
    const btnStart = document.getElementById('btn-start');
    if(btnStart) {
        btnStart.addEventListener('click', () => { 
            document.getElementById('main-menu').classList.add('menu-hidden'); 
            init(); // game.js içindeki init fonksiyonu
            audio.init(); 
            startLoop(); 
            document.getElementById('bgMusic').play().catch(e=>console.log(e)); 
        });
    }

    // Envanter Butonları
    const btnInv = document.getElementById('btn-inv-icon');
    if(btnInv) {
        btnInv.addEventListener('click', () => { 
            inventoryOpen = true; 
            document.getElementById('inventory-overlay').classList.add('open'); 
            renderInventory(); 
        });
    }
    
    const btnCloseInv = document.getElementById('btn-close-inv');
    if(btnCloseInv) {
        btnCloseInv.addEventListener('click', () => { 
            inventoryOpen = false; 
            document.getElementById('inventory-overlay').classList.remove('open'); 
        });
    }

    // AI Toggle Butonu
    const btnAi = document.getElementById('btn-ai-toggle');
    if(btnAi) {
        btnAi.addEventListener('click', () => { 
            autopilot = !autopilot; 
            if(!autopilot) { 
                manualTarget = null; 
                aiMode = 'gather'; 
            } else { 
                aiMode = 'gather'; 
            } 
            updateAIButton(); 
        });
    }

    // İstatistik Butonu
    const btnStats = document.getElementById('btn-stats-icon');
    if(btnStats) {
        btnStats.addEventListener('click', () => {
            openStats();
        });
    }
}