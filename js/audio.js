// --- SES YÖNETİMİ ---
let volMusic = 0.5, volSFX = 0.8;

class ZenAudio {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.bgMusic = document.getElementById('bgMusic');
        this.bgMusic.volume = volMusic;
        this.scale = [196.00, 220.00, 261.63, 293.66, 329.63, 392.00];
        this.lastChimeTime = 0; 
        this.lastEvolveTime = 0;
    }

    init() { 
        if(this.ctx.state === 'suspended') this.ctx.resume(); 
        // bindUI kaldırıldı çünkü artık UI olayları settings.js içinde yönetiliyor.
    }
    
    // UI binding fonksiyonu tamamen kaldırıldı.
    // Artık slider'lar global volMusic ve volSFX değişkenlerini güncelliyor.
    // Ses çalma fonksiyonları bu değişkenleri kullanıyor.
    
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