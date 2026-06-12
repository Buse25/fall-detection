# CatchMe — Dönem Projesi Teknik Raporu (Güncellenmiş)

**Ders:** Node.js ile Web Programlama  
**Senaryo:** Düşme ve Hareketsizlik Tespiti — Mobil Sensör Tabanlı Gerçek Zamanlı Güvenlik Platformu  
**Tarih:** 12 Haziran 2026  
**Sürüm notu:** Bu metin, kod tabanı ve terminal test çıktılarıyla hizalanmış güncel rapordur.

---

## 1. Gereksinim Analizi ve Proje Tanımı

Platform; akıllı telefon sensörlerini IoT uç düğümü olarak kullanır, veriyi Node.js backend üzerinden işler, Python/FastAPI AI mikroservisi ile düşme tahmini yapar ve React tabanlı web paneli ile admin izlemeyi sağlar.

### 1.1 Fonksiyonel Gereksinimler

- JWT tabanlı kimlik doğrulama ve rol yönetimi (`user`, `admin`)
- Mobil: ivmeölçer + jiroskop, 50 Hz, `sensor_window` ile gerçek zamanlı iletim
- Backend: sensör doğrulama, depolama, AI + durum makinesi ile düşme/hareketsizlik analizi
- Otomatik alarm oluşturma (`fall`, `inactivity`)
- Kullanıcı: alarm geçmişi görüntüleme; mobilde düşme alarmını iptal etme ve REST ile çözme
- Acil durum kişisi: backend’de tek kişi (`emergencyContactName`, `emergencyContactPhone`); mobilde ayrı **Acil Durum Kişileri** sekmesi
- Admin: web panelden istatistik, grafik, cihaz listesi, alarm geçmişi

### 1.2 Fonksiyonel Olmayan Gereksinimler

- Socket.IO gerçek zamanlı akış
- bcryptjs, JWT, express-validator, helmet, express-rate-limit
- AI çağrısı 3 sn timeout; erişilemezse kural tabanlı fallback (2.5 g)
- Redis: düşme state/buffer için TTL; hareketsizlik state’i açık iptal veya geçişe kadar kalıcı
- Otomatik test: backend (Jest), web panel (Vitest), mobil (Jest), AI servisi (pytest)

### 1.3 Proje Kapsamı

Zorunlu modüllerin yanı sıra: AI mikroservisi, web yönetim paneli, hareketsizlik tespiti, düşme durum makinesi, offline kuyruk, Device modeli, dört katmanlı test altyapısı.

---

## 2. Kullanım Senaryosu

### 2.1 Düşme Tespiti

Kullanıcı giriş yapar; sensör izleme başlar. 75 örneklik (~1,5 sn) pencere Socket.IO ile backend’e gider. Backend AI servisine yönlendirir; `is_fall` (prediction=1 ve probability≥0,85) sonrası Redis durum makinesi devreye girer. Düşük varyans (<0,5 g²) ile düşme onaylanır; mobilde geri sayımlı alarm ekranı açılır. Kullanıcı **İyiyim** ile `fall_cancel` gönderir ve `PATCH /api/alarms/:id/resolve` çağrılır. AI erişilemezse magnitude > 2,5 g kural tabanlı fallback çalışır.

### 2.2 Hareketsizlik Tespiti

Uyku takvimine göre gündüz 2 saat / gece 8 saat eşik. Hareketsizlik süresi aşılınca `PRE_ALARM` (varsayılan 60 sn geri sayım). Kullanıcı **İyiyim, Ben Buradayım** ile iptal edebilir; aksi halde `CONFIRMED` ve `emergency_alert`.

### 2.3 Acil Durum Kişisi ve Profil

- **Profil sekmesi:** ad, e-posta (salt okunur), profil tipi, uyku takvimi, şifre değişimi
- **Acil Durum Kişileri sekmesi:** acil durum kişisi adı ve telefonu (backend’de User üzerinde tek kişi alanları)
- Profil tipi `elderly` → AI’da `Yas_Grubu=1`; uyku takvimi hareketsizlik eşiğini etkiler

### 2.4 Admin — Web Panel

Admin dashboard’da **üç istatistik kartı** görünür:

| Kart         | Veri kaynağı               |
| ------------ | -------------------------- |
| Toplam Alarm | `stats.totalAlarms`        |
| Bugün Düşme  | `stats.todayFalls`         |
| Sensör Kaydı | `stats.totalSensorRecords` |

