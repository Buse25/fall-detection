# 🏃 CatchMe - Gerçek Zamanlı Düşme ve Hareketsizlik Tespiti Platformu

## 📖 Proje Özeti

**CatchMe**, özellikle yaşlı bireyler ve yalnız yaşayan kişiler için tasarlanmış, akıllı telefon sensörlerini (ivmeölçer ve jiroskop) birer IoT uç düğümü olarak kullanan yapay zeka destekli bir güvenlik platformudur. 

Uygulama, sensör verilerini yüksek frekansta (50 Hz) okur ve gerçek zamanlı olarak analiz ederek düşme veya uzun süreli hareketsizlik durumlarını anında tespit eder. Acil bir durumda ise yetkili acil durum kişilerine otomatik olarak yüksek öncelikli bildirim göndererek kritik durumlarda müdahale süresini en aza indirir.

## ✨ Öne Çıkan Özellikler

- 🧠 **AI Destekli Düşme Tespiti:** Python/FastAPI tabanlı bağımsız bir mikroservis üzerinden scikit-learn (Random Forest) modeli ile yüksek doğruluklu düşme analizi ve anomali tespiti.
- 🚦 **Redis Durum Makineleri (State Machines):** Yanlış alarmları önlemek için çok aşamalı düşme onayı (NORMAL → IMPACT_DETECTED → FALL_CONFIRMED) ve kullanıcının uyku takvimine göre çalışan gece/gündüz dinamik eşikli hareketsizlik takibi.
- 📡 **Gerçek Zamanlı Web Paneli:** Adminler için Socket.IO destekli, React, Vite ve Tailwind CSS ile geliştirilmiş canlı dashboard. Tüm cihazları, düşmeleri ve Recharts üzerinden sensör grafiklerini anlık olarak izleme imkanı.
- 📶 **Offline Kuyruk Mimarisi:** Mobil uygulamada olası ağ kesintilerinde veri kaybını önleyen, bellek içi çevrimdışı (FIFO) veri tamponlama sistemi. Bağlantı kurulduğunda veriler senkronize edilir.
- 🔄 **Jiroskop ve İvmeölçer Entegrasyonu:** Sensör verilerinin eş zamanlı okunması, varyans hesaplaması ve AI modeline zengin öznitelikler (features) sunulması.
- 🛡️ **Kural Tabanlı Fallback:** AI servisinin ulaşılamadığı durumlarda sistemin kesintisiz çalışmasını sağlayan şiddet eşiği tabanlı (`magnitude > 2.5g`) güvenli yedekleme mekanizması.

## 🏗️ Sistem Mimarisi ve Kullanılan Teknolojiler

Platform, bağımsız olarak geliştirilebilir ve ölçeklenebilir 4 ana katmandan oluşmaktadır:

1. **Backend (API ve İş Mantığı Katmanı)**
   - Teknolojiler: `Node.js`, `Express.js`, `Socket.IO`
   - Veritabanı ve Durum Yönetimi: `MongoDB (Mongoose)`, `Redis`
2. **Mobil İstemci (Sunum Katmanı)**
   - Teknolojiler: `React Native`, `Expo (TypeScript)`, `Expo Router`, `Socket.IO Client`
3. **Web Panel (Admin Dashboard)**
   - Teknolojiler: `React`, `Vite`, `Tailwind CSS`, `Recharts`
4. **AI Mikroservisi**
   - Teknolojiler: `Python 3.12+`, `FastAPI`, `scikit-learn`, `uvicorn`

## ⚙️ Ortam Değişkenleri (.env)

Sistemin çalışması için, **backend** dizininde bir `.env` dosyası oluşturmalısınız. Aşağıdaki şablonu doğrudan kullanabilirsiniz:

```env
# Çevre ve Sunucu Ayarları
NODE_ENV=development
PORT=5000

# Veritabanı & Önbellek Bağlantıları
MONGO_URI=mongodb://127.0.0.1:27017/fall-detection
REDIS_URL=redis://localhost:6379

# Güvenlik ve Yetkilendirme
JWT_SECRET=change_this_to_a_long_random_secret
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=1000

# Mikroservis Bağlantısı (FastAPI Servisi)
AI_SERVICE_URL=http://localhost:8000

# Hareketsizlik ve Alarm Eşikleri (Saniye cinsinden)
INACTIVITY_THRESHOLD_DAY_SEC=7200      # Gündüz: 2 saat hareketsizlik eşiği
INACTIVITY_THRESHOLD_NIGHT_SEC=28800   # Gece: 8 saat uyku eşiği
PRE_ALARM_TIMEOUT_SEC=60               # Alarm kesinleşme bekleme süresi
```

## 🚀 Kurulum ve Çalıştırma

Projeyi kendi bilgisayarınızda yerel (local) olarak çalıştırmak için, sisteminizde Node.js, Python, MongoDB ve Redis servislerinin kurulu ve aktif olduğundan emin olun. Ardından adım adım aşağıdaki talimatları izleyin:

### 1. AI Mikroservisi (Python/FastAPI)
AI mikroservisinin aktif olması, modelin doğru sonuç verebilmesi için gereklidir (Varsayılan port: `8000`).

```bash
cd ai-service

# Gerekli bağımlılıkların yüklenmesi
pip install -r requirements.txt

# Mikroservisi başlatma
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Backend (Node.js/Express)
Ana iş mantığını ve soket sunucusunu barındıran yapıdır (Varsayılan port: `5000`).

```bash
cd backend

# Gerekli paketlerin yüklenmesi
npm install

# .env dosyasını oluşturun (ya da yukarıdaki şablonu içine kopyalayın)
cp .env.example .env

# Sunucuyu geliştirici modunda başlatma
npm run dev
# veya standart başlangıç: npm start
```

### 3. Web Yönetim Paneli (React/Vite)
Adminlerin gerçek zamanlı izleme yapabildiği panel katmanıdır.

```bash
cd web-panel

# Gerekli paketlerin yüklenmesi
npm install

# Geliştirme sunucusunu başlatma
npm run dev
```

### 4. Mobil İstemci (React Native/Expo)
Uygulamayı fiziksel bir telefonda çalıştırmak için "Expo Go" uygulamasını kullanabilirsiniz.

```bash
cd mobile

# Gerekli bağımlılıkların yüklenmesi
npm install

# Uygulamayı başlatma
npx expo start
```
*(Komut sonrası terminalde çıkan QR kodu, cihazınızdaki Expo Go kamerasına okutarak test sürecine başlayabilirsiniz.)*

## 👥 Ekip

Bu proje, bir ekip çalışmasının ürünü olarak akademik kapsamda geliştirilmiştir:

- **Proje Danışmanları:** Doç. Dr. İzzet Fatih ŞENTÜRK / Arş. Gör. Yusuf KAYIPMAZ
- **Geliştiriciler:** 
  - Hasna Şahinoğlu
  - Sudenur Elmas
  - Halime Buse Yalçın

---

> 🎓 *Bu platform, Bursa Teknik Üniversitesi Bilgisayar Mühendisliği Bölümü **"Node.js ile Web Programlama"** dersi dönem projesi kapsamında tasarlanmış ve hayata geçirilmiştir.*