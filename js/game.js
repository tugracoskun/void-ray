// Path: js/game.js

/**
 * Void Ray - Oyun Motoru ve Durum Yönetimi
 */

// -------------------------------------------------------------------------
// GLOBAL DEĞİŞKENLER VE OYUN DURUMU
// -------------------------------------------------------------------------

var player; 
var echoRay = null;
var nexus = null;
var repairStation = null;
var storageCenter = null;
var particleSystem = null; 
var entityManager = null; 
var audio; 

// KAMERA HEDEFLERİ
window.cameraTarget = null; // Mantıksal hedef (Gemi veya Yankı)
window.cameraFocus = { x: 0, y: 0 }; // Görsel odak noktası (Yumuşak geçiş için)

// KAMERA GEÇİŞ DURUMU (YENİ)
let lastCameraTarget = null;
let isCameraTransitioning = false;

// OYUN AYARLARI
// data.js dosyasındaki DEFAULT_GAME_SETTINGS üzerinden ilklendirilir.
window.gameSettings = Object.assign({}, DEFAULT_GAME_SETTINGS);

let currentRenderOffsetX = 0;
let currentRenderOffsetY = 0;

let playerData = { 
    stardust: 0, 
    upgrades: { 
        playerSpeed: 0, 
        playerTurn: 0, 
        playerMagnet: 0, 
        playerCapacity: 0,
        echoSpeed: 0, 
        echoRange: 0, 
        echoDurability: 0,
        echoCapacity: 0
    },
    stats: { 
        maxSpeed: 0, 
        echoMaxSpeed: 0, 
        totalResources: 0, 
        distance: 0, 
        totalStardust: 0,
        totalSpentStardust: 0,
        totalEnergySpent: 0,
        timeIdle: 0,
        timeMoving: 0,
        timeAI: 0
    }
};

let currentZoom = 1.0, targetZoom = 1.0;
let isPaused = false;
let animationId = null;
let manualTarget = null; 
let gameStartTime = 0;
let lastFrameTime = 0;
window.cinematicMode = false; 

let frameCount = 0;
let lastFpsTime = 0;

let isInSafeZone = false;

let canvas, ctx, mmCanvas, mmCtx, bmCanvas, bmCtx;
let width, height;

var planets = [], stars = []; 
let collectedItems = [];
let centralStorage = [];

let autopilot = false;
let aiMode = 'gather'; 
let echoDeathLevel = 0;
let lowEnergyWarned = false;

// -------------------------------------------------------------------------
// OYUN MEKANİKLERİ VE MANTIK
// -------------------------------------------------------------------------

function spawnEcho(x, y) { 
    echoRay = new EchoRay(x, y); 
    const wrapper = document.getElementById('echo-wrapper-el');
    if(wrapper) {
        wrapper.style.display = 'flex'; 
    }
    showNotification({name: "YANKI DOĞDU", type:{color:'#67e8f9'}}, ""); 
}

function addItemToInventory(planet) { 
    const currentCount = collectedItems.length;
    const capacity = getPlayerCapacity();

    if (currentCount >= capacity) {
        if (!autopilot) {
            showNotification({name: "ENVANTER DOLU! NEXUS VEYA DEPOYA GİDİN.", type:{color:'#ef4444'}}, "");
            if(audio) audio.playError(); // HATA SESİ
        }
        return false; 
    }

    collectedItems.push(planet); 
    playerData.stats.totalResources++; 
    updateInventoryCount(); 
    if(typeof inventoryOpen !== 'undefined' && inventoryOpen) renderInventory();
    return true; 
}

function setEchoMode(mode) {
    if(!echoRay) return;
    
    if (mode !== 'return') {
        echoRay.pendingMerge = false;
    }

    if (mode === 'roam' && echoRay.attached) { 
        echoRay.attached = false; 
        showNotification({name: "YANKI AYRILDI", type:{color:'#67e8f9'}}, ""); 
    }
    if (mode === 'return') echoRay.attached = false; 
    echoRay.mode = mode; 
    updateEchoDropdownUI();
}

