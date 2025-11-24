/**
 * Void Ray - Harita ve Radar Sistemi
 * * Bu modül artık Global değişkenlere (player, nexus vb.) doğrudan erişmez.
 * * Tüm veriler parametre olarak (Dependency Injection) alınır.
 */

/**
 * Görünürlük hesaplar.
 * @param {Object} p - Hedef gezegen
 * @param {Object} player - Oyuncu nesnesi
 * @param {Object|null} echo - Yankı nesnesi (yoksa null)
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
 * @param {CanvasRenderingContext2D} ctx - Çizim yapılacak context (genelde ana oyun ekranı)
 * @param {Object} origin - Başlangıç noktası (genelde player) {x, y}
 * @param {Object} view - Görünüm ayarları {width, height, zoom}
 * @param {Object} target - Hedef koordinat {x, y}
 * @param {string} color - Ok rengi
 */
function drawTargetIndicator(ctx, origin, view, target, color) {
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    
    const screenHalfW = (view.width / view.zoom) / 2;
    const screenHalfH = (view.height / view.zoom) / 2;
    
    // Eğer hedef ekranın dışındaysa oku çiz
    if (Math.abs(dx) > screenHalfW || Math.abs(dy) > screenHalfH) {
        const angle = Math.atan2(dy, dx);
        const borderW = screenHalfW * 0.9;
        const borderH = screenHalfH * 0.9;
        
        let tx = Math.cos(angle) * borderW;
        let ty = Math.sin(angle) * borderH;
        
        // Köşelere sabitleme mantığı
        if (Math.abs(tx) > borderW) tx = Math.sign(tx) * borderW;
        if (Math.abs(ty) > borderH) ty = Math.sign(ty) * borderH;
        
        const screenX = view.width/2 + tx * view.zoom;
        const screenY = view.height/2 + ty * view.zoom;
        const distKM = Math.round(Math.hypot(dx, dy) / 100); 
        
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Transformu sıfırla (UI katmanı gibi çiz)
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
        
        // Mesafe yazısı
        ctx.rotate(-(angle + Math.PI/2));
        ctx.fillStyle = color;
        ctx.font = "bold 10px monospace";
        ctx.fillText(distKM + "m", 10, 0);
        
        ctx.restore();
    }
}

/**
 * Harita dinleyicilerini başlatır.
 * @param {HTMLCanvasElement} canvasElement - Tıklanacak canvas
 * @param {number} worldSize - Dünya boyutu
 * @param {Function} onTargetSelected - Hedef seçildiğinde çalışacak callback (x, y) -> void
 */
function initMapListeners(canvasElement, worldSize, onTargetSelected) {
    if (canvasElement) {
        canvasElement.addEventListener('mousedown', (e) => {
            const rect = canvasElement.getBoundingClientRect();
            const clickX = e.clientX - rect.left; 
            const clickY = e.clientY - rect.top;
            
            const margin = 50;
            // Canvas boyutunu dinamik al
            const cWidth = canvasElement.width;
            const cHeight = canvasElement.height;

            const scale = Math.min((cWidth - margin*2) / worldSize, (cHeight - margin*2) / worldSize);
            const offsetX = (cWidth - worldSize * scale) / 2;
            const offsetY = (cHeight - worldSize * scale) / 2;
    
            const worldX = (clickX - offsetX) / scale; 
            const worldY = (clickY - offsetY) / scale;
            
            if(worldX >= 0 && worldX <= worldSize && worldY >= 0 && worldY <= worldSize) {
                // Logic artık burada değil, callback fonksiyonunda (Game.js'de)
                if (typeof onTargetSelected === 'function') {
                    onTargetSelected(worldX, worldY);
                }
            }
        });
    }
}

/**
 * Haritayı kapatma yardımcısı
 */
function closeMap() {
    // DOM manipülasyonu UI ile ilgili olduğu için burada kalabilir veya ayrılabilir.
    // Şimdilik basitlik adına burada tutuyoruz ama mapOpen state'i game.js'den yönetilmeli.
    // Bu fonksiyon sadece görsel kapama yapıyor.
    document.getElementById('big-map-overlay').classList.remove('active');
}

/**
 * Büyük haritayı (Overlay) çizer.
 * @param {CanvasRenderingContext2D} ctx - Çizim yapılacak context
 * @param {HTMLCanvasElement} canvas - Canvas elementi (boyutlar için)
 * @param {number} worldSize - Dünya boyutu
 * @param {Object} entities - Oyundaki tüm varlıklar {player, nexus, planets, ...}
 * @param {Object} state - Harita durumu {manualTarget, ...}
 */
