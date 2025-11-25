/**
 * Void Ray - Harita ve Radar Sistemi
 * * Bu modül Dependency Injection ve Merkezi Konfigürasyon kullanır.
 * * entities.js dosyasından taşınan getPlanetVisibility fonksiyonunu içerir.
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

function initMapListeners(canvasElement, worldSize, onTargetSelected) {
    if (canvasElement) {
        canvasElement.addEventListener('mousedown', (e) => {
            const rect = canvasElement.getBoundingClientRect();
            const clickX = e.clientX - rect.left; 
            const clickY = e.clientY - rect.top;
            
            const margin = MAP_CONFIG.bigmap.margin; // CONFIG KULLANIMI
            const cWidth = canvasElement.width;
            const cHeight = canvasElement.height;

            const scale = Math.min((cWidth - margin*2) / worldSize, (cHeight - margin*2) / worldSize);
            const offsetX = (cWidth - worldSize * scale) / 2;
            const offsetY = (cHeight - worldSize * scale) / 2;
    
            const worldX = (clickX - offsetX) / scale; 
            const worldY = (clickY - offsetY) / scale;
            
            if(worldX >= 0 && worldX <= worldSize && worldY >= 0 && worldY <= worldSize) {
                if (typeof onTargetSelected === 'function') {
                    onTargetSelected(worldX, worldY);
                }
            }
        });
    }
}

function drawBigMap(ctx, canvas, worldSize, entities, state) {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth; 
    canvas.height = container.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const margin = MAP_CONFIG.bigmap.margin;
    const scale = Math.min((canvas.width - margin*2) / worldSize, (canvas.height - margin*2) / worldSize);
    const offsetX = (canvas.width - worldSize * scale) / 2;
    const offsetY = (canvas.height - worldSize * scale) / 2;

    // Sınır çizgisi
    ctx.strokeStyle = MAP_CONFIG.bigmap.gridColor; 
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, worldSize*scale, worldSize*scale);

    const px = offsetX + entities.player.x * scale;
    const py = offsetY + entities.player.y * scale;
    
    // --- Oyuncu Radarı ---
    ctx.beginPath(); 
    ctx.arc(px, py, entities.player.radarRadius * scale, 0, Math.PI*2); 
    
    ctx.shadowBlur = 10;
    ctx.shadowColor = "rgba(251, 191, 36, 0.8)"; 
    ctx.strokeStyle = MAP_CONFIG.colors.radarStroke; 
    ctx.lineWidth = 1; 
    ctx.setLineDash([5, 5]); 
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.fillStyle = MAP_CONFIG.colors.radarArea; 
    ctx.fill();
    ctx.shadowBlur = 0;

    // --- Oyuncu Tarama Alanı ---
    ctx.beginPath(); 
    ctx.arc(px, py, entities.player.scanRadius * scale, 0, Math.PI*2); 
    
    ctx.shadowBlur = 15;
    ctx.shadowColor = MAP_CONFIG.minimap.scanColor; 
    ctx.strokeStyle = "rgba(16, 185, 129, 0.8)"; 
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = MAP_CONFIG.colors.scanArea; 
    ctx.fill();
    ctx.shadowBlur = 0;

    // --- Yankı Radarı ---
    if(entities.echoRay) {
        const ex = offsetX + entities.echoRay.x * scale;
        const ey = offsetY + entities.echoRay.y * scale;
        
        ctx.beginPath(); ctx.arc(ex, ey, entities.echoRay.radarRadius * scale, 0, Math.PI*2); 
        ctx.shadowBlur = 10; ctx.shadowColor = "rgba(251, 191, 36, 0.8)";
        ctx.strokeStyle = MAP_CONFIG.colors.radarStroke; ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = MAP_CONFIG.colors.radarArea; ctx.fill();
        
        ctx.beginPath(); ctx.arc(ex, ey, entities.echoRay.scanRadius * scale, 0, Math.PI*2); 
        ctx.shadowBlur = 15; ctx.shadowColor = MAP_CONFIG.minimap.scanColor;
        ctx.strokeStyle = "rgba(16, 185, 129, 0.8)"; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = MAP_CONFIG.colors.scanArea; ctx.fill(); ctx.shadowBlur = 0;
    }

    // --- Gezegenler ---
    entities.planets.forEach(p => {
        if(!p.collected) {
            // getPlanetVisibility global olarak tanımlanır.
            const visibility = getPlanetVisibility(p, entities.player, entities.echoRay);
            if (visibility === 0) return;

            ctx.beginPath(); 
            if (visibility === 1) ctx.fillStyle = "rgba(255,255,255,0.3)"; 
            else ctx.fillStyle = p.type.color; 
            
            const drawRadius = Math.max(1.5, 2 * scale); 
            ctx.arc(offsetX + p.x*scale, offsetY + p.y*scale, drawRadius, 0, Math.PI*2); 
            ctx.fill();
        }
    });

    // --- Sabit Üsler (Config Renkleri) ---
    ctx.fillStyle = MAP_CONFIG.colors.nexus; ctx.beginPath(); ctx.arc(offsetX + entities.nexus.x*scale, offsetY + entities.nexus.y*scale, 5, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = MAP_CONFIG.colors.nexus; ctx.beginPath(); ctx.arc(offsetX + entities.nexus.x*scale, offsetY + entities.nexus.y*scale, 10, 0, Math.PI*2); ctx.stroke();

    if(entities.repairStation) {
        ctx.fillStyle = MAP_CONFIG.colors.repair; ctx.beginPath(); ctx.arc(offsetX + entities.repairStation.x*scale, offsetY + entities.repairStation.y*scale, 4, 0, Math.PI*2); ctx.fill();
    }
    
    if(entities.storageCenter) {
        ctx.fillStyle = MAP_CONFIG.colors.storage; ctx.beginPath(); ctx.arc(offsetX + entities.storageCenter.x*scale, offsetY + entities.storageCenter.y*scale, 5, 0, Math.PI*2); ctx.fill();
    }

    if(entities.echoRay) { 
        ctx.fillStyle = MAP_CONFIG.colors.echo; ctx.beginPath(); ctx.arc(offsetX + entities.echoRay.x*scale, offsetY + entities.echoRay.y*scale, 4, 0, Math.PI*2); ctx.fill(); 
    }

    // Oyuncu İkonu
    ctx.save(); 
    ctx.translate(offsetX + entities.player.x*scale, offsetY + entities.player.y*scale); 
    ctx.rotate(entities.player.angle + Math.PI/2);
    ctx.fillStyle = MAP_CONFIG.colors.player; 
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 8); ctx.lineTo(-6, 8); ctx.fill(); 
    ctx.restore();

    // Hedef Çizgisi (Manual Target)
    if(state.manualTarget) {
        const tx = offsetX + state.manualTarget.x*scale; 
        const ty = offsetY + state.manualTarget.y*scale;
        
        ctx.strokeStyle = MAP_CONFIG.colors.target; 
        ctx.setLineDash([5, 5]); 
        ctx.beginPath(); ctx.moveTo(offsetX + entities.player.x*scale, offsetY + entities.player.y*scale); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(tx, ty, 5, 0, Math.PI*2); ctx.stroke();
    }

    // --- YANKI DÖNÜŞ ÇİZGİSİ (Büyük Harita) ---
    if(entities.echoRay && entities.echoRay.mode === 'return') {
        const ex = offsetX + entities.echoRay.x * scale;
        const ey = offsetY + entities.echoRay.y * scale;
        const px = offsetX + entities.player.x * scale;
        const py = offsetY + entities.player.y * scale;
        
        ctx.strokeStyle = MAP_CONFIG.colors.echo; 
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]); 
        
        // Animasyon
        ctx.lineDashOffset = -Date.now() / 20;

        ctx.beginPath(); 
        ctx.moveTo(ex, ey); // Yankıdan
        ctx.lineTo(px, py); // Oyuncuya
        ctx.stroke(); 
        
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;
    }
}

/**
 * Minimap (Küçük Harita) çizimi
 * Tamamen MAP_CONFIG üzerinden stil alır.
 */