function echoManualMerge() {
    if(!echoRay) return;
    // Utils güncellemesi:
    const dist = Utils.distEntity(player, echoRay);
    
    if (dist < 350) {
        if(audio) audio.playEvolve(); 
        echoRay.attached = true; 
        echoRay.mode = 'roam'; 
        echoRay.pendingMerge = false;

        showNotification({name: "SİSTEMLER BİRLEŞTİ", type:{color:'#67e8f9'}}, "Yankı deposuna erişilebilir.");
        updateEchoDropdownUI();
        
        // Eğer kamera Yankı'daysa, birleşince gemiye geri al
        if (window.cameraTarget === echoRay) {
            window.cameraTarget = player;
            showNotification({name: "KAMERA SIFIRLANDI", type:{color:'#38bdf8'}}, "Gemiye dönüldü.");
            // Göstergeyi kapat
            const indicator = document.getElementById('echo-vision-indicator');
            if(indicator) indicator.classList.remove('active');
        }
    } else { 
        showNotification({name: "YANKI BİRLEŞMEK İÇİN GELİYOR...", type:{color:'#fbbf24'}}, ""); 
        setEchoMode('return'); 
        echoRay.pendingMerge = true;
    }
}

function cycleAIMode() {
    if(!autopilot) {
        autopilot = true;
        aiMode = 'gather';
    } else {
        if (aiMode === 'gather') aiMode = 'base';
        else if (aiMode === 'base') autopilot = false;
        else aiMode = 'gather';
    }
    updateAIButton();
}

// -------------------------------------------------------------------------
// OYUN DÖNGÜSÜ VE BAŞLATMA
// -------------------------------------------------------------------------

function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    mmCanvas = document.getElementById('minimap-canvas');
    mmCtx = mmCanvas.getContext('2d');
    bmCanvas = document.getElementById('big-map-canvas');
    bmCtx = bmCanvas.getContext('2d'); 

    player = new VoidRay(); 
    window.cameraTarget = player; 
    window.cameraFocus = { x: player.x, y: player.y }; // Başlangıçta odak gemide
    lastCameraTarget = player; // Takip başlangıcı

    nexus = new Nexus(); 
    repairStation = new RepairStation(); 
    storageCenter = new StorageCenter(); 
    particleSystem = new ParticleSystem(); 
    entityManager = new EntityManager(); 
    audio = new ZenAudio();
    
    gameStartTime = Date.now(); 
    lastFrameTime = Date.now(); 
    
    // Utils güncellemesi:
    const startSafeDist = Utils.distEntity(player, nexus);
    isInSafeZone = startSafeDist < 1500;

    // --- SES BAŞLATMA (YUMUŞAK GİRİŞ) ---
    // Eğer güvenli bölgedeysek 'base', değilse 'space'
    if (audio) {
        audio.init();
        if (isInSafeZone) audio.playTheme('base');
        else audio.playTheme('space');
    }

    entityManager.init();
    
    // --- BAŞARIM SİSTEMİNİ BAŞLAT (YENİ) ---
    if (typeof AchievementManager !== 'undefined') {
        AchievementManager.init();
    }

    // --- KAYIT YÖNETİCİSİNİ BAŞLAT ---
    if (typeof SaveManager !== 'undefined') {
        SaveManager.init();
        // Load sonrası UI'ı bir kez daha güncellemekte fayda var
        updateInventoryCount();
        player.updateUI();
    } else {
        console.warn("SaveManager bulunamadı!");
        player.updateUI(); 
        updateInventoryCount(); 
    }

    isPaused = false;
    startTipsCycle();
    
    if (bmCanvas && typeof initMapListeners === 'function') {
        initMapListeners(bmCanvas, WORLD_SIZE, (worldX, worldY) => {
            manualTarget = {x: worldX, y: worldY};
            autopilot = true;
            aiMode = 'travel';
            const aiToggle = document.getElementById('btn-ai-toggle');
            if(aiToggle) aiToggle.classList.add('active');
            updateAIButton();
            showNotification({name: "ROTA OLUŞTURULDU", type:{color:'#fff'}}, "");
        });
    }

    currentZoom = 0.2; 
    targetZoom = 1.0;  
    window.cinematicMode = true; 

    addChatMessage("Sistem başlatılıyor...", "system", "genel");
    setTimeout(() => addChatMessage("Optik sensörler kalibre ediliyor...", "info", "genel"), 1000);
    setTimeout(() => addChatMessage("Hoş geldin, Pilot. Motorlar aktif.", "loot", "genel"), 3500);

    if (typeof initContextSystem === 'function') {
        initContextSystem();
    }

    resize();
    window.addEventListener('resize', resize);
}

