// --- AYARLAR ---
const WORLD_SIZE = 120000; 
const RARITY = {
    COMMON:    { id: 'common',    name: 'Madde',   color: '#94a3b8', prob: 0.5, xp: 10, value: 10 },
    RARE:      { id: 'rare',      name: 'Kristal',   color: '#38bdf8', prob: 0.2, xp: 40, value: 30 },
    EPIC:      { id: 'epic',      name: 'Öz',        color: '#c084fc', prob: 0.1, xp: 100, value: 100 },
    LEGENDARY: { id: 'legendary', name: 'Yadigâr',   color: '#fbbf24', prob: 0.04, xp: 500, value: 400 },
    TOXIC:     { id: 'toxic',     name: 'Zehir',     color: '#84cc16', prob: 0.01, xp: 0, value: 0 },
    TARDIGRADE:{ id: 'tardigrade',name: 'Tardigrad Yuvası', color: '#C7C0AE', prob: 0.02, xp: 20, value: 0 }, 
    LOST:      { id: 'lost',      name: 'Kayıp Kargo', color: '#a855f7', prob: 0, xp: 0, value: 0 }
};
const LOOT_DB = {
    common: ["Hidrojen", "Karbon Tozu", "Demir", "Silika"],
    rare: ["Buz Çekirdeği", "Safir", "İyonize Gaz"],
    epic: ["Nebula Özü", "Yıldız Parçası", "Plazma"], // Nebula Özü burada
    legendary: ["Zaman Kristali", "Kara Delik Kalıntısı"],
    toxic: ["Zehirli Gaz", "Asit Bulutu"],
    tardigrade: ["Tardigrad"],
    lost: ["KAYIP SİNYAL"]
};

const UPGRADES = {
    playerSpeed: { name: "İyon Motorları", desc: "Maksimum uçuş hızı.", baseCost: 100, max: 5 },
    playerTurn:  { name: "Manevra İticileri", desc: "Dönüş kabiliyeti.", baseCost: 150, max: 5 },
    playerMagnet:{ name: "Çekim Alanı", desc: "Eşya toplama mesafesi.", baseCost: 200, max: 5 },
    echoSpeed:   { name: "Yankı Hızı", desc: "Yankı'nın uçuş hızı.", baseCost: 150, max: 5 },
    echoRange:   { name: "Sensör Ağı", desc: "Yankı'nın toplama çapı.", baseCost: 250, max: 5 },
    echoDurability: { name: "Yankı Bataryası", desc: "Enerji tüketim verimliliği.", baseCost: 200, max: 5 }
};

let playerData = { stardust: 0, upgrades: { playerSpeed: 0, playerTurn: 0, playerMagnet: 0, echoSpeed: 0, echoRange: 0, echoDurability: 0 } };
const TIPS = [
    "Enerjinizi yenilemek için Tardigradlar çok değerlidir.",
    "Yankı, Nexus istasyonunda enerjisini yenileyebilir.",
    "Mor sinyaller değerli kayıp kargoları işaret eder.",
    "Zehirli bölgelerden (Yeşil) uzak durun, enerji tüketir.",
    "Space tuşu ile kısa süreli hızlanabilirsiniz (Enerji harcar)."
];

let volMusic = 0.5, volSFX = 0.8;
let lastToxicNotification = 0; 
let currentZoom = 1.0, targetZoom = 1.0;
let isPaused = false;
let animationId = null;
let manualTarget = null; 

// --- SES ---
class ZenAudio {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.bgMusic = document.getElementById('bgMusic');
        this.bgMusic.volume = volMusic;
        this.scale = [196.00, 220.00, 261.63, 293.66, 329.63, 392.00];
        this.lastChimeTime = 0; 
        this.lastEvolveTime = 0;
    }
    init() { if(this.ctx.state === 'suspended') this.ctx.resume(); }
    
    playChime(rarity) {
        const now = this.ctx.currentTime;
        if (now - this.lastChimeTime < 0.08) return;
        this.lastChimeTime = now;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        const freq = this.scale[Math.floor(Math.random()*this.scale.length)];
        
        if (rarity.id === 'lost') osc.type = 'square';
        else if (rarity.id === 'tardigrade') osc.type = 'triangle';
        else osc.type = rarity.id === 'legendary' ? 'triangle' : 'sine';
        
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volSFX * 0.2, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 3);
        
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(now + 3.1);
    }

    // GÜNCELLENMİŞ SATIŞ SESİ (Cute Synth Blip)
    playCash() {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, t);
        osc.frequency.exponentialRampToValueAtTime(1000, t + 0.1);
        
        gain.gain.setValueAtTime(volSFX * 0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(t + 0.35);
    }
    
    playEvolve() {
        const now = this.ctx.currentTime;
        if (now - this.lastEvolveTime < 0.5) return; 
        this.lastEvolveTime = now;

        const osc = this.ctx.createOscillator(); 
        const gain = this.ctx.createGain();
        osc.type = 'triangle'; 
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(600, now+2);
        gain.gain.setValueAtTime(volSFX*0.3, now);
        gain.gain.linearRampToValueAtTime(0, now+2.5);
        osc.connect(gain); gain.connect(this.ctx.destination); 
        osc.start(); osc.stop(now+3);
    }
    
    playToxic() {
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime+0.4);
        gain.gain.setValueAtTime(volSFX*0.5, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime+0.4);
        osc.connect(gain); gain.connect(this.ctx.destination); osc.start(); osc.stop(this.ctx.currentTime+0.5);
    }
}