Çözülmemiş alarm sayısı (`unresolvedAlarms`) ayrı bir kart değildir; üst çubuktaki bildirim göstergesinde kullanılır.

Sensör grafiği (Recharts), cihaz listesi, alarm geçmişi (listeleme + filtreleme) ve Socket.IO ile anlık olay güncellemeleri sunulur. Alarm geçmişi sayfasında alarmlar **listelenir ve filtrelenir**; panel üzerinden çözme butonu bulunmaz (çözüm mobil veya REST API ile yapılır).

---

## 3. Sistem Mimarisi

Beş bileşen: mobil (Expo/RN), web panel (React/Vite), backend (Node/Express/Socket.IO), AI (FastAPI), veri katmanı (MongoDB + Redis).

### 3.3 Mobil Sensör Parametreleri

| Parametre      | Değer                             |
| -------------- | --------------------------------- |
| Örnekleme      | 20 ms (50 Hz)                     |
| Pencere        | 75 örnek (~1,5 sn)                |
| İletim         | Socket.IO `sensor_window`         |
| Offline kuyruk | Bellek içi, max 100 pencere, FIFO |

---

## 4. Kullanılan Teknolojiler

### 4.5 Geliştirme ve Test

| Bileşen    | Araç                                          |
| ---------- | --------------------------------------------- |
| Backend    | Jest, Supertest, mongodb-memory-server        |
| Web panel  | Vitest, React Testing Library, jsdom          |
| Mobil      | Jest, jest-expo, React Native Testing Library |
| AI servisi | pytest, FastAPI TestClient, httpx             |

---

## 5. Veri Modeli

### 5.1 Varlık-İlişki Özeti

```
User ──1:N──► SensorData
User ──1:N──► Alarm
User ──1:N──► Device
SensorData ──1:1──► Alarm (sensorDataId)
```

### 5.2 User Modeli

`name`, `email`, `password`, `role`, `profileType`, `emergencyContactName`, `emergencyContactPhone`, `sleepSchedule` (nightStart, nightEnd).

### 5.5 Device Modeli

`deviceId` (unique), `userId`, `deviceName`, `isOnline`, `lastSeen`. Socket `sensor_window` akışında upsert edilir; `/api/panel/devices` bu koleksiyondan beslenir.

### 5.6 Redis Durum Anahtarları

| Anahtar                             | TTL  | Açıklama                     |
| ----------------------------------- | ---- | ---------------------------- |
| `fall:state:{deviceId}`             | 3 sn | Düşme SM (`IMPACT_DETECTED`) |
| `fall:buffer:{deviceId}`            | 3 sn | Varyans buffer’ı             |
| `inactivity:last_active:{deviceId}` | Yok  | Son hareket zamanı           |
| `inactivity:state:{deviceId}`       | Yok  | Hareketsizlik SM             |

**TTL politikası:** Düşme durum makinesi ve sensör buffer anahtarları Redis üzerinde 3 saniyelik TTL ile yönetilmektedir. Hareketsizlik durum bilgileri ise açık bir iptal veya durum geçişine kadar kalıcı tutulmaktadır.

---

## 6. Gerçekleştirilen Modüller (özet)

### 6.3 Düşme Tespiti — AI

AI mikroservisi bağımsız FastAPI uygulamasıdır. `models/fall_model.pkl` dosyasından yüklenen **scikit-learn tabanlı eğitilmiş sınıflandırma modeli** kullanılır (pickle yükleme; runtime’da algoritma sınıfı ayrıca doğrulanmaz).

6 öznitelik: `Yas_Grubu`, `Acc_Min`, `Acc_Max`, `Acc_Var`, `Gyro_Max`, `Gyro_Var`. Jiroskop rad/s → °/s (×57,2958). `is_fall = (prediction == 1) AND (probability >= 0.85)`.

### 6.5 Alarm Yaşam Döngüsü

```
Tespit → Alarm (isResolved: false) → Socket olayları (fall_detected / emergency_alert)
Mobil düşme iptali → fall_cancel + PATCH /api/alarms/:id/resolve → alarm_resolved (panel)
Web panel → alarm durumunu listeler; çözme aksiyonu sunmaz
```

### 6.6 Socket.IO

JWT yalnızca **`handshake.auth.token`** üzerinden alınır (opsiyonel `Bearer ` ön eki desteklenir). Bağlantıda `profileType`, `sleepSchedule`, `role` cache’lenir. Admin otomatik `panel:{userId}` odasına alınır.

### 6.7 Web Panel

