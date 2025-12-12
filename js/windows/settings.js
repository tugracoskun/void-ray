/**
 * Void Ray - Pencere: Ayarlar
 * * Oyun ayarlarını, ses kontrollerini ve görünüm tercihlerini yönetir.
 * * GÜNCELLEME: Tema rengi (Hue) ve Doygunluğu (Sat) gemiye doğru şekilde aktarılır.
 * * GÜNCELLEME: Izgara ve Yıldız Parlaklığı ayarları eklendi. (Eski yıldız toggle'ı kaldırıldı)
 */

let settingsOpen = false;

// Global Ayar Nesnesi
if (!window.gameSettings) {
    window.gameSettings = typeof DEFAULT_GAME_SETTINGS !== 'undefined' ? Object.assign({}, DEFAULT_GAME_SETTINGS) : {};
}

// Eksik ayarları tamamla (Geriye dönük uyumluluk)
if (typeof window.gameSettings.windowOpacity === 'undefined') window.gameSettings.windowOpacity = 1.0;
if (typeof window.gameSettings.crtIntensity === 'undefined') window.gameSettings.crtIntensity = 50;
if (typeof window.gameSettings.themeColor === 'undefined') window.gameSettings.themeColor = '#94d8c3';
if (typeof window.gameSettings.themeHue === 'undefined') window.gameSettings.themeHue = 162;
if (typeof window.gameSettings.themeSat === 'undefined') window.gameSettings.themeSat = 47;
if (typeof window.gameSettings.showGrid === 'undefined') window.gameSettings.showGrid = true;
if (typeof window.gameSettings.starBrightness === 'undefined') window.gameSettings.starBrightness = 100;

