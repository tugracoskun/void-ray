/**
 * Void Ray - Harita ve Radar Sistemi
 * * Bu dosya Minimap, Büyük Harita (BigMap) ve Görünürlük 
 * * hesaplamalarını yönetir.
 */

/**
 * Bir gezegenin veya nesnenin oyuncu veya Yankı tarafından görülüp görülmediğini hesaplar.
 * @returns {number} 0: Görünmez, 1: Radar İzi (Siluet), 2: Tam Görüş
 */
function getPlanetVisibility(p, player, echo) {
    let visibility = 0;

    const dPlayer = Math.hypot(player.x - p.x, player.y - p.y);
    
    if (dPlayer < player.scanRadius) {
        return 2; 
    }
    else if (dPlayer < player.radarRadius) {
        visibility = 1; 
    }

    if (echo) {
        const dEcho = Math.hypot(echo.x - p.x, echo.y - p.y);
        if (dEcho < echo.scanRadius) {
            return 2; 
        } else if (dEcho < echo.radarRadius) {
            if (visibility < 1) visibility = 1; 
        }
    }

    return visibility;
}

/**
 * Ekran dışındaki hedefleri gösteren yön okunu çizer.
 */
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

/**
 * Harita üzerindeki etkileşimleri (tıklama vb.) başlatır.
 * game.js içindeki init() fonksiyonundan çağrılmalıdır.
 */
function initMapListeners() {
    const bmCanvasEl = document.getElementById('big-map-canvas');
    if (bmCanvasEl) {
        bmCanvasEl.addEventListener('mousedown', (e) => {
            const rect = bmCanvasEl.getBoundingClientRect();
            const clickX = e.clientX - rect.left; 
            const clickY = e.clientY - rect.top;
            
            const margin = 50;
            const scale = Math.min((bmCanvasEl.width - margin*2) / WORLD_SIZE, (bmCanvasEl.height - margin*2) / WORLD_SIZE);
            const offsetX = (bmCanvasEl.width - WORLD_SIZE * scale) / 2;
            const offsetY = (bmCanvasEl.height - WORLD_SIZE * scale) / 2;
    
            const worldX = (clickX - offsetX) / scale; 
            const worldY = (clickY - offsetY) / scale;
            
            if(worldX >= 0 && worldX <= WORLD_SIZE && worldY >= 0 && worldY <= WORLD_SIZE) {
                manualTarget = {x: worldX, y: worldY};
                autopilot = true; 
                aiMode = 'travel';
                document.getElementById('btn-ai-toggle').classList.add('active');
                updateAIButton();
                showNotification({name: "ROTA OLUŞTURULDU", type:{color:'#fff'}}, "");
            }
        });
    }
}

function closeMap() {
    mapOpen = false;
    document.getElementById('big-map-overlay').classList.remove('active');
}

/**
 * Büyük haritayı (Overlay) çizer.
 */
