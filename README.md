# 📊 Daily Life Dashboard CLI

Günlük hayatınızı terminal üzerinden yönetmenizi sağlayan, şık ve interaktif bir Dashboard uygulaması. Tek bir komutla (`daily`) tüm finansal verilere, haberlere, hava durumuna ve daha fazlasına anında ulaşın.

---

## ✨ Özellikler

- **🌦️ Hava Durumu:** Şehrinize özel anlık hava durumu ve hissedilen sıcaklık.
- **📈 Borsa / Hisse:** Yahoo Finance entegrasyonu ile canlı hisse senedi ve kripto takibi.
- **💱 Döviz & Metaller:** Dolar, Euro, Sterlin ve detaylı altın (Gram, Çeyrek, Yarım, Tam, Cumhuriyet) ve gümüş fiyatları.
- **📰 Son Haberler:** Sadece Türkiye kaynaklı (`NewsAPI`) en güncel haber başlıkları.
- **🕌 Namaz Vakitleri:** Bulunduğunuz konuma göre günlük ezan vakitleri.
- **💡 Günün Tavsiyesi:** Motivasyonunuzu artıracak rastgele tavsiyeler.
- **📚 İngilizce Çeviri & Örnek:** İngilizce kelime çevirisi, otomatik örnek cümle bulma ve örnek cümlenin çevirisi.
- **🛠️ Global Kullanım:** `npm link` desteği ile her klasörden sadece `daily` yazarak erişim.

---

## 🚀 Kurulum

1. **Bağımlılıkları Yükleyin:**
   ```bash
   npm install
   ```

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

Projenin çalışması için kök dizinde bir `.env` dosyası oluşturun ve aşağıdaki şablonu kullanın:

```env
# API Anahtarları
NEWS_API_KEY=YOUR_API_KEY_HERE

# Servis URL'leri (Dokunmayın)
FRANKFURTER_BASE_URL=https://api.frankfurter.app/latest
WTTR_BASE_URL=https://wttr.in
NEWS_API_BASE_URL=https://newsapi.org/v2/top-headlines
ALADHAN_API_URL=http://api.aladhan.com/v1/timingsByCity
ADVICE_API_URL=https://api.adviceslip.com/advice
TRANSLATE_API_URL=https://api.mymemory.translated.net/get
DICTIONARY_API_URL=https://api.dictionaryapi.dev/api/v2/entries/en
```

---

## 🛠️ Kullanılan Teknolojiler

- **Node.js** (v16+)
- **Axios** (HTTP İstekleri)
- **Chalk** (Renkli Terminal Çıktıları)
- **Ora** (Elegant Spinner)
- **Cli-Table3** (Tablo Tasarımları)
- **Yahoo Finance 2** (Borsa Verileri)
- **Dotenv** (Güvenli Yapılandırma)

---

## 📝 Lisans

Bu proje kişisel kullanım ve geliştirme amaçlı hazırlanmıştır. Özgürce değiştirebilir ve geliştirebilirsiniz. 🚀
