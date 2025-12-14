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

// KAMERA GEÇİŞ DURUMU
let lastCameraTarget = null;
let isCameraTransitioning = false;

// OYUN AYARLARI
window.gameSettings = Object.assign({}, DEFAULT_GAME_SETTINGS);

let currentRenderOffsetX = 0;
let currentRenderOffsetY = 0;

// OYUNCU VERİSİ
let playerData = JSON.parse(JSON.stringify(INITIAL_PLAYER_DATA));

// ZOOM
let currentZoom = GAME_CONFIG.CAMERA.DEFAULT_ZOOM; 
let targetZoom = GAME_CONFIG.CAMERA.DEFAULT_ZOOM;
let isPaused = false;
let animationId = null;

// --- DÜZELTME: Global AI Değişkenleri Proxy Olarak Tanımlandı ---
// Böylece ui.js ve controls.js değiştirilmeden çalışmaya devam eder.
// Arka planda AIManager ile senkronize olurlar.

Object.defineProperty(window, 'autopilot', {
    get: function() { return window.AIManager ? window.AIManager.active : false; },
    set: function(val) { 
        // Eğer true atanırsa ve aktif değilse toggle et
        if (val && window.AIManager && !window.AIManager.active) window.AIManager.toggle();
        // Eğer false atanırsa ve aktifse toggle et
        else if (!val && window.AIManager && window.AIManager.active) window.AIManager.toggle();
    }
});

Object.defineProperty(window, 'aiMode', {
    get: function() { return window.AIManager ? window.AIManager.mode : 'gather'; },
    set: function(val) { if (window.AIManager) window.AIManager.mode = val; }
});

Object.defineProperty(window, 'manualTarget', {
    get: function() { return window.AIManager ? window.AIManager.manualTarget : null; },
    set: function(val) { if (window.AIManager) window.AIManager.manualTarget = val; }
});

var echoDeathLevel = 0;
var lowEnergyWarned = false;
// --------------------------------------------------------------------

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

// -------------------------------------------------------------------------
// OYUN MEKANİKLERİ VE MANTIK
// -------------------------------------------------------------------------

function spawnEcho(x, y) { 
    echoRay = new EchoRay(x, y); 
    const wrapper = document.getElementById('echo-wrapper-el');
    if(wrapper) {
        wrapper.style.display = 'flex'; 
    }
    showNotification({name: MESSAGES.ECHO.SPAWN, type:{color: MAP_CONFIG.colors.echo}}, ""); 
}

