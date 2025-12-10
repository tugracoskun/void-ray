/**
 * Void Ray - Yardımcı Araçlar (Utilities)
 * * Matematiksel işlemler, rastgele sayı üretimi ve güvenli ses çalma
 * * gibi sık kullanılan fonksiyonları içerir.
 */

const Utils = {
    // --- MATEMATİK VE MESAFE ---

    /**
     * İki nokta (x1, y1) ve (x2, y2) arasındaki mesafeyi hesaplar.
     * Math.hypot sarmalayıcısıdır.
     */
    dist: (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2),

    /**
     * İki varlık (entity) arasındaki mesafeyi hesaplar.
     * Varlıkların {x, y} özelliklerine sahip olması gerekir.
     */
    distEntity: (e1, e2) => Math.hypot(e1.x - e2.x, e1.y - e2.y),

    // --- RASTGELELİK (RANDOM) ---

    /**
     * Belirtilen aralıkta [min, max) rastgele ondalıklı sayı döndürür.
     * Tek parametre verilirse [0, min) aralığında döndürür.
     */
    random: (min, max) => {
        if (max === undefined) {
            return Math.random() * min;
        }
        return Math.random() * (max - min) + min;
    },

    /**
     * Belirtilen aralıkta [min, max] rastgele tam sayı döndürür.
     */
    randomInt: (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Bir diziden rastgele bir eleman seçer.
     */
    randomChoice: (array) => {
        if (!array || array.length === 0) return null;
        return array[Math.floor(Math.random() * array.length)];
    },

    // --- RENK İŞLEMLERİ ---

    /**
     * Hex renk kodunu (örn: #ffffff) RGBA formatına çevirir.
     * CSS değişkenlerini dinamik güncellemek için kullanılır.
     * @param {string} hex - #RRGGBB formatında renk
     * @param {number} alpha - 0.0 ile 1.0 arası opaklık
     */
    hexToRgba: (hex, alpha) => {
        let r = 0, g = 0, b = 0;
        // 3 haneli hex (#RGB)
        if (hex.length === 4) {
            r = "0x" + hex[1] + hex[1];
            g = "0x" + hex[2] + hex[2];
            b = "0x" + hex[3] + hex[3];
        } 
        // 6 haneli hex (#RRGGBB)
        else if (hex.length === 7) {
            r = "0x" + hex[1] + hex[2];
            g = "0x" + hex[3] + hex[4];
            b = "0x" + hex[5] + hex[6];
        }
        return "rgba(" + +r + "," + +g + "," + +b + "," + alpha + ")";
    },

    // --- GÜVENLİ SES YÖNETİMİ ---

    /**
     * Global 'audio' nesnesinin varlığını kontrol ederek güvenli ses çalar.
     * @param {string} methodName - audio.js içindeki metot adı (örn: 'playToxic', 'playChime')
     * @param {...any} args - Metoda gönderilecek parametreler
     */
    playSound: (methodName, ...args) => {
        if (typeof audio !== 'undefined' && audio && typeof audio[methodName] === 'function') {
            try {
                audio[methodName](...args);
            } catch (e) {
                console.warn(`Ses hatası (${methodName}):`, e);
            }
        }
    }
};