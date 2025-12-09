/**
 * Void Ray - Pencere: İletişim ve Bildirimler
 * * Sohbet geçmişi, sistem bildirimleri ve kullanıcı mesajlarını yönetir.
 * * Sürüklenebilir pencere mantığını içerir.
 * * ConsoleSystem entegrasyonu yapılmıştır.
 */

// İletişim Sistemi (Loglar ve Mesajlar)
let chatHistory = {
    genel: [],
    bilgi: [],
    grup: []
};
let activeChatTab = 'genel';

// CHAT MODU: 2=Aktif (Tam), 1=Yarım (Fading), 0=Kapalı
let chatState = 1; // Varsayılan olarak Yarım Mod başlat
let wasSemiActive = false; // Enter ile açıldığında, geri dönüş için bayrak

/**
 * Chat modunu değiştirir (Buton tetikler).
 * 2 -> 1 -> 0 -> 2 döngüsü.
 */
window.cycleChatMode = function() {
    chatState--;
    if (chatState < 0) chatState = 2;
    wasSemiActive = false; // Manuel değişimde hafızayı sıfırla
    updateChatUI();
};

/**
 * Arayüzü mevcut chatState'e göre günceller.
 */
function updateChatUI() {
    const panel = document.getElementById('chat-panel');
    const btn = document.getElementById('btn-chat-mode');
    const inputArea = document.getElementById('chat-input-area');
    
    if (!panel || !btn) return;

    // Sınıfları temizle
    panel.classList.remove('chat-mode-semi', 'chat-mode-off');

    if (chatState === 2) {
        // --- AKTİF MOD ---
        btn.innerText = "✉"; 
        btn.style.color = "white";
        
        // Butonu aktif olarak işaretle
        if (typeof setHudButtonActive === 'function') setHudButtonActive('btn-chat-mode', true);
        
        // Input alanını görünür yap (Tab durumuna göre switchChatTab yönetecek)
        if(inputArea) inputArea.style.removeProperty('display');
        
        // Tam geçmişi geri yükle
        switchChatTab(activeChatTab); 
    } 
    else if (chatState === 1) {
        // --- YARIM AKTİF ---
        btn.innerText = "⋯"; 
        btn.style.color = "#94a3b8"; 
        panel.classList.add('chat-mode-semi');
        
        // Buton aktifliğini kaldır
        if (typeof setHudButtonActive === 'function') setHudButtonActive('btn-chat-mode', false);
        
        // Input alanını ZORLA gizle
        if(inputArea) inputArea.style.display = 'none';

        // Yarım moda geçerken eski kalabalığı temizle
        const chatContent = document.getElementById('chat-content');
        if (chatContent) chatContent.innerHTML = ''; 
    } 
    else {
        // --- KAPALI MOD ---
        btn.innerText = "⊘"; 
        btn.style.color = "#ef4444"; 
        panel.classList.add('chat-mode-off');
        
        // Buton aktifliğini kaldır
        if (typeof setHudButtonActive === 'function') setHudButtonActive('btn-chat-mode', false);
        
        // Input alanını ZORLA gizle
        if(inputArea) inputArea.style.display = 'none';
    }
}

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
    } else if (name.includes("ZEHİR") || name.includes("TEHLİKE") || name.includes("YANKI ZEHİRLENDİ") || name.includes("DOLU") || name.includes("YETERSİZ") || name.includes("BAĞLANTI YOK") || name.includes("BOŞ")) {
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
    
    // Veriyi her zaman kaydet
    chatHistory[channel].push(msgObj);
    if (channel !== 'genel') {
        chatHistory['genel'].push(msgObj);
    }
    
    // Eğer kapalıysa (0) ekrana çizme
    if (chatState === 0) return;

    // Eğer kanal aktif değilse ekrana çizme (Yarım modda sadece aktif kanaldakiler görünsün)
    if (activeChatTab !== channel && activeChatTab !== 'genel') return;

    const chatContent = document.getElementById('chat-content');
    if (!chatContent) return;

    const div = document.createElement('div');
    div.className = `chat-message ${type}`;
    div.innerHTML = `<span class="chat-timestamp">[${timeStr}]</span> ${text}`;

    if (chatState === 1) {
        // YARIM MOD: Solarak kaybolma efekti (6sn toplam ömür)
        div.classList.add('fading-msg');
        chatContent.appendChild(div);
        
        // Animasyon bitince DOM'dan sil (Tarihçede zaten var)
        setTimeout(() => {
            if (div.parentNode) div.parentNode.removeChild(div);
        }, 6000); 
    } else {
        // AKTİF MOD: Normal ekle (Silme yok)
        chatContent.appendChild(div);
        chatContent.scrollTop = chatContent.scrollHeight;
    }
}

