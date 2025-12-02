/**
 * Void Ray - Sistem Önyükleme (Boot) Modülü
 * * project_structure.yaml dosyasını okur, ağaç yapısını çözer ve dosyaları kontrol eder.
 */

class SystemBoot {
    constructor() {
        this.tasks = [
            { id: 'init', label: 'ÇEKİRDEK BAŞLATILIYOR', action: async () => { await this.wait(150); return true; } },
            { id: 'yaml', label: 'DOSYA SİSTEMİ TARANIYOR', action: this.loadConfiguration.bind(this) }
        ];
        
        this.container = document.getElementById('integrated-boot-container');
        this.listContainer = document.querySelector('.check-list-integrated');
        this.progressBar = document.querySelector('.progress-fill-integrated');
        this.statusText = document.querySelector('.boot-status-text');
        
        this.currentTaskIndex = 0;
        this.filePaths = [];
    }

    start() {
        if (!this.container || !this.listContainer) {
            console.warn("Boot arayüzü bulunamadı.");
            this.forceShowMenu();
            return;
        }
        this.listContainer.innerHTML = '';
        this.runTask(0);
    }

    async runTask(index) {
        if (index >= this.tasks.length) {
            this.finish();
            return;
        }

        const task = this.tasks[index];
        
        // Listeye ekle
        const item = document.createElement('div');
        item.className = 'check-item';
        item.innerHTML = `<span class="check-label">${task.label}</span><span class="status-icon pending" id="status-${task.id}">...</span>`;
        this.listContainer.appendChild(item);
        this.listContainer.scrollTop = this.listContainer.scrollHeight;

        this.updateProgress(index, this.tasks.length);

        // Hızlı akış efekti için mikro bekleme
        await this.wait(30);

        let result = true;
        try {
            if (task.action) {
                result = await task.action();
            }
        } catch (e) {
            console.error(`Hata (${task.label}):`, e);
            result = false;
        }

        const statusEl = document.getElementById(`status-${task.id}`);
        if (statusEl) {
            statusEl.className = result ? "status-icon ok" : "status-icon error";
            statusEl.innerText = result ? "OK" : "ERR";
        }

        setTimeout(() => this.runTask(index + 1), 20);
    }

    updateProgress(current, total) {
        const pct = Math.floor((current / total) * 100);
        if(this.progressBar) this.progressBar.style.width = `${pct}%`;
    }

    async wait(ms) { return new Promise(r => setTimeout(r, ms)); }

    // --- YAPILANDIRMA VE DOSYA KONTROLÜ ---

    async loadConfiguration() {
        try {
            // Cache-busting: Dosyayı taze çekmek için zaman damgası ekle
            const timestamp = Date.now();
            const response = await fetch(`project_structure.yaml?t=${timestamp}`);
            
            if (!response.ok) throw new Error("Manifest dosyası bulunamadı");
            const text = await response.text();
            
            // 1. YAML Ağacını Ayrıştır
            const tree = this.parseYamlTree(text);
            
            // 2. Düz Dosya Yollarına Çevir
            this.filePaths = [];
            this.flattenTree(tree, "");

            console.log(`Boot: ${this.filePaths.length} dosya indekslendi.`);

            // 3. Kontrol Görevlerini Oluştur
            this.filePaths.forEach((path, i) => {
                let label = path.split('/').pop().toUpperCase();
                if(label.length > 25) label = label.substring(0, 22) + '...';

                this.tasks.push({
                    id: `node_${i}`,
                    label: `KONTROL: ${label}`,
                    action: async () => {
                        try {
                            const res = await fetch(path, { method: 'HEAD' });
                            return res.ok;
                        } catch (e) { return false; }
                    }
                });
            });

            // 4. Bitiş Görevi
            this.tasks.push({ id: 'ready', label: 'SİSTEM HAZIR', action: async () => { await this.wait(300); return true; } });

            return true;
        } catch (e) {
            console.error("FS Error:", e);
            return false;
        }
    }

    // Basit Girinti Tabanlı YAML Parser
    parseYamlTree(text) {
        const lines = text.split('\n');
        const root = {};
        const stack = [{ obj: root, indent: -1 }];

        lines.forEach(line => {
            if (!line.trim() || line.trim().startsWith('#')) return;

            const indent = line.search(/\S/);
            const content = line.trim();
            
            while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
                stack.pop();
            }
            
            const parent = stack[stack.length - 1].obj;

            if (content.endsWith(':')) {
                const key = content.replace(':', '');
                const newObj = []; // Klasörler liste olarak başlar
                
                if (Array.isArray(parent)) {
                    const wrapper = {};
                    wrapper[key] = newObj;
                    parent.push(wrapper);
                } else {
                    parent[key] = newObj;
                }
                stack.push({ obj: newObj, indent: indent });

            } else if (content.startsWith('- ')) {
                const val = content.substring(2).trim();
                if (Array.isArray(parent)) parent.push(val);
            }
        });
        return root;
    }

    flattenTree(node, currentPath) {
        if (Array.isArray(node)) {
            node.forEach(item => {
                if (typeof item === 'string') {
                    this.filePaths.push(currentPath + item);
                } else if (typeof item === 'object') {
                    this.flattenTree(item, currentPath);
                }
            });
        } else if (typeof node === 'object') {
            for (const key in node) {
                this.flattenTree(node[key], currentPath + key + "/");
            }
        }
    }

    finish() {
        if(this.progressBar) this.progressBar.style.width = '100%';
        if(this.statusText) {
            this.statusText.innerText = "SİSTEM HAZIR";
            this.statusText.style.color = "#10b981";
        }
        
        setTimeout(() => {
            if(this.container) {
                this.container.classList.add('fade-out');
                setTimeout(() => {
                    this.container.style.display = 'none';
                    this.showMenuControls();
                }, 500);
            } else {
                this.showMenuControls();
            }
        }, 500);
    }

    showMenuControls() {
        const controls = document.getElementById('menu-controls-wrapper');
        if (controls) {
            controls.classList.remove('menu-controls-hidden');
            controls.classList.add('menu-controls-visible');
        }
    }

    forceShowMenu() {
        const container = document.getElementById('integrated-boot-container');
        if(container) container.style.display = 'none';
        this.showMenuControls();
    }
}