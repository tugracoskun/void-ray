// --- DURUM DEĞİŞKENLERİ (STATE) ---
let playerData = { 
    stardust: 0, 
    upgrades: { playerSpeed: 0, playerTurn: 0, playerMagnet: 0, echoSpeed: 0, echoRange: 0, echoDurability: 0 },
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
window.cinematicMode = false; // Sinematik mod durumu (window'a eklendi)

// --- CHAT SİSTEMİ ---
let chatHistory = {
    genel: [],
    bilgi: [],
    grup: []
};
let activeChatTab = 'genel';

// --- CANVAS VE REFERANSLAR ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const mmCanvas = document.getElementById('minimap-canvas');
const mmCtx = mmCanvas.getContext('2d');
const bmCanvas = document.getElementById('big-map-canvas');
const bmCtx = bmCanvas.getContext('2d');

let width, height, player, echoRay = null, nexus = null, audio;
let planets = [], stars = [], collectedItems = [], particles = [];
let inventoryOpen = false, echoInvOpen = false, nexusOpen = false, mapOpen = false;
let statsOpen = false; // İstatistik paneli durumu
let activeFilter = 'all';

let autopilot = false;
let aiMode = 'gather';
let echoDeathLevel = 0;
let lowEnergyWarned = false;

const keys = { w:false, a:false, s:false, d:false, " ":false, f:false, q:false, e:false, m:false, Escape:false };

// --- YARDIMCI FONKSİYONLAR (SPAWNER) ---
function spawnEcho(x, y) { 
    echoRay = new EchoRay(x, y); 
    document.getElementById('echo-wrapper-el').style.display = 'flex'; 
    showNotification({name: "YANKI DOĞDU", type:{color:'#67e8f9'}}, ""); 
}

// --- UI YÖNETİMİ ---
function updateInventoryCount() {
    const badge = document.getElementById('inv-total-badge'); const count = collectedItems.length; badge.innerText = count; badge.style.display = count > 0 ? 'flex' : 'none';
    document.getElementById('count-all').innerText = count;
    document.getElementById('count-legendary').innerText = collectedItems.filter(i => i.type.id === 'legendary').length;
    document.getElementById('count-epic').innerText = collectedItems.filter(i => i.type.id === 'epic').length;
    document.getElementById('count-rare').innerText = collectedItems.filter(i => i.type.id === 'rare').length;
}

function addItemToInventory(planet) { 
    collectedItems.push(planet); 
    playerData.stats.totalResources++; // İstatistik güncelle
    updateInventoryCount(); 
    if(inventoryOpen) renderInventory(); 
}

function updateEchoDropdownUI() {
    document.querySelectorAll('.echo-menu-item').forEach(el => el.classList.remove('active-mode'));
    
    let rateText = "Normal";
    if(playerData.upgrades.echoSpeed >= 2) rateText = "Hızlı";
    if(playerData.upgrades.echoSpeed >= 4) rateText = "Turbo";
    document.getElementById('echo-rate-disp').innerText = "Toplama Hızı: " + rateText;

    if (!echoRay) return;
    if (echoRay.attached) document.getElementById('menu-merge').classList.add('active-mode');
    else if (echoRay.mode === 'return') document.getElementById('menu-return').classList.add('active-mode');
    else if (echoRay.mode === 'recharge') { }
    else document.getElementById('menu-roam').classList.add('active-mode');
}

function setEchoMode(mode) {
    if(!echoRay) return;
    if (mode === 'roam' && echoRay.attached) { echoRay.attached = false; showNotification({name: "YANKI AYRILDI", type:{color:'#67e8f9'}}, ""); }
    if (mode === 'return') echoRay.attached = false; 
    echoRay.mode = mode; updateEchoDropdownUI();
}

function echoManualMerge() {
    if(!echoRay) return;
    const dist = Math.hypot(player.x - echoRay.x, player.y - echoRay.y);
    if (dist < 350) {
         if (echoRay.lootBag.length > 0) {
            echoRay.lootBag.forEach(p => { 
                if(p.type.id === 'tardigrade') {
                    player.energy = Math.min(player.energy + 50, player.maxEnergy);
                    showNotification({name: "YANKI: TARDİGRAD GETİRDİ (+%50 ENERJİ)", type:{color:'#C7C0AE'}}, "");
                } else {
                    addItemToInventory(p); player.gainXp(p.type.xp); 
                }
            });
            if(echoRay.lootBag.filter(p=>p.type.id!=='tardigrade').length > 0) {
                showNotification({name: `YANKI: EŞYALAR AKTARILDI`, type:{color:'#38bdf8'}}, "");
            }
            echoRay.lootBag = []; if(echoInvOpen) renderEchoInventory();
        }
        audio.playEvolve(); echoRay.attached = true; echoRay.mode = 'roam'; updateEchoDropdownUI();
    } else { showNotification({name: "YANKI ÇOK UZAK, ÇAĞIRILIYOR...", type:{color:'#fbbf24'}}, ""); setEchoMode('return'); }
}

function openEchoInventory() { if(!echoRay) return; echoInvOpen = true; document.getElementById('echo-inventory-overlay').classList.add('open'); renderEchoInventory(); }
function closeEchoInventory() { echoInvOpen = false; document.getElementById('echo-inventory-overlay').classList.remove('open'); }
function closeInventory() { inventoryOpen = false; document.getElementById('inventory-overlay').classList.remove('open'); }

function renderEchoInventory() {
    if(!echoRay) return; const grid = document.getElementById('echo-inv-grid-content');
    if(echoRay.lootBag.length === 0) { grid.innerHTML = '<div class="text-center text-cyan-500/50 mt-20">Depo boş.</div>'; return; }
    const grouped = {}; echoRay.lootBag.forEach(item => { if (!grouped[item.name]) grouped[item.name] = { ...item, count: 0 }; grouped[item.name].count++; });
    let html = `<table class="inv-table"><thead><tr><th>TÜR</th><th>İSİM</th><th>XP</th><th style="text-align:right">MİKTAR</th></tr></thead><tbody>`;
    Object.values(grouped).sort((a, b) => b.type.xp - a.type.xp).forEach(item => { html += `<tr><td style="color:${item.type.color}">●</td><td style="color:${item.type.color}">${item.name}</td><td style="font-size:0.8rem; opacity:0.7">${item.type.xp} XP</td><td style="text-align:right">x${item.count}</td></tr>`; });
    html += '</tbody></table>'; grid.innerHTML = html;
}

function renderInventory() {
    const grid = document.getElementById('inv-grid-content');
    let filteredItems = collectedItems.filter(i => activeFilter === 'all' || i.type.id === activeFilter);
    if(filteredItems.length === 0) { grid.innerHTML = '<div class="text-center text-gray-500 mt-20">Bu kategoride eşya yok.</div>'; return; }
    
    const grouped = {};
    filteredItems.forEach(item => {
        if (!grouped[item.name]) grouped[item.name] = { ...item, count: 0 };
        grouped[item.name].count++;
    });

    let html = `<table class="inv-table"><thead><tr><th>TÜR</th><th>İSİM</th><th>XP</th><th style="text-align:right">MİKTAR</th></tr></thead><tbody>`;
    Object.values(grouped).sort((a, b) => b.type.xp - a.type.xp).forEach(item => {
        html += `
            <tr>
                <td style="color:${item.type.color}">●</td>
                <td style="color:${item.type.color}">${item.name}</td>
                <td style="font-size:0.8rem; opacity:0.7">${item.type.xp} XP</td>
                <td style="text-align:right">x${item.count}</td>
            </tr>`;
    });
    html += '</tbody></table>';
    grid.innerHTML = html;
}

function filterInventory(f) { activeFilter = f; document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active')); event.currentTarget.classList.add('active'); renderInventory(); }

// --- ISTATISTIK PENCERESI FONKSİYONLARI ---
function formatTime(ms) {
    if(!ms) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

function openStats() {
    statsOpen = true;
    document.getElementById('stats-overlay').classList.add('open');
    renderStats();
}

function closeStats() {
    statsOpen = false;
    document.getElementById('stats-overlay').classList.remove('open');
}

function renderStats() {
    if(!statsOpen) return;
    const table = document.getElementById('stats-table-content');
    
    const now = Date.now();
    const gameTime = now - gameStartTime;

    // Mesafe formatlama
    const distStr = Math.floor(playerData.stats.distance / 100) + " km";

    table.innerHTML = `
        <tr><th>EVREN SÜRESİ</th><td>${formatTime(gameTime)}</td></tr>
        <tr><th>HAREKET SÜRESİ</th><td>${formatTime(playerData.stats.timeMoving)}</td></tr>
        <tr><th>BEKLEME SÜRESİ</th><td>${formatTime(playerData.stats.timeIdle)}</td></tr>
        <tr><th>AI (OTOPİLOT) SÜRESİ</th><td>${formatTime(playerData.stats.timeAI)}</td></tr>
        <tr><th>VATOZ MAX HIZ</th><td>${Math.floor(playerData.stats.maxSpeed * 10)} KM/S</td></tr>
        <tr><th>YANKI MAX HIZ</th><td>${Math.floor(playerData.stats.echoMaxSpeed * 10)} KM/S</td></tr>
        <tr><th>TOPLAM MESAFE</th><td>${distStr}</td></tr>
        <tr><th>TOPLANAN KAYNAK</th><td>${playerData.stats.totalResources} ADET</td></tr>
        <tr><th>KAZANILAN KRİSTAL</th><td>${playerData.stats.totalStardust} ◆</td></tr>
        <tr><th>HARCANAN KRİSTAL</th><td>${playerData.stats.totalSpentStardust} ◆</td></tr>
        <tr><th>HARCANAN ENERJİ</th><td>${Math.floor(playerData.stats.totalEnergySpent)} BİRİM</td></tr>
    `;
}

// --- AI MODES ---
function cycleAIMode() {
    if(!autopilot) {
        autopilot = true;
        aiMode = 'gather';
    } else {
        if (aiMode === 'gather') aiMode = 'base';
        else if (aiMode === 'base') autopilot = false;
        else aiMode = 'gather'; // Travel modundaysa gather'a dön
    }
    updateAIButton();
}

function updateAIButton() {
    const btn = document.getElementById('ai-mode-btn');
    const aiToggle = document.getElementById('btn-ai-toggle');
    const modeBtn = document.getElementById('ai-mode-btn');
    
    // Uyarı sınıfını temizle (durum değiştiğinde)
    aiToggle.classList.remove('warn-blink');

    if(!autopilot) {
            aiToggle.classList.remove('active'); 
            modeBtn.classList.remove('visible');
            return;
    }

    aiToggle.classList.add('active'); 
    modeBtn.classList.add('visible');

    if (aiMode === 'travel') { btn.innerText = 'SEYİR'; btn.style.color = '#ef4444'; btn.style.borderColor = '#ef4444'; }
    else if (aiMode === 'base') { btn.innerText = 'ÜS'; btn.style.color = '#fbbf24'; btn.style.borderColor = '#fbbf24'; }
    else { btn.innerText = 'TOPLA'; btn.style.color = 'white'; btn.style.borderColor = 'transparent'; }
}

// --- NEXUS LOGIC ---
function enterNexus() { nexusOpen = true; document.getElementById('nexus-overlay').classList.add('open'); switchNexusTab('market'); }
function exitNexus() { nexusOpen = false; document.getElementById('nexus-overlay').classList.remove('open'); }

function switchNexusTab(tabName) {
    document.querySelectorAll('.nexus-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nexus-content').forEach(c => c.classList.remove('active'));
    if(tabName === 'market') { document.querySelector('.nexus-tab:nth-child(1)').classList.add('active'); document.getElementById('tab-market').classList.add('active'); renderMarket(); } 
    else { document.querySelector('.nexus-tab:nth-child(2)').classList.add('active'); document.getElementById('tab-upgrades').classList.add('active'); renderUpgrades(); }
}

function renderMarket() {
    const grid = document.getElementById('market-grid'); grid.innerHTML = '';
    if(collectedItems.length === 0) { grid.innerHTML = '<div class="col-span-full text-center text-gray-500 mt-10">Satılacak eşya yok.</div>'; return; }
    const grouped = {}; collectedItems.forEach(item => { if (!grouped[item.name]) grouped[item.name] = { ...item, count: 0 }; grouped[item.name].count++; });
    Object.values(grouped).forEach(item => {
        if(item.type.value > 0) {
            const totalVal = item.count * item.type.value;
            const div = document.createElement('div'); div.className = 'market-card';
            div.innerHTML = `<div class="text-2xl" style="color:${item.type.color}">●</div><div class="font-bold text-white">${item.name}</div><div class="text-sm text-gray-400">x${item.count}</div><div class="text-white font-mono text-lg opacity-80">${totalVal} <span class="text-xs">KRİSTAL</span></div><button class="sell-btn" onclick="sellItem('${item.name}', ${item.type.value}, ${item.count})">SAT</button>`;
            grid.appendChild(div);
        }
    });
}

function sellItem(name, unitPrice, count) {
    collectedItems = collectedItems.filter(i => i.name !== name);
    const totalEarned = count * unitPrice;
    playerData.stardust += totalEarned; 
    playerData.stats.totalStardust += totalEarned; // İstatistik güncelle
    audio.playCash(); player.updateUI(); updateInventoryCount(); renderMarket();
}
function sellAll() {
    let total = 0; let toKeep = [];
    collectedItems.forEach(item => { if(item.type.value > 0) total += item.type.value; else toKeep.push(item); });
    if(total > 0) { 
        collectedItems = toKeep; 
        playerData.stardust += total; 
        playerData.stats.totalStardust += total; // İstatistik güncelle
        audio.playCash(); player.updateUI(); updateInventoryCount(); renderMarket(); showNotification({name: `${total} KRİSTAL KAZANILDI`, type:{color:'#fbbf24'}}, ""); 
    }
}

function renderUpgrades() {
    const pList = document.getElementById('upg-player-list'); const eList = document.getElementById('upg-echo-list'); pList.innerHTML = ''; eList.innerHTML = '';
    const createCard = (key, data) => {
        const currentLvl = playerData.upgrades[key]; const cost = Math.floor(data.baseCost * Math.pow(1.5, currentLvl)); const isMax = currentLvl >= data.max;
        let pips = ''; for(let i=0; i<data.max; i++) pips += `<div class="lvl-pip ${i<currentLvl?'filled':''}"></div>`;
        return `<div class="upgrade-item"><div class="upg-info"><h4>${data.name}</h4><p>${data.desc}</p><div class="upg-level">${pips}</div></div><button class="buy-btn" ${isMax || playerData.stardust < cost ? 'disabled' : ''} onclick="buyUpgrade('${key}')">${isMax ? 'MAX' : 'GELİŞTİR'} ${!isMax ? `<span class="cost-text">${cost} ◆</span>` : ''}</button></div>`;
    };
    ['playerSpeed', 'playerTurn', 'playerMagnet'].forEach(k => pList.innerHTML += createCard(k, UPGRADES[k]));
    ['echoSpeed', 'echoRange', 'echoDurability'].forEach(k => eList.innerHTML += createCard(k, UPGRADES[k]));
}
window.buyUpgrade = function(key) {
    const data = UPGRADES[key]; const currentLvl = playerData.upgrades[key]; if(currentLvl >= data.max) return;
    const cost = Math.floor(data.baseCost * Math.pow(1.5, currentLvl));
    if(playerData.stardust >= cost) { 
        playerData.stardust -= cost; 
        playerData.upgrades[key]++; 
        playerData.stats.totalSpentStardust += cost; // Harcanan kristal kaydı
        audio.playCash(); player.updateUI(); renderUpgrades(); updateEchoDropdownUI(); 
    }
};

function showToxicEffect() { const el = document.getElementById('toxic-overlay'); el.classList.add('active'); setTimeout(() => el.classList.remove('active'), 1500); }

// --- YENİ BİLDİRİM SİSTEMİ (CHAT) ---
function showNotification(planet, suffix) {
    let msg = "";
    let type = "loot";
    const name = planet.name || "";

    // Mesaj İçeriğine Göre Akıllı Formatlama
    if (name === "ROTA OLUŞTURULDU") {
        msg = `Sistem: Rota oluşturuldu.`;
        type = "info";
    } else if (name.includes("EVRİM GEÇİRİLDİ")) {
        msg = `Sistem: ${name}`;
        type = "info";
    } else if (name.includes("YANKI DOĞDU") || name.includes("YANKI AYRILDI") || name.includes("YANKI: ŞARJ")) {
        msg = `Sistem: ${name}`;
        type = "info";
    } else if (name.includes("ENERJİ")) {
         msg = `${name} ${suffix}`;
         type = "info";
    } else if (name.includes("ZEHİR") || name.includes("TEHLİKE") || name.includes("YANKI ZEHİRLENDİ")) {
        msg = `UYARI: ${name} ${suffix}`;
        type = "alert";
    } else if (name.includes("KAYIP KARGO")) {
        msg = `Keşif: ${name} bulundu!`;
        type = "info";
    } else if (planet.type && (planet.type.id === 'common' || planet.type.id === 'rare' || planet.type.id === 'epic' || planet.type.id === 'legendary')) {
        // Sadece gerçek eşyalar için "Toplandı" yaz
        msg = `Toplandı: ${name} ${suffix}`;
        type = "loot";
    } else {
        // Diğer durumlar için varsayılan
        msg = `${name} ${suffix}`;
        type = "info";
    }
    
    addChatMessage(msg, type, 'bilgi');
}

function addChatMessage(text, type = 'system', channel = 'bilgi') {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const msgObj = { text, type, time: timeStr };
    
    // Mesajı ilgili kanala ekle
    chatHistory[channel].push(msgObj);
    
    // "Genel" kanalı, "Bilgi" ve "Grup" kanallarını da kapsar (Aggregator)
    if (channel !== 'genel') {
        chatHistory['genel'].push(msgObj);
    }
    
    // Eğer şu an açık olan tab bu kanalsa veya Genel ise arayüzü güncelle
    if (activeChatTab === channel || activeChatTab === 'genel') {
        const chatContent = document.getElementById('chat-content');
        const div = document.createElement('div');
        div.className = `chat-message ${type}`;
        div.innerHTML = `<span class="chat-timestamp">[${timeStr}]</span> ${text}`;
        chatContent.appendChild(div);
        chatContent.scrollTop = chatContent.scrollHeight;
    }
}

function switchChatTab(tab) {
    activeChatTab = tab;
    
    // Tab stili güncelleme
    document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    
    // Input alanını Bilgi kanalında gizle
    const inputArea = document.getElementById('chat-input-area');
    if(tab === 'bilgi') inputArea.style.display = 'none';
    else inputArea.style.display = 'flex';

    // İçeriği temizle ve yeniden doldur
    const chatContent = document.getElementById('chat-content');
    chatContent.innerHTML = '';
    
    chatHistory[tab].forEach(msg => {
        const div = document.createElement('div');
        div.className = `chat-message ${msg.type}`;
        div.innerHTML = `<span class="chat-timestamp">[${msg.time}]</span> ${msg.text}`;
        chatContent.appendChild(div);
    });
    chatContent.scrollTop = chatContent.scrollHeight;
}

function sendUserMessage() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if(!msg) return;

    // Şimdilik sadece sistem uyarısı ver
    input.value = '';
    
    addChatMessage(`Pilot: ${msg}`, 'loot', activeChatTab); // Kendi mesajımızı gri (loot rengi) gösterelim
    setTimeout(() => {
        addChatMessage("Sistem: İletişim kanallarında parazit var. Mesaj iletilemedi (Bakımda).", 'alert', activeChatTab);
    }, 200);
}

// Chat Input Event Listeners
document.getElementById('chat-send-btn').addEventListener('click', sendUserMessage);
document.getElementById('chat-input').addEventListener('keydown', (e) => {
    if(e.key === 'Enter') sendUserMessage();
});

function drawTargetIndicator(targetX, targetY, color) {
    const camCX = player.x; const camCY = player.y; const dx = targetX - camCX; const dy = targetY - camCY;
    const screenHalfW = (width / currentZoom) / 2; const screenHalfH = (height / currentZoom) / 2;
    if (Math.abs(dx) > screenHalfW || Math.abs(dy) > screenHalfH) {
        const angle = Math.atan2(dy, dx); const borderW = screenHalfW * 0.9; const borderH = screenHalfH * 0.9;
        let tx = Math.cos(angle) * borderW; let ty = Math.sin(angle) * borderH;
        if (Math.abs(tx) > borderW) tx = Math.sign(tx) * borderW; if (Math.abs(ty) > borderH) ty = Math.sign(ty) * borderH;
        const screenX = width/2 + tx * currentZoom; const screenY = height/2 + ty * currentZoom;
        const distKM = Math.round(Math.hypot(dx, dy) / 100); 
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.translate(screenX, screenY); ctx.rotate(angle + Math.PI/2);
        ctx.fillStyle = color; ctx.shadowBlur = 10; ctx.shadowColor = color; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(6, 6); ctx.lineTo(-6, 6); ctx.fill();
        ctx.rotate(-(angle + Math.PI/2)); ctx.fillStyle = color; ctx.font = "bold 10px monospace"; ctx.fillText(distKM + "m", 10, 0);
        ctx.restore();
    }
}

function drawBigMap() {
    if(!mapOpen) return;
    const container = document.querySelector('.big-map-container');
    bmCanvas.width = container.clientWidth; bmCanvas.height = container.clientHeight;
    bmCtx.clearRect(0, 0, bmCanvas.width, bmCanvas.height);

    const margin = 50;
    const scale = Math.min((bmCanvas.width - margin*2) / WORLD_SIZE, (bmCanvas.height - margin*2) / WORLD_SIZE);
    const offsetX = (bmCanvas.width - WORLD_SIZE * scale) / 2;
    const offsetY = (bmCanvas.height - WORLD_SIZE * scale) / 2;

    bmCtx.strokeStyle = "rgba(255,255,255,0.1)"; bmCtx.lineWidth = 2;
    bmCtx.strokeRect(offsetX, offsetY, WORLD_SIZE*scale, WORLD_SIZE*scale);

    bmCtx.fillStyle = "rgba(255,255,255,0.3)";
    planets.forEach(p => {
        if(!p.collected) {
            bmCtx.beginPath(); 
            // Tardigrad için özel renk
            if (p.type.id === 'tardigrade') bmCtx.fillStyle = "#C7C0AE";
            else bmCtx.fillStyle = "rgba(255,255,255,0.3)";
            bmCtx.arc(offsetX + p.x*scale, offsetY + p.y*scale, 2, 0, Math.PI*2); bmCtx.fill();
        }
    });

    bmCtx.fillStyle = "white"; bmCtx.beginPath(); bmCtx.arc(offsetX + nexus.x*scale, offsetY + nexus.y*scale, 5, 0, Math.PI*2); bmCtx.fill();
    bmCtx.strokeStyle = "white"; bmCtx.beginPath(); bmCtx.arc(offsetX + nexus.x*scale, offsetY + nexus.y*scale, 10, 0, Math.PI*2); bmCtx.stroke();

    if(echoRay) { bmCtx.fillStyle = "#67e8f9"; bmCtx.beginPath(); bmCtx.arc(offsetX + echoRay.x*scale, offsetY + echoRay.y*scale, 4, 0, Math.PI*2); bmCtx.fill(); }

    bmCtx.save(); bmCtx.translate(offsetX + player.x*scale, offsetY + player.y*scale); bmCtx.rotate(player.angle + Math.PI/2);
    bmCtx.fillStyle = "#38bdf8"; bmCtx.beginPath(); bmCtx.moveTo(0, -8); bmCtx.lineTo(6, 8); bmCtx.lineTo(-6, 8); bmCtx.fill(); bmCtx.restore();

    if(manualTarget) {
        const tx = offsetX + manualTarget.x*scale; const ty = offsetY + manualTarget.y*scale;
        bmCtx.strokeStyle = "#ef4444"; bmCtx.setLineDash([5, 5]); bmCtx.beginPath(); bmCtx.moveTo(offsetX + player.x*scale, offsetY + player.y*scale); bmCtx.lineTo(tx, ty); bmCtx.stroke(); bmCtx.setLineDash([]);
        bmCtx.beginPath(); bmCtx.arc(tx, ty, 5, 0, Math.PI*2); bmCtx.stroke();
    }
}

bmCanvas.addEventListener('mousedown', (e) => {
        const rect = bmCanvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left; const clickY = e.clientY - rect.top;
        const margin = 50;
        const scale = Math.min((bmCanvas.width - margin*2) / WORLD_SIZE, (bmCanvas.height - margin*2) / WORLD_SIZE);
        const offsetX = (bmCanvas.width - WORLD_SIZE * scale) / 2;
        const offsetY = (bmCanvas.height - WORLD_SIZE * scale) / 2;

        const worldX = (clickX - offsetX) / scale; const worldY = (clickY - offsetY) / scale;
        if(worldX >= 0 && worldX <= WORLD_SIZE && worldY >= 0 && worldY <= WORLD_SIZE) {
            manualTarget = {x: worldX, y: worldY};
            autopilot = true; aiMode = 'travel';
            document.getElementById('btn-ai-toggle').classList.add('active');
            updateAIButton();
            showNotification({name: "ROTA OLUŞTURULDU", type:{color:'#fff'}}, "");
        }
});

// CLICK LISTENER FOR ECHO ENERGY BAR
canvas.addEventListener('mousedown', (e) => {
    if (!echoRay) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    // Convert echo world pos to screen pos
    const screenX = (echoRay.x - player.x) * currentZoom + width/2;
    const screenY = (echoRay.y - player.y) * currentZoom + height/2;
    
    // Simple distance check (40px radius)
    const dist = Math.hypot(mx - screenX, my - screenY);
    if (dist < 40 * currentZoom) {
        echoRay.energyDisplayTimer = 240; // ~4 seconds at 60fps
    }
});

function closeMap() {
    mapOpen = false;
    document.getElementById('big-map-overlay').classList.remove('active');
}

function init() {
    player = new VoidRay(); nexus = new Nexus(); audio = new ZenAudio();
    planets = []; 
    gameStartTime = Date.now(); // Oyun başlangıç zamanını kaydet
    lastFrameTime = Date.now(); // Frame timer başlat
    
    for(let i=0; i<1200; i++) planets.push(new Planet());
    stars = []; for(let i=0; i<5000; i++) stars.push({x:Math.random()*WORLD_SIZE, y:Math.random()*WORLD_SIZE, s:Math.random()*2});
    player.updateUI(); updateInventoryCount(); isPaused = false;
    startTipsCycle();
    
    // SİNEMATİK BAŞLANGIÇ AYARLARI
    currentZoom = 0.2; // Çok uzaktan başla
    targetZoom = 1.0;  // Normale doğru git
    window.cinematicMode = true; // Sinematik modu aç (window üzerinden global)

    // Atmosferik Başlangıç Mesajları
    addChatMessage("Sistem başlatılıyor...", "system", "genel");
    setTimeout(() => addChatMessage("Optik sensörler kalibre ediliyor...", "info", "genel"), 1000);
    setTimeout(() => addChatMessage("Hoş geldin, Pilot. Motorlar aktif.", "loot", "genel"), 3500);
}

function startTipsCycle() {
    let tipIdx = 0;
    const tipEl = document.getElementById('tip-text');
    setInterval(() => {
        tipIdx = (tipIdx + 1) % TIPS.length;
        tipEl.style.opacity = 0;
        setTimeout(() => {
            tipEl.innerText = TIPS[tipIdx];
            tipEl.style.opacity = 1;
        }, 1000);
    }, 5000);
}

function startLoop() {
    if(animationId) cancelAnimationFrame(animationId);
    loop();
}

function loop() {
    if(!isPaused) {
        const now = Date.now();
        const dt = now - lastFrameTime;
        lastFrameTime = now;

        // ZOOM MANTIĞI (Sinematik Mod Entegrasyonu)
        let zoomSpeed = 0.1; // Standart hız
        if (window.cinematicMode) {
            zoomSpeed = 0.02; // Sinematik modda çok daha yavaş ve akıcı zoom
            // Hedefe çok yaklaştıysa sinematik modu bitir
            if (Math.abs(targetZoom - currentZoom) < 0.01) {
                window.cinematicMode = false;
            }
        }
        currentZoom += (targetZoom - currentZoom) * zoomSpeed;

        player.update(dt); // DT gönder
        if(echoRay) echoRay.update(); nexus.update();

        // AI Timer update
        if(autopilot) {
            playerData.stats.timeAI += dt;
        }

        // İstatistik paneli açıksa güncelle
        if(statsOpen) {
            renderStats();
        }

        planets = planets.filter(p => !p.collected);
        if (planets.length < 1200) {
            const needed = 1200 - planets.length;
            for(let i=0; i<needed; i++) {
                let px, py, d; do { px = Math.random() * WORLD_SIZE; py = Math.random() * WORLD_SIZE; d = Math.hypot(px - player.x, py - player.y); } while(d < 2000);
                planets.push(new Planet(px, py));
            }
        }

        if (keys.Escape) { 
            if (inventoryOpen) closeInventory();
            else if (echoInvOpen) closeEchoInventory();
            else if (nexusOpen) exitNexus();
            else if (mapOpen) closeMap();
            else if (statsOpen) closeStats(); // İstatistik panelini kapat
            else if (document.getElementById('sound-panel').classList.contains('open')) document.getElementById('sound-panel').classList.remove('open');
            else togglePause();
            keys.Escape = false;
        }

        if (keys.q) { 
            // Chat inputuna yazarken oyun kontrollerini engelle
            if(document.activeElement === document.getElementById('chat-input')) return;

            autopilot = !autopilot; 
            if(!autopilot) { manualTarget = null; aiMode = 'gather'; }
            else { aiMode = 'gather'; } 
            updateAIButton();
            keys.q = false; 
        }
        if (keys.m) { 
            if(document.activeElement === document.getElementById('chat-input')) return;
            mapOpen = !mapOpen; const overlay = document.getElementById('big-map-overlay'); if(mapOpen) overlay.classList.add('active'); else overlay.classList.remove('active'); keys.m = false; 
        }

        ctx.fillStyle = "#020204"; ctx.fillRect(0,0,width,height);
        ctx.fillStyle="white"; stars.forEach(s => { let sx = (s.x - player.x * 0.9) % width; let sy = (s.y - player.y * 0.9) % height; if(sx<0) sx+=width; if(sy<0) sy+=height; ctx.globalAlpha = 0.7; ctx.fillRect(sx, sy, s.s, s.s); }); ctx.globalAlpha = 1;

        ctx.save(); ctx.translate(width/2, height/2); ctx.scale(currentZoom, currentZoom); ctx.translate(-player.x, -player.y);
        nexus.draw(ctx);
        for(let i=particles.length-1; i>=0; i--) { particles[i].update(); particles[i].draw(ctx); if(particles[i].life<=0) particles.splice(i,1); }
        
        planets.forEach(p => { 
            const viewW = width / currentZoom; const viewH = height / currentZoom; 
            if(p.x > player.x - viewW && p.x < player.x + viewW && p.y > player.y - viewH && p.y < player.y + viewH) { p.draw(ctx, 0, 0); } 
            if(!p.collected) { 
                if(Math.hypot(player.x-p.x, player.y-p.y) < p.radius + 30*player.scale) { 
                    if(p.type.id === 'toxic') { 
                        audio.playToxic(); showToxicEffect(); for(let i=0; i<30; i++) particles.push(new Particle(p.x, p.y, '#84cc16')); 
                        if(echoRay && echoRay.attached) { echoRay = null; echoDeathLevel = player.level; document.getElementById('echo-wrapper-el').style.display = 'none'; if(echoInvOpen) closeEchoInventory(); showNotification({name: "YANKI ZEHİRLENDİ...", type:{color:'#ef4444'}}, ""); } 
                        else { const now = Date.now(); if (now - lastToxicNotification > 2000) { showNotification({name: "ZARARLI GAZ TESPİT EDİLDİ", type:{color:'#84cc16'}}, ""); lastToxicNotification = now; } } 
                    } else if (p.type.id === 'lost') { 
                        p.collected = true; audio.playChime({id:'legendary'}); showNotification({name: "KAYIP KARGO KURTARILDI!", type:{color:'#a855f7'}}, ""); 
                        if (p.lootContent && p.lootContent.length > 0) { p.lootContent.forEach(item => { addItemToInventory(item); player.gainXp(item.type.xp); }); } 
                    } else if (p.type.id === 'tardigrade') {
                        p.collected = true; 
                        audio.playChime(p.type); 
                        player.energy = Math.min(player.energy + 50, player.maxEnergy);
                        showNotification({name: "TARDİGRAD YENDİ (+%50 ENERJİ)", type:{color:'#C7C0AE'}}, "");
                        player.gainXp(p.type.xp);
                    } else { 
                        p.collected = true; audio.playChime(p.type); 
                        const lootCount = Math.floor(Math.random() * 4) + 1; 
                        for(let i=0; i<lootCount; i++) { addItemToInventory(p); player.gainXp(p.type.xp); }
                        showNotification(p, lootCount > 1 ? `x${lootCount}` : ""); 
                    } 
                } 
            } 
        });

        if(echoRay) echoRay.draw(ctx);
        player.draw(ctx); ctx.restore();
        
        // NEXUS VE ECHO PROMPT MANTIĞI
        const promptEl = document.getElementById('merge-prompt');
        const distNexus = Math.hypot(player.x - nexus.x, player.y - nexus.y);
        let showNexusPrompt = (distNexus < nexus.radius + 300) && !nexusOpen;
        
        if (showNexusPrompt) {
            promptEl.innerText = "[E] NEXUS'A GİRİŞ YAP";
            promptEl.className = 'visible';
            if (keys.e) { 
                if(document.activeElement !== document.getElementById('chat-input')) {
                    enterNexus(); keys.e = false; 
                }
            }
        } else if (echoRay && !nexusOpen && !mapOpen) {
            const distEcho = Math.hypot(player.x - echoRay.x, player.y - echoRay.y);
            if (!echoRay.attached && distEcho < 300) { 
                promptEl.innerText = "[F] BİRLEŞ"; promptEl.className = 'visible'; 
                if(keys.f) { 
                    if(document.activeElement !== document.getElementById('chat-input')) {
                        echoManualMerge(); keys.f = false; 
                    }
                } 
            } else if (echoRay.attached) { 
                    promptEl.className = ''; 
                    if(keys.f) { 
                        if(document.activeElement !== document.getElementById('chat-input')) {
                            echoRay.attached = false; echoRay.mode = 'roam'; updateEchoDropdownUI(); keys.f = false; showNotification({name: "YANKI AYRILDI", type:{color:'#67e8f9'}}, ""); 
                        }
                    } 
            } else {
                promptEl.className = '';
            }
        } else {
                promptEl.className = '';
        }

        if(echoRay && !echoRay.attached) drawTargetIndicator(echoRay.x, echoRay.y, "#67e8f9");
        drawTargetIndicator(nexus.x, nexus.y, "#ffffff");
        drawMiniMap();
        if(mapOpen) drawBigMap();
    }
    animationId = requestAnimationFrame(loop);
}

function togglePause() { isPaused = true; document.getElementById('pause-overlay').classList.add('active'); }
function resumeGame() { isPaused = false; document.getElementById('pause-overlay').classList.remove('active'); }
function quitToMain() { document.getElementById('pause-overlay').classList.remove('active'); document.getElementById('main-menu').classList.remove('menu-hidden'); isPaused = true; if(animationId) cancelAnimationFrame(animationId); }

function drawMiniMap() {
    mmCtx.clearRect(0,0,180,180); 
    // Yuvarlak maskeleme
    mmCtx.save(); 
    mmCtx.beginPath(); mmCtx.arc(90,90,90,0,Math.PI*2); mmCtx.clip();
    
    const scale = 180/30000; const cx = 90, cy = 90;
    
    // Draw Nexus on MM
    const nx = (nexus.x-player.x)*scale + cx; const ny = (nexus.y-player.y)*scale + cy;
    if(nx > 0 && nx < 180 && ny > 0 && ny < 180) {
            mmCtx.fillStyle = "white"; mmCtx.beginPath(); mmCtx.arc(nx, ny, 2, 0, Math.PI*2); mmCtx.fill();
    }

    if(echoRay) { 
        const ex = (echoRay.x-player.x)*scale + cx, ey = (echoRay.y-player.y)*scale + cy; 
        if(ex > 0 && ex < 180 && ey > 0 && ey < 180) {
            mmCtx.fillStyle = "#67e8f9"; mmCtx.beginPath(); mmCtx.arc(ex, ey, 2, 0, Math.PI*2); mmCtx.fill(); 
        }
    }
    
    mmCtx.fillStyle = "rgba(255,255,255,0.4)";
    planets.forEach(p => {
        if(!p.collected) {
            let px = (p.x-player.x)*scale + cx; let py = (p.y-player.y)*scale + cy;
            if(px > 0 && px < 180 && py > 0 && py < 180) {
                if(p.type.id === 'lost') mmCtx.fillStyle = "#a855f7";
                else if(p.type.id === 'tardigrade') mmCtx.fillStyle = "#C7C0AE";
                else mmCtx.fillStyle = "rgba(255,255,255,0.4)";
                mmCtx.beginPath(); mmCtx.arc(px, py, 1, 0, Math.PI*2); mmCtx.fill();
            }
        }
    });
    
        if(manualTarget) {
        const tx = (manualTarget.x-player.x)*scale + cx; const ty = (manualTarget.y-player.y)*scale + cy;
        mmCtx.strokeStyle = "#ef4444"; mmCtx.lineWidth = 1; mmCtx.setLineDash([2, 2]); mmCtx.beginPath(); mmCtx.moveTo(cx, cy); mmCtx.lineTo(tx, ty); mmCtx.stroke(); mmCtx.setLineDash([]);
    }

    // Player is always center
    mmCtx.translate(cx, cy); mmCtx.rotate(player.angle+Math.PI/2);
    mmCtx.fillStyle="#38bdf8"; mmCtx.beginPath(); mmCtx.moveTo(0,-4); mmCtx.lineTo(-3,4); mmCtx.lineTo(3,4); mmCtx.fill(); mmCtx.restore();
    mmCtx.restore(); // Clip restore
}

window.addEventListener('keydown', e => { 
    // Chat input aktifse tuşları engelle (Enter ve Escape hariç)
    if(document.activeElement === document.getElementById('chat-input')) {
        if(e.key === "Escape") {
            document.getElementById('chat-input').blur(); // Focus'tan çık
        }
        return; 
    }

    if(e.code === "Space") e.preventDefault(); 
    if(e.key === "Escape") keys.Escape = true; 
    else if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true; 
    else if(e.code === "Space") keys[" "] = true; 
    else if(keys.hasOwnProperty(e.code)) keys[e.code] = true; 
    
    // Q TUŞU MANTIĞI (GÜNCELLENDİ)
    if(e.key.toLowerCase() === 'q') { 
        if (!autopilot) {
            // 1. Basım: AI Aç (Topla Modu)
            autopilot = true;
            aiMode = 'gather';
            addChatMessage("Otopilot: Toplama protokolü devreye alındı.", "info", "genel");
        } else if (aiMode === 'gather' || aiMode === 'travel') {
            // 2. Basım: Üs Moduna Geç
            aiMode = 'base';
            addChatMessage("Otopilot: Üsse dönüş rotası hesaplanıyor.", "info", "genel");
        } else {
            // 3. Basım: AI Kapat
            autopilot = false;
            manualTarget = null;
            addChatMessage("Otopilot: Devre dışı. Manuel kontrol aktif.", "system", "genel");
        }
        updateAIButton();
        keys.q = false; 
    }

    if(e.key.toLowerCase() === 'm') { 
        if(document.activeElement === document.getElementById('chat-input')) return;
        mapOpen = !mapOpen; const overlay = document.getElementById('big-map-overlay'); if(mapOpen) overlay.classList.add('active'); else overlay.classList.remove('active'); keys.m = false; 
    }
    
    if(e.key.toLowerCase() === 'i') { inventoryOpen=!inventoryOpen; document.getElementById('inventory-overlay').classList.toggle('open'); if(inventoryOpen) renderInventory(); } 
});

window.addEventListener('keyup', e => { if(e.key === "Escape") keys.Escape = false; else if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false; else if(e.code === "Space") keys[" "] = false; else if(keys.hasOwnProperty(e.code)) keys[e.code] = false; });

// SCROLL EVENT (ZOOM) - CHAT ÜZERİNDEYKEN ÇALIŞMASIN
window.addEventListener('wheel', e => { 
    // Eğer mouse chat content üzerindeyse, varsayılan scroll davranışına izin ver ve zoom yapma
    if (e.target.closest('#chat-content')) {
        return; 
    }
    
    // Sinematik modda zoom yapmayı engelle
    if (window.cinematicMode) return;

    e.preventDefault(); 
    targetZoom += e.deltaY * -0.001; 
    targetZoom = Math.min(Math.max(0.5, targetZoom), 1.5); 
}, { passive: false });

document.getElementById('btn-start').addEventListener('click', () => { document.getElementById('main-menu').classList.add('menu-hidden'); init(); audio.init(); startLoop(); document.getElementById('bgMusic').play().catch(e=>console.log(e)); });
document.getElementById('btn-inv-icon').addEventListener('click', () => { inventoryOpen=true; document.getElementById('inventory-overlay').classList.add('open'); renderInventory(); });
document.getElementById('btn-close-inv').addEventListener('click', () => { inventoryOpen=false; document.getElementById('inventory-overlay').classList.remove('open'); });
document.getElementById('btn-ai-toggle').addEventListener('click', () => { autopilot = !autopilot; if(!autopilot) { manualTarget=null; aiMode='gather'; } else { aiMode='gather'; } updateAIButton(); });

// STATS BUTTON LISTENER
document.getElementById('btn-stats-icon').addEventListener('click', () => {
    openStats();
});

function resize() { width = window.innerWidth; height = window.innerHeight; canvas.width = width; canvas.height = height; mmCanvas.width = 180; mmCanvas.height = 180; bmCanvas.width = window.innerWidth; bmCanvas.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();