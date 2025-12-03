/**
 * Void Ray - Pencere: Ayarlar
 * * Oyun ayarlarını, ses kontrollerini ve görünüm tercihlerini yönetir.
 */

let settingsOpen = false;

// Global Ayar Nesnesi (Varsayılanlar, game.js ile aynı olmalı)
if (!window.gameSettings) {
    window.gameSettings = {
        showNexusArrow: true,
        showRepairArrow: false,
        showStorageArrow: false,
        showEchoArrow: true, 
        hudOpacity: 1.0,
        hudHoverEffect: false,
        cameraOffsetX: 0, 
        cameraOffsetY: 0,
        adaptiveCamera: false,
        smoothCameraTransitions: true, // YENİ
        developerMode: false,
        showGravityFields: false,
        showHitboxes: false,
        showVectors: false,
        showTargetVectors: false,
        showFps: false,
        godMode: false,
        hidePlayer: false
    };
}

function initSettings() {
    console.log("Ayarlar paneli başlatılıyor...");
    
    const btnSettings = document.getElementById('btn-settings');
    if (btnSettings) {
        const newBtn = btnSettings.cloneNode(true);
        btnSettings.parentNode.replaceChild(newBtn, btnSettings);
        newBtn.addEventListener('click', toggleSettings);
    }

    const nexusToggle = document.getElementById('toggle-nexus-arrow');
    const repairToggle = document.getElementById('toggle-repair-arrow');
    const storageToggle = document.getElementById('toggle-storage-arrow');
    const echoToggle = document.getElementById('toggle-echo-arrow');
    const hudHoverToggle = document.getElementById('toggle-hud-hover');
    const adaptiveCamToggle = document.getElementById('toggle-adaptive-cam');
    
    // YENİ: Smooth Camera Toggle
    const smoothCamToggle = document.getElementById('toggle-smooth-cam');
    
    const devModeToggle = document.getElementById('toggle-dev-mode');
    const gravityToggle = document.getElementById('toggle-gravity-debug');
    const hitboxToggle = document.getElementById('toggle-hitboxes');
    const vectorToggle = document.getElementById('toggle-vectors');
    const targetVectorToggle = document.getElementById('toggle-target-vectors');
    const fpsToggle = document.getElementById('toggle-fps-counter');
    const godModeToggle = document.getElementById('toggle-god-mode');
    const hidePlayerToggle = document.getElementById('toggle-hide-player');
    
    const manualCamControls = document.getElementById('manual-camera-controls');
    const camXInput = document.getElementById('cam-offset-x');
    const camYInput = document.getElementById('cam-offset-y');

    const hudSelectors = ['.hud-icon-group', '#xp-container', '#chat-panel', '#speedometer', '#minimap-wrapper', '#btn-settings', '#merge-prompt'];
    const hudElements = [];
    
    hudSelectors.forEach(sel => {
        const el = document.querySelector(sel);
        if(el) {
            hudElements.push(el);
            el.style.transition = 'opacity 0.3s ease';
            el.addEventListener('mouseenter', () => { if (window.gameSettings.hudHoverEffect) el.style.opacity = '1'; });
            el.addEventListener('mouseleave', () => { if (window.gameSettings.hudHoverEffect) el.style.opacity = window.gameSettings.hudOpacity; });
        }
    });

    if (nexusToggle) nexusToggle.addEventListener('change', (e) => window.gameSettings.showNexusArrow = e.target.checked);
    if (repairToggle) repairToggle.addEventListener('change', (e) => window.gameSettings.showRepairArrow = e.target.checked);
    if (storageToggle) storageToggle.addEventListener('change', (e) => window.gameSettings.showStorageArrow = e.target.checked);
    if (echoToggle) echoToggle.addEventListener('change', (e) => window.gameSettings.showEchoArrow = e.target.checked);

    if (hudHoverToggle) {
        hudHoverToggle.addEventListener('change', (e) => {
            window.gameSettings.hudHoverEffect = e.target.checked;
            hudElements.forEach(el => {
                if (window.gameSettings.hudHoverEffect && el.matches(':hover')) el.style.opacity = '1';
                else el.style.opacity = window.gameSettings.hudOpacity;
            });
        });
    }

    if (adaptiveCamToggle) {
        adaptiveCamToggle.addEventListener('change', (e) => {
            window.gameSettings.adaptiveCamera = e.target.checked;
            if (manualCamControls) {
                if (window.gameSettings.adaptiveCamera) {
                    manualCamControls.style.opacity = '0.3';
                    manualCamControls.style.pointerEvents = 'none';
                    if(camXInput) camXInput.disabled = true;
                    if(camYInput) camYInput.disabled = true;
                } else {
                    manualCamControls.style.opacity = '1';
                    manualCamControls.style.pointerEvents = 'auto';
                    if(camXInput) camXInput.disabled = false;
                    if(camYInput) camYInput.disabled = false;
                }
            }
        });
    }

    // YENİ: Smooth Cam Listener
    if (smoothCamToggle) {
        smoothCamToggle.addEventListener('change', (e) => window.gameSettings.smoothCameraTransitions = e.target.checked);
    }
    
    if (devModeToggle) {
        devModeToggle.addEventListener('change', (e) => {
            window.gameSettings.developerMode = e.target.checked;
            const devTabBtn = document.getElementById('tab-btn-dev');
            if (devTabBtn) {
                if (window.gameSettings.developerMode) {
                    devTabBtn.style.display = 'block';
                    showNotification({name: "GELİŞTİRİCİ MODU AKTİF", type:{color:'#ef4444'}}, "");
                } else {
                    devTabBtn.style.display = 'none';
                    if (devTabBtn.classList.contains('active')) {
                        switchSettingsTab('game');
                    }
                    window.gameSettings.showGravityFields = false;
                    window.gameSettings.showHitboxes = false;
                    window.gameSettings.showVectors = false;
                    window.gameSettings.showTargetVectors = false;
                    window.gameSettings.showFps = false;
                    window.gameSettings.godMode = false;
                    window.gameSettings.hidePlayer = false;
                    
                    if(gravityToggle) gravityToggle.checked = false;
                    if(hitboxToggle) hitboxToggle.checked = false;
                    if(vectorToggle) vectorToggle.checked = false;
                    if(targetVectorToggle) targetVectorToggle.checked = false;
                    if(fpsToggle) fpsToggle.checked = false;
                    if(godModeToggle) godModeToggle.checked = false;
                    if(hidePlayerToggle) hidePlayerToggle.checked = false;
                    
                    document.getElementById('debug-fps-panel').style.display = 'none';
                    
                    showNotification({name: "GELİŞTİRİCİ MODU KAPALI", type:{color:'#fff'}}, "");
                }
            }
        });
    }

    if (gravityToggle) {
        gravityToggle.addEventListener('change', (e) => window.gameSettings.showGravityFields = e.target.checked);
    }
    
    if (hitboxToggle) {
        hitboxToggle.addEventListener('change', (e) => window.gameSettings.showHitboxes = e.target.checked);
    }

    if (vectorToggle) {
        vectorToggle.addEventListener('change', (e) => window.gameSettings.showVectors = e.target.checked);
    }

    if (targetVectorToggle) {
        targetVectorToggle.addEventListener('change', (e) => window.gameSettings.showTargetVectors = e.target.checked);
    }

    if (fpsToggle) {
        fpsToggle.addEventListener('change', (e) => {
            window.gameSettings.showFps = e.target.checked;
            document.getElementById('debug-fps-panel').style.display = e.target.checked ? 'block' : 'none';
        });
    }

    if (godModeToggle) {
        godModeToggle.addEventListener('change', (e) => {
            window.gameSettings.godMode = e.target.checked;
            if(window.gameSettings.godMode) {
                showNotification({name: "ÖLÜMSÜZLÜK AKTİF", type:{color:'#10b981'}}, "");
            } else {
                showNotification({name: "ÖLÜMSÜZLÜK KAPALI", type:{color:'#ef4444'}}, "");
            }
        });
    }

    if (hidePlayerToggle) {
        hidePlayerToggle.addEventListener('change', (e) => {
            window.gameSettings.hidePlayer = e.target.checked;
        });
    }

    // --- AKILLI SLIDER YÖNETİMİ ---
    const smartSliders = document.querySelectorAll('.smart-slider');
    
    smartSliders.forEach(slider => {
        slider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            const id = e.target.id;

            if (id === 'vol-hud-opacity') {
                const opacity = val / 100;
                window.gameSettings.hudOpacity = opacity;
                const disp = document.getElementById('val-hud-opacity');
                if(disp) disp.innerText = val + '%';
                
                hudElements.forEach(el => {
                    if (window.gameSettings.hudHoverEffect && el.matches(':hover')) el.style.opacity = '1';
                    else el.style.opacity = opacity;
                });
            } 
            else if (id === 'cam-offset-x') {
                window.gameSettings.cameraOffsetX = val;
                const disp = document.getElementById('val-cam-x');
                if(disp) disp.innerText = Math.round(val);
            }
            else if (id === 'cam-offset-y') {
                window.gameSettings.cameraOffsetY = val;
                const disp = document.getElementById('val-cam-y');
                if(disp) disp.innerText = Math.round(val);
            }
            else if (id === 'vol-music') {
                const disp = document.getElementById('val-m');
                if(disp) disp.innerText = val + '%';
                
                // Müzik sesi değişimini Audio Manager üzerinden yap
                if (typeof audio !== 'undefined' && audio.updateMusicVolume) {
                    audio.updateMusicVolume(val / 100);
                }
            }
            else if (id === 'vol-sfx') {
                const disp = document.getElementById('val-s');
                if(disp) disp.innerText = val + '%';
                window.volSFX = val / 100;
            }
        });

        slider.addEventListener('dblclick', () => {
            const defaultVal = slider.getAttribute('data-default');
            if (defaultVal !== null) {
                slider.value = defaultVal;
                slider.dispatchEvent(new Event('input')); 
            }
        });

        slider.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = Math.sign(e.deltaY) * -1;
            let step = 5;
            if (slider.id.includes('cam')) step = 10;
            
            let currentVal = parseFloat(slider.value);
            let newVal = currentVal + (delta * step);
            
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            newVal = Math.max(min, Math.min(max, newVal));
            
            slider.value = newVal;
            slider.dispatchEvent(new Event('input'));
        }, { passive: false });
    });
}

