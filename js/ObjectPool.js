/**
 * Void Ray - Object Pool (Nesne Havuzu)
 * * Sık oluşturulan/yok edilen nesneler için bellek optimizasyonu.
 * * Garbage Collection yükünü azaltır.
 */

class ObjectPool {
    /**
     * @param {Function} factory - Yeni nesne üreten fonksiyon
     * @param {number} initialSize - Başlangıç havuz boyutu
     * @param {number} maxSize - Maksimum havuz boyutu (0 = sınırsız)
     */
    constructor(factory, initialSize = 50, maxSize = 500) {
        this.factory = factory;
        this.maxSize = maxSize;
        this.available = []; // Kullanıma hazır nesneler
        this.inUse = new Set(); // Aktif kullanımda olan nesneler
        
        // İstatistikler (Debugging için)
        this.stats = {
            created: 0,
            reused: 0,
            released: 0,
            expanded: 0
        };
        
        // Başlangıç havuzunu oluştur
        for (let i = 0; i < initialSize; i++) {
            this.available.push(this.factory());
            this.stats.created++;
        }
        
        console.log(`ObjectPool oluşturuldu: ${initialSize} başlangıç nesnesi`);
    }
    
    /**
     * Havuzdan bir nesne al (veya yeni oluştur)
     */
    acquire() {
        let obj;
        
        if (this.available.length > 0) {
            // Mevcut havuzdan al
            obj = this.available.pop();
            this.stats.reused++;
        } else {
            // Havuz boş, yeni nesne oluştur
            obj = this.factory();
            this.stats.created++;
            this.stats.expanded++;
        }
        
        this.inUse.add(obj);
        return obj;
    }
    
    /**
     * Nesneyi havuza geri koy
     */
    release(obj) {
        if (!obj) return;
        
        // Aktif listeden çıkar
        if (!this.inUse.delete(obj)) {
            // Havuzdan alınmamış olsa bile listeye eklemek yerine uyarı verebiliriz
            // veya sessizce yok sayabiliriz. Performans için kontrolü basit tutuyoruz.
            return;
        }
        
        // Reset metodunu çağır (varsa)
        if (typeof obj.reset === 'function') {
            obj.reset();
        }
        
        // Havuza geri koy (maksimum boyut kontrolü)
        if (this.maxSize === 0 || this.available.length < this.maxSize) {
            this.available.push(obj);
            this.stats.released++;
        }
        // Maksimum boyut aşıldıysa nesneyi garbage collector'a bırak
    }
    
    /**
     * Toplu geri alma (Batch release)
     */
    releaseAll(objects) {
        objects.forEach(obj => this.release(obj));
    }
    
    /**
     * Havuzu temizle
     */
    clear() {
        this.available = [];
        this.inUse.clear();
        console.log('ObjectPool temizlendi.');
    }
    
    /**
     * Havuz bilgilerini al
     */
    getInfo() {
        return {
            available: this.available.length,
            inUse: this.inUse.size,
            total: this.available.length + this.inUse.size,
            stats: { ...this.stats }
        };
    }
}

window.ObjectPool = ObjectPool;