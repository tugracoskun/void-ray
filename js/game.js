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

// KAMERA HEDEFİ
window.cameraTarget = null;

// OYUN AYARLARI
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
    developerMode: false,
    showGravityFields: false,
    showHitboxes: false,
    showVectors: false,
    showTargetVectors: false,
    showFps: false,
    godMode: false,
    hidePlayer: false
};

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
    const dist = Math.hypot(player.x - echoRay.x, player.y - echoRay.y);
    
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
    window.cameraTarget = player; // Başlangıçta kamera oyuncuyu takip eder

    nexus = new Nexus(); 
    repairStation = new RepairStation(); 
    storageCenter = new StorageCenter(); 
    particleSystem = new ParticleSystem(); 
    entityManager = new EntityManager(); 
    audio = new ZenAudio();
    
    gameStartTime = Date.now(); 
    lastFrameTime = Date.now(); 
    
    const startSafeDist = Math.hypot(player.x - nexus.x, player.y - nexus.y);
    isInSafeZone = startSafeDist < 1500;

    // --- SES BAŞLATMA (YUMUŞAK GİRİŞ) ---
    // Eğer güvenli bölgedeysek 'base', değilse 'space'
    if (audio) {
        audio.init();
        if (isInSafeZone) audio.playTheme('base');
        else audio.playTheme('space');
    }

    entityManager.init();
    
    player.updateUI(); 
    updateInventoryCount(); 
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
                 const dist = Math.hypot(player.x - echoRay.x, player.y - echoRay.y);
                 if (dist < 300) echoManualMerge();
            }
        }
        nexus.update();
        repairStation.update();
        storageCenter.update();

        // --- KAMERA HEDEFİ GÜVENLİK KONTROLÜ ---
        if (!window.cameraTarget) window.cameraTarget = player;
        
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
        const distToNexusSafe = Math.hypot(player.x - nexus.x, player.y - nexus.y);
        
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
            else togglePause();
            keys.Escape = false;
        }

        ctx.fillStyle = "#020617"; ctx.fillRect(0,0,width,height);
        
        if (entityManager) {
            // Yıldızları oyuncuya göre parallax yapsak da çizimi kamera hedefine göre ayarlamak lazım
            // Ancak yıldız çizim fonksiyonu şu an 'player' parametresi alıyor.
            // Parallax'ın kameraya göre değil de her zaman gemiye göre olması daha doğal olabilir.
            // Şimdilik 'player' olarak bırakıyorum.
            entityManager.drawStars(ctx, width, height, player);
        }
        
        ctx.save(); 
        
        let targetOffsetX = window.gameSettings.cameraOffsetX;
        let targetOffsetY = window.gameSettings.cameraOffsetY;

        if (window.gameSettings.adaptiveCamera) {
            const lookAheadFactor = 30; 
            const maxAdaptiveOffset = 400; 
            
            // Adaptif kamera artık seçili hedefin hızına göre çalışır
            // Eğer hedef Echo ise onun hızını kullanır
            targetOffsetX = -window.cameraTarget.vx * lookAheadFactor;
            targetOffsetY = -window.cameraTarget.vy * lookAheadFactor;
            
            targetOffsetX = Math.max(-maxAdaptiveOffset, Math.min(maxAdaptiveOffset, targetOffsetX));
            targetOffsetY = Math.max(-maxAdaptiveOffset, Math.min(maxAdaptiveOffset, targetOffsetY));
        }

        currentRenderOffsetX += (targetOffsetX - currentRenderOffsetX) * 0.05;
        currentRenderOffsetY += (targetOffsetY - currentRenderOffsetY) * 0.05;

        ctx.translate(width/2 + currentRenderOffsetX, height/2 + currentRenderOffsetY); 
        ctx.scale(currentZoom, currentZoom); 
        
        // KAMERA MERKEZLEME
        // Artık player.x/y yerine window.cameraTarget.x/y kullanıyoruz
        ctx.translate(-window.cameraTarget.x, -window.cameraTarget.y);
        
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
                const distToEcho = Math.hypot(player.x - echoRay.x, player.y - echoRay.y);
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
        
        const promptEl = document.getElementById('merge-prompt');
        if (promptEl) {
            const distNexus = Math.hypot(player.x - nexus.x, player.y - nexus.y);
            const distStorage = Math.hypot(player.x - storageCenter.x, player.y - storageCenter.y);
            
            let isNexusOpen = (typeof nexusOpen !== 'undefined' && nexusOpen);
            let isStorageOpen = (typeof storageOpen !== 'undefined' && storageOpen);

            let showNexusPrompt = (distNexus < nexus.radius + 200) && !isNexusOpen;
            let showStoragePrompt = (distStorage < storageCenter.radius + 200) && !isStorageOpen;

            if (showNexusPrompt) { promptEl.innerText = "[E] NEXUS'A GİRİŞ YAP"; promptEl.className = 'visible'; if (keys.e) { if(document.activeElement !== document.getElementById('chat-input')) { enterNexus(); keys.e = false; } } } 
            else if (showStoragePrompt) { promptEl.innerText = "[E] DEPO YÖNETİMİ"; promptEl.className = 'visible'; if (keys.e) { if(document.activeElement !== document.getElementById('chat-input')) { openStorage(); keys.e = false; } } }
            else if (echoRay && !isNexusOpen && !isStorageOpen && !mapOpen) {
                const distEcho = Math.hypot(player.x - echoRay.x, player.y - echoRay.y);
                if (!echoRay.attached && distEcho < 300) { 
                    promptEl.innerText = "[F] BİRLEŞ"; promptEl.className = 'visible'; if(keys.f) { if(document.activeElement !== document.getElementById('chat-input')) { echoManualMerge(); keys.f = false; } } 
                } else if (echoRay.attached) { 
                    promptEl.className = ''; if(keys.f) { if(document.activeElement !== document.getElementById('chat-input')) { echoRay.attached = false; echoRay.mode = 'roam'; updateEchoDropdownUI(); keys.f = false; showNotification({name: "YANKI AYRILDI", type:{color:'#67e8f9'}}, ""); } } 
                } else { promptEl.className = ''; }
            } else { promptEl.className = ''; }
        }

        // Ok işaretleri her zaman oynadığınız karakterden bağımsız olarak gemiyi merkez alarak çizilir (Navigasyon kolaylığı için)
        // Ancak kamera Echo'daysa, oklar Echo'dan hedefe doğru çizilse daha mantıklı olabilir.
        // Şimdilik çizim fonksiyonu (drawTargetIndicator) "origin" parametresi alıyor.
        // Bunu "cameraTarget" olarak güncellersek oklar her zaman ekranın ortasından çıkar.
        const navOrigin = window.cameraTarget;

        if(echoRay && !echoRay.attached && window.gameSettings.showEchoArrow && window.cameraTarget !== echoRay) {
            drawTargetIndicator(ctx, navOrigin, {width, height, zoom: currentZoom}, echoRay, MAP_CONFIG.colors.echo);
        }

        // Eğer kamera Echo'daysa, gemiye dönüş okunu göster
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
        
        drawMiniMap(mmCtx, entities, state);
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