function drawBigMap() {
    if(!mapOpen) return;
    const container = document.querySelector('.big-map-container');
    
    // bmCanvas game.js'de tanımlı global değişkendir
    bmCanvas.width = container.clientWidth; 
    bmCanvas.height = container.clientHeight;
    bmCtx.clearRect(0, 0, bmCanvas.width, bmCanvas.height);

    const margin = 50;
    const scale = Math.min((bmCanvas.width - margin*2) / WORLD_SIZE, (bmCanvas.height - margin*2) / WORLD_SIZE);
    const offsetX = (bmCanvas.width - WORLD_SIZE * scale) / 2;
    const offsetY = (bmCanvas.height - WORLD_SIZE * scale) / 2;

    bmCtx.strokeStyle = "rgba(255,255,255,0.1)"; bmCtx.lineWidth = 2;
    bmCtx.strokeRect(offsetX, offsetY, WORLD_SIZE*scale, WORLD_SIZE*scale);

    const px = offsetX + player.x * scale;
    const py = offsetY + player.y * scale;
    
    // --- Oyuncu Radarı ---
    bmCtx.beginPath(); 
    bmCtx.arc(px, py, player.radarRadius * scale, 0, Math.PI*2); 
    
    bmCtx.shadowBlur = 10;
    bmCtx.shadowColor = "rgba(251, 191, 36, 0.8)"; 
    bmCtx.strokeStyle = "rgba(251, 191, 36, 0.6)"; 
    bmCtx.lineWidth = 1; 
    bmCtx.setLineDash([5, 5]); 
    bmCtx.stroke();
    bmCtx.setLineDash([]);
    
    bmCtx.fillStyle = "rgba(251, 191, 36, 0.03)"; 
    bmCtx.fill();
    bmCtx.shadowBlur = 0;

    bmCtx.beginPath(); 
    bmCtx.arc(px, py, player.scanRadius * scale, 0, Math.PI*2); 
    
    bmCtx.shadowBlur = 15;
    bmCtx.shadowColor = "rgba(16, 185, 129, 0.8)"; 
    bmCtx.strokeStyle = "rgba(16, 185, 129, 0.8)"; 
    bmCtx.lineWidth = 1;
    bmCtx.stroke();
    bmCtx.fillStyle = "rgba(16, 185, 129, 0.05)"; 
    bmCtx.fill();
    bmCtx.shadowBlur = 0;

    // --- Yankı Radarı ---
    if(echoRay) {
        const ex = offsetX + echoRay.x * scale;
        const ey = offsetY + echoRay.y * scale;
        
        bmCtx.beginPath(); 
        bmCtx.arc(ex, ey, echoRay.radarRadius * scale, 0, Math.PI*2); 
        
        bmCtx.shadowBlur = 10;
        bmCtx.shadowColor = "rgba(251, 191, 36, 0.8)";
        bmCtx.strokeStyle = "rgba(251, 191, 36, 0.6)";
        bmCtx.lineWidth = 1;
        bmCtx.setLineDash([5, 5]);
        bmCtx.stroke();
        bmCtx.setLineDash([]);
        bmCtx.fillStyle = "rgba(251, 191, 36, 0.03)";
        bmCtx.fill();
        
        bmCtx.beginPath(); 
        bmCtx.arc(ex, ey, echoRay.scanRadius * scale, 0, Math.PI*2); 
        
        bmCtx.shadowBlur = 15;
        bmCtx.shadowColor = "rgba(16, 185, 129, 0.8)";
        bmCtx.strokeStyle = "rgba(16, 185, 129, 0.8)";
        bmCtx.lineWidth = 1;
        bmCtx.stroke();
        bmCtx.fillStyle = "rgba(16, 185, 129, 0.05)";
        bmCtx.fill();
        
        bmCtx.shadowBlur = 0;
    }

    planets.forEach(p => {
        if(!p.collected) {
            const visibility = getPlanetVisibility(p, player, echoRay);
            if (visibility === 0) return;

            bmCtx.beginPath(); 
            
            if (visibility === 1) {
                bmCtx.fillStyle = "rgba(255,255,255,0.3)"; 
            } else {
                bmCtx.fillStyle = p.type.color; 
            }
            
            const drawRadius = Math.max(1.5, 2 * scale); 
            bmCtx.arc(offsetX + p.x*scale, offsetY + p.y*scale, drawRadius, 0, Math.PI*2); 
            bmCtx.fill();
        }
    });

    bmCtx.fillStyle = "white"; bmCtx.beginPath(); bmCtx.arc(offsetX + nexus.x*scale, offsetY + nexus.y*scale, 5, 0, Math.PI*2); bmCtx.fill();
    bmCtx.strokeStyle = "white"; bmCtx.beginPath(); bmCtx.arc(offsetX + nexus.x*scale, offsetY + nexus.y*scale, 10, 0, Math.PI*2); bmCtx.stroke();

    if(repairStation) {
        bmCtx.fillStyle = "#10b981"; bmCtx.beginPath(); bmCtx.arc(offsetX + repairStation.x*scale, offsetY + repairStation.y*scale, 4, 0, Math.PI*2); bmCtx.fill();
    }
    
    if(storageCenter) {
        bmCtx.fillStyle = "#a855f7"; bmCtx.beginPath(); bmCtx.arc(offsetX + storageCenter.x*scale, offsetY + storageCenter.y*scale, 5, 0, Math.PI*2); bmCtx.fill();
    }

    if(echoRay) { bmCtx.fillStyle = "#67e8f9"; bmCtx.beginPath(); bmCtx.arc(offsetX + echoRay.x*scale, offsetY + echoRay.y*scale, 4, 0, Math.PI*2); bmCtx.fill(); }

    bmCtx.save(); bmCtx.translate(offsetX + player.x*scale, offsetY + player.y*scale); bmCtx.rotate(player.angle + Math.PI/2);
    bmCtx.fillStyle = "#38bdf8"; bmCtx.beginPath(); bmCtx.moveTo(0, -8); bmCtx.lineTo(6, 8); bmCtx.lineTo(-6, 8); bmCtx.fill(); bmCtx.restore();

    if(manualTarget) {
        const tx = offsetX + manualTarget.x*scale; const ty = offsetY + manualTarget.y*scale;
        bmCtx.strokeStyle = "#ef4444"; bmCtx.setLineDash([5, 5]); bmCtx.beginPath(); bmCtx.moveTo(offsetX + player.x*scale, offsetY + player.y*scale); bmCtx.lineTo(tx, ty); bmCtx.stroke(); bmCtx.setLineDash([]);
        bmCtx.beginPath(); bmCtx.arc(tx, ty, 5, 0, Math.PI*2); bmCtx.stroke();
    }
}

