/**
 * Void Ray - Kontrol Sistemi
 * GÜNCELLEME: HUD Butonları için aç/kapa (toggle) mantığı eklendi.
 */

// Tuş Durumları (Global erişim için)
const keys = { w:false, a:false, s:false, d:false, " ":false, f:false, q:false, e:false, m:false, h:false, c:false, p:false, Escape:false };

function initControls() {
    console.log("Kontroller başlatılıyor...");

    // --- KLAVYE GİRDİLERİ ---
    window.addEventListener('keydown', e => { 
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
        
        // --- KAMERA DEĞİŞTİRME (C TUŞU) ---
        if(e.key.toLowerCase() === 'c') {
            if (typeof echoRay !== 'undefined' && echoRay && !echoRay.attached) {
                
                // Utils güncellemesi:
                const dist = Utils.distEntity(player, echoRay);
                const maxRange = player.radarRadius;

                if (dist > maxRange) {
                    showNotification({name: "BAĞLANTI HATASI", type:{color:'#ef4444'}}, "Yankı radar menzili dışında.");
                    Utils.playSound('playError'); // Güvenli Ses
                    return; 
                }

                const indicator = document.getElementById('echo-vision-indicator');
                
                if (window.cameraTarget === player) {
                    window.cameraTarget = echoRay;
                    showNotification({name: "GÖRÜŞ: YANKI (ECHO)", type:{color:'#67e8f9'}}, "Kamera Aktarıldı");
                    if(indicator) indicator.classList.add('active');
                } else {
                    window.cameraTarget = player;
                    showNotification({name: "GÖRÜŞ: VATOZ (GEMİ)", type:{color:'#38bdf8'}}, "Kamera Aktarıldı");
                    if(indicator) indicator.classList.remove('active');
                }
            } else if (echoRay && echoRay.attached) {
                showNotification({name: "YANKI BAĞLI", type:{color:'#ef4444'}}, "Kamera geçişi için Yankı ayrılmalı.");
                if(window.cameraTarget !== player) {
                    window.cameraTarget = player;
                    const indicator = document.getElementById('echo-vision-indicator');
                    if(indicator) indicator.classList.remove('active');
                }
            } else {
                showNotification({name: "YANKI YOK", type:{color:'#ef4444'}}, "Kamera geçişi yapılamıyor.");
                window.cameraTarget = player;
                const indicator = document.getElementById('echo-vision-indicator');
                if(indicator) indicator.classList.remove('active');
            }
            keys.c = false;
        }

        // --- PROFİL (P TUŞU) ---
        if(e.key.toLowerCase() === 'p') {
            if (typeof profileOpen !== 'undefined') {
                if (profileOpen) closeProfile();
                else openProfile();
            }
            keys.p = false;
        }

        if(e.key.toLowerCase() === 'h') {
             if (typeof toggleHUD === 'function') {
                 toggleHUD();
             }
             keys.h = false; 
        }

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
            // Hud butonunu güncelle
            if (typeof setHudButtonActive === 'function') setHudButtonActive('btn-inv-icon', inventoryOpen);
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
        if (e.target.closest('.chat-content') || 
            e.target.closest('.profile-content') || 
            e.target.closest('.nexus-content') || 
            e.target.closest('.inv-content') || 
            e.target.closest('.stats-wireframe-content') || 
            e.target.closest('.overflow-y-auto') || 
            e.target.closest('#settings-panel')) {
            return; 
        }

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
            
            const focusPoint = window.cameraFocus || window.cameraTarget;
            const screenX = (echoRay.x - focusPoint.x) * currentZoom + width/2;
            const screenY = (echoRay.y - focusPoint.y) * currentZoom + height/2;
            
            const dist = Utils.dist(mx, my, screenX, screenY);
            if (dist < 40 * currentZoom) {
                echoRay.energyDisplayTimer = 240; 
            }
        });
    }

    // --- ARAYÜZ BUTONLARI VE BAŞLATICILAR ---
    const btnStart = document.getElementById('btn-start');
    if(btnStart) {
        btnStart.addEventListener('click', () => { 
            const mainMenu = document.getElementById('main-menu');
            if(mainMenu) mainMenu.classList.add('menu-hidden'); 
            
            const controlsWrapper = document.getElementById('menu-controls-wrapper');
            if (controlsWrapper) {
                controlsWrapper.classList.remove('menu-controls-visible');
                controlsWrapper.classList.add('menu-controls-hidden');
            }

            if(typeof init === 'function') init(); 
            if(audio) audio.init(); 
            startLoop(); 
        });
    }

    // ENVANTER BUTONU (TOGGLE)
    const btnInv = document.getElementById('btn-inv-icon');
    if(btnInv) {
        btnInv.addEventListener('click', () => { 
            if (inventoryOpen) {
                closeInventory();
            } else {
                inventoryOpen = true; 
                const el = document.getElementById('inventory-overlay');
                if(el) el.classList.add('open'); 
                renderInventory(); 
            }
        });
    }
    
    // ENVANTER KAPATMA BUTONU
    const btnCloseInv = document.getElementById('btn-close-inv');
    if(btnCloseInv) {
        btnCloseInv.addEventListener('click', () => { 
            inventoryOpen = false; 
            const el = document.getElementById('inventory-overlay');
            if(el) el.classList.remove('open'); 
            if (typeof setHudButtonActive === 'function') setHudButtonActive('btn-inv-icon', false);
        });
    }

    // OTO-PİLOT BUTONU
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

    // İSTATİSTİK BUTONU (TOGGLE)
    const btnStats = document.getElementById('btn-stats-icon');
    if(btnStats) {
        btnStats.addEventListener('click', () => {
            if (typeof statsOpen !== 'undefined' && statsOpen) {
                closeStats();
            } else {
                openStats();
            }
        });
    }

    // PROFİL BUTONU (HTML ONCLICK OVERRIDE)
    const btnProfile = document.getElementById('btn-profile-icon');
    if(btnProfile) {
        btnProfile.onclick = function(e) {
            e.preventDefault();
            if (typeof toggleProfile === 'function') {
                toggleProfile();
            } else if (typeof openProfile === 'function') {
                if(typeof profileOpen !== 'undefined' && profileOpen) closeProfile(); 
                else openProfile();
            }
        };
    }
}