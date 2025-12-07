/**
 * Void Ray - Rehber ve Alıştırma Sistemi (Tutorial System)
 * Oyuncuya oyunun temellerini öğretmek için adım adım görevler sunar.
 */

const TUTORIAL_STEPS = [
    {
        id: 'intro_welcome',
        text: "Sistemler aktif. [WASD] tuşları ile gemiyi hareket ettir.",
        trigger: () => true, // Başlangıçta hemen tetiklenir
        checkComplete: () => Math.hypot(player.vx, player.vy) > 2, // Hareket edince
        delay: 1000
    },
    {
        id: 'intro_boost',
        text: "Motor gücünü artırmak için [SPACE] tuşuna basılı tut.",
        trigger: () => TutorialManager.isStepCompleted('intro_welcome'),
        checkComplete: () => keys && keys[" "], // Space basılınca
        delay: 500
    },
    {
        id: 'first_resource',
        text: "Yakındaki kaynakları topla. Onlara yaklaşman yeterli.",
        trigger: () => TutorialManager.isStepCompleted('intro_boost'),
        checkComplete: () => collectedItems.length > 0,
        delay: 2000
    },
    {
        id: 'inventory_check',
        text: "Kargo bölümüne erişmek için [I] tuşuna bas.",
        trigger: () => TutorialManager.isStepCompleted('first_resource'),
        checkComplete: () => typeof inventoryOpen !== 'undefined' && inventoryOpen,
        delay: 1000
    },
    {
        id: 'nexus_find',
        text: "Envanterin dolunca Nexus'a (Üs) dönmelisin. Beyaz oku takip et.",
        trigger: () => collectedItems.length >= 5, // Biraz kaynak toplayınca
        checkComplete: () => Utils.distEntity(player, nexus) < 400,
        delay: 500
    },
    {
        id: 'nexus_trade',
        text: "[E] tuşu ile Nexus'a bağlan ve kaynaklarını sat.",
        trigger: () => TutorialManager.isStepCompleted('nexus_find') && Utils.distEntity(player, nexus) < 400,
        checkComplete: () => typeof nexusOpen !== 'undefined' && nexusOpen,
        delay: 0
    },
    {
        id: 'echo_intro',
        text: "3. Seviyeye ulaştığında Yankı (Echo) dronu otomatik üretilecek.",
        trigger: () => player.level >= 2 && !echoRay,
        checkComplete: () => player.level >= 3,
        delay: 2000
    },
    {
        id: 'echo_command',
        text: "Yankı seninle! [F] tuşu ile onu serbest bırak veya çağır.",
        trigger: () => echoRay !== null,
        checkComplete: () => echoRay && !echoRay.attached,
        delay: 1000
    }
];

class TutorialSystem {
    constructor() {
        this.activeStep = null;
        this.completedSteps = new Set();
        this.uiContainer = null;
        this.uiText = null;
        this.uiIcon = null;
        
        // Durumlar: 'idle', 'active', 'success', 'waiting_next'
        this.state = 'idle';
        this.timer = 0;
    }

    init() {
        this.uiContainer = document.getElementById('tutorial-box');
        this.uiText = document.getElementById('tutorial-text');
        this.uiIcon = document.getElementById('tutorial-icon');
        
        console.log("Tutorial System başlatıldı.");
    }

    loadProgress(savedSteps) {
        if (Array.isArray(savedSteps)) {
            this.completedSteps = new Set(savedSteps);
        }
    }

    getExportData() {
        return Array.from(this.completedSteps);
    }

    isStepCompleted(id) {
        return this.completedSteps.has(id);
    }

    update(dt) {
        if (!player || !this.uiContainer) return;

        // 1. Yeni Görev Ara
        if (this.state === 'idle') {
            for (const step of TUTORIAL_STEPS) {
                if (!this.completedSteps.has(step.id)) {
                    if (step.trigger()) {
                        // Delay kontrolü için waiting state'e geçebilirdik ama basit tutalım
                        this.startStep(step);
                        break;
                    }
                }
            }
        }

        // 2. Aktif Görevi Kontrol Et
        if (this.state === 'active' && this.activeStep) {
            if (this.activeStep.checkComplete()) {
                this.completeStep();
            }
        }

        // 3. Başarı Ekranı Zamanlayıcısı
        if (this.state === 'success') {
            this.timer -= dt;
            if (this.timer <= 0) {
                this.uiContainer.classList.remove('visible', 'success');
                this.state = 'idle';
                this.activeStep = null;
            }
        }
    }

    startStep(step) {
        this.activeStep = step;
        this.state = 'active';
        
        this.uiText.innerHTML = step.text;
        this.uiIcon.innerHTML = "!";
        
        this.uiContainer.classList.remove('success');
        this.uiContainer.classList.add('visible');
        
        // Yeni görev sesi
        if (typeof audio !== 'undefined' && audio) audio.playChime({id: 'common'});
    }

    completeStep() {
        this.completedSteps.add(this.activeStep.id);
        this.state = 'success';
        this.timer = 3000; // 3 saniye ekranda kalsın
        
        this.uiContainer.classList.add('success');
        this.uiIcon.innerHTML = "✔";
        
        // Eğer SaveManager varsa anlık kaydet
        if (typeof SaveManager !== 'undefined') SaveManager.save(true);
        
        // Başarım sesi
        if (typeof audio !== 'undefined' && audio) audio.playChime({id: 'rare'});
    }
    
    reset() {
        this.completedSteps.clear();
        this.state = 'idle';
        this.activeStep = null;
        if(this.uiContainer) this.uiContainer.classList.remove('visible');
    }
}

window.TutorialManager = new TutorialSystem();