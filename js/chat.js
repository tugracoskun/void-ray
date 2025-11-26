/**
 * Void Ray - İletişim ve Bildirim Sistemi
 * * Sohbet geçmişi, sistem bildirimleri ve kullanıcı mesajlarını yönetir.
 * * AYRICA: Sürüklenebilir pencere mantığını içerir (Sınır korumalı).
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
 * @param {Object} planet - Etkileşime girilen nesne veya olay objesi
 * @param {string} suffix - Mesajın sonuna eklenecek ek metin (örn: "x2")
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
 * @param {string} text - Mesaj içeriği
 * @param {string} type - Mesaj tipi (system, loot, alert, info)
 * @param {string} channel - Hangi kanala ekleneceği
 */
function addChatMessage(text, type = 'system', channel = 'bilgi') {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const msgObj = { text, type, time: timeStr };
    
    chatHistory[channel].push(msgObj);
    
    // Bilgi kanalı hariç diğerlerini genele de ekle (opsiyonel mantık)
    if (channel !== 'genel') {
        chatHistory['genel'].push(msgObj);
    }
    
    // Eğer şu an açık olan tab bu kanalsa veya genel ise ekrana yazdır
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

/**
 * Sohbet sekmeleri arasında geçiş yapar.
 */
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

/**
 * Kullanıcının yazdığı mesajı gönderir.
 */
function sendUserMessage() {
    const input = document.getElementById('chat-input');
    if(!input) return;
    
    const msg = input.value.trim();
    if(!msg) return;

    input.value = '';
    
    addChatMessage(`Pilot: ${msg}`, 'loot', activeChatTab);
    
    // Basit bir cevap simülasyonu
    setTimeout(() => {
        addChatMessage("Sistem: İletişim kanallarında parazit var. Mesaj iletilemedi (Bakımda).", 'alert', activeChatTab);
    }, 200);
}

// Olay Dinleyicileri
const sendBtn = document.getElementById('chat-send-btn');
if(sendBtn) sendBtn.addEventListener('click', sendUserMessage);

const chatInput = document.getElementById('chat-input');
if(chatInput) {
    chatInput.addEventListener('keydown', (e) => {
        if(e.key === 'Enter') sendUserMessage();
    });
}

// --- SÜRÜKLE BIRAK SİSTEMİ (DRAG & DROP - SINIR KORUMALI) ---
/**
 * Bir HTML elementini sürükle-bırak yapılabilir hale getirir.
 * Ekran sınırlarını aşmasını engeller.
 * @param {HTMLElement} el - Taşınacak ana pencere/element
 * @param {HTMLElement} handle - Tutulacak başlık/sap kısmı
 */
function makeElementDraggable(el, handle) {
    if (!el || !handle) return;
    
    handle.style.cursor = 'move';
    
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    handle.addEventListener('mousedown', (e) => {
        // Sadece sol tık ile sürüklensin
        if (e.button !== 0) return;
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        
        // Mevcut pozisyonu al (Hesaplanan stil)
        const rect = el.getBoundingClientRect();
        
        // Elementin konumlandırmasını 'absolute' ve 'top/left'e sabitle
        el.style.bottom = 'auto';
        el.style.right = 'auto';
        el.style.left = rect.left + 'px';
        el.style.top = rect.top + 'px';
        el.style.margin = '0';
        
        startLeft = rect.left;
        startTop = rect.top;
        
        // Seçimi engelle
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
        
        // --- SINIR KONTROLÜ (BOUNDARY CHECK) ---
        const maxLeft = window.innerWidth - el.offsetWidth;
        const maxTop = window.innerHeight - el.offsetHeight;
        
        // 0'dan küçük olamaz (sol/üst sınır)
        // maxLeft/maxTop'tan büyük olamaz (sağ/alt sınır)
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
    
    // Pencere yeniden boyutlandırıldığında element ekran dışında kaldıysa içeri çek
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

// Chat Panelini Sürüklenebilir Yap
const chatPanelEl = document.getElementById('chat-panel');
const chatHeaderEl = document.querySelector('#chat-panel .chat-header');

// Başlat
makeElementDraggable(chatPanelEl, chatHeaderEl);