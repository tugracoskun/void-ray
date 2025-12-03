/**
 * Void Ray - Ortak Harita ve Radar Araçları
 * * Bu modül, Mini Harita ve Büyük Harita tarafından ortak kullanılan
 * * hesaplama ve çizim fonksiyonlarını içerir.
 * * Büyük harita pencere mantığı js/windows/map.js'e taşınmıştır.
 */

/**
 * Gezegenin oyuncu ve yankıya göre görünürlük seviyesini hesaplar.
 * @param {Planet} p - Gezegen nesnesi
 * @param {VoidRay} player - Oyuncu nesnesi
 * @param {EchoRay | null} echo - Yankı nesnesi
 * @returns {number} 0: Görünmez, 1: Radar (Sinyal), 2: Tarama (Tam Görüş)
 */
function getPlanetVisibility(p, player, echo) {
    let visibility = 0;
    const dPlayer = Math.hypot(player.x - p.x, player.y - p.y);
    
    // Oyuncu Tarama Alanı (Tam Görüş)
    if (dPlayer < player.scanRadius) return 2; 
    // Oyuncu Radar Alanı (Sinyal)
    else if (dPlayer < player.radarRadius) visibility = 1; 

    if (echo) {
        const dEcho = Math.hypot(echo.x - p.x, echo.y - p.y);
        // Yankı Tarama Alanı (Tam Görüş)
        if (dEcho < echo.scanRadius) return 2; 
        // Yankı Radar Alanı (Sinyal)
        else if (dEcho < echo.radarRadius) {
            if (visibility < 1) visibility = 1; 
        }
    }
    return visibility;
}

/**
 * Hedef göstergesini çizer.
 * Renkler artık MAP_CONFIG'den alınabilir veya parametre olarak geçilebilir.
 */
function drawTargetIndicator(ctx, origin, view, target, color) {
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    
    const screenHalfW = (view.width / view.zoom) / 2;
    const screenHalfH = (view.height / view.zoom) / 2;
    
    if (Math.abs(dx) > screenHalfW || Math.abs(dy) > screenHalfH) {
        const angle = Math.atan2(dy, dx);
        const borderW = screenHalfW * 0.9;
        const borderH = screenHalfH * 0.9;
        
        let tx = Math.cos(angle) * borderW;
        let ty = Math.sin(angle) * borderH;
        
        if (Math.abs(tx) > borderW) tx = Math.sign(tx) * borderW;
        if (Math.abs(ty) > borderH) ty = Math.sign(ty) * borderH;
        
        const screenX = view.width/2 + tx * view.zoom;
        const screenY = view.height/2 + ty * view.zoom;
        const distKM = Math.round(Math.hypot(dx, dy) / 100); 
        
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); 
        ctx.translate(screenX, screenY);
        ctx.rotate(angle + Math.PI/2);
        
        ctx.fillStyle = color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(6, 6);
        ctx.lineTo(-6, 6);
        ctx.fill();
        
        ctx.rotate(-(angle + Math.PI/2));
        ctx.fillStyle = color;
        ctx.font = "bold 10px monospace";
        ctx.fillText(distKM + "m", 10, 0);
        
        ctx.restore();
    }
}

/**
 * Minimap (Küçük Harita) çizimi
 * Tamamen MAP_CONFIG üzerinden stil alır.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} entities - Oyun varlıkları
 * @param {object} state - Oyun durumu
 * @param {object} origin - Haritanın merkezindeki varlık (Player veya Echo)
 */
