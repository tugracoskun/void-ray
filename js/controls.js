/**
 * Void Ray - Kontrol Sistemi
 * * initControls fonksiyonu, HTML elementlerinin varlığını kontrol eder.
 * * UI yüklendikten sonra çalışmalıdır.
 */

// Tuş Durumları (Global erişim için)
const keys = { w:false, a:false, s:false, d:false, " ":false, f:false, q:false, e:false, m:false, Escape:false };

function initControls() {
    console.log("Kontroller başlatılıyor...");

    // --- KLAVYE GİRDİLERİ ---
    window.addEventListener('keydown', e => { 
        // Element kontrolü ekleyelim
        const chatInput = document.getElementById('chat-input');
        if(chatInput && document.activeElement === chatInput) {
            if(e.key === "Escape") chatInput.blur(); 
            return; 
        }

        if(e.code === "Space") e.preventDefault(); 
        
        if(e.key === "Escape") keys.Escape = true; 
        else if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true; 
        else if(e.code === "Space") keys[" "] = true; 
        else if(keys.hasOwnProperty(e.code)) keys[e.code] = true; 
        
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
            keys.q = false; 
        }

        if(e.key.toLowerCase() === 'm') { 
            const chatInp = document.getElementById('chat-input');
            if(chatInp && document.activeElement === chatInp) return;
            
            if (typeof mapOpen !== 'undefined') {
                if (mapOpen) closeMap();
                else openMap();
            }
            keys.m = false; 
        }
        
        if(e.key.toLowerCase() === 'i') { 
            inventoryOpen = !inventoryOpen; 
            const invOverlay = document.getElementById('inventory-overlay');
            if(invOverlay) invOverlay.classList.toggle('open'); 
            if(inventoryOpen) renderInventory(); 
        } 
    });

    window.addEventListener('keyup', e => { 
        if(e.key === "Escape") keys.Escape = false; 
        else if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false; 
        else if(e.code === "Space") keys[" "] = false; 
        else if(keys.hasOwnProperty(e.code)) keys[e.code] = false; 
    });

    // --- FARE TEKERLEĞİ ---
    window.addEventListener('wheel', e => { 
        if (e.target.closest('#chat-content')) return; 
        if (window.cinematicMode) return;
        if (typeof mapOpen !== 'undefined' && mapOpen) return;

        e.preventDefault(); 
        targetZoom += e.deltaY * -MAP_CONFIG.zoom.speed; 
        targetZoom = Math.min(Math.max(MAP_CONFIG.zoom.min, targetZoom), MAP_CONFIG.zoom.max); 
    }, { passive: false });

    // --- CANVAS TIKLAMALARI ---
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        canvas.addEventListener('mousedown', (e) => {
            if (!echoRay) return;
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            
            const screenX = (echoRay.x - player.x) * currentZoom + width/2;
            const screenY = (echoRay.y - player.y) * currentZoom + height/2;
            
            const dist = Math.hypot(mx - screenX, my - screenY);
            if (dist < 40 * currentZoom) {
                echoRay.energyDisplayTimer = 240; 
            }
        });
    }

    // --- ARAYÜZ BUTONLARI (Elementler var mı diye kontrol et) ---
    const btnStart = document.getElementById('btn-start');
    if(btnStart) {
        btnStart.addEventListener('click', () => { 
            const mainMenu = document.getElementById('main-menu');
            if(mainMenu) mainMenu.classList.add('menu-hidden'); 
            
            // init game.js içindedir
            if(typeof init === 'function') init(); 
            if(audio) audio.init(); 
            startLoop(); 
            const bgMusic = document.getElementById('bgMusic');
            if(bgMusic) bgMusic.play().catch(e=>console.log(e)); 
        });
    }

    const btnInv = document.getElementById('btn-inv-icon');
    if(btnInv) {
        btnInv.addEventListener('click', () => { 
            inventoryOpen = true; 
            const el = document.getElementById('inventory-overlay');
            if(el) el.classList.add('open'); 
            renderInventory(); 
        });
    }
    
    const btnCloseInv = document.getElementById('btn-close-inv');
    if(btnCloseInv) {
        btnCloseInv.addEventListener('click', () => { 
            inventoryOpen = false; 
            const el = document.getElementById('inventory-overlay');
            if(el) el.classList.remove('open'); 
        });
    }

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

    const btnStats = document.getElementById('btn-stats-icon');
    if(btnStats) {
        btnStats.addEventListener('click', () => {
            openStats();
        });
    }
}