// --- OYUN DEĞİŞKENLERİ ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const mmCanvas = document.getElementById('minimap-canvas');
const mmCtx = mmCanvas.getContext('2d');
const bmCanvas = document.getElementById('big-map-canvas');
const bmCtx = bmCanvas.getContext('2d');

let width, height, player, echoRay = null, nexus = null, audio;
let planets = [], stars = [], collectedItems = [], particles = [];
let inventoryOpen = false, echoInvOpen = false, nexusOpen = false, mapOpen = false;
let activeFilter = 'all';

let autopilot = false;
let aiMode = 'gather';
let echoDeathLevel = 0;
let lowEnergyWarned = false;

const keys = { w:false, a:false, s:false, d:false, " ":false, f:false, q:false, e:false, m:false, Escape:false };

// --- NEXUS ---
class Nexus {
    constructor() { this.x = WORLD_SIZE/2; this.y = WORLD_SIZE/2; this.radius = 300; this.rotation = 0; }
    update() {
        this.rotation += 0.002;
        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        if (dist < this.radius + 200 && !nexusOpen) { 
            document.getElementById('merge-prompt').innerText = "[E] NEXUS'A GİRİŞ YAP";
            document.getElementById('merge-prompt').className = 'visible';
            if(keys.e) { enterNexus(); keys.e = false; }
        } else if (nexusOpen || (echoRay && !echoRay.attached && Math.hypot(player.x-echoRay.x, player.y-echoRay.y) < 300)) {
            if(nexusOpen) document.getElementById('merge-prompt').className = '';
        } else {
             document.getElementById('merge-prompt').className = '';
        }
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rotation);
        ctx.beginPath(); ctx.arc(0,0, this.radius, 0, Math.PI*2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"; ctx.lineWidth = 20; ctx.stroke();
        ctx.strokeStyle = "rgba(56, 189, 248, 0.8)"; ctx.lineWidth = 2; ctx.stroke();
        for(let i=0; i<4; i++) { ctx.rotate(Math.PI/2); ctx.fillStyle = "rgba(15, 23, 42, 0.9)"; ctx.fillRect(-50, -this.radius, 100, 100); ctx.fillStyle = "rgba(56, 189, 248, 0.5)"; ctx.fillRect(-40, -this.radius+10, 80, 20); }
        ctx.beginPath(); ctx.arc(0,0, 80, 0, Math.PI*2); ctx.fillStyle = "#000"; ctx.fill();
        ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 5; ctx.stroke();
        ctx.shadowBlur = 50; ctx.shadowColor = "#38bdf8"; ctx.fillStyle = "#e0f2fe"; ctx.beginPath(); ctx.arc(0,0, 30, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }
}

// --- VOID RAY (PLAYER) ---
class VoidRay {
    constructor() {
        this.x = WORLD_SIZE/2 + 600; this.y = WORLD_SIZE/2 + 600;
        this.vx = 0; this.vy = 0; this.angle = -Math.PI/2;
        this.roll = 0; this.wingState = 0; this.wingPhase = 0;
        this.scale = 1; this.level = 1; this.xp = 0; this.maxXp = 150; 
        this.energy = 100; this.maxEnergy = 100;
        this.tail = []; for(let i=0; i<20; i++) this.tail.push({x:this.x, y:this.y});
    }
    gainXp(amount) { this.xp += amount; if(this.xp >= this.maxXp) this.levelUp(); this.updateUI(); }
    levelUp() {
        this.level++; this.xp = 0; this.maxXp *= 1.5; this.scale += 0.1; 
        audio.playEvolve(); showNotification({name: `EVRİM GEÇİRİLDİ: SEVİYE ${this.level}`, type:{color:'#fff'}}, "");
        if (!echoRay && (this.level === 3 || (this.level > 3 && this.level >= echoDeathLevel + 3))) spawnEcho(this.x, this.y);
    }
    updateUI() {
        document.getElementById('level-val').innerText = this.level;
        document.getElementById('xp-fill').style.width = `${(this.xp/this.maxXp)*100}%`;
        document.getElementById('stardust-amount').innerText = playerData.stardust;
    }
    update() {
        const spdMult = 1 + (playerData.upgrades.playerSpeed * 0.15);
        const turnMult = 1 + (playerData.upgrades.playerTurn * 0.2);
        
        const BOOST = keys[" "] ? 0.6 : 0; // Hız artışı
        let ACCEL = 0.2 + BOOST;
        
        const MAX_SPEED = (keys[" "] ? 18 : 10) * (1 + this.scale * 0.05) * spdMult; 
        const TURN_SPEED = (0.05 / Math.sqrt(this.scale)) * turnMult; 

        // Enerji Tüketimi ve Dolumu
        const currentSpeed = Math.hypot(this.vx, this.vy);
        
        if (keys[" "] && this.energy > 0) {
             this.energy = Math.max(0, this.energy - 0.05); 
        } else if (currentSpeed > 2) {
             this.energy = Math.max(0, this.energy - 0.002);
        } else {
             this.energy = Math.min(this.maxEnergy, this.energy + 0.01);
        }
        
        if (this.energy < 10 && !lowEnergyWarned) {
            showNotification({name: "ENERJİ KRİTİK SEVİYEDE!", type:{color:'#ef4444'}}, "");
            lowEnergyWarned = true;
        } else if (this.energy > 15) {
            lowEnergyWarned = false;
        }

        if (this.energy <= 0 && keys[" "]) {
            ACCEL = 0.2; // Boost'suz ivme
        }

        const bar = document.getElementById('energy-bar-fill');
        bar.style.width = (this.energy/this.maxEnergy*100) + '%';
        if(this.energy < 20) bar.style.background = '#ef4444';
        else bar.style.background = '#38bdf8';

        let targetRoll = 0; let targetWingState = 0;

        if (autopilot) {
            let targetX, targetY, doThrust = true;
            if (aiMode === 'base') {
                 targetX = nexus.x; targetY = nexus.y;
                 const distToNexus = Math.hypot(this.x - nexus.x, this.y - nexus.y);
                 if(distToNexus < 400) doThrust = false;
            } else if (aiMode === 'travel' && manualTarget) {
                targetX = manualTarget.x; targetY = manualTarget.y;
                const distToTarget = Math.hypot(this.x - targetX, this.y - targetY);
                if(distToTarget < 200) {
                     doThrust = false; 
                     autopilot = false; manualTarget = null; 
                     showNotification({name: "HEDEFE ULAŞILDI", type:{color:'#fff'}}, "");
                     document.getElementById('btn-ai-toggle').classList.remove('active');
                     updateAIButton();
                }
            } else {
                aiMode = 'gather';
                let nearest = null, minDist = Infinity;
                for(let p of planets) {
                    if(!p.collected && p.type.id !== 'toxic') {
                        const d = (p.x-this.x)**2 + (p.y-this.y)**2;
                        if(d < minDist) { minDist = d; nearest = p; }
                    }
                }
                if(nearest) { targetX = nearest.x; targetY = nearest.y; } 
                else { targetX = this.x + Math.cos(this.angle)*1000; targetY = this.y + Math.sin(this.angle)*1000; }
            }

            if(targetX !== undefined) {
                const targetAngle = Math.atan2(targetY - this.y, targetX - this.x);
                let diff = targetAngle - this.angle;
                while (diff < -Math.PI) diff += Math.PI*2; while (diff > Math.PI) diff -= Math.PI*2;
                this.angle += diff * 0.1;
                
                if(doThrust) {
                    if(Math.abs(diff) < 1.0) {
                        this.vx += Math.cos(this.angle) * ACCEL;
                        this.vy += Math.sin(this.angle) * ACCEL;
                    } else { this.vx *= 0.95; this.vy *= 0.95; }
                } else { this.vx *= 0.9; this.vy *= 0.9; }
                this.wingPhase += 0.2; targetRoll = diff * 5 * 0.6;
            }
        } else {
            if (keys.a) { this.angle -= TURN_SPEED; targetRoll = -0.5 * 0.6; }
            if (keys.d) { this.angle += TURN_SPEED; targetRoll = 0.5 * 0.6; }
            if (keys.w || (keys[" "] && this.energy > 0)) {
                this.vx += Math.cos(this.angle) * ACCEL;
                this.vy += Math.sin(this.angle) * ACCEL;
                targetWingState = -0.8; this.wingPhase += 0.2;
            } else { this.wingPhase += 0.05; }
            if (keys.s) { this.vx *= 0.92; this.vy *= 0.92; targetWingState = 1.2; }
        }

        planets.forEach(p => {
            if(!p.collected && p.type.id !== 'toxic') {
                const dx = p.x - this.x; const dy = p.y - this.y;
                const distSq = dx*dx + dy*dy;
                const magnetRange = 200 * (1 + playerData.upgrades.playerMagnet * 0.5);
                if(distSq < magnetRange**2 && distSq > p.radius**2) {
                    const force = (p.radius * 5) / distSq; 
                    this.vx += (dx / Math.sqrt(distSq)) * force;
                    this.vy += (dy / Math.sqrt(distSq)) * force;
                }
            }
        });

        const speed = Math.hypot(this.vx, this.vy);
        document.getElementById('speed-val').innerText = Math.floor(speed * 10); 
        
        if (speed > MAX_SPEED) { 
            this.vx = (this.vx/speed)*MAX_SPEED; 
            this.vy = (this.vy/speed)*MAX_SPEED; 
        }
        
        this.vx *= 0.98; this.vy *= 0.98; 
        this.x += this.vx; this.y += this.vy;

        this.roll += (targetRoll - this.roll) * 0.05; this.wingState += (targetWingState - this.wingState) * 0.1;
        let targetX = this.x - Math.cos(this.angle) * 20 * this.scale;
        let targetY = this.y - Math.sin(this.angle) * 20 * this.scale;
        this.tail[0].x += (targetX - this.tail[0].x) * 0.5; this.tail[0].y += (targetY - this.tail[0].y) * 0.5;
        for (let i = 1; i < this.tail.length; i++) {
            let prev = this.tail[i-1]; let curr = this.tail[i];
            let dx = prev.x - curr.x; let dy = prev.y - curr.y;
            let d = Math.sqrt(dx*dx + dy*dy); let a = Math.atan2(dy, dx);
            if(d > 5 * this.scale) { curr.x = prev.x - Math.cos(a) * 5 * this.scale; curr.y = prev.y - Math.sin(a) * 5 * this.scale; }
        }
        document.getElementById('coords').innerText = `${Math.floor(this.x)} : ${Math.floor(this.y)}`;
    }
    draw(ctx) {
        ctx.beginPath(); ctx.moveTo(this.tail[0].x, this.tail[0].y);
        for(let i=1; i<this.tail.length-1; i++) { let xc = (this.tail[i].x + this.tail[i+1].x) / 2; let yc = (this.tail[i].y + this.tail[i+1].y) / 2; ctx.quadraticCurveTo(this.tail[i].x, this.tail[i].y, xc, yc); }
        let grad = ctx.createLinearGradient(this.tail[0].x, this.tail[0].y, this.tail[this.tail.length-1].x, this.tail[this.tail.length-1].y);
        grad.addColorStop(0, "rgba(56, 189, 248, 0.9)"); grad.addColorStop(1, "transparent");
        ctx.strokeStyle = grad; ctx.lineWidth = 3 * this.scale; ctx.lineCap = 'round'; ctx.stroke();
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle + Math.PI/2); ctx.scale(this.scale, this.scale); 
        let scaleX = 1 - Math.abs(this.roll) * 0.4; let shiftX = this.roll * 15; let wingTipY = 20 + (this.wingState * 15); let wingTipX = 60 - (this.wingState * 10); let wingFlap = Math.sin(this.wingPhase) * 5;
        ctx.shadowBlur = 25; ctx.shadowColor = "rgba(56, 189, 248, 0.5)"; ctx.fillStyle = "rgba(8, 15, 30, 0.95)";
        ctx.beginPath(); ctx.moveTo(0+shiftX, -30); ctx.bezierCurveTo(15+shiftX, -10, wingTipX+shiftX, wingTipY+wingFlap, 40*scaleX+shiftX, 40); ctx.bezierCurveTo(20+shiftX, 30, 10+shiftX, 40, 0+shiftX, 50); ctx.bezierCurveTo(-10+shiftX, 40, -20+shiftX, 30, -40*scaleX+shiftX, 40); ctx.bezierCurveTo(-wingTipX+shiftX, wingTipY+wingFlap, -15+shiftX, -10, 0+shiftX, -30); ctx.fill();
        ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = "#e0f2fe"; ctx.shadowBlur = 30; ctx.shadowColor = "#0ea5e9"; ctx.beginPath(); ctx.arc(0+shiftX, 0, 5, 0, Math.PI*2); ctx.fill(); ctx.restore();
    }
}