function startLoop() {
    if(animationId) cancelAnimationFrame(animationId);
    loop();
}

/**
 * Ekrana parazit (karıncalanma) efekti çizer.
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} w - Ekran genişliği
 * @param {number} h - Ekran yüksekliği
 * @param {number} intensity - Yoğunluk (0.0 ile 1.0 arası)
 */
function drawStaticNoise(ctx, w, h, intensity) {
    ctx.save();
    
    // 1. Genel parazit (Rastgele şeritler)
    const count = 20 * intensity; // Yoğunluğa göre şerit sayısı
    
    for (let i = 0; i < count; i++) {
        const y = Math.random() * h;
        const height = Math.random() * 20 + 2;
        // Beyaz/Gri şeritler
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3 * intensity})`;
        ctx.fillRect(0, y, w, height);
    }

    // 2. Rastgele bloklar (Dijital bozulma/Glitch)
    const blockCount = 50 * intensity;
    for (let i = 0; i < blockCount; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const size = Math.random() * 50 + 10;
        // Açık gri bloklar
        ctx.fillStyle = `rgba(200, 200, 200, ${Math.random() * 0.4 * intensity})`;
        ctx.fillRect(x, y, size, size/4);
    }
    
    // 3. Renk kanalı kayması efekti (Kritik seviyede kırmızımsı)
    if (intensity > 0.5) {
        ctx.fillStyle = `rgba(255, 0, 0, ${0.1 * intensity})`;
        ctx.fillRect(Math.random() * 10 - 5, 0, w, h);
    }

    // 4. Uyarı Yazısı (Nadir yanıp sönme)
    if (intensity > 0.4 && Math.random() < 0.1) {
        ctx.fillStyle = `rgba(239, 68, 68, ${intensity})`;
        ctx.font = "bold 20px monospace";
        ctx.textAlign = "center";
        ctx.shadowBlur = 5;
        ctx.shadowColor = "red";
        ctx.fillText("⚠ SİNYAL ZAYIF ⚠", w/2, h/2 - 50);
    }

    ctx.restore();
}

function loop() {
    if(!isPaused && ctx) {
        const now = Date.now();
        const dt = now - lastFrameTime;
        lastFrameTime = now;

        frameCount++;
        if (now - lastFpsTime >= 1000) {
            if (window.gameSettings.showFps) {
                const fps = Math.round((frameCount * 1000) / (now - lastFpsTime));
                document.getElementById('debug-fps-val').innerText = fps;
                const objCount = (entityManager ? entityManager.planets.length : 0) + particleSystem.count + (entityManager ? entityManager.stars.length : 0);
                document.getElementById('debug-obj-val').innerText = objCount;
            }
            frameCount = 0;
            lastFpsTime = now;
        }

        let zoomSpeed = 0.1;
        if (window.cinematicMode) {
            zoomSpeed = 0.02;
            if (Math.abs(targetZoom - currentZoom) < 0.01) {
                window.cinematicMode = false;
            }
        }
        currentZoom += (targetZoom - currentZoom) * zoomSpeed;

        player.update(dt);
        if(echoRay) {
            echoRay.update(); 
            if (echoRay.mode === 'return' && echoRay.pendingMerge) {
                 // Utils güncellemesi:
                 const dist = Utils.distEntity(player, echoRay);
                 if (dist < 300) echoManualMerge();
            }
        }
        nexus.update();
        repairStation.update();
        storageCenter.update();

        // --- KAMERA HEDEFİ GÜVENLİK KONTROLÜ ---
        if (!window.cameraTarget) {
            window.cameraTarget = player;
            lastCameraTarget = player;
        }
        
        // Eğer hedef Yankı ise ve Yankı yoksa/yok olduysa kamerayı gemiye al
        if (window.cameraTarget === echoRay && !echoRay) {
            window.cameraTarget = player;
            showNotification({name: "SİNYAL KAYBI", type:{color:'#ef4444'}}, "Kamera Vatoz'a döndü.");
            // Göstergeyi kapat
            const indicator = document.getElementById('echo-vision-indicator');
            if(indicator) indicator.classList.remove('active');
        }

        // --- GÜVENLİ BÖLGE VE MÜZİK GEÇİŞ MANTIĞI ---
        const SAFE_ZONE_R = 1500;
        // Utils güncellemesi:
        const distToNexusSafe = Utils.distEntity(player, nexus);
        
        if (distToNexusSafe < SAFE_ZONE_R) {
            // Eğer daha önce güvenli bölgede değilsek, şimdi girdik
            if (!isInSafeZone) {
                isInSafeZone = true;
                showNotification({name: "GÜVENLİ BÖLGEYE VARILDI", type:{color:'#38bdf8'}}, "Nexus Koruma Alanı");
                // Müzik: Soft geçiş ile Base
                if(audio) audio.playTheme('base');
            }
        } else {
            // Eğer daha önce güvenli bölgedeysek, şimdi çıktık
            if (isInSafeZone) {
                isInSafeZone = false;
                showNotification({name: "GÜVENLİ BÖLGEDEN AYRILDINIZ", type:{color:'#fbbf24'}}, "Dikkatli Olun");
                // Müzik: Soft geçiş ile Space
                if(audio) audio.playTheme('space');
            }
        }

        if(autopilot) {
            playerData.stats.timeAI += dt;
        }

        // --- PENCERE GÜNCELLEMELERİ ---
        // Profil penceresi açıksa her karede (veya belli aralıklarla) güncelle
        if(typeof profileOpen !== 'undefined' && profileOpen) {
            // Performans için her frame yerine her 5 frame'de bir güncellenebilir ama
            // metin güncellemeleri çok ağır değil, akıcılık için her frame çağırıyoruz.
            renderProfile();
        }

        if(typeof statsOpen !== 'undefined' && statsOpen) renderStats();
        if(typeof contextOpen !== 'undefined' && contextOpen) renderContext();

        if (entityManager) {
            entityManager.update(dt);
        }

        if (keys.Escape) { 
            if (typeof inventoryOpen !== 'undefined' && inventoryOpen) closeInventory();
            else if (typeof echoInvOpen !== 'undefined' && echoInvOpen) closeEchoInventory();
            else if (typeof nexusOpen !== 'undefined' && nexusOpen) exitNexus();
            else if (typeof storageOpen !== 'undefined' && storageOpen) closeStorage(); 
            else if (typeof mapOpen !== 'undefined' && mapOpen) closeMap();
            else if (typeof statsOpen !== 'undefined' && statsOpen) closeStats();
            else if (typeof settingsOpen !== 'undefined' && settingsOpen) closeSettings();
            else if (typeof contextOpen !== 'undefined' && contextOpen) closeContext(); 
            
            // YENİ: Profil penceresi kapatma
            else if (typeof profileOpen !== 'undefined' && profileOpen) closeProfile();

            else togglePause();
            keys.Escape = false;
        }

        ctx.fillStyle = "#020617"; ctx.fillRect(0,0,width,height);
        
        // ... (Çizim kodlarının geri kalanı aynı)
        
        if (entityManager) {
            entityManager.drawStars(ctx, width, height, window.cameraFocus || window.cameraTarget);
        }
        
        ctx.save(); 
        
        let targetOffsetX = window.gameSettings.cameraOffsetX;
        let targetOffsetY = window.gameSettings.cameraOffsetY;

        if (window.gameSettings.adaptiveCamera) {
            const lookAheadFactor = 30; 
            const maxAdaptiveOffset = 400; 
            
            targetOffsetX = -window.cameraTarget.vx * lookAheadFactor;
            targetOffsetY = -window.cameraTarget.vy * lookAheadFactor;
            
            targetOffsetX = Math.max(-maxAdaptiveOffset, Math.min(maxAdaptiveOffset, targetOffsetX));
            targetOffsetY = Math.max(-maxAdaptiveOffset, Math.min(maxAdaptiveOffset, targetOffsetY));
        }

        currentRenderOffsetX += (targetOffsetX - currentRenderOffsetX) * 0.05;
        currentRenderOffsetY += (targetOffsetY - currentRenderOffsetY) * 0.05;

        ctx.translate(width/2 + currentRenderOffsetX, height/2 + currentRenderOffsetY); 
        ctx.scale(currentZoom, currentZoom); 
        
        if (window.cameraTarget !== lastCameraTarget) {
            isCameraTransitioning = true;
            lastCameraTarget = window.cameraTarget;
        }

        if (!window.cameraFocus) window.cameraFocus = { x: window.cameraTarget.x, y: window.cameraTarget.y };

        if (!window.gameSettings.smoothCameraTransitions) {
            window.cameraFocus.x = window.cameraTarget.x;
            window.cameraFocus.y = window.cameraTarget.y;
            isCameraTransitioning = false;
        } else {
            // Utils güncellemesi:
            const distCam = Utils.distEntity(window.cameraTarget, window.cameraFocus);
            
            if (distCam > 5000) {
                window.cameraFocus.x = window.cameraTarget.x;
                window.cameraFocus.y = window.cameraTarget.y;
                isCameraTransitioning = false; 
            } else if (isCameraTransitioning) {
                const lerpSpeed = 0.08; 
                window.cameraFocus.x += (window.cameraTarget.x - window.cameraFocus.x) * lerpSpeed;
                window.cameraFocus.y += (window.cameraTarget.y - window.cameraFocus.y) * lerpSpeed;
                
                if (distCam < 50) {
                    isCameraTransitioning = false; 
                }
            } else {
                const lerpSpeed = 0.9; 
                window.cameraFocus.x += (window.cameraTarget.x - window.cameraFocus.x) * lerpSpeed;
                window.cameraFocus.y += (window.cameraTarget.y - window.cameraFocus.y) * lerpSpeed;
            }
        }

        ctx.translate(-window.cameraFocus.x, -window.cameraFocus.y);
        
        if (entityManager) {
            entityManager.drawPlanets(ctx, player, echoRay, width, height, currentZoom);
        }

        ctx.save();
        ctx.translate(nexus.x, nexus.y);
        ctx.rotate(Date.now() * 0.0001);
        ctx.beginPath();
        ctx.arc(0, 0, SAFE_ZONE_R, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(56, 189, 248, 0.1)"; 
        ctx.lineWidth = 20;
        ctx.setLineDash([100, 100]); 
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, SAFE_ZONE_R - 50, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(56, 189, 248, 0.05)";
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.stroke();
        ctx.restore();

        nexus.draw(ctx);
        repairStation.draw(ctx); 
        storageCenter.draw(ctx); 
        
        particleSystem.update();
        particleSystem.draw(ctx);
        
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(16, 185, 129, 0.2)"; 
        ctx.beginPath(); ctx.arc(player.x, player.y, player.scanRadius, 0, Math.PI*2); ctx.stroke();
        
        ctx.strokeStyle = "rgba(245, 158, 11, 0.15)"; 
        ctx.beginPath(); ctx.arc(player.x, player.y, player.radarRadius, 0, Math.PI*2); ctx.stroke();

        if(echoRay) {
            ctx.strokeStyle = "rgba(16, 185, 129, 0.2)"; ctx.beginPath(); ctx.arc(echoRay.x, echoRay.y, echoRay.scanRadius, 0, Math.PI*2); ctx.stroke();
            ctx.strokeStyle = "rgba(245, 158, 11, 0.15)"; ctx.beginPath(); ctx.arc(echoRay.x, echoRay.y, echoRay.radarRadius, 0, Math.PI*2); ctx.stroke();
            
            if (echoRay.mode === 'return') {
                // Utils güncellemesi:
                const distToEcho = Utils.distEntity(player, echoRay);
                let lineAlpha = 0.4;
                if (distToEcho < player.scanRadius) {
                    lineAlpha = Math.max(0, (distToEcho / player.scanRadius) * 0.4);
                }

                if (lineAlpha > 0.05) { 
                    ctx.beginPath();
                    ctx.moveTo(echoRay.x, echoRay.y);
                    ctx.lineTo(player.x, player.y);
                    ctx.strokeStyle = MAP_CONFIG.colors.echo; 
                    ctx.lineWidth = 2;
                    ctx.setLineDash([15, 10]); 
                    ctx.lineDashOffset = -Date.now() / 50; 
                    ctx.globalAlpha = lineAlpha;
                    ctx.stroke();
                    ctx.globalAlpha = 1.0;
                    ctx.setLineDash([]);
                    ctx.lineDashOffset = 0;
                }
            }
        }

        if(echoRay) echoRay.draw(ctx);
        player.draw(ctx); ctx.restore();
        
        if (window.cameraTarget === echoRay && echoRay && !echoRay.attached) {
            // Utils güncellemesi:
            const dist = Utils.distEntity(player, echoRay);
            const maxRange = player.radarRadius; 
            const interferenceStart = maxRange * 0.6; 

            if (dist > maxRange) {
                window.cameraTarget = player;
                showNotification({name: "SİNYAL KAYBI: MENZİL DIŞI", type:{color:'#ef4444'}}, "Kamera Vatoz'a döndü.");
                if(audio) audio.playError();
                const indicator = document.getElementById('echo-vision-indicator');
                if(indicator) indicator.classList.remove('active');
            } else if (dist > interferenceStart) {
                const intensity = (dist - interferenceStart) / (maxRange - interferenceStart);
                drawStaticNoise(ctx, width, height, intensity);
            }
        }

        const promptEl = document.getElementById('merge-prompt');
        if (promptEl) {
            // Utils güncellemesi:
            const distNexus = Utils.distEntity(player, nexus);
            const distStorage = Utils.distEntity(player, storageCenter);
            
            let isNexusOpen = (typeof nexusOpen !== 'undefined' && nexusOpen);
            let isStorageOpen = (typeof storageOpen !== 'undefined' && storageOpen);
            let isMapOpen = (typeof mapOpen !== 'undefined' && mapOpen);

            let showNexusPrompt = (distNexus < nexus.radius + 200) && !isNexusOpen;
            let showStoragePrompt = (distStorage < storageCenter.radius + 200) && !isStorageOpen;
            let showEchoMergePrompt = false;

            if (echoRay && !isMapOpen) {
                 // Utils güncellemesi:
                 const distEcho = Utils.distEntity(player, echoRay);
                 if (!echoRay.attached && distEcho < 300) {
                     showEchoMergePrompt = true;
                 }
            }

            let activePrompts = [];

            if (showNexusPrompt) {
                activePrompts.push("[E] NEXUS'A GİRİŞ YAP");
                if (keys.e && document.activeElement !== document.getElementById('chat-input')) {
                     enterNexus(); keys.e = false;
                }
            } else if (showStoragePrompt) {
                activePrompts.push("[E] DEPO YÖNETİMİ");
                if (keys.e && document.activeElement !== document.getElementById('chat-input')) {
                     openStorage(); keys.e = false;
                }
            }

            if (showEchoMergePrompt) {
                activePrompts.push("[F] BİRLEŞ");
                if (keys.f && document.activeElement !== document.getElementById('chat-input')) {
                     echoManualMerge(); keys.f = false;
                }
            }
            
            if (echoRay && echoRay.attached) {
                if (keys.f && document.activeElement !== document.getElementById('chat-input')) {
                     echoRay.attached = false; 
                     echoRay.mode = 'roam'; 
                     updateEchoDropdownUI(); 
                     keys.f = false; 
                     showNotification({name: "YANKI AYRILDI", type:{color:'#67e8f9'}}, "");
                }
            }

            if (activePrompts.length > 0) {
                promptEl.innerHTML = activePrompts.join('<br>');
                promptEl.className = 'visible';
            } else {
                promptEl.className = '';
                promptEl.innerHTML = '';
            }
        }

        const navOrigin = window.cameraFocus || window.cameraTarget;

        if(echoRay && !echoRay.attached && window.gameSettings.showEchoArrow && window.cameraTarget !== echoRay) {
            drawTargetIndicator(ctx, navOrigin, {width, height, zoom: currentZoom}, echoRay, MAP_CONFIG.colors.echo);
        }

        if (window.cameraTarget === echoRay && echoRay && !echoRay.attached) {
             drawTargetIndicator(ctx, navOrigin, {width, height, zoom: currentZoom}, player, MAP_CONFIG.colors.player);
        }

        if (window.gameSettings.showNexusArrow) {
            drawTargetIndicator(ctx, navOrigin, {width, height, zoom: currentZoom}, nexus, MAP_CONFIG.colors.nexus);
        }
        
        if (window.gameSettings.showRepairArrow) {
            drawTargetIndicator(ctx, navOrigin, {width, height, zoom: currentZoom}, repairStation, MAP_CONFIG.colors.repair);
        }
        
        if (window.gameSettings.showStorageArrow) {
            drawTargetIndicator(ctx, navOrigin, {width, height, zoom: currentZoom}, storageCenter, MAP_CONFIG.colors.storage);
        }

        const entities = { player, echoRay, nexus, repairStation, storageCenter, planets: (entityManager ? entityManager.planets : []) };
        const state = { manualTarget };
        
        drawMiniMap(mmCtx, entities, state, navOrigin, window.cameraTarget);
        
        if(typeof mapOpen !== 'undefined' && mapOpen) drawBigMap(bmCtx, bmCanvas, WORLD_SIZE, entities, state);

    } 
    animationId = requestAnimationFrame(loop);
}

function togglePause() { isPaused = true; const el=document.getElementById('pause-overlay'); if(el) el.classList.add('active'); }
function resumeGame() { isPaused = false; const el=document.getElementById('pause-overlay'); if(el) el.classList.remove('active'); }
function quitToMain() { 
    const pEl = document.getElementById('pause-overlay'); if(pEl) pEl.classList.remove('active');
    const dEl = document.getElementById('death-screen'); if(dEl) dEl.classList.remove('active');
    const mEl = document.getElementById('main-menu'); if(mEl) mEl.classList.remove('menu-hidden');
    isPaused = true; 
    if(animationId) cancelAnimationFrame(animationId); 
}

function resize() { 
    if (!canvas) return;
    width = window.innerWidth; 
    height = window.innerHeight; 
    canvas.width = width; 
    canvas.height = height; 
    
    if(mmCanvas) { mmCanvas.width = 180; mmCanvas.height = 180; }
    if(bmCanvas) { bmCanvas.width = window.innerWidth; bmCanvas.height = window.innerHeight; }
}