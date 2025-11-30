/**
 * Void Ray - Oyun Motoru ve Durum Yönetimi
 * * Depo mantığı js/windows/storage.js dosyasına taşınmıştır.
 */

// -------------------------------------------------------------------------
// GLOBAL DEĞİŞKENLER VE OYUN DURUMU
// -------------------------------------------------------------------------

var player; 
var echoRay = null;
var nexus = null;
var repairStation = null;
var storageCenter = null;
var audio; 

// OYUN AYARLARI (Varsayılanlar, settings.js tarafından güncellenir)
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

// Render işlemi için kullanılan dinamik ofset değerleri
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

let lastToxicNotification = 0; 
let currentZoom = 1.0, targetZoom = 1.0;
let isPaused = false;
let animationId = null;
let manualTarget = null; 
let gameStartTime = 0;
let lastFrameTime = 0;
window.cinematicMode = false; 

let canvas, ctx, mmCanvas, mmCtx, bmCanvas, bmCtx;
let width, height;
let planets = [], stars = [], collectedItems = [], particles = [];
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

// depositToStorage fonksiyonu buradan kaldırıldı -> js/windows/storage.js

function addItemToInventory(planet) { 
    const currentCount = collectedItems.length;
    const capacity = getPlayerCapacity();

    if (currentCount >= capacity) {
        if (!autopilot) {
            showNotification({name: "ENVANTER DOLU! NEXUS VEYA DEPOYA GİDİN.", type:{color:'#ef4444'}}, "");
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
    nexus = new Nexus(); 
    repairStation = new RepairStation(); 
    storageCenter = new StorageCenter(); 
    audio = new ZenAudio();
    planets = []; 
    gameStartTime = Date.now(); 
    lastFrameTime = Date.now(); 
    
    for(let i=0; i < GAME_CONFIG.WORLD_GEN.PLANET_COUNT; i++) planets.push(new Planet());
    
    stars = []; 
    for(let i=0; i < GAME_CONFIG.WORLD_GEN.STAR_COUNT; i++) {
        stars.push({x:Math.random()*WORLD_SIZE, y:Math.random()*WORLD_SIZE, s:Math.random()*2});
    }
    
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

        if(autopilot) {
            playerData.stats.timeAI += dt;
        }

        if(typeof statsOpen !== 'undefined' && statsOpen) {
            renderStats();
        }

        planets = planets.filter(p => !p.collected);
        if (planets.length < GAME_CONFIG.WORLD_GEN.PLANET_COUNT) {
            const needed = GAME_CONFIG.WORLD_GEN.PLANET_COUNT - planets.length;
            for(let i=0; i<needed; i++) {
                let px, py, d; 
                do { 
                    px = Math.random() * WORLD_SIZE; 
                    py = Math.random() * WORLD_SIZE; 
                    d = Math.hypot(px - player.x, py - player.y); 
                } while(d < GAME_CONFIG.WORLD_GEN.SAFE_ZONE_RADIUS);
                planets.push(new Planet(px, py));
            }
        }

        // ESC Kontrolü
        if (keys.Escape) { 
            if (typeof inventoryOpen !== 'undefined' && inventoryOpen) closeInventory();
            else if (typeof echoInvOpen !== 'undefined' && echoInvOpen) closeEchoInventory();
            else if (typeof nexusOpen !== 'undefined' && nexusOpen) exitNexus();
            else if (typeof storageOpen !== 'undefined' && storageOpen) closeStorage(); 
            else if (typeof mapOpen !== 'undefined' && mapOpen) closeMap();
            else if (typeof statsOpen !== 'undefined' && statsOpen) closeStats();
            else if (typeof settingsOpen !== 'undefined' && settingsOpen) closeSettings();
            else togglePause();
            keys.Escape = false;
        }

        ctx.fillStyle = "#020204"; ctx.fillRect(0,0,width,height);
        ctx.fillStyle="white"; stars.forEach(s => { let sx = (s.x - player.x * 0.9) % width; let sy = (s.y - player.y * 0.9) % height; if(sx<0) sx+=width; if(sy<0) sy+=height; ctx.globalAlpha = 0.7; ctx.fillRect(sx, sy, s.s, s.s); }); ctx.globalAlpha = 1;

        ctx.save(); 
        
        let targetOffsetX = window.gameSettings.cameraOffsetX;
        let targetOffsetY = window.gameSettings.cameraOffsetY;

        if (window.gameSettings.adaptiveCamera) {
            const lookAheadFactor = 30; 
            const maxAdaptiveOffset = 400; 
            targetOffsetX = -player.vx * lookAheadFactor;
            targetOffsetY = -player.vy * lookAheadFactor;
            targetOffsetX = Math.max(-maxAdaptiveOffset, Math.min(maxAdaptiveOffset, targetOffsetX));
            targetOffsetY = Math.max(-maxAdaptiveOffset, Math.min(maxAdaptiveOffset, targetOffsetY));
        }

        currentRenderOffsetX += (targetOffsetX - currentRenderOffsetX) * 0.05;
        currentRenderOffsetY += (targetOffsetY - currentRenderOffsetY) * 0.05;

        ctx.translate(width/2 + currentRenderOffsetX, height/2 + currentRenderOffsetY); 
        ctx.scale(currentZoom, currentZoom); 
        ctx.translate(-player.x, -player.y);
        
        nexus.draw(ctx);
        repairStation.draw(ctx); 
        storageCenter.draw(ctx); 
        
        for(let i=particles.length-1; i>=0; i--) { particles[i].update(); particles[i].draw(ctx); if(particles[i].life<=0) particles.splice(i,1); }
        
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

        planets.forEach(p => { 
            const visibility = getPlanetVisibility(p, player, echoRay);
            if (visibility === 0) return;
            const viewW = width / currentZoom; const viewH = height / currentZoom; 
            if(p.x > player.x - viewW && p.x < player.x + viewW && p.y > player.y - viewH && p.y < player.y + viewH) { 
                p.draw(ctx, visibility); 
            } 
            if(!p.collected) { 
                 if(Math.hypot(player.x-p.x, player.y-p.y) < p.radius + 30*player.scale) { 
                    if(p.type.id === 'toxic') { 
                        if(audio) audio.playToxic(); showToxicEffect(); 
                        for(let i=0; i<30; i++) particles.push(new Particle(p.x, p.y, '#84cc16')); 
                        if(echoRay && echoRay.attached) { echoRay = null; echoDeathLevel = player.level; document.getElementById('echo-wrapper-el').style.display = 'none'; if(typeof echoInvOpen !== 'undefined' && echoInvOpen) closeEchoInventory(); showNotification({name: "YANKI ZEHİRLENDİ...", type:{color:'#ef4444'}}, ""); } 
                        else { 
                            const now = Date.now(); 
                            if (now - lastToxicNotification > 2000) { showNotification({name: "ZARARLI GAZ TESPİT EDİLDİ", type:{color:'#84cc16'}}, ""); lastToxicNotification = now; } 
                            player.takeDamage(5);
                        } 
                    } else if (p.type.id === 'lost') { 
                         if (addItemToInventory(p)) { 
                             p.collected = true; 
                             if(audio) audio.playChime({id:'legendary'}); 
                             showNotification({name: "KAYIP KARGO KURTARILDI!", type:{color:'#a855f7'}}, ""); 
                             if (p.lootContent && p.lootContent.length > 0) { 
                                 p.lootContent.forEach(item => { 
                                     if(addItemToInventory(item)) {
                                         const xp = calculatePlanetXp(item.type);
                                         player.gainXp(xp);
                                     }
                                 }); 
                             }
                         }
                    } else if (p.type.id === 'tardigrade') {
                        p.collected = true; if(audio) audio.playChime(p.type); 
                        player.energy = Math.min(player.energy + 50, player.maxEnergy);
                        const xp = calculatePlanetXp(p.type);
                        showNotification({name: "TARDİGRAD YENDİ", type:{color:'#C7C0AE'}}, `(+%50 ENERJİ, +${xp} XP)`);
                        player.gainXp(xp);
                    } else { 
                        const lootCount = GameRules.calculateLootCount(); 
                        if (lootCount === 0) {
                            p.collected = true;
                            const xp = calculatePlanetXp(p.type);
                            player.gainXp(xp);
                            showNotification({ name: `+${xp} XP`, type: { color: '#94a3b8' } }, "(Veri Analizi)");
                        } else {
                            let addedCount = 0;
                            let totalXp = 0;
                            for(let i=0; i<lootCount; i++) { 
                                if(addItemToInventory(p)) { 
                                    addedCount++; 
                                    const xp = calculatePlanetXp(p.type);
                                    totalXp += xp;
                                    player.gainXp(xp); 
                                } else { 
                                    break; 
                                } 
                            }
                            if (addedCount > 0) { 
                                p.collected = true; 
                                if(audio) audio.playChime(p.type); 
                                const suffix = (addedCount > 1 ? `x${addedCount} ` : "") + `(+${totalXp} XP)`;
                                showNotification(p, suffix); 
                            } 
                        }
                    } 
                } 
            } 
        });

        if(echoRay) echoRay.draw(ctx);
        player.draw(ctx); ctx.restore();
        
        const promptEl = document.getElementById('merge-prompt');
        if (promptEl) {
            const distNexus = Math.hypot(player.x - nexus.x, player.y - nexus.y);
            const distStorage = Math.hypot(player.x - storageCenter.x, player.y - storageCenter.y);
            
            // nexusOpen ve storageOpen kontrolleri global scope'ta veya ilgili modülde
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

        if(echoRay && !echoRay.attached) {
            drawTargetIndicator(ctx, player, {width, height, zoom: currentZoom}, echoRay, MAP_CONFIG.colors.echo);
        }

        if (window.gameSettings.showNexusArrow) {
            drawTargetIndicator(ctx, player, {width, height, zoom: currentZoom}, nexus, MAP_CONFIG.colors.nexus);
        }
        
        if (window.gameSettings.showRepairArrow) {
            drawTargetIndicator(ctx, player, {width, height, zoom: currentZoom}, repairStation, MAP_CONFIG.colors.repair);
        }
        
        if (window.gameSettings.showStorageArrow) {
            drawTargetIndicator(ctx, player, {width, height, zoom: currentZoom}, storageCenter, MAP_CONFIG.colors.storage);
        }

        const entities = { player, echoRay, nexus, repairStation, storageCenter, planets };
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