function toggleSettings() {
    const panel = document.getElementById('settings-panel');
    if (!panel) return;
    
    settingsOpen = !settingsOpen;
    if (settingsOpen) {
        panel.classList.add('open');
    } else {
        panel.classList.remove('open');
    }
}

function openSettings() {
    settingsOpen = true;
    const panel = document.getElementById('settings-panel');
    if(panel) panel.classList.add('open');
}

function closeSettings() {
    settingsOpen = false;
    const panel = document.getElementById('settings-panel');
    if(panel) panel.classList.remove('open');
}

function switchSettingsTab(tabName) {
    document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.settings-content').forEach(c => c.classList.remove('active'));
    
    const btnId = 'tab-btn-' + tabName;
    const contentId = 'set-tab-' + tabName;
    
    const btn = document.getElementById(btnId);
    const content = document.getElementById(contentId);
    
    if (btn) btn.classList.add('active');
    if (content) content.classList.add('active');
}

// --- GELİŞTİRİCİ FONKSİYONLAR ---
window.devAddResources = function() {
    if(typeof playerData !== 'undefined') {
        playerData.stardust += 1000;
        playerData.stats.totalStardust += 1000;
        if(typeof audio !== 'undefined' && audio) audio.playCash();
        if(typeof player !== 'undefined' && player.updateUI) player.updateUI();
        if(typeof updateInventoryCount === 'function') updateInventoryCount();
        if(typeof renderMarket === 'function') renderMarket();
        if(typeof renderUpgrades === 'function') renderUpgrades();
        showNotification({name: "DEV: +1000 KRİSTAL EKLENDİ", type:{color:'#fbbf24'}}, "");
    }
};

window.devLevelUp = function() {
    if(typeof player !== 'undefined') {
        player.gainXp(player.maxXp);
    }
};