function drawMiniMap(ctx, entities, state, origin) {
    // Varsayılan olarak oyuncuyu merkez al
    origin = origin || entities.player;

    const size = MAP_CONFIG.minimap.size;
    const radius = MAP_CONFIG.minimap.radius;
    
    ctx.clearRect(0, 0, size, size); 
    
    ctx.save(); 
    ctx.beginPath(); ctx.arc(radius, radius, radius, 0, Math.PI*2); ctx.clip();
    
    ctx.fillStyle = MAP_CONFIG.minimap.bg;
    ctx.fill();

    // Ölçekleme, merkezdeki varlığın radar menziline göre yapılır
    const scale = radius / origin.radarRadius; 
    const cx = radius, cy = radius;
    
    // Tarama Alanı Çemberi (Merkezdeki varlığa ait)
    const scanPixelRadius = origin.scanRadius * scale;
    ctx.lineWidth = 1;
    ctx.strokeStyle = MAP_CONFIG.minimap.scanColor; 
    ctx.setLineDash([3, 3]); 
    ctx.beginPath(); ctx.arc(cx, cy, scanPixelRadius, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);

    // --- DİĞER VARLIKLARI ÇİZ ---

    // Eğer merkez Oyuncu DEĞİLSE, Oyuncuyu nokta olarak çiz
    if (entities.player && entities.player !== origin) {
        const px = (entities.player.x - origin.x) * scale + cx;
        const py = (entities.player.y - origin.y) * scale + cy;
        if (Math.hypot(px - cx, py - cy) < radius) {
            ctx.fillStyle = MAP_CONFIG.colors.player; 
            ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI*2); ctx.fill(); 
        }
    }

    // Yankı (Eğer merkez Yankı DEĞİLSE ve Yankı varsa)
    if(entities.echoRay && entities.echoRay !== origin) {
        const ex = (entities.echoRay.x - origin.x) * scale + cx;
        const ey = (entities.echoRay.y - origin.y) * scale + cy;
        if (Math.hypot(ex - cx, ey - cy) < radius) {
            ctx.fillStyle = MAP_CONFIG.colors.echo; 
            ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI*2); ctx.fill(); 
        }
    }

    // Üsler
    const drawBase = (entity, color) => {
        const bx = (entity.x - origin.x) * scale + cx; 
        const by = (entity.y - origin.y) * scale + cy;
        if(Math.hypot(bx - cx, by - cy) < radius) {
            ctx.fillStyle = color; ctx.beginPath(); ctx.arc(bx, by, 3.5, 0, Math.PI*2); ctx.fill();
        }
    }
    
    drawBase(entities.nexus, MAP_CONFIG.colors.nexus);
    if(entities.repairStation) drawBase(entities.repairStation, MAP_CONFIG.colors.repair);
    if(entities.storageCenter) drawBase(entities.storageCenter, MAP_CONFIG.colors.storage);
    
    // Gezegenler
    entities.planets.forEach(p => {
        if(!p.collected) {
            let px = (p.x - origin.x) * scale + cx; 
            let py = (p.y - origin.y) * scale + cy;
            
            if(Math.hypot(px - cx, py - cy) < radius) {
                // getPlanetVisibility global olarak tanımlanır.
                const visibility = getPlanetVisibility(p, entities.player, entities.echoRay);
                if (visibility === 1) ctx.fillStyle = "rgba(255,255,255,0.3)"; 
                else if (visibility === 2) ctx.fillStyle = p.type.color; 
                else return; 
                ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI*2); ctx.fill();
            }
        }
    });
    
    // Hedef Çizgisi
    if(state.manualTarget) {
        const tx = (state.manualTarget.x - origin.x) * scale + cx; 
        const ty = (state.manualTarget.y - origin.y) * scale + cy;
        const distToTarget = Math.hypot(tx - cx, ty - cy);
        const angle = Math.atan2(ty - cy, tx - cx);
        
        ctx.strokeStyle = MAP_CONFIG.colors.target; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); 
        ctx.beginPath(); ctx.moveTo(cx, cy); 
        const drawDist = Math.min(distToTarget, radius);
        ctx.lineTo(cx + Math.cos(angle) * drawDist, cy + Math.sin(angle) * drawDist);
        ctx.stroke(); ctx.setLineDash([]);
    }

    // --- MERKEZ İKONU (ORIGIN) ---
    // Haritanın ortasındaki üçgen (Aktif kontrol edilen varlık)
    ctx.translate(cx, cy); 
    ctx.rotate(origin.angle + Math.PI/2);
    
    // Rengi, kontrol edilen varlığa göre belirle
    const centerColor = (origin === entities.echoRay) ? MAP_CONFIG.colors.echo : MAP_CONFIG.colors.player;
    ctx.fillStyle = centerColor; 
    
    ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(-4, 5); ctx.lineTo(4, 5); ctx.fill(); 
    
    ctx.restore(); 
}