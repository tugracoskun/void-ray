/**
 * Void Ray - Spatial Hash (Uzamsal Bölümleme)
 * * Dünyayı ızgaralara bölerek çarpışma ve sorgu performansını O(n^2)'den O(k)'ya düşürür.
 */
class SpatialHash {
    /**
     * @param {number} cellSize - Her bir hücrenin boyutu (Örn: 2000 birim)
     */
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.cells = new Map(); // "x,y" anahtarı ile nesne dizilerini tutar
    }

    /**
     * Koordinat anahtarını oluşturur.
     */
    getKey(x, y) {
        return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
    }

    /**
     * Bir nesneyi (örn: Gezegen) hash haritasına ekler.
     * Nesne birden fazla hücreye taşıyorsa hepsine eklenir.
     */
    insert(client) {
        const startX = Math.floor((client.x - client.radius) / this.cellSize);
        const endX = Math.floor((client.x + client.radius) / this.cellSize);
        const startY = Math.floor((client.y - client.radius) / this.cellSize);
        const endY = Math.floor((client.y + client.radius) / this.cellSize);

        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const key = `${x},${y}`;
                if (!this.cells.has(key)) {
                    this.cells.set(key, []);
                }
                this.cells.get(key).push(client);
            }
        }
    }

    /**
     * Bir nesneyi hash haritasından tamamen siler.
     * (Toplanan gezegenler için kullanılır)
     */
    remove(client) {
        const startX = Math.floor((client.x - client.radius) / this.cellSize);
        const endX = Math.floor((client.x + client.radius) / this.cellSize);
        const startY = Math.floor((client.y - client.radius) / this.cellSize);
        const endY = Math.floor((client.y + client.radius) / this.cellSize);

        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const key = `${x},${y}`;
                if (this.cells.has(key)) {
                    const cell = this.cells.get(key);
                    const index = cell.indexOf(client);
                    if (index > -1) {
                        cell.splice(index, 1);
                    }
                    // Hücre boşaldıysa belleği temizle
                    if (cell.length === 0) {
                        this.cells.delete(key);
                    }
                }
            }
        }
    }

    /**
     * Belirli bir alan içindeki potansiyel nesneleri döndürür.
     * @param {number} x - Merkez X
     * @param {number} y - Merkez Y
     * @param {number} range - Tarama yarıçapı
     * @returns {Array} Tekil nesneler listesi (Set kullanılarak duplicate önlenir)
     */
    query(x, y, range) {
        const startX = Math.floor((x - range) / this.cellSize);
        const endX = Math.floor((x + range) / this.cellSize);
        const startY = Math.floor((y - range) / this.cellSize);
        const endY = Math.floor((y + range) / this.cellSize);

        const results = new Set();

        for (let ix = startX; ix <= endX; ix++) {
            for (let iy = startY; iy <= endY; iy++) {
                const key = `${ix},${iy}`;
                if (this.cells.has(key)) {
                    const cell = this.cells.get(key);
                    for (let i = 0; i < cell.length; i++) {
                        results.add(cell[i]);
                    }
                }
            }
        }

        return Array.from(results);
    }

    /**
     * Tüm haritayı temizler.
     */
    clear() {
        this.cells.clear();
    }
}

window.SpatialHash = SpatialHash;