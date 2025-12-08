// Path: js/windows/context.js

/**
 * Void Ray - Pencere: Bağlamlar (Context)
 * * Oyun mekaniklerinin detaylı analizini gösteren pencere.
 * * Hız, kargo, sensör ve enerji hesaplamalarını görselleştirir.
 * * game.js dosyasından taşınmıştır.
 */

var contextOpen = false;

let ctxEl = { 
    overlay: null, 
    speedFormula: null, speedVal: null, 
    cargoFormula: null, cargoVal: null, 
    sensorFormula: null, sensorVal: null, 
    envStatus: null, envDetail: null, 
    energyRate: null, energyState: null 
};

function initContextSystem() {
    ctxEl.overlay = document.getElementById('context-overlay');
    if (!ctxEl.overlay) return;
    
    ctxEl.speedFormula = document.getElementById('ctx-speed-formula');
    ctxEl.speedVal = document.getElementById('ctx-speed-val');
    ctxEl.cargoFormula = document.getElementById('ctx-cargo-formula');
    ctxEl.cargoVal = document.getElementById('ctx-cargo-val');
    ctxEl.sensorFormula = document.getElementById('ctx-sensor-formula');
    ctxEl.sensorVal = document.getElementById('ctx-sensor-val');
    ctxEl.envStatus = document.getElementById('ctx-env-status');
    ctxEl.envDetail = document.getElementById('ctx-env-detail');
    ctxEl.energyRate = document.getElementById('ctx-energy-rate');
    ctxEl.energyState = document.getElementById('ctx-energy-state');
}

window.toggleContext = function() { 
    if (!ctxEl.overlay) initContextSystem();
    contextOpen = !contextOpen;
    
    if(contextOpen) { 
        ctxEl.overlay.classList.add('open'); 
        if (typeof setHudButtonActive === 'function') setHudButtonActive('btn-context-icon', true);
        renderContext(); 
    } else { 
        ctxEl.overlay.classList.remove('open'); 
        if (typeof setHudButtonActive === 'function') setHudButtonActive('btn-context-icon', false);
    }
};

window.closeContext = function() {
    contextOpen = false;
    if(ctxEl.overlay) ctxEl.overlay.classList.remove('open');
    if (typeof setHudButtonActive === 'function') setHudButtonActive('btn-context-icon', false);
};

/**
 * Bağlam penceresindeki verileri anlık olarak günceller.
 * Bu fonksiyon game.js'deki oyun döngüsü (loop) içinden çağrılır.
 */