function drawBigMap(ctx, canvas, worldSize, entities, state) {
    const container = canvas.parentElement;
    
    // Canvas boyutunu container'a uydur
    canvas.width = container.clientWidth; 
    canvas.height = container.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const margin = 50;
    const scale = Math.min((canvas.width - margin*2) / worldSize, (canvas.height - margin*2) / worldSize);
    const offsetX = (canvas.width - worldSize * scale) / 2;
    const offsetY = (canvas.height - worldSize * scale) / 2;

    // Sınır çizgisi
    ctx.strokeStyle = "rgba(255,255,255,0.1)"; 
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, worldSize*scale, worldSize*scale);

    const px = offsetX + entities.player.x * scale;
    const py = offsetY + entities.player.y * scale;
    
    // --- Oyuncu Radarı ---
    ctx.beginPath(); 
    ctx.arc(px, py, entities.player.radarRadius * scale, 0, Math.PI*2); 
    
    ctx.shadowBlur = 10;
    ctx.shadowColor = "rgba(251, 191, 36, 0.8)"; 
    ctx.strokeStyle = "rgba(251, 191, 36, 0.6)"; 
    ctx.lineWidth = 1; 
    ctx.setLineDash([5, 5]); 
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.fillStyle = "rgba(251, 191, 36, 0.03)"; 
    ctx.fill();
    ctx.shadowBlur = 0;

    // --- Oyuncu Tarama Alanı ---
    ctx.beginPath(); 
    ctx.arc(px, py, entities.player.scanRadius * scale, 0, Math.PI*2); 
    
    ctx.shadowBlur = 15;
    ctx.shadowColor = "rgba(16, 185, 129, 0.8)"; 
    ctx.strokeStyle = "rgba(16, 185, 129, 0.8)"; 
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "rgba(16, 185, 129, 0.05)"; 
    ctx.fill();
    ctx.shadowBlur = 0;

    // --- Yankı Radarı ---
    if(entities.echoRay) {
        const ex = offsetX + entities.echoRay.x * scale;
        const ey = offsetY + entities.echoRay.y * scale;
        
        ctx.beginPath(); 
        ctx.arc(ex, ey, entities.echoRay.radarRadius * scale, 0, Math.PI*2); 
        
        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(251, 191, 36, 0.8)";
        ctx.strokeStyle = "rgba(251, 191, 36, 0.6)";
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(251, 191, 36, 0.03)";
        ctx.fill();
        
        ctx.beginPath(); 
        ctx.arc(ex, ey, entities.echoRay.scanRadius * scale, 0, Math.PI*2); 
        
        ctx.shadowBlur = 15;
        ctx.shadowColor = "rgba(16, 185, 129, 0.8)";
        ctx.strokeStyle = "rgba(16, 185, 129, 0.8)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "rgba(16, 185, 129, 0.05)";
        ctx.fill();
        
        ctx.shadowBlur = 0;
    }

    // --- Gezegenler ---
    entities.planets.forEach(p => {
        if(!p.collected) {
            const visibility = getPlanetVisibility(p, entities.player, entities.echoRay);
            if (visibility === 0) return;

            ctx.beginPath(); 
            
            if (visibility === 1) {
                ctx.fillStyle = "rgba(255,255,255,0.3)"; 
            } else {
                ctx.fillStyle = p.type.color; 
            }
            
            const drawRadius = Math.max(1.5, 2 * scale); 
            ctx.arc(offsetX + p.x*scale, offsetY + p.y*scale, drawRadius, 0, Math.PI*2); 
            ctx.fill();
        }
    });

    // --- Sabit Üsler ---
    // Nexus
    ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(offsetX + entities.nexus.x*scale, offsetY + entities.nexus.y*scale, 5, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "white"; ctx.beginPath(); ctx.arc(offsetX + entities.nexus.x*scale, offsetY + entities.nexus.y*scale, 10, 0, Math.PI*2); ctx.stroke();

    // Repair Station
    if(entities.repairStation) {
        ctx.fillStyle = "#10b981"; ctx.beginPath(); ctx.arc(offsetX + entities.repairStation.x*scale, offsetY + entities.repairStation.y*scale, 4, 0, Math.PI*2); ctx.fill();
    }
    
    // Storage Center
    if(entities.storageCenter) {
        ctx.fillStyle = "#a855f7"; ctx.beginPath(); ctx.arc(offsetX + entities.storageCenter.x*scale, offsetY + entities.storageCenter.y*scale, 5, 0, Math.PI*2); ctx.fill();
    }

    // Yankı İkonu
    if(entities.echoRay) { 
        ctx.fillStyle = "#67e8f9"; ctx.beginPath(); ctx.arc(offsetX + entities.echoRay.x*scale, offsetY + entities.echoRay.y*scale, 4, 0, Math.PI*2); ctx.fill(); 
    }

    // Oyuncu İkonu (Ok)
    ctx.save(); 
    ctx.translate(offsetX + entities.player.x*scale, offsetY + entities.player.y*scale); 
    ctx.rotate(entities.player.angle + Math.PI/2);
    ctx.fillStyle = "#38bdf8"; 
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 8); ctx.lineTo(-6, 8); ctx.fill(); 
    ctx.restore();

    // Hedef Çizgisi
    if(state.manualTarget) {
        const tx = offsetX + state.manualTarget.x*scale; 
        const ty = offsetY + state.manualTarget.y*scale;
        
        ctx.strokeStyle = "#ef4444"; 
        ctx.setLineDash([5, 5]); 
        ctx.beginPath(); 
        ctx.moveTo(offsetX + entities.player.x*scale, offsetY + entities.player.y*scale); 
        ctx.lineTo(tx, ty); 
        ctx.stroke(); 
        ctx.setLineDash([]);
        
        ctx.beginPath(); ctx.arc(tx, ty, 5, 0, Math.PI*2); ctx.stroke();
    }
}