function addItemToInventory(planet) { 
    // MANTIK: GameRules.isInventoryFull
    if (GameRules.isInventoryFull(collectedItems.length)) {
        if (!AIManager.active) { // AIManager kontrolü
            showNotification({name: MESSAGES.UI.INVENTORY_FULL, type:{color:'#ef4444'}}, "");
            if(audio) audio.playError();
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
        showNotification({name: MESSAGES.ECHO.DETACH, type:{color: MAP_CONFIG.colors.echo}}, ""); 
    }
    if (mode === 'return') echoRay.attached = false; 
    echoRay.mode = mode; 
    updateEchoDropdownUI();
}

function echoManualMerge() {
    if(!echoRay) return;
    const dist = Utils.distEntity(player, echoRay);
    
    // MANTIK: GameRules.canEchoMerge
    if (GameRules.canEchoMerge(dist)) {
        if(audio) audio.playEvolve(); 
        echoRay.attached = true; 
        echoRay.mode = 'roam'; 
        echoRay.pendingMerge = false;

        showNotification({name: MESSAGES.ECHO.MERGE, type:{color: MAP_CONFIG.colors.echo}}, MESSAGES.ECHO.MERGE_DESC);
        updateEchoDropdownUI();
        
        if (window.cameraTarget === echoRay) {
            window.cameraTarget = player;
            showNotification({name: MESSAGES.UI.CAMERA_RESET, type:{color:'#38bdf8'}}, MESSAGES.UI.CAMERA_RESET_DESC);
            const indicator = document.getElementById('echo-vision-indicator');
            if(indicator) indicator.classList.remove('active');
        }
    } else { 
        showNotification({name: MESSAGES.ECHO.COMING, type:{color:'#fbbf24'}}, ""); 
        setEchoMode('return'); 
        echoRay.pendingMerge = true;
    }
}

/**
 * AI Mod Döngüsü (Artık AIManager'ı kullanıyor)
 */
function cycleAIMode() {
    if (!AIManager.active) {
        AIManager.toggle();
    } else {
        // Basit mod döngüsü: gather -> base -> kapat -> gather
        if (AIManager.mode === 'gather') AIManager.setMode('base');
        else if (AIManager.mode === 'base') AIManager.toggle(); // Kapat
        else AIManager.setMode('gather');
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
    window.cameraFocus = { x: player.x, y: player.y }; 
    lastCameraTarget = player; 

    nexus = new Nexus(); 
    repairStation = new RepairStation(); 
    storageCenter = new StorageCenter(); 
    particleSystem = new ParticleSystem(); 
    entityManager = new EntityManager(); 
    audio = new ZenAudio();
    
    // AIManager zaten global, onu resetleyelim
    if (typeof AIManager !== 'undefined') {
        AIManager.active = false;
        AIManager.manualTarget = null;
    }
    
    gameStartTime = Date.now(); 
    lastFrameTime = Date.now(); 
    
    // MANTIK: GameRules.isInSafeZone
    isInSafeZone = GameRules.isInSafeZone(player, nexus);

    if (audio) {
        audio.init();
        if (isInSafeZone) audio.playTheme('base');
        else audio.playTheme('space');
    }

    entityManager.init();
    
    if (typeof AchievementManager !== 'undefined') AchievementManager.init();
    if (typeof TutorialManager !== 'undefined') TutorialManager.init();

    if (typeof SaveManager !== 'undefined') {
        SaveManager.init();
        updateInventoryCount();
        player.updateUI();
    } else {
        console.warn("SaveManager bulunamadı!");
        player.updateUI(); 
        updateInventoryCount(); 
    }

    isPaused = false;
    startTipsCycle();
    
    // HARİTA TIKLAMA ENTEGRASYONU (AIManager ile)
    if (bmCanvas && typeof initMapListeners === 'function') {
        initMapListeners(bmCanvas, WORLD_SIZE, (worldX, worldY) => {
            if (AIManager) {
                AIManager.setManualTarget(worldX, worldY);
                // UI güncellemesi
                updateAIButton();
            }
        });
    }

    currentZoom = GAME_CONFIG.CAMERA.INITIAL_ZOOM; 
    targetZoom = GAME_CONFIG.CAMERA.DEFAULT_ZOOM;  
    window.cinematicMode = true; 

    if (typeof INTRO_SEQUENCE !== 'undefined') {
        INTRO_SEQUENCE.forEach(msg => {
            setTimeout(() => addChatMessage(msg.text, msg.type, "genel"), msg.time);
        });
    }

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

// Statik çizim fonksiyonu (değişmedi)
function drawStaticNoise(ctx, w, h, intensity) {
    ctx.save();
    const count = 20 * intensity; 
    for (let i = 0; i < count; i++) {
        const y = Math.random() * h;
        const height = Math.random() * 20 + 2;
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3 * intensity})`;
        ctx.fillRect(0, y, w, height);
    }
    const blockCount = 50 * intensity;
    for (let i = 0; i < blockCount; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const size = Math.random() * 50 + 10;
        ctx.fillStyle = `rgba(200, 200, 200, ${Math.random() * 0.4 * intensity})`;
        ctx.fillRect(x, y, size, size/4);
    }
    if (intensity > 0.5) {
        ctx.fillStyle = `rgba(255, 0, 0, ${0.1 * intensity})`;
        ctx.fillRect(Math.random() * 10 - 5, 0, w, h);
    }
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
                const fpsEl = document.getElementById('debug-fps-val');
                if(fpsEl) fpsEl.innerText = fps;
                
                const ms = (1000 / Math.max(1, fps)).toFixed(1);
                const msEl = document.getElementById('debug-ms-val');
                if(msEl) msEl.innerText = ms;

                let pCount = (entityManager && entityManager.planets) ? entityManager.planets.length : 0;
                let wCount = (entityManager && entityManager.wormholes) ? entityManager.wormholes.length : 0;
                let partCount = particleSystem ? particleSystem.count : 0;
                const totalObj = pCount + wCount + partCount;
                const objEl = document.getElementById('debug-obj-val');
                if(objEl) objEl.innerText = totalObj;
                const partEl = document.getElementById('debug-part-val');
                if(partEl) partEl.innerText = partCount;

                const memEl = document.getElementById('debug-mem-val');
                if(memEl) {
                    if (performance && performance.memory) {
                        const memUsed = Math.round(performance.memory.usedJSHeapSize / 1048576);
                        memEl.innerText = memUsed + "MB";
                    } else {
                        memEl.innerText = "N/A";
                    }
                }
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
                 const dist = Utils.distEntity(player, echoRay);
                 if (dist < GAME_CONFIG.ECHO.INTERACTION_DIST - 50) echoManualMerge();
            }
        }
        nexus.update();
        repairStation.update();
        storageCenter.update();

        if (!window.cameraTarget) {
            window.cameraTarget = player;
            lastCameraTarget = player;
        }
        
        if (window.cameraTarget === echoRay && !echoRay) {
            window.cameraTarget = player;
            showNotification({name: MESSAGES.ECHO.LOST_SIGNAL, type:{color:'#ef4444'}}, MESSAGES.ECHO.LOST_SIGNAL_DESC);
            const indicator = document.getElementById('echo-vision-indicator');
            if(indicator) indicator.classList.remove('active');
        }

        const currentlySafe = GameRules.isInSafeZone(player, nexus);
        
        if (currentlySafe) {
            if (!isInSafeZone) {
                isInSafeZone = true;
                showNotification({name: MESSAGES.UI.SAFE_ZONE_ENTER, type:{color:'#38bdf8'}}, MESSAGES.UI.SAFE_ZONE_ENTER_DESC);
                if(audio) audio.playTheme('base');
            }
        } else {
            if (isInSafeZone) {
                isInSafeZone = false;
                showNotification({name: MESSAGES.UI.SAFE_ZONE_EXIT, type:{color:'#fbbf24'}}, MESSAGES.UI.SAFE_ZONE_EXIT_DESC);
                if(audio) audio.playTheme('space');
            }
        }

        if(AIManager.active) {
            playerData.stats.timeAI += dt;
        }

        if(typeof profileOpen !== 'undefined' && profileOpen) renderProfile();
        if(typeof statsOpen !== 'undefined' && statsOpen) renderStats();
        if(typeof contextOpen !== 'undefined' && contextOpen) renderContext();
        if(typeof TutorialManager !== 'undefined') TutorialManager.update(dt);
        if (entityManager) entityManager.update(dt);

        // --- TUŞ KONTROLLERİ ---
        if (keys.Escape) { 
            if (typeof inventoryOpen !== 'undefined' && inventoryOpen) closeInventory();
            else if (typeof echoInvOpen !== 'undefined' && echoInvOpen) closeEchoInventory();
            else if (typeof nexusOpen !== 'undefined' && nexusOpen) exitNexus();
            else if (typeof storageOpen !== 'undefined' && storageOpen) closeStorage(); 
            else if (typeof mapOpen !== 'undefined' && mapOpen) closeMap();
            else if (typeof statsOpen !== 'undefined' && statsOpen) closeStats();
            else if (typeof equipmentOpen !== 'undefined' && equipmentOpen) closeEquipment(); 
            else if (typeof settingsOpen !== 'undefined' && settingsOpen) closeSettings();
            else if (typeof contextOpen !== 'undefined' && contextOpen) closeContext(); 
            else if (typeof profileOpen !== 'undefined' && profileOpen) closeProfile();
            else if (typeof controlsOpen !== 'undefined' && controlsOpen) closeControls();
            else togglePause();
            keys.Escape = false;
        }

        // --- ARKA PLAN (SİYAH) ---
        ctx.fillStyle = "#000000"; ctx.fillRect(0,0,width,height);
        
        // --- ARKA PLAN ÇİZİMİ ---
        if (entityManager) {
            entityManager.drawStars(ctx, width, height, window.cameraFocus || window.cameraTarget);
        }
        
        ctx.save(); 
        
        let targetOffsetX = window.gameSettings.cameraOffsetX;
        let targetOffsetY = window.gameSettings.cameraOffsetY;

        if (window.gameSettings.adaptiveCamera) {
            const lookAheadFactor = GAME_CONFIG.CAMERA.ADAPTIVE_FACTOR; 
            const maxAdaptiveOffset = GAME_CONFIG.CAMERA.MAX_OFFSET; 
            targetOffsetX = -window.cameraTarget.vx * lookAheadFactor;
            targetOffsetY = -window.cameraTarget.vy * lookAheadFactor;
            targetOffsetX = Math.max(-maxAdaptiveOffset, Math.min(maxAdaptiveOffset, targetOffsetX));
            targetOffsetY = Math.max(-maxAdaptiveOffset, Math.min(maxAdaptiveOffset, targetOffsetY));
        }

        const lerpVal = GAME_CONFIG.CAMERA.LERP_SPEED;
        currentRenderOffsetX += (targetOffsetX - currentRenderOffsetX) * lerpVal;
        currentRenderOffsetY += (targetOffsetY - currentRenderOffsetY) * lerpVal;

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
            const distCam = Utils.distEntity(window.cameraTarget, window.cameraFocus);
            if (distCam > 5000) {
                window.cameraFocus.x = window.cameraTarget.x;
                window.cameraFocus.y = window.cameraTarget.y;
                isCameraTransitioning = false; 
            } else if (isCameraTransitioning) {
                const lerpSpeed = 0.08; 
                window.cameraFocus.x += (window.cameraTarget.x - window.cameraFocus.x) * lerpSpeed;
                window.cameraFocus.y += (window.cameraTarget.y - window.cameraFocus.y) * lerpSpeed;
                if (distCam < 50) isCameraTransitioning = false; 
            } else {
                const lerpSpeed = 0.9; 
                window.cameraFocus.x += (window.cameraTarget.x - window.cameraFocus.x) * lerpSpeed;
                window.cameraFocus.y += (window.cameraTarget.y - window.cameraFocus.y) * lerpSpeed;
            }
        }

        ctx.translate(-window.cameraFocus.x, -window.cameraFocus.y);
        
        if (entityManager) {
            entityManager.drawGrid(ctx, width, height, window.cameraFocus.x, window.cameraFocus.y, currentZoom);
            entityManager.drawPlanets(ctx, player, echoRay, width, height, currentZoom);
        }

        const safeR = GAME_CONFIG.WORLD_GEN.SAFE_ZONE_RADIUS;
        ctx.save();
        ctx.translate(nexus.x, nexus.y);
        ctx.rotate(Date.now() * 0.0001);
        ctx.beginPath();
        ctx.arc(0, 0, safeR, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(56, 189, 248, 0.1)"; 
        ctx.lineWidth = 20;
        ctx.setLineDash([100, 100]); 
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, safeR - 50, 0, Math.PI * 2);
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
        
        // --- YENİ: ETİKETLİ HALKA ÇİZİM FONKSİYONU ---
        const drawLabeledRing = (x, y, radius, color, labelText) => {
            ctx.strokeStyle = color; 
            ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI*2); ctx.stroke();
            
            // Etiket Mantığı: Kameranın odak noktasına (merkeze) en yakın noktayı bul
            const cx = window.cameraFocus.x;
            const cy = window.cameraFocus.y;
            
            // Merkezden halka merkezine olan açı
            const angle = Math.atan2(cy - y, cx - x);
            
            // Bu açı doğrultusunda, halka yarıçapı kadar ilerle
            const lx = x + Math.cos(angle) * radius;
            const ly = y + Math.sin(angle) * radius;
            
            ctx.save();
            
            // Metin rengini halkanın ana rengine göre belirle (Daha opak ve net)
            let textColor = "#fff";
            if(color.includes("16, 185, 129")) textColor = "#34d399"; // Yeşil tonu
            else if(color.includes("245, 158, 11")) textColor = "#fbbf24"; // Turuncu tonu
            
            ctx.font = "bold 10px monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            
            const metrics = ctx.measureText(labelText);
            const w = metrics.width + 8;
            const h = 16;
            
            // Metin arka planı (Okunabilirlik için)
            ctx.fillStyle = "rgba(0,0,0,0.8)";
            ctx.fillRect(lx - w/2, ly - h/2, w, h);
            
            // Metni çiz
            ctx.fillStyle = textColor;
            ctx.fillText(labelText, lx, ly);
            
            ctx.restore();
        };

        ctx.lineWidth = 1;
        // Eski çizimler yerine fonksiyon kullanımı
        drawLabeledRing(player.x, player.y, player.scanRadius, "rgba(16, 185, 129, 0.2)", "VATOZ TARAMA");
        drawLabeledRing(player.x, player.y, player.radarRadius, "rgba(245, 158, 11, 0.15)", "VATOZ RADAR");

        if(echoRay) {
            drawLabeledRing(echoRay.x, echoRay.y, echoRay.scanRadius, "rgba(16, 185, 129, 0.2)", "YANKI TARAMA");
            drawLabeledRing(echoRay.x, echoRay.y, echoRay.radarRadius, "rgba(245, 158, 11, 0.15)", "YANKI RADAR");
            
            if (echoRay.mode === 'return') {
                const distToEcho = Utils.distEntity(player, echoRay);
                let lineAlpha = 0.4;
                if (distToEcho < player.scanRadius) lineAlpha = Math.max(0, (distToEcho / player.scanRadius) * 0.4);
                if (lineAlpha > 0.05) { 
                    ctx.beginPath(); ctx.moveTo(echoRay.x, echoRay.y); ctx.lineTo(player.x, player.y);
                    ctx.strokeStyle = MAP_CONFIG.colors.echo; ctx.lineWidth = 2; ctx.setLineDash([15, 10]); ctx.lineDashOffset = -Date.now() / 50; 
                    ctx.globalAlpha = lineAlpha; ctx.stroke(); ctx.globalAlpha = 1.0; ctx.setLineDash([]); ctx.lineDashOffset = 0;
                }
            }
        }

        if(echoRay) echoRay.draw(ctx);
        player.draw(ctx); ctx.restore();
        
        if (window.cameraTarget === echoRay && echoRay && !echoRay.attached) {
            const dist = Utils.distEntity(player, echoRay);
            const maxRange = player.radarRadius; 
            const interference = GameRules.calculateSignalInterference(dist, maxRange);
            if (interference >= 1.0) {
                window.cameraTarget = player;
                showNotification({name: MESSAGES.ECHO.RANGE_WARNING, type:{color:'#ef4444'}}, MESSAGES.ECHO.LOST_SIGNAL_DESC);
                if(audio) audio.playError();
                const indicator = document.getElementById('echo-vision-indicator');
                if(indicator) indicator.classList.remove('active');
            } else if (interference > 0) {
                drawStaticNoise(ctx, width, height, interference);
            }
        }

        const promptEl = document.getElementById('merge-prompt');
        if (promptEl) {
            let isNexusOpen = (typeof nexusOpen !== 'undefined' && nexusOpen);
            let isStorageOpen = (typeof storageOpen !== 'undefined' && storageOpen);
            let isMapOpen = (typeof mapOpen !== 'undefined' && mapOpen);
            let showNexusPrompt = GameRules.canInteract(player, nexus, 200) && !isNexusOpen;
            let showStoragePrompt = GameRules.canInteract(player, storageCenter, 200) && !isStorageOpen;
            let showEchoMergePrompt = false;
            if (echoRay && !isMapOpen) {
                 if (!echoRay.attached && GameRules.canInteract(player, echoRay, 300)) {
                     showEchoMergePrompt = true;
                 }
            }
            let activePrompts = [];
            if (showNexusPrompt) {
                activePrompts.push("[E] NEXUS'A GİRİŞ YAP");
                if (keys.e && document.activeElement !== document.getElementById('chat-input')) { enterNexus(); keys.e = false; }
            } else if (showStoragePrompt) {
                activePrompts.push("[E] DEPO YÖNETİMİ");
                if (keys.e && document.activeElement !== document.getElementById('chat-input')) { openStorage(); keys.e = false; }
            }
            if (showEchoMergePrompt) {
                activePrompts.push("[F] BİRLEŞ");
                if (keys.f && document.activeElement !== document.getElementById('chat-input')) { echoManualMerge(); keys.f = false; }
            }
            if (echoRay && echoRay.attached) {
                if (keys.f && document.activeElement !== document.getElementById('chat-input')) {
                     echoRay.attached = false; echoRay.mode = 'roam'; updateEchoDropdownUI(); keys.f = false; 
                     showNotification({name: MESSAGES.ECHO.DETACH, type:{color: MAP_CONFIG.colors.echo}}, "");
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
            // YANKI etiketi KALDIRILDI
            drawTargetIndicator(ctx, navOrigin, {width, height, zoom: currentZoom}, echoRay, MAP_CONFIG.colors.echo);
        }
        if (window.cameraTarget === echoRay && echoRay && !echoRay.attached) {
             // VATOZ etiketi KALDIRILDI
             drawTargetIndicator(ctx, navOrigin, {width, height, zoom: currentZoom}, player, MAP_CONFIG.colors.player);
        }
        if (window.gameSettings.showNexusArrow) drawTargetIndicator(ctx, navOrigin, {width, height, zoom: currentZoom}, nexus, MAP_CONFIG.colors.nexus);
        if (window.gameSettings.showRepairArrow) drawTargetIndicator(ctx, navOrigin, {width, height, zoom: currentZoom}, repairStation, MAP_CONFIG.colors.repair);
        if (window.gameSettings.showStorageArrow) drawTargetIndicator(ctx, navOrigin, {width, height, zoom: currentZoom}, storageCenter, MAP_CONFIG.colors.storage);

        const entities = { 
            player, echoRay, nexus, repairStation, storageCenter, 
            planets: (entityManager ? entityManager.planets : []),
            wormholes: (entityManager ? entityManager.wormholes : []) 
        };
        const state = { manualTarget: AIManager.manualTarget };
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