/**
 * Minimap (Küçük Harita) çizimi
 */
function drawMiniMap() {
    // mmCtx game.js'de tanımlı global değişkendir
    mmCtx.clearRect(0,0,180,180); 
    
    mmCtx.save(); 
    mmCtx.beginPath(); mmCtx.arc(90,90,90,0,Math.PI*2); mmCtx.clip();
    
    mmCtx.fillStyle = "rgba(0, 0, 0, 0.8)";
    mmCtx.fill();

    const mmRadius = 90;
    const scale = mmRadius / player.radarRadius; 
    const cx = 90, cy = 90;
    
    const scanPixelRadius = player.scanRadius * scale;
    mmCtx.lineWidth = 1;
    mmCtx.strokeStyle = "rgba(16, 185, 129, 0.4)"; 
    mmCtx.setLineDash([3, 3]); 
    mmCtx.beginPath(); mmCtx.arc(cx, cy, scanPixelRadius, 0, Math.PI*2); mmCtx.stroke();
    mmCtx.setLineDash([]);

    if(echoRay) {
        const ex = (echoRay.x - player.x) * scale + cx;
        const ey = (echoRay.y - player.y) * scale + cy;
        
        const distToEcho = Math.hypot(ex - cx, ey - cy);
        if (distToEcho < mmRadius) {
            mmCtx.fillStyle = "#67e8f9"; 
            mmCtx.beginPath(); mmCtx.arc(ex, ey, 3, 0, Math.PI*2); mmCtx.fill(); 
        }
    }

    const nx = (nexus.x-player.x)*scale + cx; const ny = (nexus.y-player.y)*scale + cy;
    if(Math.hypot(nx-cx, ny-cy) < mmRadius) {
            mmCtx.fillStyle = "white"; mmCtx.beginPath(); mmCtx.arc(nx, ny, 4, 0, Math.PI*2); mmCtx.fill();
    }

    const rx = (repairStation.x-player.x)*scale + cx; const ry = (repairStation.y-player.y)*scale + cy;
    if(Math.hypot(rx-cx, ry-cy) < mmRadius) {
            mmCtx.fillStyle = "#10b981"; mmCtx.beginPath(); mmCtx.arc(rx, ry, 3, 0, Math.PI*2); mmCtx.fill();
    }
    
    const sx = (storageCenter.x-player.x)*scale + cx; const sy = (storageCenter.y-player.y)*scale + cy;
    if(Math.hypot(sx-cx, sy-cy) < mmRadius) {
            mmCtx.fillStyle = "#a855f7"; mmCtx.beginPath(); mmCtx.arc(sx, sy, 3, 0, Math.PI*2); mmCtx.fill();
    }
    
    planets.forEach(p => {
        if(!p.collected) {
            let px = (p.x-player.x)*scale + cx; let py = (p.y-player.y)*scale + cy;
            
            if(Math.hypot(px-cx, py-cy) < mmRadius) {
                
                const visibility = getPlanetVisibility(p, player, echoRay);
                
                if (visibility === 1) {
                    mmCtx.fillStyle = "rgba(255,255,255,0.3)"; 
                } else if (visibility === 2) {
                    mmCtx.fillStyle = p.type.color; 
                } else {
                    return; 
                }
                
                mmCtx.beginPath(); mmCtx.arc(px, py, 1.5, 0, Math.PI*2); mmCtx.fill();
            }
        }
    });
    
    if(manualTarget) {
        const tx = (manualTarget.x-player.x)*scale + cx; const ty = (manualTarget.y-player.y)*scale + cy;
        const distToTarget = Math.hypot(tx-cx, ty-cy);
        const angle = Math.atan2(ty-cy, tx-cx);
        
        mmCtx.strokeStyle = "#ef4444"; mmCtx.lineWidth = 1; mmCtx.setLineDash([2, 2]); 
        mmCtx.beginPath(); 
        mmCtx.moveTo(cx, cy); 
        
        const drawDist = Math.min(distToTarget, mmRadius);
        mmCtx.lineTo(cx + Math.cos(angle)*drawDist, cy + Math.sin(angle)*drawDist);
        mmCtx.stroke(); 
        mmCtx.setLineDash([]);
    }

    mmCtx.translate(cx, cy); mmCtx.rotate(player.angle+Math.PI/2);
    mmCtx.fillStyle="#38bdf8"; mmCtx.beginPath(); mmCtx.moveTo(0,-5); mmCtx.lineTo(-4,5); mmCtx.lineTo(4,5); mmCtx.fill(); 
    
    mmCtx.restore(); 
}