/**
 * Void Ray - Pencere: Ayarlar
 * * Oyun ayarlarını, ses kontrollerini ve görünüm tercihlerini yönetir.
 * * game.js, ui.js ve audio.js içindeki dağınık ayar mantığı burada toplanmıştır.
 */

let settingsOpen = false;

// Global Ayar Nesnesi (game.js tarafından kullanılır)
if (!window.gameSettings) {
    window.gameSettings = {
        showNexusArrow: true,
        showRepairArrow: false,
        showStorageArrow: false,
        hudOpacity: 1.0,
        hudHoverEffect: false,
        cameraOffsetX: 0, 
        cameraOffsetY: 0,
        adaptiveCamera: false 
    };
}

function initSettings() {
    console.log("Ayarlar paneli başlatılıyor...");
    
    // Panel Açma/Kapama Butonu
    const btnSettings = document.getElementById('btn-settings');
    if (btnSettings) {
        // Eski event listener'ları temizlemek için cloneNode (opsiyonel, ama güvenli)
        const newBtn = btnSettings.cloneNode(true);
        btnSettings.parentNode.replaceChild(newBtn, btnSettings);
        
        newBtn.addEventListener('click', toggleSettings);
    }

    // Toggle Switch Elementleri
    const nexusToggle = document.getElementById('toggle-nexus-arrow');
    const repairToggle = document.getElementById('toggle-repair-arrow');
    const storageToggle = document.getElementById('toggle-storage-arrow');
    const hudHoverToggle = document.getElementById('toggle-hud-hover');
    const adaptiveCamToggle = document.getElementById('toggle-adaptive-cam');
    
    // UI Kontrol Alanları
    const manualCamControls = document.getElementById('manual-camera-controls');
    const camXInput = document.getElementById('cam-offset-x');
    const camYInput = document.getElementById('cam-offset-y');

    // Etkilenecek HUD Elementleri
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

    // --- TOGGLE EVENT LİSTENERS ---
    if (nexusToggle) nexusToggle.addEventListener('change', (e) => window.gameSettings.showNexusArrow = e.target.checked);
    if (repairToggle) repairToggle.addEventListener('change', (e) => window.gameSettings.showRepairArrow = e.target.checked);
    if (storageToggle) storageToggle.addEventListener('change', (e) => window.gameSettings.showStorageArrow = e.target.checked);

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

    // --- AKILLI SLIDER YÖNETİMİ ---
    const smartSliders = document.querySelectorAll('.smart-slider');
    
    smartSliders.forEach(slider => {
        // 1. Değişiklik Dinleyicisi
        slider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            const id = e.target.id;

            // ID'ye göre işlem yap
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
                
                // Audio Global Değişkenini Güncelle (audio.js)
                if (typeof volMusic !== 'undefined') {
                    // Global değişkene yaz (audio.js okuyacak)
                    // Not: Bu değişkeni audio.js içinde 'let' yerine 'var' veya window objesine atamak gerekebilir
                    // Ama JS modül yapımızda global scope paylaşılıyor.
                    // En doğrusu audio instance üzerinden gitmek ama global değişken kullanılıyor.
                    if(audio && audio.bgMusic) audio.bgMusic.volume = val / 100;
                    // audio.js içindeki global değişkene erişim için global scope varsayıyoruz
                    window.volMusic = val / 100; 
                }
            }
            else if (id === 'vol-sfx') {
                const disp = document.getElementById('val-s');
                if(disp) disp.innerText = val + '%';
                window.volSFX = val / 100;
            }
        });

        // 2. Çift Tıklama ile Sıfırlama
        slider.addEventListener('dblclick', () => {
            const defaultVal = slider.getAttribute('data-default');
            if (defaultVal !== null) {
                slider.value = defaultVal;
                slider.dispatchEvent(new Event('input')); // Değişikliği uygula
            }
        });

        // 3. Mouse Tekerleği ile Kontrol
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

/**
 * Ayarlar içindeki sekmeler arası geçiş (Oyun, Görünüm, Ses)
 */
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