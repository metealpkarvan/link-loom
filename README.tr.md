# Link Loom

**İnternetin için biraz düzen.** Mesajlara, sekmelere ve notlara dağılmış bağlantıları aranabilir bir koleksiyonda topla.

[Uygulamayı aç](https://metealpkarvan.github.io/link-loom/) · [English](README.md) · [Sürümler](https://github.com/metealpkarvan/link-loom/releases) · [Hata bildir](https://github.com/metealpkarvan/link-loom/issues)

![Link Loom masaüstü görünümü](docs/screenshot.png)

## Bir dakikada kullan

1. URL'leri veya bağlantı içeren bir mesajı yapıştır. `example.com` gibi alan adları da kullanılabilir.
2. İstersen bir koleksiyon adı yaz ve **Add to my collection** düğmesini seç.
3. Bağlantı adlarını düzenle, favorilerini yıldızla; başlık, URL veya koleksiyon adıyla ara.
4. Notların için **Markdown**, tarayıcıya aktarmak için **Browser bookmarks**, başka bir cihazda geri yüklemek için **JSON backup** indir.

Arayüz İngilizcedir. Örnek düğmesi giriş alanına dört URL ekler. Bunları koleksiyona eklediğinde üç bağlantı oluşur; iki örnek URL temizlendikten sonra aynı adrese işaret eder.

## Özellikler

- `utm_*`, `fbclid`, `gclid`, `dclid`, `msclkid`, `mc_cid`, `mc_eid`, `_hsenc` ve `_hsmi` gibi yaygın takip parametrelerini temizler.
- Adresler normalleştirildikten sonra tekrarları atlar. Farklı sorgular ve sayfa içi konumlar ayrı kalır.
- Koleksiyon adları, düzenlenebilir başlıklar, yıldızlı bağlantılar ve birlikte kullanılabilen arama filtreleri sunar.
- Verileri tarayıcıda saklar; açık sekmeler arasındaki değişiklikleri okur ve yazmadan önce kayıtların değişip değişmediğini kontrol eder.
- Üç dışa aktarma biçimi ve doğrulanmış JSON içe aktarma sunar. Normal içe aktarmada bağlantılar eklenir; tekrarların mevcut bilgileri korunur.
- Okunamayan kayıtlar için kalıcı uyarı, özgün metni indirme ve onayla yedekten geri yükleme sunar.

## Gizlilik ve sınırlar

Hesap veya sunucu gerekmez. Uygulama bağlantılarını ziyaret etmez, koleksiyonunu bir sunucuya göndermez; harici yazı tipi, görsel, analiz aracı veya kütüphane yüklemez. Yalnızca uygulamanın statik dosyaları istenir. Bir bağlantıyı açtığında ilgili site normal şekilde açılır.

Veriler bu tarayıcı ve kaynak için `localStorage` içinde tutulur. Tarayıcı verilerini temizlemek kayıtları siler. Farklı tarayıcı ve cihazlar arasında eşitleme yoktur. **Taşınabilir bir kopya için JSON yedeği indir.** Tarayıcı kaydı ve yedekler şifrelenmez; tarayıcı profiline erişebilen biri kayıtları okuyabilir.

Takip parametrelerini temizlemek imzalı bağlantıları bozabilir. Bu bağlantılar için temizlemeyi kapat. Bilinen takip parametresi içermeyen sorgular değiştirilmez; bir takip parametresi silindiğinde tarayıcının URL ayrıştırıcısı kalan sorgunun kodlamasını değiştirebilir. Uygulama bağlantıların çalışıp çalışmadığını kontrol etmez ve sayfa başlıklarını otomatik almaz.

En fazla 1.000 bağlantı ve taşınabilir JSON yedeği için **2.000.000 UTF-8 baytı** kabul edilir. Ekleme, düzenleme, içe aktarma, kaydetme ve JSON dışa aktarma aynı boyut sınırını kullanır; kabul edilen bir koleksiyon yeniden dışa ve içe aktarılabilir. Yalnızca HTTP ve HTTPS adresleri kabul edilir; kullanıcı adı veya parola içeren URL'ler reddedilir. Yedeğin tamamı değişiklik yapılmadan önce doğrulanır. Bu sınırlara uyan sürüm 1 yedekleri desteklenir.

Kaydetme başarısız olursa mevcut koleksiyon korunur ve değişiklik reddedilir. Tarayıcı kaydına erişilemiyorsa **Session only — export to keep** görünür. Sayfayı kapatmadan önce oturumdaki koleksiyonunu dışa aktar.

## Okunamayan kayıtları kurtar

Kaydedilmiş veri okunamıyorsa kalıcı **Saved data protected** uyarısı görünür. Ekleme, düzenlemeleri kaydetme, yıldızlama ve silme engellenir. Son okunabilir koleksiyon ve açık düzenleme taslağı korunur; ilk açılışta kayıt okunamazsa koleksiyon boş görünür. Özgün kayıt metni saklanır.

![Korunan kayıtlar ve kurtarma düğmeleri](docs/recovery-desktop.png)

1. **Download original** ile kaydedilmiş metni değiştirmeden bir kurtarma `.txt` dosyası olarak indir. Geçerli JSON olmasa da dosyayı sakla.
2. Kaydı başka bir yerde düzelttikten veya değiştirdikten sonra **Retry saved data** ile yeniden oku. Veri artık okunabiliyorsa koleksiyon yüklenir.
3. Koruma açıkken geçerli bir **JSON backup** seçerek geri yükleyebilir ve kayıtların değiştirilmesini onaylayabilirsin. Yedek, son okunabilir koleksiyonla birleştirilir; tekrar eden bağlantıların mevcut bilgileri korunur. Uygulama bu birleşik koleksiyonu korunan verinin yerine kaydetmeden önce özgün metnin indirilmesini başlatır. Kurtarma dosyasının indirildiğini kontrol et.

Normal kullanımda JSON içe aktarma bağlantıları ekler ve tekrarların mevcut bilgilerini korur. Koruma açıkken geri yükleme, son okunabilir koleksiyonla aynı birleştirmeyi yapar; onaydan sonra korunan kaydın yerini alır. Kaydetmeden önce başka bir sekme veriyi değiştirirse uygulama güncel kaydı yeniden okur ve denenen değişikliği reddeder. Tekrar denemeden önce yenilenen koleksiyonu incele. Bu işlem yazmadan önce kontrol yapar; tarayıcı kaydı sekmeler arasında bir işlem garantisi sağlamaz.

Kurtarma dosyaları ve JSON yedekleri özel bağlantılar içerebilir. Uygun bir yerde sakla; uygulama bunları yüklemez.

## Yerel olarak çalıştır

Statik sunucu için Python 3 gerekir. Node.js 22+ yalnızca testler için gereklidir. Sürüm ZIP'ini çalıştırmak için dosyaları çıkar ve çıkarılan klasörde Python komutunu çalıştır. ZIP tam statik uygulamayı içerir; bağımlılık kurulumu veya derleme gerekmez.

```bash
git clone https://github.com/metealpkarvan/link-loom.git
cd link-loom
python3 -m http.server 8080 --bind 127.0.0.1
# http://localhost:8080 adresini aç
```

JavaScript yerel ES modülleri kullanır; `index.html` dosyasını çift tıklamak yerine klasörü HTTP üzerinden sun. Windows'ta Python başlatıcısı kuruluysa `py -m http.server 8080 --bind 127.0.0.1` kullanılabilir.

```bash
npm test
python3 scripts/package.py
```

Testler URL normalleştirme, güvensiz adresleri reddetme, tekrarları ayıklama, içe aktarma, UTF-8 yedek sınırı, bağlantı bilgilerini koruma, kurtarma durumları, eski kayda yazmayı engelleme ve dışa aktarma kaçışlarını kontrol eder.

Python paketleme betiği yalnızca standart kütüphaneyi kullanır. `dist/link-loom-v1.1.0.zip` ve `dist/SHA256SUMS.txt` dosyalarını oluşturur; statik uygulamayı ve herkese açık rehberleri içerir, arşivdeki dosyaların kaynakla bayt düzeyinde aynı olduğunu kontrol eder. ZIP'i çıkar ve klasörü yerel HTTP üzerinden sun; ES modüllerinin dosya yolları aynı kalır. Arşivi doğrulamak için `dist` klasöründe `shasum -a 256 -c SHA256SUMS.txt` çalıştır.

CI, Node 22/24 Linux işlerinde ve yerel Mac işlerinde testleri ve paketlemeyi çalıştıracak şekilde yapılandırılmıştır. Test edilen akışlar ve sınırlar için [doğrulama kaydına](docs/VERIFICATION.md) bak.

## Küçük tutulur

`src/links.js` veri kurallarını, `src/storage.js` kayıt okumayı ve korumalı yazmayı, `src/app.js` arayüzü yönetir. Kullanıcı metni `textContent` ile gösterilir. `index.html` ve `styles.css` arayüzü tanımlar. GitHub Actions, statik demoyu yayımlamadan önce testleri çalıştırır.

Sonraki olası işler Netscape yer imi içe aktarma ve geri alma işlemidir. [Yol haritası](docs/ROADMAP.md), [sürüm notları](CHANGELOG.md) ve [katkı rehberi](CONTRIBUTING.md).

## Mac desteği

Uygulama, modern bir tarayıcı üzerinden Intel ve Apple Silicon Mac'lerde çalışır. Rosetta veya işlemciye özel paket gerekmez. CI, x86_64 ve arm64 macOS çalıştırıcılarında yerel Node.js ile veri ve kayıt testlerini çalıştıracak şekilde yapılandırılmıştır. Bu kontroller tarayıcı ve cihaz testlerinden ayrıdır. Sürüm ZIP'leri işlemci mimarisinden bağımsız HTML, CSS ve JavaScript içerir.

MIT © Mete Alp Karvan