function drawMiniMap(ctx, entities, state) {
    const size = MAP_CONFIG.minimap.size;
    const radius = MAP_CONFIG.minimap.radius;
    
    ctx.clearRect(0, 0, size, size); 
    
    ctx.save(); 
    ctx.beginPath(); ctx.arc(radius, radius, radius, 0, Math.PI*2); ctx.clip();
    
    ctx.fillStyle = MAP_CONFIG.minimap.bg;
    ctx.fill();

    const scale = radius / entities.player.radarRadius; 
    const cx = radius, cy = radius;
    
    // Tarama Alanı Çemberi
    const scanPixelRadius = entities.player.scanRadius * scale;
    ctx.lineWidth = 1;
    ctx.strokeStyle = MAP_CONFIG.minimap.scanColor; 
    ctx.setLineDash([3, 3]); 
    ctx.beginPath(); ctx.arc(cx, cy, scanPixelRadius, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);

    // Yankı
    if(entities.echoRay) {
        const ex = (entities.echoRay.x - entities.player.x) * scale + cx;
        const ey = (entities.echoRay.y - entities.player.y) * scale + cy;
        if (Math.hypot(ex - cx, ey - cy) < radius) {
            ctx.fillStyle = MAP_CONFIG.colors.echo; 
            ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI*2); ctx.fill(); 
        }
    }

    // Üsler
    const drawBase = (entity, color) => {
        const bx = (entity.x-entities.player.x)*scale + cx; 
        const by = (entity.y-entities.player.y)*scale + cy;
        if(Math.hypot(bx-cx, by-cy) < radius) {
            ctx.fillStyle = color; ctx.beginPath(); ctx.arc(bx, by, 3.5, 0, Math.PI*2); ctx.fill();
        }
    }
    
    drawBase(entities.nexus, MAP_CONFIG.colors.nexus);
    if(entities.repairStation) drawBase(entities.repairStation, MAP_CONFIG.colors.repair);
    if(entities.storageCenter) drawBase(entities.storageCenter, MAP_CONFIG.colors.storage);
    
    // Gezegenler
    entities.planets.forEach(p => {
        if(!p.collected) {
            let px = (p.x-entities.player.x)*scale + cx; 
            let py = (p.y-entities.player.y)*scale + cy;
            
            if(Math.hypot(px-cx, py-cy) < radius) {
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
        const tx = (state.manualTarget.x-entities.player.x)*scale + cx; 
        const ty = (state.manualTarget.y-entities.player.y)*scale + cy;
        const distToTarget = Math.hypot(tx-cx, ty-cy);
        const angle = Math.atan2(ty-cy, tx-cx);
        
        ctx.strokeStyle = MAP_CONFIG.colors.target; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); 
        ctx.beginPath(); ctx.moveTo(cx, cy); 
        const drawDist = Math.min(distToTarget, radius);
        ctx.lineTo(cx + Math.cos(angle)*drawDist, cy + Math.sin(angle)*drawDist);
        ctx.stroke(); ctx.setLineDash([]);
    }

    // Oyuncu Oku
    ctx.translate(cx, cy); 
    ctx.rotate(entities.player.angle+Math.PI/2);
    ctx.fillStyle = MAP_CONFIG.colors.player; 
    ctx.beginPath(); ctx.moveTo(0,-5); ctx.lineTo(-4,5); ctx.lineTo(4,5); ctx.fill(); 
    
    ctx.restore(); 
}