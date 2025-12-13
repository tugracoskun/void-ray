/**
 * Void Ray - Kullanıcı Arayüzü (UI) Yönetimi
 * GÜNCELLEME: Ekipman penceresi sürüklenebilir pencereler listesine eklendi.
 * GÜNCELLEME: Ana menüye dinamik GitHub güncelleme tarihi, mesajı ve versiyonu eklendi.
 */

let isHudVisible = true;
let windowGlobalZ = 5000; 

const globalTooltip = document.createElement('div');
globalTooltip.id = 'global-tooltip';
document.body.appendChild(globalTooltip);

function generateItemTooltipHTML(item) {
    const name = item.name || "Bilinmeyen";
    const typeColor = item.type ? item.type.color : '#fff';
    
    let html = `<div style="min-width: 180px;">`;
    
    html += `<div style="border-bottom: 1px solid ${typeColor}; padding-bottom: 4px; margin-bottom: 6px;">
        <span class="tooltip-title" style="color:${typeColor}; font-size:0.8rem;">${name}</span>
    </div>`;

    if (item.stats && item.stats.length > 0) {
        html += `<div class="tooltip-stats" style="display:flex; flex-direction:column; gap:2px;">`;
        item.stats.forEach(stat => {
            const valColor = stat.val > 0 ? '#4ade80' : '#ef4444';
            html += `<div style="font-size: 0.7rem; color: #cbd5e1; display:flex; justify-content:space-between;">
                <span>${stat.name}</span>
                <span style="color:${valColor}; font-weight:bold;">${stat.val > 0 ? '+' : ''}${stat.val}${stat.unit}</span>
            </div>`;
        });
        html += `</div>`;
    } 
    else if (item.type && item.type.xp) {
        html += `<span class="tooltip-xp" style="font-size:0.75rem;">${item.type.xp} XP</span>`;
    }
    
    if (item.desc) {
        html += `<div class="tooltip-desc" style="margin-top:8px; font-size:0.6rem; color:#94a3b8; font-style:italic; line-height:1.2;">${item.desc}</div>`;
    }
    
    html += `</div>`;
    return html;
}

function showTooltip(e, item) {
    if (!isHudVisible) return;
    
    let html = generateItemTooltipHTML(item);

    if (item.category === 'equipment' && typeof playerData !== 'undefined' && playerData.equipment) {
        let equippedItem = null;
        let equippedItem2 = null;

        if (item.slot === 'weapon') {
            equippedItem = playerData.equipment.weaponL;
            equippedItem2 = playerData.equipment.weaponR;
        } else {
            equippedItem = playerData.equipment[item.slot];
        }

        if (equippedItem || equippedItem2) {
            html = `<div style="display:flex; gap:15px; align-items: flex-start;">
                        <div>
                            <div style="font-size:0.6rem; color:#94a3b8; margin-bottom:4px; letter-spacing:1px;">ENVANTER</div>
                            ${html}
                        </div>
                        <div style="border-left:1px solid rgba(255,255,255,0.2); padding-left:15px;">
                            <div style="font-size:0.6rem; color:#fbbf24; margin-bottom:4px; letter-spacing:1px; font-weight:bold;">KUŞANILAN</div>
                            ${equippedItem ? generateItemTooltipHTML(equippedItem) : ''}
                            ${equippedItem2 ? `<div style="margin-top:10px; padding-top:10px; border-top:1px dashed rgba(255,255,255,0.1);">${generateItemTooltipHTML(equippedItem2)}</div>` : ''}
                        </div>
                    </div>`;
        }
    }

    globalTooltip.innerHTML = html;
    globalTooltip.style.display = 'block';
    moveTooltip(e);
}

window.showInfoTooltip = function(e, text) {
    if (!isHudVisible) return;
    globalTooltip.innerHTML = `<span class="tooltip-desc" style="color:#e2e8f0; font-size:0.75rem; letter-spacing:0.5px;">${text}</span>`;
    globalTooltip.style.display = 'block';
    moveTooltip(e);
};

function moveTooltip(e) {
    const width = globalTooltip.offsetWidth;
    const height = globalTooltip.offsetHeight;
    const offset = 15;
    let x = e.clientX + offset;
    let y = e.clientY + offset;
    if (x + width > window.innerWidth) x = e.clientX - width - offset;
    if (y + height > window.innerHeight) y = e.clientY - height - offset;
    globalTooltip.style.left = Math.max(0, x) + 'px';
    globalTooltip.style.top = Math.max(0, y) + 'px';
}

window.hideTooltip = function() { globalTooltip.style.display = 'none'; };