// --- ECHO RAY ---
class EchoRay {
    constructor(x, y) { 
        this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.angle = 0; 
        this.lootBag = []; this.attached = false; this.mode = 'roam'; 
        this.energy = 100;
        this.energyDisplayTimer = 0; // Tıklanınca göstermek için sayaç
    }
    update() {
        // Enerji Tüketimi - Daha da yavaşlatıldı
        const durabilityMult = 1 + (playerData.upgrades.echoDurability * 0.5);
        const drain = 0.005 / durabilityMult; // 0.02 idi, 0.005'e düştü
        
        if (this.mode !== 'recharge') {
            this.energy = Math.max(0, this.energy - drain);
        }

        // Enerji Barı Timer Azaltma
        if (this.energyDisplayTimer > 0) this.energyDisplayTimer--;

        // Düşük Enerji Kontrolü
        if (this.energy < 10 && this.mode !== 'recharge' && !this.attached) {
            const fuelIndex = this.lootBag.findIndex(i => i.name === 'Nebula Özü');
            if (fuelIndex !== -1) {
                this.lootBag.splice(fuelIndex, 1);
                this.energy = 100;
                showNotification({name: "YANKI: NEBULA ÖZÜ TÜKETTİ (+%100 ENERJİ)", type:{color:'#c084fc'}}, "");
                if(echoInvOpen) renderEchoInventory();
            } else {
                this.mode = 'recharge';
                showNotification({name: "YANKI: ENERJİ BİTTİ, ÜSSE DÖNÜYOR", type:{color:'#fbbf24'}}, "");
                updateEchoDropdownUI();
            }
        }

        const badge = document.getElementById('echo-total-badge'); const count = this.lootBag.length; badge.innerText = count; badge.style.display = count > 0 ? 'flex' : 'none';
        
        let targetX, targetY;

        if (this.mode === 'recharge') {
            targetX = nexus.x; targetY = nexus.y;
            const d = Math.hypot(this.x - nexus.x, this.y - nexus.y);
            if (d < 100) { // Nexus'a vardı
                this.vx *= 0.5; this.vy *= 0.5; 
                // Nexus şarj hızı yavaşlatıldı
                this.energy = Math.min(100, this.energy + 0.05); 
                if(this.energy >= 100) {
                    this.mode = 'roam';
                    showNotification({name: "YANKI: ŞARJ TAMAMLANDI", type:{color:'#67e8f9'}}, "");
                    updateEchoDropdownUI();
                }
            }
        } else if (this.attached || this.mode === 'return') {
            const target = this.attached ? player.tail[player.tail.length - 1] : player;
            targetX = target.x; targetY = target.y;
        } else {
            // Roam logic
            let nearest = null, minDist = Infinity;
            for(let p of planets) {
                if(!p.collected && p.type.id !== 'toxic' && p.type.id !== 'lost') {
                    const d = (p.x-this.x)**2 + (p.y-this.y)**2;
                    if(d < minDist) { minDist = d; nearest = p; }
                }
            }
            if(nearest) { targetX = nearest.x; targetY = nearest.y; }
        }

        // Hareket Mantığı
        if (targetX !== undefined) {
            if (this.attached) {
                 this.x += (targetX - this.x) * 0.1; this.y += (targetY - this.y) * 0.1; this.angle = player.angle;
            } else {
                const targetA = Math.atan2(targetY - this.y, targetX - this.x);
                let diff = targetA - this.angle; while (diff < -Math.PI) diff += Math.PI*2; while (diff > Math.PI) diff -= Math.PI*2;
                this.angle += diff * 0.1;
                
                const dist = Math.hypot(targetX - this.x, targetY - this.y);
                if (dist < 100 && this.mode !== 'roam') {
                     this.vx *= 0.8; this.vy *= 0.8;
                } else {
                     const thrust = (this.mode === 'recharge') ? 0.8 : 0.5;
                     this.vx += Math.cos(targetA) * thrust; this.vy += Math.sin(targetA) * thrust;
                }
            }
        } else {
             this.angle += (Math.random()-0.5)*0.1; this.vx += Math.cos(this.angle)*0.1; this.vy += Math.sin(this.angle)*0.1;
        }

        const speedMult = 1 + (playerData.upgrades.echoSpeed * 0.15);
        const MAX_ECHO_SPEED = 8 * speedMult; 
        const currentSpeed = Math.hypot(this.vx, this.vy);
        if(currentSpeed > MAX_ECHO_SPEED) { this.vx = (this.vx/currentSpeed) * MAX_ECHO_SPEED; this.vy = (this.vy/currentSpeed) * MAX_ECHO_SPEED; }
        this.vx *= 0.96; this.vy *= 0.96; 
        
        if (!this.attached) {
            this.x += this.vx; this.y += this.vy;
            if (this.mode !== 'recharge') {
                const rangeMult = 1 + (playerData.upgrades.echoRange * 0.3);
                const pickupRange = 40 * rangeMult;
                for(let p of planets) {
                    if(!p.collected && p.type.id !== 'toxic' && p.type.id !== 'lost') {
                        const d = Math.hypot(this.x-p.x, this.y-p.y);
                        if(d < p.radius + pickupRange) { 
                            p.collected = true; 
                            if(p.type.id === 'tardigrade') {
                                this.lootBag.push(p);
                            } else {
                                const count = Math.floor(Math.random() * 4) + 1; 
                                for(let i=0; i<count; i++) this.lootBag.push(p); 
                            }
                            if(echoInvOpen) renderEchoInventory(); 
                        }
                    }
                }
            }
        }
    }
    draw(ctx) { 
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle + Math.PI/2); ctx.scale(0.6, 0.6); 
        