function renderContext() {
    if(!contextOpen || !player || !ctxEl.overlay) return;
    
    // 1. HIZ ANALİZİ - DETAYLI
    const isBoosting = keys[" "] && player.energy > 0;
    const baseSpeed = 10;
    const boostVal = isBoosting ? 8 : 0;
    const upgradeMult = 1 + (playerData.upgrades.playerSpeed * 0.15);
    
    // Gerçek fiziksel hız
    const rawMaxSpeed = (baseSpeed + boostVal) * upgradeMult;
    
    // HUD için x10 kalibrasyon (Kullanıcının gördüğü değer)
    const hudMaxSpeed = Math.floor(rawMaxSpeed * 10);

    let boostStyle = isBoosting ? "color:#34d399; font-weight:bold;" : "color:#64748b;";
    let boostText = isBoosting ? `AKTİF (+${boostVal})` : `PASİF (+0)`;

    if(ctxEl.speedFormula) {
        ctxEl.speedFormula.innerHTML = `
            <div style="display:flex; justify-content:space-between; color:#94a3b8;">
                <span>Taban Hız:</span> <span>${baseSpeed}</span>
            </div>
            <div style="display:flex; justify-content:space-between; ${boostStyle}">
                <span>İtici Güç (Boost):</span> <span>${boostText}</span>
            </div>
            <div style="display:flex; justify-content:space-between; color:#38bdf8;">
                <span>Motor Geliştirmesi:</span> <span>x${upgradeMult.toFixed(2)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; color:#a855f7; border-top:1px solid rgba(255,255,255,0.1); margin-top:2px; padding-top:2px;">
                <span>Gösterge Kalibrasyonu:</span> <span>x10</span>
            </div>
            <div style="display:flex; justify-content:space-between; color:#fff; font-weight:bold; margin-top:4px;">
                <span>SONUÇ (HUD):</span> <span>${hudMaxSpeed} KM/S</span>
            </div>
        `;
    }
    if(ctxEl.speedVal) ctxEl.speedVal.innerText = `${hudMaxSpeed} KM/S`;

    // 2. KARGO
    const baseCap = 150;
    const addedCap = playerData.upgrades.playerCapacity * 25;
    const totalCap = baseCap + addedCap;
    const currentLoad = collectedItems.length;
    let loadColor = currentLoad >= totalCap ? "text-red-500" : "text-white";
    
    if(ctxEl.cargoFormula) ctxEl.cargoFormula.innerHTML = `Tab [${baseCap}] + Gen [${addedCap}]`;
    if(ctxEl.cargoVal) ctxEl.cargoVal.innerHTML = `<span class="${loadColor}">${currentLoad}</span> / ${totalCap}`;

    // 3. SENSÖR
    const baseRange = 4000;
    const magnetMult = 1 + (playerData.upgrades.playerMagnet * 0.1);
    const finalRange = baseRange * magnetMult;
    
    if(ctxEl.sensorFormula) ctxEl.sensorFormula.innerHTML = `Tab [${baseRange}] x Many [${magnetMult.toFixed(1)}]`;
    if(ctxEl.sensorVal) ctxEl.sensorVal.innerText = `${Math.floor(finalRange)} km`;

    // 4. ORTAM
    // game.js'deki global nexus değişkenine erişim
    // Utils güncellemesi:
    const distToNexus = Utils.distEntity(player, nexus);
    const isOutOfBounds = player.x < 0 || player.x > WORLD_SIZE || player.y < 0 || player.y > WORLD_SIZE;
    
    if(ctxEl.envStatus) {
        if (isOutOfBounds) {
            ctxEl.envStatus.innerText = "RADYASYON";
            ctxEl.envStatus.className = "ctx-val text-red-500 blink text-sm";
            const dmg = (0.2 + (player.outOfBoundsTimer * 0.005)).toFixed(2);
            ctxEl.envDetail.innerText = `Hasar: -${dmg}/tick`;
        } else if (distToNexus < 1500) {
            ctxEl.envStatus.innerText = "GÜVENLİ";
            ctxEl.envStatus.className = "ctx-val text-sky-400 text-sm";
            ctxEl.envDetail.innerText = "Nexus Koruma Alanı";
        } else {
            ctxEl.envStatus.innerText = "UZAY";
            ctxEl.envStatus.className = "ctx-val text-gray-300 text-sm";
            ctxEl.envDetail.innerText = "Normal Seviye";
        }
    }

    // 5. ENERJİ
    let flowRate = 0; let stateText = "Beklemede"; let flowClass = "text-gray-400";
    const REGEN_PER_SEC = (0.01 * 60).toFixed(2);
    const MOVE_COST_PER_SEC = (0.002 * 60).toFixed(2);
    const BOOST_COST_PER_SEC = (0.05 * 60).toFixed(2);

    if (isBoosting) {
        flowRate = -BOOST_COST_PER_SEC; stateText = "AŞIRI YÜK"; flowClass = "text-red-400";
    } else if (Math.hypot(player.vx, player.vy) > 0.1) {
        let net = (parseFloat(REGEN_PER_SEC) - parseFloat(MOVE_COST_PER_SEC)).toFixed(2);
        flowRate = "+" + net; stateText = "AKTİF"; flowClass = "text-yellow-400";
    } else {
        flowRate = "+" + REGEN_PER_SEC; stateText = "ŞARJ"; flowClass = "text-emerald-400";
    }
    if(ctxEl.energyRate) {
        ctxEl.energyRate.innerText = `${flowRate} /s`;
        ctxEl.energyRate.className = `ctx-val ${flowClass}`;
    }
    if(ctxEl.energyState) ctxEl.energyState.innerText = stateText;
}