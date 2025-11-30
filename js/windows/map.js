/**
 * Void Ray - Pencere: Büyük Harita
 * * Büyük harita penceresini, etkileşimlerini ve çizimini yönetir.
 * * ui.js ve maps.js dosyalarından ayrıştırılmıştır.
 */

// Pencere Durumu
let mapOpen = false;

// Büyük Harita Durumu (Zoom ve Pan Kontrolü)
const bigMapState = {
    zoom: 1,
    panX: 0,
    panY: 0,
    isDragging: false
};

function openMap() {
    mapOpen = true;
    document.getElementById('big-map-overlay').classList.add('active');
}

function closeMap() {
    mapOpen = false;
    document.getElementById('big-map-overlay').classList.remove('active');
}

function initMapListeners(canvasElement, worldSize, onTargetSelected) {
    if (!canvasElement) return;

    let dragStartX = 0;
    let dragStartY = 0;
    let hasDragged = false;

    // Zoom (Tekerlek) - Mouse Konumuna Göre
    canvasElement.addEventListener('wheel', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const rect = canvasElement.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomSensitivity = 0.001;
        const oldZoom = bigMapState.zoom;
        let newZoom = oldZoom + (e.deltaY * -zoomSensitivity * 2); 
        newZoom = Math.min(Math.max(1, newZoom), 8);

        if (newZoom !== oldZoom) {
            const canvasCenterX = canvasElement.width / 2;
            const canvasCenterY = canvasElement.height / 2;
            const mouseRelX = mouseX - canvasCenterX;
            const mouseRelY = mouseY - canvasCenterY;

            const zoomFactor = newZoom / oldZoom;
            
            bigMapState.panX = mouseRelX - (mouseRelX - bigMapState.panX) * zoomFactor;
            bigMapState.panY = mouseRelY - (mouseRelY - bigMapState.panY) * zoomFactor;

            bigMapState.zoom = newZoom;

            if (bigMapState.zoom === 1) {
                bigMapState.panX = 0;
                bigMapState.panY = 0;
            }
        }
    });

    // Sürükleme Başlangıcı
    canvasElement.addEventListener('mousedown', (e) => {
        bigMapState.isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        hasDragged = false;
    });

    // Sürükleme
    window.addEventListener('mousemove', (e) => {
        if (bigMapState.isDragging) {
            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;
            
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDragged = true;

            bigMapState.panX += dx;
            bigMapState.panY += dy;

            dragStartX = e.clientX;
            dragStartY = e.clientY;
        }
    });

    // Sürükleme Bitişi / Tıklama
    window.addEventListener('mouseup', (e) => {
        bigMapState.isDragging = false;
        
        if (!hasDragged && e.target === canvasElement) {
            const rect = canvasElement.getBoundingClientRect();
            const clickX = e.clientX - rect.left; 
            const clickY = e.clientY - rect.top;
            
            const margin = MAP_CONFIG.bigmap.margin;
            const cWidth = canvasElement.width;
            const cHeight = canvasElement.height;

            const baseScale = Math.min((cWidth - margin*2) / worldSize, (cHeight - margin*2) / worldSize);
            const finalScale = baseScale * bigMapState.zoom;
            
            const offsetX = (cWidth - worldSize * finalScale) / 2 + bigMapState.panX;
            const offsetY = (cHeight - worldSize * finalScale) / 2 + bigMapState.panY;
    
            const worldX = (clickX - offsetX) / finalScale; 
            const worldY = (clickY - offsetY) / finalScale;
            
            if(worldX >= 0 && worldX <= worldSize && worldY >= 0 && worldY <= worldSize) {
                if (typeof onTargetSelected === 'function') {
                    onTargetSelected(worldX, worldY);
                }
            }
        }
    });
}