/**
 * Minimap (Küçük Harita) çizimi
 * @param {CanvasRenderingContext2D} ctx - Minimap context'i
 * @param {Object} entities - Oyun varlıkları {player, nexus, ...}
 * @param {Object} state - Oyun durumu {manualTarget}
 */
function drawMiniMap(ctx, entities, state) {
    ctx.clearRect(0,0,180,180); 
    
    ctx.save(); 
    // Dairesel Maskeleme
    ctx.beginPath(); ctx.arc(90,90,90,0,Math.PI*2); ctx.clip();
    
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fill();

    const mmRadius = 90;
    const scale = mmRadius / entities.player.radarRadius; 
    const cx = 90, cy = 90;
    
    // Tarama Alanı Çemberi
    const scanPixelRadius = entities.player.scanRadius * scale;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(16, 185, 129, 0.4)"; 
    ctx.setLineDash([3, 3]); 
    ctx.beginPath(); ctx.arc(cx, cy, scanPixelRadius, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);

    // Yankı
    if(entities.echoRay) {
        const ex = (entities.echoRay.x - entities.player.x) * scale + cx;
        const ey = (entities.echoRay.y - entities.player.y) * scale + cy;
        
        const distToEcho = Math.hypot(ex - cx, ey - cy);
        if (distToEcho < mmRadius) {
            ctx.fillStyle = "#67e8f9"; 
            ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI*2); ctx.fill(); 
        }
    }

    // Nexus
    const nx = (entities.nexus.x-entities.player.x)*scale + cx; 
    const ny = (entities.nexus.y-entities.player.y)*scale + cy;
    if(Math.hypot(nx-cx, ny-cy) < mmRadius) {
            ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(nx, ny, 4, 0, Math.PI*2); ctx.fill();
    }

    // Repair Station
    const rx = (entities.repairStation.x-entities.player.x)*scale + cx; 
    const ry = (entities.repairStation.y-entities.player.y)*scale + cy;
    if(Math.hypot(rx-cx, ry-cy) < mmRadius) {
            ctx.fillStyle = "#10b981"; ctx.beginPath(); ctx.arc(rx, ry, 3, 0, Math.PI*2); ctx.fill();
    }
    
    // Storage Center
    const sx = (entities.storageCenter.x-entities.player.x)*scale + cx; 
    const sy = (entities.storageCenter.y-entities.player.y)*scale + cy;
    if(Math.hypot(sx-cx, sy-cy) < mmRadius) {
            ctx.fillStyle = "#a855f7"; ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI*2); ctx.fill();
    }
    
    // Gezegenler
    entities.planets.forEach(p => {
        if(!p.collected) {
            let px = (p.x-entities.player.x)*scale + cx; 
            let py = (p.y-entities.player.y)*scale + cy;
            
            if(Math.hypot(px-cx, py-cy) < mmRadius) {
                
                const visibility = getPlanetVisibility(p, entities.player, entities.echoRay);
                
                if (visibility === 1) {
                    ctx.fillStyle = "rgba(255,255,255,0.3)"; 
                } else if (visibility === 2) {
                    ctx.fillStyle = p.type.color; 
                } else {
                    return; 
                }
                
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
        
        ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); 
        ctx.beginPath(); 
        ctx.moveTo(cx, cy); 
        
        const drawDist = Math.min(distToTarget, mmRadius);
        ctx.lineTo(cx + Math.cos(angle)*drawDist, cy + Math.sin(angle)*drawDist);
        ctx.stroke(); 
        ctx.setLineDash([]);
    }

    // Oyuncu Oku (Merkezde Sabit)
    ctx.translate(cx, cy); 
    ctx.rotate(entities.player.angle+Math.PI/2);
    ctx.fillStyle="#38bdf8"; 
    ctx.beginPath(); ctx.moveTo(0,-5); ctx.lineTo(-4,5); ctx.lineTo(4,5); ctx.fill(); 
    
    ctx.restore(); 
}