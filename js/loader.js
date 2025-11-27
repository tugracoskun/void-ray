/**
 * Void Ray - HTML Parça Yükleyici
 * * Bu modül, 'partials/' klasöründeki HTML dosyalarını okur ve
 * * index.html içindeki ilgili yerlere yerleştirir.
 */

async function loadPartials() {
    const partials = [
        { id: 'ui-core', url: 'partials/ui-core.html' },
        { id: 'ui-menus', url: 'partials/ui-menus.html' },
        { id: 'ui-hud', url: 'partials/ui-hud.html' },
        { id: 'ui-panels', url: 'partials/ui-panels.html' }
    ];

    console.log("Arayüz parçaları yükleniyor...");

    // Tüm parçaları paralel olarak çek
    const promises = partials.map(p => 
        fetch(p.url)
            .then(response => {
                if (!response.ok) throw new Error(`Dosya yüklenemedi: ${p.url}`);
                return response.text();
            })
            .then(html => {
                const container = document.getElementById(p.id);
                if (container) {
                    container.innerHTML = html;
                }
            })
    );

    try {
        await Promise.all(promises);
        console.log("Tüm arayüz yüklendi.");
        
        // Parçalar yüklendikten sonra oyunu başlatmaya hazırız.
        // Eğer bir başlatma fonksiyonu varsa tetikleyebiliriz.
        if (window.onUILoaded) {
            window.onUILoaded();
        }
    } catch (error) {
        console.error("Arayüz yükleme hatası:", error);
        alert("Oyun arayüzü yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.");
    }
}

// Sayfa yüklendiğinde çalıştır
window.addEventListener('DOMContentLoaded', loadPartials);