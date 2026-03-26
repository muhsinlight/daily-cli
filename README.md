# 📊 Daily Life Dashboard CLI

Günlük hayatınızı terminal üzerinden yönetmenizi sağlayan, şık ve interaktif bir Dashboard uygulaması. Tek bir komutla (`daily`) tüm finansal verilere, haberlere, hava durumuna ve daha fazlasına anında ulaşın.

---

## ✨ Özellikler

- **🌦️ Hava Durumu:** Şehrinize özel anlık hava durumu ve hissedilen sıcaklık.
- **📈 Borsa / Hisse:** Yahoo Finance entegrasyonu ile canlı hisse senedi ve kripto takibi.
- **💱 Döviz & Metaller:** [KapaliCarsi-Tracker](https://github.com/muhsinlight/KapaliCarsi-Tracker) entegrasyonu ile canlı Dolar, Euro, Sterlin ve detaylı altın (Gram, Çeyrek, Yarım, Tam, Cumhuriyet) ve gümüş fiyatları.
- **📰 Son Haberler:** Sadece Türkiye kaynaklı (`NewsAPI`) en güncel haber başlıkları.
- **🕌 Namaz Vakitleri:** Bulunduğunuz konuma göre günlük ezan vakitleri.
- **💡 Günün Tavsiyesi:** Motivasyonunuzu artıracak rastgele tavsiyeler.
- **⚽ Futbol Maçları:** Premier Lig, La Liga, Bundesliga, Serie A ve Şampiyonlar Ligi gibi dev liglerdeki canlı skorlar ve gelecek maçlar.
- **📚 Tureng Çeviri (Puppeteer):** Cloudflare korumalı Tureng üzerinden kelime çevirileri (Yaygın kullanım odaklı).
- **🛠️ Global Kullanım:** `npm link` desteği ile her klasörden sadece `daily` yazarak erişim.

---

## 🚀 Kurulum

1. **Bağımlılıkları Yükleyin:**
   ```bash
   npm install
   ```
   *Not: Puppeteer'ın çalışabilmesi için Chromium indirilmesi gerekebilir (otomatik).*

2. **Global Komut Olarak Ayarlayın:**
   ```bash
   npm link
   ```

3. **Çalıştırın:**
   ```bash
   daily
   ```

---

## ⚙️ Yapılandırma (.env)

Projenin çalışması için kök dizinde bir `.env` dosyası oluşturmanız gerekmektedir. Örnek yapılandırma için [.env.example](.env.example) dosyasına göz atın.

Kolayca kurmak için:
```bash
cp .env.example .env
```
Ardından `.env` dosyası içindeki `NEWS_API_KEY` ve `FOOTBALL_DATA_API_KEY` değişkenlerini kendi anahtarlarınızla güncelleyin.

---

## 🛠️ Kullanılan Teknolojiler

- **Node.js** (v16+)
- **Puppeteer** (Tureng Scraping - Cloudflare Bypass)
- **Axios** (HTTP İstekleri)
- **Chalk** (Renkli Terminal Çıktıları)
- **Ora** (Elegant Spinner)
- **Cli-Table3** (Tablo Tasarımları)
- **Yahoo Finance 2** (Borsa Verileri)
- **Dotenv** (Güvenli Yapılandırma)
- **KapaliCarsi-Tracker** (Finansal Veri Kaynağı)
- **Football-Data.org** (Maç Verileri ve Skorlar)

---

## 📝 Lisans

Bu proje kişisel kullanım ve geliştirme amaçlı hazırlanmıştır. Özgürce değiştirebilir ve geliştirebilirsiniz. 🚀