function switchChatTab(tab) {
    activeChatTab = tab;
    
    document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
    const activeTabEl = document.getElementById(`tab-${tab}`);
    if(activeTabEl) activeTabEl.classList.add('active');
    
    const inputArea = document.getElementById('chat-input-area');
    if(inputArea) {
        // Sadece AKTİF (2) moddaysa input görünürlüğünü yönet
        // Diğer modlarda updateChatUI zaten gizliyor
        if (chatState === 2) {
            if(tab === 'bilgi') inputArea.style.display = 'none';
            else inputArea.style.display = 'flex';
        }
    }

    // Yarım moddaysa tarihçeyi yükleme, temiz kalsın (sadece yeni gelenler görünsün)
    if (chatState === 1) {
        const chatContent = document.getElementById('chat-content');
        if (chatContent) chatContent.innerHTML = '';
        return;
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
    if(msg) {
        // --- KOMUT SİSTEMİ ENTEGRASYONU ---
        if (msg.startsWith('/')) {
            if (typeof ConsoleSystem !== 'undefined') {
                ConsoleSystem.execute(msg);
                input.value = '';
                // Komut sonrası stili temizle
                input.classList.remove('command-mode');
            } else {
                addChatMessage("HATA: Konsol sistemi yüklenemedi.", 'alert', activeChatTab);
            }
        } else {
            // Normal Chat Mesajı
            addChatMessage(`Pilot: ${msg}`, 'loot', activeChatTab);
            input.value = '';
            setTimeout(() => {
                if(audio) audio.playError(); 
                addChatMessage("Sistem: İletişim kanallarında parazit var. Mesaj iletilemedi (Bakımda).", 'alert', activeChatTab);
            }, 200);
        }
    }

    // Mesaj gönderildikten sonra: Eğer Yarım Moddan geldiysek, oraya dön
    if (wasSemiActive) {
        chatState = 1;
        wasSemiActive = false;
        updateChatUI();
        // Odağı oyuna geri ver (Tuval)
        const canvas = document.getElementById('gameCanvas');
        if(canvas) canvas.focus();
    }
}

// --- BAŞLATMA FONKSİYONU ---
function initChatSystem() {
    console.log("Chat sistemi başlatılıyor...");
    updateChatUI(); // Başlangıç modunu uygula (1: Yarım)

    const sendBtn = document.getElementById('chat-send-btn');
    if(sendBtn) {
        sendBtn.addEventListener('click', sendUserMessage);
    }

    // Input dinleyicisi: Komut modu algılama (Turuncu Renk)
    const input = document.getElementById('chat-input');
    if (input) {
        input.addEventListener('input', (e) => {
            if (input.value.startsWith('/')) {
                if (!input.classList.contains('command-mode')) {
                    input.classList.add('command-mode');
                }
            } else {
                if (input.classList.contains('command-mode')) {
                    input.classList.remove('command-mode');
                }
            }
        });
    }

    // Global Enter Listener
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            if (chatState === 1 && document.activeElement !== input) {
                // Eğer yarım moddaysak ve input odaklı değilse -> AKTİF ET
                wasSemiActive = true;
                chatState = 2; // Aktif yap
                updateChatUI();
                e.preventDefault();
                setTimeout(() => {
                    if(input) input.focus();
                }, 50); 
            } 
            else if (document.activeElement === input) {
                // Eğer input odaklıysa ve Enter'a basıldıysa -> Mesajı Gönder
                sendUserMessage();
            }
        }
        
        // ESC ile iptal etme (Eğer input açıksa kapat)
        if (e.key === 'Escape') {
            if (chatState === 2 && wasSemiActive) {
                chatState = 1;
                wasSemiActive = false;
                updateChatUI();
                if(input) {
                    input.value = ''; // Yazılanı sil
                    input.classList.remove('command-mode'); // Stili sil
                    input.blur();
                }
            }
        }
    });

    // NOT: Chat Panelini Sürüklenebilir Yapma kodu buradan kaldırıldı.
    // Artık js/ui.js içindeki 'initDraggableWindows' fonksiyonu tarafından yönetiliyor.
}