/**
 * Void Ray - Pencere: İletişim ve Bildirimler
 * * Sohbet geçmişi, sistem bildirimleri ve kullanıcı mesajlarını yönetir.
 * * Sürüklenebilir pencere mantığını içerir.
 * * js/chat.js dosyasından taşınmıştır.
 */

// İletişim Sistemi (Loglar ve Mesajlar)
let chatHistory = {
    genel: [],
    bilgi: [],
    grup: []
};
let activeChatTab = 'genel';

/**
 * Ekrana ve chat paneline bildirim gönderir.
 * Game logic tarafından global olarak kullanılır.
 */
function showNotification(planet, suffix) {
    let msg = "";
    let type = "loot";
    const name = planet.name || "";

    if (name === "ROTA OLUŞTURULDU" || name.includes("OTOMATİK")) {
        msg = `Sistem: ${name}`;
        type = "info";
    } else if (name.includes("EVRİM GEÇİRİLDİ")) {
        msg = `Sistem: ${name}`;
        type = "info";
    } else if (name.includes("YANKI DOĞDU") || name.includes("YANKI AYRILDI") || name.includes("YANKI: ŞARJ") || name.includes("DEPO")) {
        msg = `Sistem: ${name}`;
        type = "info";
    } else if (name.includes("ENERJİ")) {
         msg = `${name} ${suffix}`;
         type = "info";
    } else if (name.includes("ZEHİR") || name.includes("TEHLİKE") || name.includes("YANKI ZEHİRLENDİ") || name.includes("DOLU")) {
        msg = `UYARI: ${name} ${suffix}`;
        type = "alert";
    } else if (name.includes("KAYIP KARGO")) {
        msg = `Keşif: ${name} bulundu!`;
        type = "info";
    } else if (planet.type && (planet.type.id === 'common' || planet.type.id === 'rare' || planet.type.id === 'epic' || planet.type.id === 'legendary')) {
        msg = `Toplandı: ${name} ${suffix}`;
        type = "loot";
    } else {
        msg = `${name} ${suffix}`;
        type = "info";
    }
    
    addChatMessage(msg, type, 'bilgi');
}

/**
 * Sohbet paneline yeni bir mesaj ekler.
 */
function addChatMessage(text, type = 'system', channel = 'bilgi') {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const msgObj = { text, type, time: timeStr };
    
    chatHistory[channel].push(msgObj);
    
    if (channel !== 'genel') {
        chatHistory['genel'].push(msgObj);
    }
    
    if (activeChatTab === channel || activeChatTab === 'genel') {
        const chatContent = document.getElementById('chat-content');
        if (chatContent) {
            const div = document.createElement('div');
            div.className = `chat-message ${type}`;
            div.innerHTML = `<span class="chat-timestamp">[${timeStr}]</span> ${text}`;
            chatContent.appendChild(div);
            chatContent.scrollTop = chatContent.scrollHeight;
        }
    }
}

function switchChatTab(tab) {
    activeChatTab = tab;
    
    document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
    const activeTabEl = document.getElementById(`tab-${tab}`);
    if(activeTabEl) activeTabEl.classList.add('active');
    
    const inputArea = document.getElementById('chat-input-area');
    if(inputArea) {
        if(tab === 'bilgi') inputArea.style.display = 'none';
        else inputArea.style.display = 'flex';
    }

    const chatContent = document.getElementById('chat-content');
    if(chatContent) {
        chatContent.innerHTML = '';
        chatHistory[tab].forEach(msg => {
            const div = document.createElement('div');
            div.className = `chat-message ${msg.type}`;
            div.innerHTML = `<span class="chat-timestamp">[${msg.time}]</span> ${msg.text}`;
            chatContent.appendChild(div);
        });
        chatContent.scrollTop = chatContent.scrollHeight;
    }
}

function sendUserMessage() {
    const input = document.getElementById('chat-input');
    if(!input) return;
    
    const msg = input.value.trim();
    if(!msg) return;

    input.value = '';
    
    addChatMessage(`Pilot: ${msg}`, 'loot', activeChatTab);
    
    setTimeout(() => {
        addChatMessage("Sistem: İletişim kanallarında parazit var. Mesaj iletilemedi (Bakımda).", 'alert', activeChatTab);
    }, 200);
}

// --- BAŞLATMA FONKSİYONU ---
// index.html içindeki loader callback'inde çağrılır.
function initChatSystem() {
    console.log("Chat sistemi başlatılıyor...");

    const sendBtn = document.getElementById('chat-send-btn');
    if(sendBtn) {
        sendBtn.addEventListener('click', sendUserMessage);
    }

    const chatInput = document.getElementById('chat-input');
    if(chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if(e.key === 'Enter') sendUserMessage();
        });
    }

    // Chat Panelini Sürüklenebilir Yap
    const chatPanelEl = document.getElementById('chat-panel');
    const chatHeaderEl = document.querySelector('#chat-panel .chat-header');
    
    if(chatPanelEl && chatHeaderEl) {
        makeElementDraggable(chatPanelEl, chatHeaderEl);
    }
}

// --- SÜRÜKLE BIRAK SİSTEMİ ---
function makeElementDraggable(el, handle) {
    if (!el || !handle) return;
    
    handle.style.cursor = 'move';
    
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    handle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        
        const rect = el.getBoundingClientRect();
        
        el.style.bottom = 'auto';
        el.style.right = 'auto';
        el.style.left = rect.left + 'px';
        el.style.top = rect.top + 'px';
        el.style.margin = '0';
        
        startLeft = rect.left;
        startTop = rect.top;
        
        e.preventDefault();
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
    
    function onMouseMove(e) {
        if (!isDragging) return;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        let newLeft = startLeft + dx;
        let newTop = startTop + dy;
        
        const maxLeft = window.innerWidth - el.offsetWidth;
        const maxTop = window.innerHeight - el.offsetHeight;
        
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));
        
        el.style.left = newLeft + 'px';
        el.style.top = newTop + 'px';
    }
    
    function onMouseUp() {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
    
    window.addEventListener('resize', () => {
        const rect = el.getBoundingClientRect();
        const maxLeft = window.innerWidth - el.offsetWidth;
        const maxTop = window.innerHeight - el.offsetHeight;
        
        let newLeft = rect.left;
        let newTop = rect.top;
        
        if (newLeft > maxLeft) newLeft = maxLeft;
        if (newTop > maxTop) newTop = maxTop;
        
        el.style.left = Math.max(0, newLeft) + 'px';
        el.style.top = Math.max(0, newTop) + 'px';
    });
}