        // Nexus şarj olurken pulse efekti
        if (this.mode === 'recharge' && Math.hypot(this.x - nexus.x, this.y - nexus.y) < 150) {
             const pulse = 0.5 + Math.sin(Date.now() * 0.005) * 0.5; // 0 ile 1 arası
             ctx.shadowBlur = 30 + pulse * 30; 
             ctx.shadowColor = "#67e8f9"; 
             ctx.fillStyle = `rgba(103, 232, 249, ${0.5 + pulse * 0.5})`; 
        } else {
             ctx.shadowBlur = 20; ctx.shadowColor = "#67e8f9"; ctx.fillStyle = "rgba(10, 20, 40, 0.9)";
        }
        
        ctx.beginPath(); ctx.moveTo(0, -25); ctx.lineTo(30, 30); ctx.lineTo(0, 40); ctx.lineTo(-30, 30); ctx.fill();
        ctx.strokeStyle = "#67e8f9"; ctx.lineWidth = 3; ctx.stroke();
        if(this.mode === 'return' && !this.attached) { ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI*2); ctx.strokeStyle = "rgba(103, 232, 249, 0.3)"; ctx.stroke(); }
        
        // Enerji Barı (Sadece tıklanınca görünür)
        if (this.energyDisplayTimer > 0) {
            ctx.globalAlpha = Math.min(1, this.energyDisplayTimer / 30); // Fade out
            ctx.fillStyle = "#334155"; ctx.fillRect(-20, -40, 40, 4);
            ctx.fillStyle = "#67e8f9"; ctx.fillRect(-20, -40, 40 * (this.energy/100), 4);
            ctx.globalAlpha = 1;
        }
        
        ctx.restore();
    }
}