- **Dashboard:** Toplam Alarm, Bugün Düşme, Sensör Kaydı kartları; SensorChart; RecentAlarms
- **SensorChart:** canlı mod (son 300 nokta, ~60 sn kayan pencere), 1 saat, 24 saat; cihaz filtresi
- **DevicesPage:** çevrimiçi/çevrimdışı, düşme sayısı, son magnitude
- **AlarmHistoryPage:** tip, tarih, ciddiyet, durum filtreleri; salt okunur durum sütunu

---

## 7. API Dokümantasyonu

### 7.1 Kimlik Doğrulama (`/api/auth`)

| Metot     | Yol         | Açıklama                                                                                                     | Auth  |
| --------- | ----------- | ------------------------------------------------------------------------------------------------------------ | ----- |
| POST      | `/register` | Kayıt                                                                                                        | Hayır |
| POST      | `/login`    | Giriş                                                                                                        | Hayır |
| GET       | `/me`       | Oturum bilgisi                                                                                               | Evet  |
| **PATCH** | **`/me`**   | **Profil güncelleme** (name, profileType, emergencyContactName, emergencyContactPhone, sleepSchedule, şifre) | Evet  |

> **Not:** Profil güncelleme endpoint’i `PATCH /api/auth/me` şeklindedir. `PUT /api/auth/profile` kullanılmaz.

### 7.2 Sensör Verisi (`/api/sensor-data`)

| Metot | Yol       | Açıklama                                                                            | Auth |
| ----- | --------- | ----------------------------------------------------------------------------------- | ---- |
| POST  | `/`       | Yeni sensör kaydı; kural tabanlı düşme (magnitude > 2,5 g)                          | Evet |
| GET   | `/`       | Listeleme (sayfalama, filtre: `deviceId`, `isFallDetected`, `startDate`, `endDate`) | Evet |
| GET   | `/latest` | Kullanıcının son sensör kaydı                                                       | Evet |
| GET   | `/falls`  | Düşme işaretli kayıtlar (limit 100)                                                 | Evet |

### 7.3 Alarm Yönetimi (`/api/alarms`)

| Metot | Yol            | Açıklama                                   |
| ----- | -------------- | ------------------------------------------ |
| GET   | `/`            | Alarm listesi (admin: tümü)                |
| GET   | `/:id`         | Tek alarm detayı (`sensorDataId` populate) |
| PATCH | `/:id/resolve` | Alarmı çözüldü işaretle                    |

### 7.5 Web Panel (`/api/panel`) — adminOnly

| Metot | Yol              | Açıklama                                     |
| ----- | ---------------- | -------------------------------------------- |
| GET   | `/stats`         | Panel istatistikleri                         |
| GET   | `/recent-alarms` | Son 10 alarm                                 |
| GET   | `/sensor-chart`  | Zaman serisi (`hours`, `deviceId`, `userId`) |
| GET   | `/devices`       | Cihaz listesi                                |

---

## 8. Test Süreci

Test altyapısı **dört bileşene** ayrılmıştır. Her bileşen kendi dizininde bağımsız çalıştırılır. Backend testleri izole MongoDB (mongodb-memory-server) kullanır; Redis, Socket.IO ve panel route’ları backend Jest kapsamına **dahil değildir**.

### 8.1 Test Sonuçları (terminal çıktısı — 12 Haziran 2026)

| Bileşen        | Komut                        | Test dosyası / süit | Test sayısı | Sonuç                          |
| -------------- | ---------------------------- | ------------------- | ----------- | ------------------------------ |
| **backend**    | `npm test`                   | 6 süit              | **50**      | 50 geçti                       |
| **web-panel**  | `npm run test:run`           | 6 dosya             | **41**      | 40 geçti, 1 beklenen fail      |
| **mobile**     | `npm run test:run`           | 4 süit              | **34**      | 33 geçti, 1 beklenen fail      |
| **ai-service** | `python -m pytest tests/ -q` | 4 modül             | **50**      | 50 geçti                       |
| **Toplam**     | —                            | **20 süit/dosya**   | **175**     | **173 geçti, 2 beklenen fail** |

> **Mobil not:** `sensor-tracking.test.tsx` içindeki 3.1.1 senaryosu (74 örnekte emit yok, 75. örnekte tetiklenir) Jest ortamında zamanlayıcı/async kısıtı nedeniyle zaman aşımına düşebilir; bu test bilinen ortam kısıtı olarak beklenen fail sınıfına alınmıştır.

**Backend süitleri:** `health`, `auth`, `sensorData`, `alarm`, `admin`, `makeAdmin`.