window.initUIListeners = function() {
    console.log("UI Olay Dinleyicileri başlatılıyor...");
    window.eventBus.on('player:levelup', (data) => {
        showNotification({name: `EVRİM GEÇİRİLDİ: SEVİYE ${data.level}`, type: {color: '#fff'}}, "");
        if(typeof audio !== 'undefined' && audio) audio.playEvolve();
    });
    setTimeout(initDraggableWindows, 100);
};

window.bringWindowToFront = function(el) {
    if (el.style.display === 'none' || el.offsetParent === null) return;
    windowGlobalZ++;
    el.style.zIndex = windowGlobalZ;
    const parentOverlay = el.closest('.overlay-base');
    if (parentOverlay) {
        parentOverlay.style.zIndex = windowGlobalZ;
    }
};

window.setHudButtonActive = function(id, isActive) {
    const btn = document.getElementById(id);
    if (btn) {
        if (isActive) btn.classList.add('active');
        else btn.classList.remove('active');
    }
};

window.toggleHUD = function() {
    isHudVisible = !isHudVisible;
    const hudContainer = document.getElementById('ui-hud');
    const panelsContainer = document.getElementById('ui-panels');
    
    if (hudContainer) hudContainer.classList.toggle('hidden-ui', !isHudVisible);
    if (panelsContainer) panelsContainer.classList.toggle('hidden-ui', !isHudVisible);
    
    if (!isHudVisible) hideTooltip();
    else showNotification({name: "ARAYÜZ AKTİF", type:{color:'#fff'}}, "");
}