function spawnEcho(x, y) { echoRay = new EchoRay(x, y); document.getElementById('echo-wrapper-el').style.display = 'flex'; showNotification({name: "YANKI DOĞDU", type:{color:'#67e8f9'}}, ""); }

// --- UI & EVENTS ---
function updateInventoryCount() {
    const badge = document.getElementById('inv-total-badge'); const count = collectedItems.length; badge.innerText = count; badge.style.display = count > 0 ? 'flex' : 'none';
    document.getElementById('count-all').innerText = count;
    document.getElementById('count-legendary').innerText = collectedItems.filter(i => i.type.id === 'legendary').length;
    document.getElementById('count-epic').innerText = collectedItems.filter(i => i.type.id === 'epic').length;
    document.getElementById('count-rare').innerText = collectedItems.filter(i => i.type.id === 'rare').length;
}

function addItemToInventory(planet) { collectedItems.push(planet); updateInventoryCount(); if(inventoryOpen) renderInventory(); }

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

// --- AI MODES ---
function cycleAIMode() {
    if(!autopilot) return;
    const modes = ['gather', 'base']; // Travel is handled automatically
    const currIdx = modes.indexOf(aiMode);
    aiMode = modes[(currIdx + 1) % modes.length];
    updateAIButton();
}

function updateAIButton() {
    const btn = document.getElementById('ai-mode-btn');
    const aiToggle = document.getElementById('btn-ai-toggle');
    const modeBtn = document.getElementById('ai-mode-btn');
    
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
    playerData.stardust += count * unitPrice; audio.playCash(); player.updateUI(); updateInventoryCount(); renderMarket();
}
function sellAll() {
    let total = 0; let toKeep = [];
    collectedItems.forEach(item => { if(item.type.value > 0) total += item.type.value; else toKeep.push(item); });
    if(total > 0) { collectedItems = toKeep; playerData.stardust += total; audio.playCash(); player.updateUI(); updateInventoryCount(); renderMarket(); showNotification({name: `${total} KRİSTAL KAZANILDI`, type:{color:'#fbbf24'}}, ""); }
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
    if(playerData.stardust >= cost) { playerData.stardust -= cost; playerData.upgrades[key]++; audio.playCash(); player.updateUI(); renderUpgrades(); updateEchoDropdownUI(); }
};

