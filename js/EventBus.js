/**
 * Void Ray - Olay Yöneticisi (Event Bus)
 * * Modüller arası gevşek bağlı (loosely coupled) iletişim sağlar.
 */
class EventBus {
    constructor() {
        this.listeners = new Map();
    }
    
    /**
     * Bir olayı dinlemeye başlar.
     * @param {string} event - Olay adı (örn: 'player:levelup')
     * @param {function} callback - Çalıştırılacak fonksiyon
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    /**
     * Bir olayı dinlemeyi bırakır.
     * @param {string} event 
     * @param {function} callback 
     */
    off(event, callback) {
        if (!this.listeners.has(event)) return;
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }
    
    /**
     * Bir olay fırlatır ve dinleyicileri tetikler.
     * @param {string} event - Olay adı
     * @param {object} data - Gönderilecek veri
     */
    emit(event, data) {
        this.listeners.get(event)?.forEach(cb => cb(data));
    }
}

// Global EventBus örneği oluştur
window.eventBus = new EventBus();
console.log("EventBus sistemi başlatıldı.");