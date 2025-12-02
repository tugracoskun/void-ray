// --- SES YÖNETİMİ ---
// Müzik varsayılan olarak %20 (0.2)
let volMusic = 0.2, volSFX = 0.8;

class ZenAudio {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Müzik elementlerini al
        this.musicBase = document.getElementById('music-base');
        this.musicSpace = document.getElementById('music-space');
        
        this.currentTrack = null; // Şu an aktif olan parça
        this.activeTheme = '';    // 'base' veya 'space'
        this.fadeInterval = null; // Geçiş animasyonu zamanlayıcısı
        
        // Başlangıçta sesleri tamamen kıs (Fade-in için)
        if(this.musicBase) this.musicBase.volume = 0;
        if(this.musicSpace) this.musicSpace.volume = 0;

        this.scale = [196.00, 220.00, 261.63, 293.66, 329.63, 392.00];
        this.lastChimeTime = 0; 
        this.lastEvolveTime = 0;
    }

    init() { 
        if(this.ctx.state === 'suspended') this.ctx.resume();
        // Oyun başladığında, game.js'den playTheme çağrılacak.
    }

    /**
     * İki müzik arasında yumuşak, alçalarak/yükselerek geçiş yapar.
     * @param {string} themeName - 'base' veya 'space'
     */
    playTheme(themeName) {
        if (this.activeTheme === themeName) return;
        this.activeTheme = themeName;

        const targetTrack = themeName === 'base' ? this.musicBase : this.musicSpace;
        const fadeOutTrack = themeName === 'base' ? this.musicSpace : this.musicBase;

        console.log(`♫ Müzik Geçişi Başladı: ${themeName.toUpperCase()} (Soft Fade)`);

        // Hedef parçayı sessizce başlat (Eğer çalmıyorsa)
        if (targetTrack.paused) {
            targetTrack.volume = 0;
            targetTrack.play().catch(e => console.warn("Otomatik oynatma tarayıcı tarafından engellendi:", e));
        }

        // Varsa eski fade işlemini iptal et
        if (this.fadeInterval) clearInterval(this.fadeInterval);

        // --- SOFT CROSSFADE AYARLARI ---
        const duration = 3000; // 3 Saniye (Daha yumuşak)
        const fps = 60; // Saniyedeki güncelleme sayısı
        const stepTime = 1000 / fps;
        const steps = duration / stepTime;
        let currentStep = 0;

        // Başlangıç ses seviyelerini kaydet
        const startVolIn = targetTrack.volume;
        const startVolOut = fadeOutTrack ? fadeOutTrack.volume : 0;

        this.fadeInterval = setInterval(() => {
            currentStep++;
            const ratio = currentStep / steps; // 0.0 -> 1.0 ilerleme

            // Yumuşatma Formülü (Easing): Daha doğal duyulması için
            // Basit lineer yerine hafif kavisli geçiş
            const fadeLevel = ratio; 

            // 1. Yeni Müzik Yükseliyor (Fade In)
            // volMusic (Ayarlardaki max seviye) ile sınırla
            targetTrack.volume = Math.min(1, startVolIn + (volMusic - startVolIn) * fadeLevel);

            // 2. Eski Müzik Alçalıyor (Fade Out)
            if (fadeOutTrack && !fadeOutTrack.paused) {
                fadeOutTrack.volume = Math.max(0, startVolOut * (1 - fadeLevel));
            }

            // Geçiş Tamamlandı
            if (currentStep >= steps) {
                clearInterval(this.fadeInterval);
                this.fadeInterval = null;
                
                // Emin olmak için son değerleri set et
                targetTrack.volume = volMusic;
                if (fadeOutTrack) {
                    fadeOutTrack.volume = 0;
                    fadeOutTrack.pause();
                    fadeOutTrack.currentTime = 0; // Başa sar
                }
                this.currentTrack = targetTrack;
            }
        }, stepTime);
    }

    /**
     * Ayarlar panelinden ses değiştirildiğinde anlık güncelleme.
     */
    updateMusicVolume(newVolume) {
        volMusic = newVolume;
        // Şu an çalan parça varsa onun sesini hemen güncelle
        if (this.currentTrack && !this.currentTrack.paused) {
            // Eğer o an fade işlemi yoksa güncelle
            if (!this.fadeInterval) {
                this.currentTrack.volume = volMusic;
            }
        }
    }
    
    // --- EFEKT SESLERİ (Değişmedi) ---
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
        osc.type = 'sine'; osc.frequency.setValueAtTime(500, t); osc.frequency.exponentialRampToValueAtTime(1000, t + 0.1);
        gain.gain.setValueAtTime(volSFX * 0.2, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain); gain.connect(this.ctx.destination); osc.start(); osc.stop(t + 0.35);
    }
    
    playEvolve() {
        const now = this.ctx.currentTime;
        if (now - this.lastEvolveTime < 0.5) return; 
        this.lastEvolveTime = now;
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(100, now); osc.frequency.linearRampToValueAtTime(600, now+2);
        gain.gain.setValueAtTime(volSFX*0.3, now); gain.gain.linearRampToValueAtTime(0, now+2.5);
        osc.connect(gain); gain.connect(this.ctx.destination); osc.start(); osc.stop(now+3);
    }
    
    playToxic() {
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(150, this.ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime+0.4);
        gain.gain.setValueAtTime(volSFX*0.5, this.ctx.currentTime); gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime+0.4);
        osc.connect(gain); gain.connect(this.ctx.destination); osc.start(); osc.stop(this.ctx.currentTime+0.5);
    }
}