function formatTime(ms) {
    if(!ms) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

function startTipsCycle() {
    let tipIdx = 0;
    const tipEl = document.getElementById('tip-text');
    if (!tipEl) return;
    setInterval(() => {
        tipEl.style.opacity = 0;
        setTimeout(() => {
            tipIdx = (tipIdx + 1) % TIPS.length;
            tipEl.innerText = TIPS[tipIdx];
            tipEl.style.opacity = 1;
        }, 1000);
    }, 5000);
}

function renderGrid(container, items, capacity, onClickAction, isUnlimited = false) {
    if (!container) return;
    container.innerHTML = '';
    container.className = 'inventory-grid-container';
    const displayCount = isUnlimited ? Math.max(items.length + 20, 100) : capacity;

    for (let i = 0; i < displayCount; i++) {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        if (i < items.length) {
            const item = items[i];
            slot.classList.add('has-item');
            const itemBox = document.createElement('div');
            itemBox.className = 'item-box';
            itemBox.style.backgroundColor = item.type.color;
            if (item.icon) {
                itemBox.innerText = item.icon;
                itemBox.style.fontSize = "1.2rem";
            } else if (item.name) {
                itemBox.innerText = item.name.charAt(0).toUpperCase();
            }
            slot.appendChild(itemBox);
            slot.onclick = () => { hideTooltip(); onClickAction(item); };
            slot.onmouseenter = (e) => showTooltip(e, item);
            slot.onmousemove = (e) => moveTooltip(e);
            slot.onmouseleave = () => hideTooltip();
        }
        container.appendChild(slot);
    }
}

function updateAIButton() {
    const btn = document.getElementById('ai-mode-btn');
    const aiToggle = document.getElementById('btn-ai-toggle');
    const modeBtn = document.getElementById('ai-mode-btn');
    aiToggle.classList.remove('warn-blink');

    if(!autopilot) {
            aiToggle.classList.remove('active'); 
            modeBtn.classList.remove('visible');
            return;
    }
    aiToggle.classList.add('active'); 
    modeBtn.classList.add('visible');

    if (aiMode === 'travel') { 
        btn.innerText = 'SEYİR'; btn.style.color = '#ef4444'; btn.style.borderColor = '#ef4444'; 
    } else if (aiMode === 'base') { 
        btn.innerText = 'ÜS'; btn.style.color = '#fbbf24'; btn.style.borderColor = '#fbbf24'; 
    } else if (aiMode === 'deposit') { 
        btn.innerText = 'DEPO'; btn.style.color = '#a855f7'; btn.style.borderColor = '#a855f7'; 
    } else { 
        if (typeof player !== 'undefined' && player.scoutTarget) {
            btn.innerText = 'KEŞİF'; btn.style.color = '#67e8f9'; btn.style.borderColor = '#67e8f9';
        } else {
            btn.innerText = 'TOPLA'; btn.style.color = 'white'; btn.style.borderColor = 'transparent';
        }
    }
}

window.checkMobile = function() {
    const warning = document.getElementById('mobile-warning');
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 800;
    if (warning) warning.style.display = isMobile ? 'flex' : 'none';
}
window.closeMobileWarning = function() {
    const warning = document.getElementById('mobile-warning');
    if (warning) warning.style.display = 'none';
}

window.initMainMenu = function() {
    const btnContinue = document.getElementById('btn-continue');
    const btnStart = document.getElementById('btn-start');
    
    if (btnContinue) {
        const newBtn = btnContinue.cloneNode(true);
        btnContinue.parentNode.replaceChild(newBtn, btnContinue);
    }
    if (btnStart) {
        const newBtn = btnStart.cloneNode(true);
        btnStart.parentNode.replaceChild(newBtn, btnStart);
    }

    const cleanBtnContinue = document.getElementById('btn-continue');
    const cleanBtnStart = document.getElementById('btn-start');

    if (typeof SaveManager !== 'undefined' && SaveManager.hasSave()) {
        if (cleanBtnContinue) {
            cleanBtnContinue.style.display = 'block';
            cleanBtnContinue.addEventListener('click', () => {
                startGameSession(true);
            });
        }
        
        if (cleanBtnStart) {
            cleanBtnStart.innerText = "YENİ YAŞAM DÖNGÜSÜ";
            cleanBtnStart.addEventListener('click', () => {
                if(confirm("Mevcut ilerleme silinecek. Emin misin?")) {
                    SaveManager.resetSave();
                    startGameSession(false);
                }
            });
        }
    } else {
        if (cleanBtnContinue) cleanBtnContinue.style.display = 'none';
        if (cleanBtnStart) {
            cleanBtnStart.innerText = "YAŞAM DÖNGÜSÜNÜ BAŞLAT";
            cleanBtnStart.addEventListener('click', () => {
                startGameSession(false);
            });
        }
    }

    // --- GITHUB SON GÜNCELLEME KONTROLÜ (DİNAMİK) ---
    const repoOwner = 'tugracoskun';
    const repoName = 'void-ray';
    
    fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/commits?per_page=1`)
        .then(response => {
            if (!response.ok) throw new Error("Network response was not ok");
            return response.json();
        })
        .then(data => {
            if (data && data.length > 0 && data[0].commit) {
                const commit = data[0].commit;
                const sha = data[0].sha.substring(0, 7); // Kısa SHA (Versiyon kodu)
                const date = new Date(commit.committer.date);
                const dateStr = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
                
                // Mesajın sadece ilk satırını al
                let message = commit.message.split('\n')[0];
                // Kısaltma işlemini CSS'e bıraktık, JS'de tam metni tutuyoruz.

                const container = document.getElementById('update-container');
                const separator = document.getElementById('update-separator');
                const dateEl = document.getElementById('update-date');
                const msgEl = document.getElementById('commit-msg');
                const shaEl = document.getElementById('commit-sha');
                
                if (container && dateEl) {
                    dateEl.innerText = dateStr;
                    
                    if(msgEl) {
                        msgEl.innerText = message;
                        msgEl.title = message; // Hover için tam metni ekle
                    }
                    if(shaEl) shaEl.innerText = `v.${sha}`; // Versiyon formatı
                    
                    container.style.display = 'flex';
                    if(separator) separator.style.display = 'block';
                }
            }
        })
        .catch(error => console.log("Github update fetch error:", error));
}

window.startGameSession = function(loadSave) {
    const mainMenu = document.getElementById('main-menu');
    if(mainMenu) mainMenu.classList.add('menu-hidden'); 
    
    const hud = document.getElementById('ui-hud');
    const panels = document.getElementById('ui-panels');
    if(hud) hud.classList.add('active');
    if(panels) panels.classList.add('active');
    
    const controlsWrapper = document.getElementById('menu-controls-wrapper');
    if (controlsWrapper) {
        controlsWrapper.classList.remove('menu-controls-visible');
        controlsWrapper.classList.add('menu-controls-hidden');
    }

    if(typeof init === 'function') init(); 
    
    if (loadSave && typeof SaveManager !== 'undefined') {
        SaveManager.load();
        SaveManager.init();
    } else if (typeof SaveManager !== 'undefined') {
        SaveManager.init();
    }

    if(audio) audio.init(); 
    if(typeof startLoop === 'function') startLoop(); 
}

window.makeElementDraggable = function(el, handle) {
    if (!el || !handle) return;
    handle.style.cursor = 'move';
    handle.style.userSelect = 'none'; 

    let isDragging = false;
    let startX, startY, startLeft, startTop;

    el.addEventListener('mousedown', function(e) {
        bringWindowToFront(el);
    }, { capture: true });

    handle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        const targetTag = e.target.tagName;
        if (['INPUT', 'BUTTON', 'TEXTAREA', 'A', 'SELECT'].includes(targetTag) || e.target.closest('.no-drag') || e.target.closest('.window-close-btn') || e.target.closest('.stats-close-btn')) return;

        bringWindowToFront(el);
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;

        const rect = el.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(el);
        if (computedStyle.position !== 'absolute' && computedStyle.position !== 'fixed') {
            el.style.position = 'absolute';
        }
        
        const offsetParent = el.offsetParent || document.body;
        const offsetParentRect = offsetParent.getBoundingClientRect();
        startLeft = rect.left - offsetParentRect.left;
        startTop = rect.top - offsetParentRect.top;

        el.style.left = startLeft + 'px';
        el.style.top = startTop + 'px';
        el.style.margin = '0';
        el.style.bottom = 'auto'; 
        el.style.right = 'auto';
        el.style.transform = 'none';

        document.body.style.cursor = 'move';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
        if (!isDragging) return;
        e.preventDefault();
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let newLeft = startLeft + dx;
        let newTop = startTop + dy;

        const parent = el.offsetParent || document.body;
        const parentW = parent.clientWidth;
        const parentH = parent.clientHeight;
        const elW = el.offsetWidth;
        const elH = el.offsetHeight;
        const maxLeft = parentW - elW;
        const maxTop = parentH - elH;

        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));

        el.style.left = newLeft + 'px';
        el.style.top = newTop + 'px';
    }

    function onMouseUp() {
        isDragging = false;
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
};

window.initDraggableWindows = function() {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const clamp = (val, min, max) => Math.max(min, Math.min(val, max));

    const windows = [
        { container: '#chat-panel', handle: '.chat-header' },
        { 
            container: '#inventory-overlay .inv-window', 
            handle: '.inv-header', 
            getPos: (w, h, elW, elH) => ({ x: w - elW - 20, y: (h - elH) / 2 }) 
        },
        { 
            container: '#equipment-overlay .equipment-window', 
            handle: '.equip-header', 
            getPos: (w, h, elW, elH) => ({ x: (w - elW) / 2, y: (h - elH) / 2 }) // Merkeze konumlandır
        },
        { 
            container: '#stats-overlay .stats-window', 
            handle: '.stats-header', 
            getPos: (w, h, elW, elH) => ({ x: w - elW - 20, y: 100 })
        }, 
        { 
            container: '#profile-overlay .profile-window', 
            handle: '.profile-rpg-header', 
            getPos: (w, h, elW, elH) => ({ x: 60, y: 100 })
        },
        { 
            container: '#context-overlay .context-window', 
            handle: '.context-header', 
            getPos: (w, h, elW, elH) => ({ x: 60, y: h - elH - 150 })
        },
        { 
            container: '#settings-panel', 
            handle: '#settings-header',
            getPos: (w, h, elW, elH) => ({ x: w - elW - 20, y: 70 })
        },
        { container: '#nexus-overlay .nexus-window', handle: '.nexus-header' },
        { container: '#storage-overlay .nexus-window', handle: '.nexus-header' },
        { container: '#echo-inventory-overlay .nexus-window', handle: '.nexus-header' },
        { container: '#achievements-overlay .stats-window', handle: '.stats-header' },
        { container: '#debug-fps-panel', handle: '#debug-fps-panel' }
    ];

    windows.forEach(win => {
        const containerEl = document.querySelector(win.container);
        const handleEl = containerEl ? (containerEl.querySelector(win.handle) || document.querySelector(win.handle)) : null;
        
        if (containerEl) {
            if (win.getPos) {
                let elW = containerEl.offsetWidth;
                let elH = containerEl.offsetHeight;
                if (elW === 0) elW = 300; 
                if (elH === 0) elH = 400; 

                const pos = win.getPos(screenW, screenH, elW, elH);
                const safeX = clamp(pos.x, 10, screenW - elW - 10);
                const safeY = clamp(pos.y, 10, screenH - elH - 10);

                containerEl.style.position = 'absolute';
                containerEl.style.left = safeX + 'px';
                containerEl.style.top = safeY + 'px';
                containerEl.style.margin = '0';
                containerEl.style.transform = 'none'; 
                containerEl.style.bottom = 'auto';
                containerEl.style.right = 'auto';
            }
            if (handleEl) {
                makeElementDraggable(containerEl, handleEl);
            }
        }
    });

    window.addEventListener('resize', () => {
        const newW = window.innerWidth;
        const newH = window.innerHeight;
        windows.forEach(win => {
            const el = document.querySelector(win.container);
            if (el && el.style.position === 'absolute') {
                const elW = el.offsetWidth;
                let currentLeft = parseFloat(el.style.left);
                let currentTop = parseFloat(el.style.top);
                if (isNaN(currentLeft)) currentLeft = el.getBoundingClientRect().left;
                if (isNaN(currentTop)) currentTop = el.getBoundingClientRect().top;
                const maxLeft = newW - elW;
                const maxTop = newH - el.offsetHeight;
                if (currentLeft > maxLeft) el.style.left = Math.max(0, maxLeft) + 'px';
                if (currentTop > maxTop) el.style.top = Math.max(0, maxTop) + 'px';
            }
        });
    });
};