function initSettings() {
    console.log("Ayarlar paneli başlatılıyor...");
    
    // --- BAŞLANGIÇ TEMASINI UYGULA (Gemi rengi için kritik) ---
    const startColor = window.gameSettings.themeColor || '#94d8c3';
    setGameTheme(startColor, true); 

    const btnSettings = document.getElementById('btn-settings');
    if (btnSettings) {
        const newBtn = btnSettings.cloneNode(true);
        btnSettings.parentNode.replaceChild(newBtn, btnSettings);
        newBtn.addEventListener('click', toggleSettings);
    }

    // --- ELEMENT REFERANSLARI ---
    const nexusToggle = document.getElementById('toggle-nexus-arrow');
    const repairToggle = document.getElementById('toggle-repair-arrow');
    const storageToggle = document.getElementById('toggle-storage-arrow');
    const echoToggle = document.getElementById('toggle-echo-arrow');
    const hudHoverToggle = document.getElementById('toggle-hud-hover');
    
    const shipBarsToggle = document.getElementById('toggle-ship-bars');
    const consoleToggle = document.getElementById('toggle-console'); 
    
    const adaptiveCamToggle = document.getElementById('toggle-adaptive-cam');
    const smoothCamToggle = document.getElementById('toggle-smooth-cam');
    
    const crtToggle = document.getElementById('toggle-crt');
    const crtIntensityWrapper = document.getElementById('crt-intensity-wrapper');
    const gridToggle = document.getElementById('toggle-grid'); // YENİ
    
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

    // --- OPAK KONTROLÜ İÇİN YAPI ---
    const hudSelectors = ['.hud-icon-group', '#xp-container', '#speedometer', '#minimap-wrapper', '#btn-settings', '#merge-prompt', '#echo-vision-indicator'];
    
    const windowDefinitions = [
        { id: '#chat-panel', targetClass: null },
        { id: '#settings-panel', targetClass: null },
        { id: '#inventory-overlay', targetClass: '.inv-window' },
        { id: '#stats-overlay', targetClass: '.stats-window' },
        { id: '#profile-overlay', targetClass: '.profile-window' },
        { id: '#context-overlay', targetClass: '.context-window' },
        { id: '#nexus-overlay', targetClass: '.nexus-window' },
        { id: '#storage-overlay', targetClass: '.nexus-window' },
        { id: '#echo-inventory-overlay', targetClass: '.nexus-window' },
        { id: '#achievements-overlay', targetClass: '.stats-window' }
    ];

    const hudElements = [];
    const windowTrackers = [];
    let windowObserver = null;

    const cacheElements = () => {
        hudElements.length = 0;
        windowTrackers.length = 0;

        hudSelectors.forEach(sel => {
            const el = document.querySelector(sel);
            if(el) {
                hudElements.push(el);
                el.style.transition = 'opacity 0.3s ease';
            }
        });

        windowDefinitions.forEach(def => {
            const triggerEl = document.querySelector(def.id);
            if (triggerEl) {
                const targetEl = def.targetClass ? triggerEl.querySelector(def.targetClass) : triggerEl;
                if (targetEl) {
                    targetEl.style.transition = 'opacity 0.3s ease';
                    windowTrackers.push({ trigger: triggerEl, target: targetEl });
                }
            }
        });

        if (windowObserver) windowObserver.disconnect();

        windowObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    const el = mutation.target;
                    const tracker = windowTrackers.find(t => t.trigger === el);
                    if (!tracker) return;

                    const isOpen = el.classList.contains('open') || el.classList.contains('active');
                    if (isOpen) {
                        tracker.target.style.opacity = window.gameSettings.windowOpacity;
                    } else {
                        tracker.target.style.opacity = '';
                    }
                }
            });
        });

        windowTrackers.forEach(t => {
            windowObserver.observe(t.trigger, { attributes: true, attributeFilter: ['class'] });
        });
    };

    cacheElements();

    const applyHoverLogic = (items, baseOpacity, isWindow = false) => {
        items.forEach(item => {
            const el = item.target || item;
            const trigger = item.trigger || item;

            if (isWindow) {
                const isOpen = trigger.classList.contains('open') || trigger.classList.contains('active');
                if (!isOpen) {
                    el.style.opacity = '';
                    return; 
                }
            }

            if (window.gameSettings.hudHoverEffect && el.matches(':hover')) {
                el.style.opacity = '1';
            } else {
                el.style.opacity = baseOpacity;
            }

            el.onmouseenter = () => {
                if (window.gameSettings.hudHoverEffect) el.style.opacity = '1';
            };
            el.onmouseleave = () => {
                if (isWindow) {
                     const isOpen = trigger.classList.contains('open') || trigger.classList.contains('active');
                     if(isOpen) el.style.opacity = baseOpacity;
                } else {
                     el.style.opacity = baseOpacity;
                }
            };
        });
    };

    // --- TEMA RENK SEÇİMİ ---
    const themeOpts = document.querySelectorAll('.theme-opt');
    themeOpts.forEach(opt => {
        opt.addEventListener('click', (e) => {
            const color = e.target.getAttribute('data-color');
            setGameTheme(color); 
            const picker = document.getElementById('custom-theme-picker');
            if (picker) picker.value = color;
        });
        
        // Başlangıçta seçili rengi işaretle
        if (opt.getAttribute('data-color') === startColor) {
            opt.style.borderColor = '#fff';
            opt.style.transform = 'scale(1.2)';
            opt.style.boxShadow = `0 0 10px ${startColor}`;
        }
    });

    const customPicker = document.getElementById('custom-theme-picker');
    if (customPicker) {
        customPicker.value = startColor;
        customPicker.addEventListener('input', (e) => {
            setGameTheme(e.target.value);
            document.querySelectorAll('.theme-opt').forEach(el => {
                el.style.borderColor = 'rgba(255,255,255,0.2)';
                el.style.transform = 'scale(1)';
                el.style.boxShadow = 'none';
            });
        });
    }

    // --- TOGGLE LISTENERLARI ---
    if (nexusToggle) nexusToggle.addEventListener('change', (e) => window.gameSettings.showNexusArrow = e.target.checked);
    if (repairToggle) repairToggle.addEventListener('change', (e) => window.gameSettings.showRepairArrow = e.target.checked);
    if (storageToggle) storageToggle.addEventListener('change', (e) => window.gameSettings.showStorageArrow = e.target.checked);
    if (echoToggle) echoToggle.addEventListener('change', (e) => window.gameSettings.showEchoArrow = e.target.checked);

    if (hudHoverToggle) {
        hudHoverToggle.addEventListener('change', (e) => {
            window.gameSettings.hudHoverEffect = e.target.checked;
            cacheElements();
            applyHoverLogic(hudElements, window.gameSettings.hudOpacity);
            applyHoverLogic(windowTrackers, window.gameSettings.windowOpacity, true);
        });
    }

    if (shipBarsToggle) shipBarsToggle.addEventListener('change', (e) => window.gameSettings.showShipBars = e.target.checked);

    if (consoleToggle) {
        consoleToggle.addEventListener('change', (e) => {
            window.gameSettings.enableConsole = e.target.checked;
            if(e.target.checked) showNotification({name: "KONSOL AKTİF", type:{color:'#fbbf24'}}, "Komutları kullanabilirsiniz.");
        });
    }

    // CRT
    const updateCRT = () => {
        const overlay = document.getElementById('crt-overlay');
        if (!overlay) return;
        
        if (window.gameSettings.enableCRT) {
            overlay.classList.add('active');
            overlay.style.opacity = window.gameSettings.crtIntensity / 100;
        } else {
            overlay.classList.remove('active');
            overlay.style.opacity = '';
        }
    };

    if (crtToggle) {
        crtToggle.addEventListener('change', (e) => {
            window.gameSettings.enableCRT = e.target.checked;
            if (crtIntensityWrapper) {
                crtIntensityWrapper.style.display = e.target.checked ? 'block' : 'none';
            }
            updateCRT();
        });
    }

    // GRID
    if (gridToggle) {
        gridToggle.addEventListener('change', (e) => {
            window.gameSettings.showGrid = e.target.checked;
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

    if (smoothCamToggle) smoothCamToggle.addEventListener('change', (e) => window.gameSettings.smoothCameraTransitions = e.target.checked);
    
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

    if (gravityToggle) gravityToggle.addEventListener('change', (e) => window.gameSettings.showGravityFields = e.target.checked);
    if (hitboxToggle) hitboxToggle.addEventListener('change', (e) => window.gameSettings.showHitboxes = e.target.checked);
    if (vectorToggle) vectorToggle.addEventListener('change', (e) => window.gameSettings.showVectors = e.target.checked);
    if (targetVectorToggle) targetVectorToggle.addEventListener('change', (e) => window.gameSettings.showTargetVectors = e.target.checked);

    if (fpsToggle) {
        fpsToggle.addEventListener('change', (e) => {
            window.gameSettings.showFps = e.target.checked;
            document.getElementById('debug-fps-panel').style.display = e.target.checked ? 'block' : 'none';
        });
    }

    if (godModeToggle) {
        godModeToggle.addEventListener('change', (e) => {
            window.gameSettings.godMode = e.target.checked;
            if(window.gameSettings.godMode) showNotification({name: "ÖLÜMSÜZLÜK AKTİF", type:{color:'#10b981'}}, "");
            else showNotification({name: "ÖLÜMSÜZLÜK KAPALI", type:{color:'#ef4444'}}, "");
        });
    }

    if (hidePlayerToggle) hidePlayerToggle.addEventListener('change', (e) => window.gameSettings.hidePlayer = e.target.checked);

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
                
                cacheElements();
                applyHoverLogic(hudElements, opacity);
            } 
            else if (id === 'vol-window-opacity') { 
                const opacity = val / 100;
                window.gameSettings.windowOpacity = opacity;
                const disp = document.getElementById('val-window-opacity');
                if(disp) disp.innerText = val + '%';
                
                cacheElements();
                applyHoverLogic(windowTrackers, opacity, true);
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
                if (typeof audio !== 'undefined' && audio.updateMusicVolume) {
                    audio.updateMusicVolume(val / 100);
                }
            }
            else if (id === 'vol-sfx') {
                const disp = document.getElementById('val-s');
                if(disp) disp.innerText = val + '%';
                window.volSFX = val / 100;
            }
            else if (id === 'vol-crt-intensity') {
                window.gameSettings.crtIntensity = val;
                const disp = document.getElementById('val-crt-intensity');
                if(disp) disp.innerText = val + '%';
                updateCRT();
            }
            else if (id === 'vol-star-bright') { // YENİ
                window.gameSettings.starBrightness = val;
                const disp = document.getElementById('val-star-bright');
                if(disp) disp.innerText = val + '%';
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

function setGameTheme(colorHex, silent = false) {
    if (!colorHex) return;
    
    // 1. Global Ayarları Güncelle
    window.gameSettings.themeColor = colorHex;

    // 2. CSS Değişkenlerini Güncelle
    document.documentElement.style.setProperty('--hud-color', colorHex);
    document.documentElement.style.setProperty('--ray-color', colorHex);
    
    if (typeof Utils !== 'undefined' && Utils.hexToRgba) {
        const dimColor = Utils.hexToRgba(colorHex, 0.3);
        document.documentElement.style.setProperty('--hud-color-dim', dimColor);
    }

    // 3. Global Ayarlara Hue VE Saturation Kaydet
    if (typeof Utils !== 'undefined' && Utils.hexToHSL) {
        const hsl = Utils.hexToHSL(colorHex);
        window.gameSettings.themeHue = hsl.h;
        window.gameSettings.themeSat = hsl.s; // YENİ: Saturation kaydediliyor
    }

    // 4. UI Güncellemesi
    const opts = document.querySelectorAll('.theme-opt');
    if (opts.length > 0) {
        opts.forEach(el => {
            const isActive = el.getAttribute('data-color') === colorHex;
            el.style.borderColor = isActive ? '#fff' : 'rgba(255,255,255,0.2)';
            el.style.transform = isActive ? 'scale(1.2)' : 'scale(1)';
            el.style.boxShadow = isActive ? `0 0 10px ${colorHex}` : 'none';
        });
    }
    
    if (!silent) {
        showNotification({name: "TEMA GÜNCELLENDİ", type:{color: colorHex}}, "");
    }
}

function toggleSettings() {
    const panel = document.getElementById('settings-panel');
    if (!panel) return;
    settingsOpen = !settingsOpen;
    if (settingsOpen) {
        panel.classList.add('open');
        if (typeof setHudButtonActive === 'function') setHudButtonActive('btn-settings', true);
    } else {
        panel.classList.remove('open');
        if (typeof setHudButtonActive === 'function') setHudButtonActive('btn-settings', false);
    }
}

function openSettings() {
    settingsOpen = true;
    const panel = document.getElementById('settings-panel');
    if(panel) {
        panel.classList.add('open');
        if (typeof setHudButtonActive === 'function') setHudButtonActive('btn-settings', true);
    }
}

function closeSettings() {
    settingsOpen = false;
    const panel = document.getElementById('settings-panel');
    if(panel) {
        panel.classList.remove('open');
        if (typeof setHudButtonActive === 'function') setHudButtonActive('btn-settings', false);
    }
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

// --- KAYIT YÖNETİMİ BUTON AKSİYONLARI ---

window.actionExportSave = function() {
    if (typeof SaveManager === 'undefined') return;
    SaveManager.exportSave();
};

window.actionImportSave = function() {
    if (typeof SaveManager === 'undefined') return;
    const code = prompt("Kayıt kodunu buraya yapıştırın:");
    if (code) {
        const result = SaveManager.importSave(code);
        if (result && result.startsWith("HATA")) {
            showNotification({name: "İÇE AKTARMA HATASI", type:{color:'#ef4444'}}, "Geçersiz kod.");
        }
    }
};

window.actionResetSave = function() {
    if (typeof SaveManager === 'undefined') return;
    if (confirm("DİKKAT: Tüm ilerlemeniz kalıcı olarak silinecek. Onaylıyor musunuz?")) {
        SaveManager.resetSave();
        location.reload();
    }
};

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