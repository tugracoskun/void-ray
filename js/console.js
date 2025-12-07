/**
 * Void Ray - Konsol ve Komut Sistemi
 * * Sohbet penceresi üzerinden oyunun yönetilmesini sağlar.
 * * "/" ile başlayan komutları işler.
 * * Bazı komutlar sadece Geliştirici Modu (Dev Mode) açıkken çalışır.
 * * TÜM komutlar için Ayarlar > Konsolu Aktif Et seçeneğinin açık olması gerekir.
 */

const ConsoleSystem = {
    commands: {
        'help': {
            desc: 'Komut listesini gösterir.',
            usage: '/help',
            devOnly: false,
            action: () => {
                let msg = "MEVCUT KOMUTLAR:<br>";
                Object.keys(ConsoleSystem.commands).forEach(cmd => {
                    const info = ConsoleSystem.commands[cmd];
                    // DevOnly komutları gri, açık komutları sarı gösterelim (Eğer dev modu kapalıysa)
                    const isDev = info.devOnly;
                    const isDevActive = window.gameSettings && window.gameSettings.developerMode;
                    
                    let color = "#fbbf24"; // Sarı
                    if (isDev && !isDevActive) color = "#475569"; // Sönük gri (Kilitli)
                    
                    msg += `<span style="color:${color}">/${cmd}</span>: <span style="color:#94a3b8">${info.desc}</span>${isDev ? " <span style='font-size:0.6em; color:#ef4444'>[DEV]</span>" : ""}<br>`;
                });
                addChatMessage(msg, 'system', 'bilgi');
            }
        },
        'god': {
            desc: 'Ölümsüzlük modunu açar/kapatır.',
            usage: '/god',
            devOnly: true,
            action: () => {
                if (!window.gameSettings) return;
                window.gameSettings.godMode = !window.gameSettings.godMode;
                const state = window.gameSettings.godMode ? "AKTİF" : "PASİF";
                const color = window.gameSettings.godMode ? "#10b981" : "#ef4444";
                
                // Settings UI'daki checkbox'ı güncelle (varsa)
                const toggle = document.getElementById('toggle-god-mode');
                if (toggle) toggle.checked = window.gameSettings.godMode;

                showNotification({name: `GOD MODE: ${state}`, type:{color: color}}, "");
                addChatMessage(`Sistem: Ölümsüzlük modu ${state}`, 'system', 'genel');
            }
        },
        'heal': {
            desc: 'Canı ve enerjiyi fuller.',
            usage: '/heal',
            devOnly: true,
            action: () => {
                if (player) {
                    player.health = player.maxHealth;
                    player.energy = player.maxEnergy;
                    showNotification({name: "SİSTEMLER ONARILDI", type:{color:'#10b981'}}, "");
                    Utils.playSound('playChime', {id: 'rare'});
                }
            }
        },
        'tp': {
            desc: 'Belirtilen koordinata ışınlar.',
            usage: '/tp <x> <y> (Örn: /tp 5000 5000)',
            devOnly: true,
            action: (args) => {
                if (args.length < 2) return ConsoleSystem.showUsage('tp');
                
                const x = parseFloat(args[0]);
                const y = parseFloat(args[1]);
                
                if (isNaN(x) || isNaN(y)) return ConsoleSystem.showUsage('tp');
                
                if (player) {
                    player.x = x;
                    player.y = y;
                    player.vx = 0;
                    player.vy = 0;
                    // Kuyruğu da taşı
                    if(player.tail) player.tail.forEach(t => { t.x = x; t.y = y; });
                    // Kamerayı odakla
                    if (window.cameraFocus) { window.cameraFocus.x = x; window.cameraFocus.y = y; }
                    
                    showNotification({name: "IŞINLANMA BAŞARILI", type:{color:'#a855f7'}}, `[${Math.floor(x)}:${Math.floor(y)}]`);
                }
            }
        },
        'give': {
            desc: 'Envantere eşya ekler.',
            usage: '/give <isim> <adet> (Örn: /give Kristal 10)',
            devOnly: true,
            action: (args) => {
                if (args.length < 1) return ConsoleSystem.showUsage('give');
                
                let count = 1;
                const lastArg = args[args.length - 1];
                if (!isNaN(parseInt(lastArg))) {
                    count = parseInt(lastArg);
                    args.pop(); 
                }
                
                const itemNameSearch = args.join(" ").toLowerCase();
                
                let foundType = null;
                let foundName = "";
                
                for (const [rarityKey, items] of Object.entries(LOOT_DB)) {
                    for (const item of items) {
                        if (item.toLowerCase() === itemNameSearch) {
                            foundName = item;
                            foundType = RARITY[rarityKey.toUpperCase()];
                            break;
                        }
                    }
                    if (foundType) break;
                }
                
                if (!foundType) return ConsoleSystem.error("Eşya bulunamadı. Tam ismini yazmayı deneyin.");
                
                for(let i=0; i<count; i++) {
                    const fakePlanet = { name: foundName, type: foundType };
                    collectedItems.push(fakePlanet);
                }
                
                updateInventoryCount();
                if(inventoryOpen) renderInventory();
                addChatMessage(`Konsol: ${count} adet ${foundName} verildi.`, 'loot', 'genel');
            }
        },
        'xp': {
            desc: 'Oyuncuya XP verir.',
            usage: '/xp <miktar> (Örn: /xp 500)',
            devOnly: true,
            action: (args) => {
                if (args.length < 1) return ConsoleSystem.showUsage('xp');
                const amount = parseInt(args[0]);
                if (player && !isNaN(amount)) {
                    player.gainXp(amount);
                    addChatMessage(`Konsol: +${amount} XP eklendi.`, 'info', 'genel');
                } else {
                    ConsoleSystem.showUsage('xp');
                }
            }
        },
        'level': {
            desc: 'Seviye atlatır.',
            usage: '/level',
            devOnly: true,
            action: () => {
                if (player) player.gainXp(player.maxXp);
            }
        },
        'speed': {
            desc: 'Hız limitini artırır (Test amaçlı).',
            usage: '/speed <değer>',
            devOnly: true,
            action: (args) => {
                if (args.length < 1) return ConsoleSystem.showUsage('speed');
                ConsoleSystem.error("Hız ayarı şu an sadece Nexus üzerinden yapılabilir.");
            }
        },
        'stardust': {
            desc: 'Kristal (Para) ekler.',
            usage: '/stardust <miktar>',
            devOnly: true,
            action: (args) => {
                if (args.length < 1) return ConsoleSystem.showUsage('stardust');
                const amount = parseInt(args[0]);
                
                if (isNaN(amount)) return ConsoleSystem.showUsage('stardust');

                playerData.stardust += amount;
                playerData.stats.totalStardust += amount;
                player.updateUI();
                addChatMessage(`Konsol: +${amount} Kristal eklendi.`, 'loot', 'genel');
            }
        },
        'echo': {
            desc: 'Yankı dronunu yönetir.',
            usage: '/echo <spawn|kill>',
            devOnly: true,
            action: (args) => {
                if (args.length < 1) return ConsoleSystem.showUsage('echo');

                if (args[0] === 'spawn') {
                    if (echoRay) return ConsoleSystem.error("Yankı zaten aktif.");
                    spawnEcho(player.x, player.y + 100);
                    addChatMessage("Konsol: Yankı oluşturuldu.", 'info', 'genel');
                } else if (args[0] === 'kill') {
                    if (!echoRay) return ConsoleSystem.error("Yankı yok.");
                    window.echoRay = null;
                    document.getElementById('echo-wrapper-el').style.display = 'none';
                    addChatMessage("Konsol: Yankı yok edildi.", 'alert', 'genel');
                } else {
                    ConsoleSystem.showUsage('echo');
                }
            }
        },
        'save': {
            desc: 'Oyunu zorla kaydeder.',
            usage: '/save',
            devOnly: false, // Herkes kullanabilir
            action: () => {
                if (typeof SaveManager !== 'undefined') {
                    SaveManager.save();
                    addChatMessage("Sistem: Oyun zorla kaydedildi.", 'system', 'genel');
                }
            }
        },
        'ui': {
            desc: 'Arayüzü gizler/gösterir.',
            usage: '/ui',
            devOnly: false, // Herkes kullanabilir (Sinematik amaçlı)
            action: () => {
                if (typeof toggleHUD === 'function') toggleHUD();
            }
        },
        'clear': {
            desc: 'Sohbet geçmişini temizler.',
            usage: '/clear',
            devOnly: false,
            action: () => {
                const content = document.getElementById('chat-content');
                if (content) content.innerHTML = '';
                chatHistory.genel = [];
                chatHistory.bilgi = [];
                chatHistory.grup = [];
            }
        }
    },

    execute: function(inputString) {
        // --- ANA GÜVENLİK KONTROLÜ ---
        // Konsolun ayarlardan açık olup olmadığını kontrol et
        if (!window.gameSettings || !window.gameSettings.enableConsole) {
            this.error("Konsol devre dışı. Ayarlar > Oyun menüsünden 'Konsolu Aktif Et' seçeneğini açın.");
            return;
        }

        const cleanInput = inputString.substring(1).trim();
        if (!cleanInput) return;

        const parts = cleanInput.split(" ");
        const commandName = parts[0].toLowerCase();
        const args = parts.slice(1);

        const cmd = this.commands[commandName];

        if (cmd) {
            // --- DEV YETKİ KONTROLÜ ---
            // Eğer komut 'devOnly' ise ve ayarlarımızda dev modu kapalıysa engelle.
            if (cmd.devOnly) {
                if (!window.gameSettings || !window.gameSettings.developerMode) {
                    this.error(`Bu komutu kullanmak için 'Geliştirici Modu'nu açmalısın. (Ayarlar > Oyun)`);
                    return;
                }
            }

            try {
                cmd.action(args);
            } catch (e) {
                console.error(e);
                this.error("Komut çalıştırılırken hata oluştu.");
            }
        } else {
            this.error(`Bilinmeyen komut: ${commandName}. Yardım için /help yazın.`);
        }
    },

    error: function(msg) {
        addChatMessage(`HATA: ${msg}`, 'alert', 'genel');
    },

    showUsage: function(cmdKey) {
        const cmd = this.commands[cmdKey];
        if (cmd && cmd.usage) {
            addChatMessage(`KULLANIM: <span style="color:#fbbf24">${cmd.usage}</span>`, 'alert', 'genel');
        } else {
            this.error("Bu komut için kullanım bilgisi yok.");
        }
    }
};

window.ConsoleSystem = ConsoleSystem;