function showToxicEffect() { const el = document.getElementById('toxic-overlay'); el.classList.add('active'); setTimeout(() => el.classList.remove('active'), 1500); }
function showNotification(planet, suffix) { 
    const div = document.createElement('div'); div.className='zen-notif'; 
    const countText = suffix ? ` ${suffix}` : "";
    div.innerHTML = `<div class="rarity-dot" style="background:${planet.type.color};"></div> ${planet.name}${countText}`; 
    document.getElementById('notification-area').appendChild(div); setTimeout(()=>div.remove(), 4000); 
}

class Planet {
    constructor(x, y, type, lootContent = []) {
        this.x = x !== undefined ? x : Math.random()*WORLD_SIZE; this.y = y !== undefined ? y : Math.random()*WORLD_SIZE; this.collected = false;
        if (type) { this.type = type; this.lootContent = lootContent; } 
        else { 
            const r = Math.random(); 
            if(r < 0.01) this.type = RARITY.TOXIC; 
            else if(r < 0.05) this.type = RARITY.LEGENDARY; 
            else if(r < 0.15) this.type = RARITY.EPIC;
            else if(r < 0.17) this.type = RARITY.TARDIGRADE; // %2 şans
            else if(r < 0.50) this.type = RARITY.RARE; 
            else this.type = RARITY.COMMON; 
            this.lootContent = []; 
        }
        this.name = this.type.id === 'lost' ? "KAYIP KARGO" : LOOT_DB[this.type.id][Math.floor(Math.random()*LOOT_DB[this.type.id].length)];
        this.radius = this.type.id==='legendary'?120 : (this.type.id==='toxic'? 60 : (this.type.id==='lost' ? 80 : (this.type.id === 'tardigrade' ? 50 : 40+Math.random()*60)));
    }
    draw(ctx) {
        if(this.collected) return;
        ctx.shadowBlur=50; ctx.shadowColor=this.type.color;
        const grad = ctx.createRadialGradient(this.x-this.radius*0.3, this.y-this.radius*0.3, this.radius*0.1, this.x, this.y, this.radius);
        grad.addColorStop(0, this.type.color); grad.addColorStop(1, "#020617");
        ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        
        if(this.type.id === 'toxic') { const t = Date.now() * 0.002; ctx.strokeStyle = "rgba(132, 204, 22, 0.15)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius + 10 + Math.sin(t)*5, 0, Math.PI*2); ctx.stroke(); }
        if (this.type.id === 'lost') { ctx.strokeStyle = this.type.color; ctx.lineWidth = 3; const pulse = Math.sin(Date.now() * 0.005) * 10; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius + 20 + pulse, 0, Math.PI*2); ctx.stroke(); }
        if (this.type.id === 'tardigrade') { 
            // Tardigrad için özel organik görünüm
            ctx.strokeStyle = "rgba(199, 192, 174, 0.3)"; ctx.lineWidth = 2; 
            const wiggle = Math.sin(Date.now() * 0.01) * 3;
            ctx.beginPath(); ctx.ellipse(this.x, this.y, this.radius+5+wiggle, this.radius+5-wiggle, 0, 0, Math.PI*2); ctx.stroke();
        }
    }
}
class Particle {
    constructor(x, y, color) { this.x = x; this.y = y; this.color = color; this.vx = (Math.random()-0.5)*3; this.vy = (Math.random()-0.5)*3; this.life = 1.0; this.radius = Math.random() * 5 + 3; this.growth = 0.15; }
    update() { this.x+=this.vx; this.y+=this.vy; this.life-=0.015; this.radius += this.growth; }
    draw(ctx) { ctx.globalAlpha = this.life * 0.6; ctx.fillStyle=this.color; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1; }
}

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
    for(let i=0; i<1200; i++) planets.push(new Planet());
    stars = []; for(let i=0; i<5000; i++) stars.push({x:Math.random()*WORLD_SIZE, y:Math.random()*WORLD_SIZE, s:Math.random()*2});
    player.updateUI(); updateInventoryCount(); isPaused = false;
    startTipsCycle();
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
        currentZoom += (targetZoom - currentZoom) * 0.1;
        player.update(); if(echoRay) echoRay.update(); nexus.update();

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
            else if (document.getElementById('sound-panel').classList.contains('open')) document.getElementById('sound-panel').classList.remove('open');
            else togglePause();
            keys.Escape = false;
        }

        if (keys.q) { 
            autopilot = !autopilot; 
            if(!autopilot) { manualTarget = null; aiMode = 'gather'; }
            else { aiMode = 'gather'; } 
            updateAIButton();
            keys.q = false; 
        }
        if (keys.m) { mapOpen = !mapOpen; const overlay = document.getElementById('big-map-overlay'); if(mapOpen) overlay.classList.add('active'); else overlay.classList.remove('active'); keys.m = false; }

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
            if (keys.e) { enterNexus(); keys.e = false; }
        } else if (echoRay && !nexusOpen && !mapOpen) {
            const distEcho = Math.hypot(player.x - echoRay.x, player.y - echoRay.y);
            if (!echoRay.attached && distEcho < 300) { 
                promptEl.innerText = "[F] BİRLEŞ"; promptEl.className = 'visible'; 
                if(keys.f) { echoManualMerge(); keys.f = false; } 
            } else if (echoRay.attached) { 
                    promptEl.className = ''; 
                    if(keys.f) { echoRay.attached = false; echoRay.mode = 'roam'; updateEchoDropdownUI(); keys.f = false; showNotification({name: "YANKI AYRILDI", type:{color:'#67e8f9'}}, ""); } 
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

window.addEventListener('keydown', e => { if(e.code === "Space") e.preventDefault(); if(e.key === "Escape") keys.Escape = true; else if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true; else if(e.code === "Space") keys[" "] = true; else if(keys.hasOwnProperty(e.code)) keys[e.code] = true; if(e.key.toLowerCase() === 'i') { inventoryOpen=!inventoryOpen; document.getElementById('inventory-overlay').classList.toggle('open'); if(inventoryOpen) renderInventory(); } });
window.addEventListener('keyup', e => { if(e.key === "Escape") keys.Escape = false; else if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false; else if(e.code === "Space") keys[" "] = false; else if(keys.hasOwnProperty(e.code)) keys[e.code] = false; });
window.addEventListener('wheel', e => { e.preventDefault(); targetZoom += e.deltaY * -0.001; targetZoom = Math.min(Math.max(0.5, targetZoom), 1.5); }, { passive: false });

const soundPanel = document.getElementById('sound-panel');
document.getElementById('btn-sound').addEventListener('click', () => soundPanel.classList.toggle('open'));
document.getElementById('vol-music').addEventListener('input', (e) => { const val = e.target.value / 100; const m = document.getElementById('bgMusic'); if(m) m.volume = val; document.getElementById('val-m').innerText = e.target.value + '%'; volMusic = val; });
document.getElementById('vol-sfx').addEventListener('input', (e) => { const val = e.target.value / 100; volSFX = val; document.getElementById('val-s').innerText = e.target.value + '%'; });

document.getElementById('btn-start').addEventListener('click', () => { document.getElementById('main-menu').classList.add('menu-hidden'); init(); audio.init(); startLoop(); document.getElementById('bgMusic').play().catch(e=>console.log(e)); });
document.getElementById('btn-inv-icon').addEventListener('click', () => { inventoryOpen=true; document.getElementById('inventory-overlay').classList.add('open'); renderInventory(); });
document.getElementById('btn-close-inv').addEventListener('click', () => { inventoryOpen=false; document.getElementById('inventory-overlay').classList.remove('open'); });
document.getElementById('btn-ai-toggle').addEventListener('click', () => { autopilot = !autopilot; if(!autopilot) { manualTarget=null; aiMode='gather'; } else { aiMode='gather'; } updateAIButton(); });

function resize() { width = window.innerWidth; height = window.innerHeight; canvas.width = width; canvas.height = height; mmCanvas.width = 180; mmCanvas.height = 180; bmCanvas.width = window.innerWidth; bmCanvas.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();