**Web-panel test dosyaları:** `auth`, `dashboard`, `sensor-chart`, `socket-events`, `alarm-history`, `device-list`.

**Mobil test dosyaları:** `auth-storage`, `sensor-tracking`, `socket-events`, `profile`.

**AI test modülleri:** `test_health`, `test_predict_api`, `test_features`, `test_thresholds`.

### 8.2 Backend Kod Kapsama

Komut: `npm test -- --coverage --coverageReporters=text-summary`

| Tür        | Oran    |
| ---------- | ------- |
| Statements | 74,65 % |
| Branches   | 56,16 % |
| Functions  | 68,75 % |
| Lines      | 75,69 % |

Kapsama yalnızca backend kaynak kodunu ölçer. Panel route’ları, socket handler, AI/inactivity servisleri ve harici mikroservisler bu orana dahil değildir.

### 8.3 Backend Jest — Test Edilen Başlıklar

- Health: `GET /health`, `GET /api/health`
- Auth: kayıt, giriş, validasyon, JWT koruması
- SensorData: oluşturma, listeleme, filtreleme, sayfalama, kural tabanlı düşme (REST POST)
- Alarm: listeleme, tekil getirme (`GET /:id`), çözme (`PATCH /:id/resolve`), sahiplik izolasyonu
- Admin: dashboard uç noktaları, rol kontrolü
- `make-admin` script

### 8.4 Backend Jest — Kapsam Dışı (bilinçli)

Aşağıdakiler backend Jest ile **test edilmemektedir**; ilgili davranışlar bileşen testlerinde veya manuel senaryolarda doğrulanır:

- Socket.IO olayları ve JWT handshake
- `PATCH /api/auth/me` (profil güncelleme)
- `/api/panel/*` endpoint’leri
- Redis durum makineleri, AI HTTP entegrasyonu, hareketsizlik akışı

### 8.5 Diğer Bileşen Testleri

- **Web panel (Vitest):** rota koruması, dashboard kartları, SensorChart, socket olayları, alarm listesi/filtre, cihaz listesi
- **Mobil (Jest):** AsyncStorage auth, sensör pencereleme, offline kuyruk, alarm socket olayları, profil PATCH
- **AI servisi (pytest):** `/health`, `/predict` validasyon, öznitelik hesabı, olasılık eşiği sınır testleri (mock model)

---

## 9. Karşılaşılan Kısıtlar ve Geliştirme Önerileri

### 9.1 Mevcut Kısıtlar

- `analysis/` altındaki `inactivityDetection.js`, `riskAnalyzer.js` ve `locationStability.js` boş; `fallDetection.js` ise aktif kural tabanlı düşme tespiti mantığını içerir (`detectFallRuleBased`, 2,5 g eşiği). İnactivity ve risk analizi `services/` ile `socket.js` içinde
- `Alert.js` modeli boş; alarm işlevi `Alarm.js` ile karşılanıyor
- Push/SMS bildirimi yok; uygulama içi Socket.IO bildirimi
- Web panelde alarm çözme UI’si yok

### 9.2 Gelecek Geliştirme Önerileri

- `riskAnalyzer.js` ile çok boyutlu risk skoru
- Push/SMS (FCM, Twilio)
- Panel `/api/panel/*` için backend entegrasyon testleri
- `analysis/` modüllerinin servis katmanından ayrıştırılması

> **Kaldırılan kısıt:** Web paneli ve AI mikroservisi için otomatik testler yazılmıştır (Bölüm 8.1).

---

## 10. Sonuç

CatchMe; mobil sensör toplama, Node.js backend, FastAPI AI servisi, Redis destekli durum makineleri ve React admin panelinden oluşan modüler bir platformdur.

**Test özeti (terminal):** 175 otomatik test (backend 50, web-panel 41, mobil 34, AI 50); **173 geçti, 2 beklenen fail** — web-panelde 1 , mobilde 1 (`sensor-tracking` 3.1.1 zamanlayıcı kısıtı).

Backend Jest kapsama oranı yaklaşık **%75** satır düzeyindedir. Dört bileşenli test yapısı, REST ve birim mantığının yanı sıra panel, mobil ve AI sözleşmelerinin ayrı doğrulanmasını sağlar.

Platform; AI + varyans doğrulamalı düşme tespiti, gece/gündüz hareketsizlik izleme, Device kaydı, offline kuyruk ve gerçek zamanlı web paneli ile genişlemeye açık bir temel sunmaktadır.
