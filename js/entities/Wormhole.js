/**
 * Void Ray - Varlık Sınıfı: SOLUCAN DELİĞİ (WORMHOLE)
 * * Uzay-zaman dokusunda yırtıklar oluşturan spiral yapılar.
 * * Oyuncu içine girdiğinde rastgele bir konuma ışınlar.
 */
class Wormhole {
    constructor(x, y) {
        // Eğer konum verilmezse rastgele bir yerde oluştur
        if (x === undefined || y === undefined) {
            const margin = GAME_CONFIG.WORMHOLE.TELEPORT_SAFE_DISTANCE;
            // Haritanın güvenli sınırları içinde rastgele konum
            this.x = Utils.random(margin, WORLD_SIZE - margin);
            this.y = Utils.random(margin, WORLD_SIZE - margin);
        } else {
            this.x = x;
            this.y = y;
        }

        this.radius = GAME_CONFIG.WORMHOLE.RADIUS;
        this.angle = 0;
        
        // Animasyon için rastgelelik
        this.spinSpeed = GAME_CONFIG.WORMHOLE.SPIN_SPEED * (Math.random() > 0.5 ? 1 : -1);
        this.pulsePhase = Math.random() * Math.PI * 2;
        
        // İç içe spiraller için
        this.spirals = [
            { offset: 0, speed: 1.0, color: GAME_CONFIG.WORMHOLE.COLOR_CORE },
            { offset: Math.PI/3, speed: 0.7, color: GAME_CONFIG.WORMHOLE.COLOR_OUTER },
            { offset: Math.PI, speed: 0.5, color: "rgba(255,255,255,0.2)" }
        ];
    }

    update() {
        this.angle += this.spinSpeed;
        this.pulsePhase += 0.05;
    }

    draw(ctx, visibility = 2) {
        // Görünürlük kontrolü (Radar sistemine uyumlu)
        if (visibility === 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // 1. RADAR GÖRÜNÜMÜ (Basit İkon)
        if (visibility === 1) {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = GAME_CONFIG.WORMHOLE.COLOR_CORE;
            ctx.globalAlpha = 0.5;
            ctx.fill();
            
            // Dönen halka efekti
            ctx.rotate(this.angle);
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.8, 0, Math.PI * 1.5);
            ctx.strokeStyle = GAME_CONFIG.WORMHOLE.COLOR_OUTER;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.restore();
            return;
        }

        // 2. TAM GÖRÜNÜM (Detaylı Spiral)
        
        // Pulsating (Nefes alma) efekti
        const scale = 1 + Math.sin(this.pulsePhase) * 0.05;
        ctx.scale(scale, scale);

        // Dış Işıma (Glow)
        ctx.shadowBlur = 40 + Math.sin(this.pulsePhase) * 20;
        ctx.shadowColor = GAME_CONFIG.WORMHOLE.COLOR_CORE;

        // Spiralleri Çiz
        this.spirals.forEach(spiral => {
            ctx.save();
            ctx.rotate(this.angle * spiral.speed + spiral.offset);
            
            ctx.beginPath();
            // Spiral matematiği: r = a + b * theta
            const laps = 3;
            const points = 50;
            const maxAngle = Math.PI * 2 * laps;
            
            for (let i = 0; i <= points; i++) {
                const theta = (i / points) * maxAngle;
                const r = (i / points) * this.radius; // Yarıçap giderek artar
                const x = r * Math.cos(theta);
                const y = r * Math.sin(theta);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            
            ctx.strokeStyle = spiral.color;
            // Merkeze yaklaştıkça kalınlaşan çizgi efekti
            ctx.lineWidth = 4;
            ctx.lineCap = "round";
            ctx.stroke();
            ctx.restore();
        });

        // Merkezdeki Kara Delik (Event Horizon)
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = "#000";
        ctx.shadowBlur = 0; // Merkez gölge yapmaz, yutar
        ctx.fill();
        
        // Merkez etrafındaki ince beyaz halka (Photon sphere)
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.22, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 1;
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#fff";
        ctx.stroke();

        ctx.restore();
    }
}