function drawBigMap(ctx, canvas, worldSize, entities, state) {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth; 
    canvas.height = container.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const margin = MAP_CONFIG.bigmap.margin;
    
    const baseScale = Math.min((canvas.width - margin*2) / worldSize, (canvas.height - margin*2) / worldSize);
    const scale = baseScale * bigMapState.zoom;

    const offsetX = (canvas.width - worldSize * scale) / 2 + bigMapState.panX;
    const offsetY = (canvas.height - worldSize * scale) / 2 + bigMapState.panY;

    // --- ZOOM SEVİYESİ GÖSTERGESİ ---
    ctx.save();
    ctx.font = "bold 16px monospace";
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 4;
    // Sağ üst köşeye yazdır
    ctx.fillText(`ZOOM: ${bigMapState.zoom.toFixed(1)}x`, canvas.width - 20, 20);
    ctx.restore();

    // --- GRID SİSTEMİ ---
    const GRID_STEP_MAJOR = MAP_CONFIG.grid.major; 
    const GRID_STEP_MINOR = MAP_CONFIG.grid.minor; 

    ctx.save();
    ctx.beginPath();
    ctx.rect(offsetX, offsetY, worldSize * scale, worldSize * scale);
    ctx.clip();

    if (bigMapState.zoom > 2) {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
        ctx.lineWidth = 1;

        for (let x = 0; x <= worldSize; x += GRID_STEP_MINOR) {
            const screenX = offsetX + x * scale;
            ctx.moveTo(screenX, offsetY);
            ctx.lineTo(screenX, offsetY + worldSize * scale);
        }
        for (let y = 0; y <= worldSize; y += GRID_STEP_MINOR) {
            const screenY = offsetY + y * scale;
            ctx.moveTo(offsetX, screenY);
            ctx.lineTo(offsetX + worldSize * scale, screenY);
        }
        ctx.stroke();
    }

    ctx.beginPath();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.1)";
    ctx.lineWidth = 1;
    ctx.fillStyle = "rgba(56, 189, 248, 0.4)";
    ctx.font = "10px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    for (let x = 0; x <= worldSize; x += GRID_STEP_MAJOR) {
        const screenX = offsetX + x * scale;
        ctx.moveTo(screenX, offsetY);
        ctx.lineTo(screenX, offsetY + worldSize * scale);
        if(screenX > 0 && screenX < canvas.width)
            ctx.fillText((x/1000)+"k", screenX + 2, offsetY + 2);
    }
    for (let y = 0; y <= worldSize; y += GRID_STEP_MAJOR) {
        const screenY = offsetY + y * scale;
        ctx.moveTo(offsetX, screenY);
        ctx.lineTo(offsetX + worldSize * scale, screenY);
        if(screenY > 0 && screenY < canvas.height)
            ctx.fillText((y/1000)+"k", offsetX + 2, screenY + 2);
    }
    ctx.stroke();

    ctx.restore();

    ctx.strokeStyle = "rgba(56, 189, 248, 0.3)"; 
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, worldSize*scale, worldSize*scale);

    const px = offsetX + entities.player.x * scale;
    const py = offsetY + entities.player.y * scale;

    // Mesafe Halkaları
    ctx.save();
    ctx.translate(px, py);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);

    const rings = MAP_CONFIG.grid.rings;
    rings.forEach(r => {
        const rScaled = r * scale;
        ctx.beginPath();
        ctx.arc(0, 0, rScaled, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillText((r/1000) + "km", 0, -rScaled - 2);
    });
    ctx.restore();

    // Oyuncu Radarı
    ctx.beginPath(); 
    ctx.arc(px, py, entities.player.radarRadius * scale, 0, Math.PI*2); 
    ctx.shadowBlur = 10; ctx.shadowColor = "rgba(251, 191, 36, 0.8)"; 
    ctx.strokeStyle = MAP_CONFIG.colors.radarStroke; 
    ctx.lineWidth = 1; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = MAP_CONFIG.colors.radarArea; ctx.fill(); ctx.shadowBlur = 0;

    // Oyuncu Tarama Alanı
    ctx.beginPath(); 
    ctx.arc(px, py, entities.player.scanRadius * scale, 0, Math.PI*2); 
    ctx.shadowBlur = 15; ctx.shadowColor = MAP_CONFIG.minimap.scanColor; 
    ctx.strokeStyle = "rgba(16, 185, 129, 0.8)"; 
    ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = MAP_CONFIG.colors.scanArea; ctx.fill(); ctx.shadowBlur = 0;

    // Yankı Radarı
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

    // Gezegenler
    entities.planets.forEach(p => {
        if(!p.collected) {
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

    // --- GÜVENLİ BÖLGE (YENİ) ---
    // Nexus ve çevresini kapsayan alan
    const SAFE_ZONE_R = 1500;
    const nx = offsetX + entities.nexus.x * scale;
    const ny = offsetY + entities.nexus.y * scale;

    ctx.beginPath();
    ctx.arc(nx, ny, SAFE_ZONE_R * scale, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(56, 189, 248, 0.3)"; // Mavi-Yeşil ton
    ctx.lineWidth = 1;
    ctx.setLineDash([10, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(56, 189, 248, 0.05)";
    ctx.fill();

    // Üsler
    const drawBaseIcon = (entity, color, label) => {
        const bx = offsetX + entity.x * scale;
        const by = offsetY + entity.y * scale;
        
        ctx.fillStyle = color; 
        ctx.beginPath(); ctx.arc(bx, by, 5, 0, Math.PI*2); ctx.fill();
        
        ctx.strokeStyle = color; 
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI*2); ctx.stroke();

        if (bigMapState.zoom > 1.5) {
            ctx.fillStyle = "white";
            ctx.font = "10px monospace";
            ctx.textAlign = "center";
            ctx.fillText(label, bx, by + 18);
        }
    };

    drawBaseIcon(entities.nexus, MAP_CONFIG.colors.nexus, "NEXUS");
    if(entities.repairStation) drawBaseIcon(entities.repairStation, MAP_CONFIG.colors.repair, "TAMİR");
    if(entities.storageCenter) drawBaseIcon(entities.storageCenter, MAP_CONFIG.colors.storage, "DEPO");

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

    // Hedef Çizgisi
    if(state.manualTarget) {
        const tx = offsetX + state.manualTarget.x*scale; 
        const ty = offsetY + state.manualTarget.y*scale;
        
        ctx.strokeStyle = MAP_CONFIG.colors.target; 
        ctx.setLineDash([5, 5]); 
        ctx.beginPath(); ctx.moveTo(offsetX + entities.player.x*scale, offsetY + entities.player.y*scale); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(tx, ty, 5, 0, Math.PI*2); ctx.stroke();
        
        ctx.fillStyle = MAP_CONFIG.colors.target;
        ctx.font = "10px monospace";
        ctx.fillText(`HEDEF [${Math.floor(state.manualTarget.x/1000)}:${Math.floor(state.manualTarget.y/1000)}]`, tx + 10, ty);
    }

    // Yankı Dönüş Çizgisi
    if(entities.echoRay && entities.echoRay.mode === 'return') {
        const ex = offsetX + entities.echoRay.x * scale;
        const ey = offsetY + entities.echoRay.y * scale;
        const px = offsetX + entities.player.x * scale;
        const py = offsetY + entities.player.y * scale;
        
        ctx.strokeStyle = MAP_CONFIG.colors.echo; 
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]); 
        ctx.lineDashOffset = -Date.now() / 20;

        ctx.beginPath(); 
        ctx.moveTo(ex, ey); 
        ctx.lineTo(px, py); 
        ctx.stroke(); 
        
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;
    }
}