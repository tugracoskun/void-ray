/**
 * Void Ray - Ortak Harita ve Radar Araçları
 * * Bu modül, Mini Harita ve Büyük Harita tarafından ortak kullanılan
 * * hesaplama ve çizim fonksiyonlarını içerir.
 */

// getPlanetVisibility fonksiyonu artık GameRules içinde.
// Geriye dönük uyumluluk için alias tanımlayabiliriz veya kodu direkt GameRules'tan çağırabiliriz.
// Doğrudan GameRules kullanımı game.js ve ui.js içinde yapılıyor.

/**
 * Hedef göstergesini çizer.
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
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} entities - Oyun varlıkları
 * @param {object} state - Oyun durumu
 * @param {object} origin - Haritanın MERKEZ koordinatları (Camera Focus)
 * @param {object} [refEntity] - (Opsiyonel) Radar menzili ve açı için REFERANS varlık (Player/Echo)
 */
function drawMiniMap(ctx, entities, state, origin, refEntity) {
    // Eğer refEntity verilmemişse ve origin bir entity ise onu kullan, yoksa player'ı kullan
    const reference = refEntity || (origin.radarRadius ? origin : entities.player);
    // Merkez koordinatları origin'den al
    const centerPos = origin || entities.player;

    const size = MAP_CONFIG.minimap.size;
    const radius = MAP_CONFIG.minimap.radius;
    
    ctx.clearRect(0, 0, size, size); 
    
    ctx.save(); 
    ctx.beginPath(); ctx.arc(radius, radius, radius, 0, Math.PI*2); ctx.clip();
    
    ctx.fillStyle = MAP_CONFIG.minimap.bg;
    ctx.fill();

    // Ölçekleme, REFERANS varlığın radar menziline göre yapılır
    // Eğer radarRadius undefined ise (hata durumu) varsayılan 10000 al
    const safeRadarRadius = reference.radarRadius || 10000;
    const scale = radius / safeRadarRadius; 
    const cx = radius, cy = radius;
    
    // Tarama Alanı Çemberi
    const scanPixelRadius = (reference.scanRadius || 4000) * scale;
    ctx.lineWidth = 1;
    ctx.strokeStyle = MAP_CONFIG.minimap.scanColor; 
    ctx.setLineDash([3, 3]); 
    ctx.beginPath(); ctx.arc(cx, cy, scanPixelRadius, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);

    // --- DİĞER VARLIKLARI ÇİZ ---

    // Oyuncu (Eğer referans Oyuncu değilse, örn: Echo kamerasındayız)
    if (entities.player && reference !== entities.player) {
        const px = (entities.player.x - centerPos.x) * scale + cx;
        const py = (entities.player.y - centerPos.y) * scale + cy;
        // Utils güncellemesi:
        if (Utils.dist(px, py, cx, cy) < radius) {
            ctx.fillStyle = MAP_CONFIG.colors.player; 
            ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI*2); ctx.fill(); 
        }
    }

    // Yankı (Eğer referans Yankı değilse)
    if(entities.echoRay && reference !== entities.echoRay) {
        const ex = (entities.echoRay.x - centerPos.x) * scale + cx;
        const ey = (entities.echoRay.y - centerPos.y) * scale + cy;
        // Utils güncellemesi:
        if (Utils.dist(ex, ey, cx, cy) < radius) {
            ctx.fillStyle = MAP_CONFIG.colors.echo; 
            ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI*2); ctx.fill(); 
        }
    }

    // Üsler
    const drawBase = (entity, color) => {
        const bx = (entity.x - centerPos.x) * scale + cx; 
        const by = (entity.y - centerPos.y) * scale + cy;
        // Utils güncellemesi:
        if(Utils.dist(bx, by, cx, cy) < radius) {
            ctx.fillStyle = color; ctx.beginPath(); ctx.arc(bx, by, 3.5, 0, Math.PI*2); ctx.fill();
        }
    }
    
    drawBase(entities.nexus, MAP_CONFIG.colors.nexus);
    if(entities.repairStation) drawBase(entities.repairStation, MAP_CONFIG.colors.repair);
    if(entities.storageCenter) drawBase(entities.storageCenter, MAP_CONFIG.colors.storage);
    
    // Gezegenler
    entities.planets.forEach(p => {
        if(!p.collected) {
            let px = (p.x - centerPos.x) * scale + cx; 
            let py = (p.y - centerPos.y) * scale + cy;
            
            // Utils güncellemesi:
            if(Utils.dist(px, py, cx, cy) < radius) {
                const visibility = GameRules.getPlanetVisibility(p, entities.player, entities.echoRay);
                if (visibility === 1) ctx.fillStyle = "rgba(255,255,255,0.3)"; 
                else if (visibility === 2) ctx.fillStyle = p.type.color; 
                else return; 
                ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI*2); ctx.fill();
            }
        }
    });
    
    // Hedef Çizgisi
    if(state.manualTarget) {
        const tx = (state.manualTarget.x - centerPos.x) * scale + cx; 
        const ty = (state.manualTarget.y - centerPos.y) * scale + cy;
        // Utils güncellemesi:
        const distToTarget = Utils.dist(tx, ty, cx, cy);
        const angle = Math.atan2(ty - cy, tx - cx);
        
        ctx.strokeStyle = MAP_CONFIG.colors.target; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); 
        ctx.beginPath(); ctx.moveTo(cx, cy); 
        const drawDist = Math.min(distToTarget, radius);
        ctx.lineTo(cx + Math.cos(angle) * drawDist, cy + Math.sin(angle) * drawDist);
        ctx.stroke(); ctx.setLineDash([]);
    }

    // --- MERKEZ İKONU (REFERANS VARLIĞA GÖRE) ---
    ctx.translate(cx, cy); 
    // Referans varlığın açısına göre döndür
    ctx.rotate((reference.angle || 0) + Math.PI/2);
    
    // Rengi referans varlığa göre belirle
    const centerColor = (reference === entities.echoRay) ? MAP_CONFIG.colors.echo : MAP_CONFIG.colors.player;
    ctx.fillStyle = centerColor; 
    
    ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(-4, 5); ctx.lineTo(4, 5); ctx.fill(); 
    
    ctx.restore(); 
}