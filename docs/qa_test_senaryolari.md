# CatchMe — QA Test Senaryoları Kataloğu

> **Kapsam:** ai-service, web-panel, mobile  
> **Oluşturulma:** 2026-06-12  
> **Not:** Bu belge test kodu içermez; yalnızca test senaryosu tanımlarından oluşur.

---

## İçindekiler

1. [AI Mikroservisi (ai-service)](#1-ai-mikroservisi)
   - 1.1 `/health` Endpoint Testleri
   - 1.2 `/predict` Endpoint Testleri
   - 1.3 Öznitelik Çıkarım Algoritması Testleri
   - 1.4 Olasılık Eşiği Sınır Testleri
   - 1.5 Hata Yönetimi Testleri
2. [Web Yönetim Paneli (web-panel)](#2-web-yönetim-paneli)
   - 2.1 Kimlik Doğrulama ve Rota Koruma Testleri
   - 2.2 Dashboard İstatistik Kartları Testleri
   - 2.3 Sensör Grafiği (SensorChart) Testleri
   - 2.4 Socket.IO Gerçek Zamanlı Event Testleri
   - 2.5 Alarm Geçmişi Sayfası Testleri
   - 2.6 Cihaz Listesi Sayfası Testleri
3. [Mobil Uygulama (mobile)](#3-mobil-uygulama)
   - 3.1 Sensör Veri Toplama ve Pencereleme Testleri
   - 3.2 Çevrimdışı Kuyruk (Offline Queue) Testleri
   - 3.3 Socket.IO Alarm Event UI Testleri
   - 3.4 JWT ve AsyncStorage Testleri
   - 3.5 Profil ve Acil Durum Kişisi Yönetimi Testleri

---

## 1. AI Mikroservisi

> **Teknoloji Yığını:** Python, FastAPI, scikit-learn, Pydantic  
> **Test Türleri:** Birim (Unit), Entegrasyon (Integration)

---

### 1.1 `/health` Endpoint Testleri

---

**Senaryo 1.1.1 — Model Yüklü Durum Sağlık Kontrolü**

- **Test Senaryosu:** `fall_model.pkl` başarıyla yüklendiğinde `/health` endpoint'inin beklenen yanıtı dönmesi
- **Girdi/Durum:** `GET /health` isteği; `models/fall_model.pkl` dosyası mevcut ve okunabilir durumda
- **Beklenen Çıktı/Davranış:** HTTP 200, `status: "ok"`, `modelLoaded: true`, `fallProbabilityThreshold: 0.85`
- **Kenar Durum:** Model dosyası var ancak bozuk (corrupt) — `modelLoaded: false` ve `status: "degraded"` dönmeli

---

**Senaryo 1.1.2 — Model Yüklenememe Durumunda Sağlık Kontrolü**

- **Test Senaryosu:** `fall_model.pkl` dosyası mevcut değilken ya da erişim izni yokken `/health` endpoint'inin degraded durum dönmesi
- **Girdi/Durum:** Model dosyası silinmiş veya yolu hatalı
- **Beklenen Çıktı/Davranış:** HTTP 200 (endpoint çökmemeli), `status: "degraded"`, `modelLoaded: false`
- **Kenar Durum:** Endpoint, model hatasına rağmen 5xx dönmemeli; servis ayakta kalmalı

---

**Senaryo 1.1.3 — Eşik Değerinin Yanıtta Doğru Yer Alması**

- **Test Senaryosu:** `FALL_PROBABILITY_THRESHOLD` sabitinin `/health` yanıtında doğru yansıtılması
- **Girdi/Durum:** `GET /health`; ortam değişkeni ile eşik değiştirilebiliyorsa farklı değer ayarlanmış
- **Beklenen Çıktı/Davranış:** `fallProbabilityThreshold` değeri, `main.py`'deki sabitle tam eşleşmeli (0.85)
- **Kenar Durum:** —

---

### 1.2 `/predict` Endpoint Testleri

---

**Senaryo 1.2.1 — Geçerli Payload ile Başarılı Düşme Tahmini**

- **Test Senaryosu:** Tam ve geçerli bir `SensorWindowPayload` ile `/predict` endpoint'inin düzgün yanıt dönmesi
- **Girdi/Durum:** `userId`, `deviceId`, `windowStart`, `windowEnd`, `sampleRateHz`, 75 adet tam okuma (`accelerometer` + `gyroscope` x/y/z), `profile: null`
- **Beklenen Çıktı/Davranış:** HTTP 200; yanıt gövdesinde `prediction` (0 veya 1), `probability` (0.0–1.0 arası float), `is_fall` (bool), `timestamp` (geçerli ISO 8601 UTC string) alanları mevcut
- **Kenar Durum:** `probability` değeri tam 0.0 veya tam 1.0 olursa yanıt hâlâ geçerli olmalı

---

**Senaryo 1.2.2 — `is_fall` Bayrağının Çift Koşul Mantığının Doğruluğu**

- **Test Senaryosu:** `prediction=1` ancak `probability < 0.85` iken `is_fall` değerinin `false` dönmesi
- **Girdi/Durum:** Model `prediction=1` üretecek ancak `probability=0.84` (sentetik/mock model) verecek şekilde payload hazırlanmış
- **Beklenen Çıktı/Davranış:** `is_fall: false` — tek başına `prediction=1` alarm oluşturmak için yeterli değil
- **Kenar Durum:** `prediction=0` iken `probability=0.90` — `is_fall: false` dönmeli (her iki koşul da sağlanmalı)

---

**Senaryo 1.2.3 — `profile: "yasli"` Parametresinin Yas_Grubu Özniteliğine Yansıması**

- **Test Senaryosu:** `profile: "yasli"` gönderildiğinde modelin `Yas_Grubu=1` ile çalışması; farklı `profile` değerlerinde `Yas_Grubu=0` kullanılması
- **Girdi/Durum:** İki özdeş sensör penceresi; biri `profile: "yasli"`, diğeri `profile: null` veya `profile: "other"` ile gönderiliyor
- **Beklenen Çıktı/Davranış:** `Yas_Grubu` özniteliği, `"yasli"` için 1, diğer tüm değerler için 0 olmalı; model bu farkı `probability` değerine yansıtabilir
- **Kenar Durum:** `profile: "YASLI"` (büyük harf) — büyük/küçük harf duyarsızlığı yoksa `Yas_Grubu=0` dönmeli; bu davranış dokümante edilmeli

---

**Senaryo 1.2.4 — `readings` Listesi Boş Gönderildiğinde Güvenli Varsayılan Yanıt**

- **Test Senaryosu:** `readings: []` ile gönderilen payloadda endpoint'in güvenli varsayılanı döndürmesi
- **Girdi/Durum:** Tüm zorunlu alanlar mevcut ancak `readings: []`
- **Beklenen Çıktı/Davranış:** `prediction: 0`, `probability: 0.0`, `is_fall: false` — hata fırlatılmadan güvenli yanıt
- **Kenar Durum:** `readings` alanı hiç gönderilmemişse Pydantic doğrulama hatası (HTTP 422) beklenmeli

---

**Senaryo 1.2.5 — Tek Okuma ile Tahmin (`readings` uzunluğu = 1)**

- **Test Senaryosu:** Yalnızca 1 sensör okuması içeren pencerede öznitelik hesaplamalarının çökmemesi
- **Girdi/Durum:** `readings` listesinde tek eleman; tüm x/y/z alanları geçerli float
- **Beklenen Çıktı/Davranış:** HTTP 200; `Acc_Min == Acc_Max` (tek eleman varyans = 0), `Acc_Var = 0.0`, yanıt alınabilir
- **Kenar Durum:** Tek elemanla `numpy.var()` 0.0 üretmeli; bu değer modeli bozmamalı

---

**Senaryo 1.2.6 — Zorunlu Alan Eksikliğinde Pydantic Doğrulama Hatası**

- **Test Senaryosu:** Zorunlu alanlardan biri eksik gönderildiğinde endpoint'in HTTP 422 döndürmesi
- **Girdi/Durum:** Sırasıyla `userId`, `deviceId`, `readings`, `windowStart`, `windowEnd` alanlarından biri eksik gönderilecek (her biri ayrı senaryo)
- **Beklenen Çıktı/Davranış:** HTTP 422 Unprocessable Entity; yanıt gövdesinde eksik alan adını içeren `detail` dizisi
- **Kenar Durum:** —

---

**Senaryo 1.2.7 — `accelerometer` İç Alanı Eksik Okuma**

- **Test Senaryosu:** `readings` içindeki bir okumanın `accelerometer.z` gibi eksik bir eksen içermesi
- **Girdi/Durum:** `readings[0].accelerometer` nesnesi; `x` ve `y` mevcut, `z` yok
- **Beklenen Çıktı/Davranış:** Pydantic HTTP 422 veya `predictor.py`'deki `s.get("z", 0)` fallback ile 0 kullanılarak hesaplamanın devam etmesi
- **Kenar Durum:** `null` ya da `"abc"` gibi sayısal olmayan bir z değeri

---

**Senaryo 1.2.8 — Geçersiz JSON Gövdesi**

- **Test Senaryosu:** İstek gövdesinin geçerli JSON formatında olmadığı durumda hata yönetimi
- **Girdi/Durum:** `Content-Type: application/json` başlığı ile gönderilmiş bozuk JSON string (`{"userId": "abc"` — kapanış parantezi yok)
- **Beklenen Çıktı/Davranış:** HTTP 422; servis çökmemeli
- **Kenar Durum:** Tamamen boş gövde (`Content-Length: 0`)

---

**Senaryo 1.2.9 — Aşırı Büyük Payload**

- **Test Senaryosu:** Çok sayıda okuma içeren (örn. 10.000 eleman) payload gönderildiğinde servisin yanıt vermesi
- **Girdi/Durum:** `readings` listesi 10.000 elemanlı; tüm değerler geçerli
- **Beklenen Çıktı/Davranış:** Yanıt alınabilmeli; öznitelik hesaplama süresi ölçülmeli (performans benchmarkı)
- **Kenar Durum:** Bellek tükenmesi (OOM) durumu — serviste hata yakalanmalı

---

### 1.3 Öznitelik Çıkarım Algoritması Testleri

> Bu senaryolar `services/predictor.py` içindeki `_smv_series()` ve `predict()` fonksiyonlarını hedefler.

---

**Senaryo 1.3.1 — SMV Hesaplamasının Matematiksel Doğruluğu (İvmeölçer)**

- **Test Senaryosu:** `_smv_series()` fonksiyonunun ivmeölçer için doğru SMV değeri üretmesi
- **Girdi/Durum:** `accelerometer: {x: 3, y: 4, z: 0}` — beklenen SMV = 5.0 (Pisagor teoremi)
- **Beklenen Çıktı/Davranış:** Dönen liste elemanı `5.0` olmalı (veya makine hassasiyeti toleransında)
- **Kenar Durum:** `x=y=z=0` → SMV = 0.0; negatif değerler `{x: -3, y: -4, z: 0}` → SMV = 5.0

---

**Senaryo 1.3.2 — Jiroskop Birim Dönüşümünün Doğruluğu (rad/s → °/s)**

- **Test Senaryosu:** `_smv_series()` fonksiyonunun jiroskop için `scale=57.2958` çarpanını doğru uygulaması
- **Girdi/Durum:** `gyroscope: {x: 1, y: 0, z: 0}` (1 rad/s) — beklenen SMV = 57.2958 °/s
- **Beklenen Çıktı/Davranış:** Dönen SMV değeri `57.2958` (±makine epsilon)
- **Kenar Durum:** `scale=1.0` (ivmeölçer) için dönüşüm yapılmamalı; scale parametresi yanlış aktarılırsa değer 57 kat büyümeli

---

**Senaryo 1.3.3 — `Acc_Min` ve `Acc_Max` Özniteliklerinin Doğruluğu**

- **Test Senaryosu:** Farklı ivme büyüklüklerine sahip 3 okuma içeren pencerede minimum ve maksimum değerlerin doğru hesaplanması
- **Girdi/Durum:** SMV değerleri [1.0, 3.5, 2.2] üretecek 3 okuma
- **Beklenen Çıktı/Davranış:** `Acc_Min = 1.0`, `Acc_Max = 3.5`
- **Kenar Durum:** Tüm okumaların aynı SMV'ye sahip olduğu durum (min == max)

---

**Senaryo 1.3.4 — `Acc_Var` Varyans Hesaplamasının Doğruluğu**

- **Test Senaryosu:** Popülasyon varyansının (numpy.var) matematiksel doğruluğu
- **Girdi/Durum:** SMV değerleri [2.0, 4.0] (2 eleman) — beklenen popülasyon varyansı = 1.0
- **Beklenen Çıktı/Davranış:** `Acc_Var = 1.0`
- **Kenar Durum:** Tek elemanlı liste — `numpy.var([x]) = 0.0` dönmeli

---

**Senaryo 1.3.5 — Jiroskop Verisi Boş Olduğunda Varsayılan Değer Kullanımı**

- **Test Senaryosu:** Okuma nesnesinde `gyroscope` alanı tamamen yokken `Gyro_Max` ve `Gyro_Var` hesaplamalarının çökmemesi
- **Girdi/Durum:** `readings[i]` nesnelerinin `gyroscope` anahtarı yok veya `{}`
- **Beklenen Çıktı/Davranış:** `s.get("x", 0)` fallback ile tüm eksenler 0 kabul edilmeli; `Gyro_Max = 0.0`, `Gyro_Var = 0.0`
- **Kenar Durum:** `gyroscope` değeri `null` — `None.get()` çağrısı `AttributeError` fırlatmamalı

---

**Senaryo 1.3.6 — `pd.DataFrame` Sütun Adlarının Model Beklentisiyle Uyumu**

- **Test Senaryosu:** Predictor'ın oluşturduğu DataFrame sütunlarının modelin eğitim sırasında beklediği sütun adlarıyla birebir eşleşmesi
- **Girdi/Durum:** Geçerli bir sensör penceresi; `features` DataFrame oluşturma adımı izleniyor
- **Beklenen Çıktı/Davranış:** DataFrame sütunları sırasıyla `["Yas_Grubu", "Acc_Min", "Acc_Max", "Acc_Var", "Gyro_Max", "Gyro_Var"]`; scikit-learn "feature names mismatch" uyarısı üretmemeli
- **Kenar Durum:** Sütun sırası değiştirildiğinde model yanlış tahmin yapabilir

---

### 1.4 Olasılık Eşiği Sınır Testleri (Boundary Testing)

---

**Senaryo 1.4.1 — Eşiğin Tam Altında: `probability = 0.8499`**

- **Test Senaryosu:** Olasılık değeri eşiğin hemen altında olduğunda `is_fall` değerinin `false` dönmesi
- **Girdi/Durum:** Model `prediction=1`, `probability=0.8499` üretecek şekilde mock/patch uygulanmış
- **Beklenen Çıktı/Davranış:** `is_fall: false`
- **Kenar Durum:** —

---

**Senaryo 1.4.2 — Eşiğin Tam Üzerinde: `probability = 0.8500`**

- **Test Senaryosu:** Olasılık değeri eşikle tam eşit olduğunda `is_fall` değerinin `true` dönmesi (≥ operatörü)
- **Girdi/Durum:** Model `prediction=1`, `probability=0.85` üretecek şekilde mock/patch uygulanmış
- **Beklenen Çıktı/Davranış:** `is_fall: true`
- **Kenar Durum:** —

---

**Senaryo 1.4.3 — Eşiğin Bir Epsilon Üzerinde: `probability = 0.8501`**

- **Test Senaryosu:** Eşiği yeni geçen olasılık değerinde `is_fall: true` dönmesi
- **Girdi/Durum:** Model `prediction=1`, `probability=0.8501` üretecek şekilde mock/patch uygulanmış
- **Beklenen Çıktı/Davranış:** `is_fall: true`
- **Kenar Durum:** —

---

**Senaryo 1.4.4 — `prediction=0` iken `probability=0.90`**

- **Test Senaryosu:** Olasılık eşiği aşmış olsa bile `prediction=0` ise `is_fall: false` dönmesi
- **Girdi/Durum:** Model `prediction=0`, `probability=0.90`
- **Beklenen Çıktı/Davranış:** `is_fall: false` — her iki koşul da sağlanmalıdır
- **Kenar Durum:** —

---

**Senaryo 1.4.5 — `probability = 1.0` (Maksimum)**

- **Test Senaryosu:** Sınır değer: olasılık tam 1.0 olduğunda sistemin stabil çalışması
- **Girdi/Durum:** Mock model `probability=1.0` üretiyor
- **Beklenen Çıktı/Davranış:** `is_fall: true` (prediction=1 varsayımıyla), float overflow veya hata yok
- **Kenar Durum:** —

---

**Senaryo 1.4.6 — `probability = 0.0` (Minimum)**

- **Test Senaryosu:** Sınır değer: olasılık tam 0.0 olduğunda sistemin stabil çalışması
- **Girdi/Durum:** Mock model `probability=0.0` üretiyor
- **Beklenen Çıktı/Davranış:** `is_fall: false`; JSON yanıtında `probability` alanı `0.0` (null veya string değil)
- **Kenar Durum:** —

---

### 1.5 Hata Yönetimi Testleri

---

**Senaryo 1.5.1 — Model Yüklü Değilken `/predict` Çağrısı**

- **Test Senaryosu:** `_model = None` durumunda tahmin isteği geldiğinde güvenli varsayılanın dönmesi
- **Girdi/Durum:** Model dosyası mevcut değil (`_model = None`); geçerli payload gönderiliyor
- **Beklenen Çıktı/Davranış:** HTTP 200; `prediction: 0`, `probability: 0.0`, `is_fall: false` — servis çökmemeli
- **Kenar Durum:** HTTP 500 dönmemeli; istemci tarafında kural tabanlı fallback devreye girebilmeli

---

**Senaryo 1.5.2 — Model Tahmin Sırasında Exception Fırlatması**

- **Test Senaryosu:** `model.predict()` çağrısı beklenmeyen bir exception fırlattığında `except` bloğunun devreye girmesi
- **Girdi/Durum:** Mock model `predict()` çağrısında `ValueError` fırlatiyor
- **Beklenen Çıktı/Davranış:** `_SAFE_DEFAULT` döner; hata mesajı konsola yazılır; HTTP 200 yanıt
- **Kenar Durum:** Exception mesajı yanıtta kullanıcıya açık edilmemeli

---

**Senaryo 1.5.3 — `classes_` Listesinde `1` Sınıfı Yokken Olasılık Hesabı**

- **Test Senaryosu:** Modelin `classes_` dizisinde `1` değeri yokken `fall_class_index = -1` durumunun yönetimi
- **Girdi/Durum:** Mock model `classes_=[0]` (yalnızca negatif sınıf)
- **Beklened Çıktı/Davranış:** `max(proba)` kullanılarak hesaplama yapılmalı; `IndexError` fırlatılmamalı
- **Kenar Durum:** —

---

**Senaryo 1.5.4 — `/predict` Endpoint'ine `GET` İsteği**

- **Test Senaryosu:** `/predict` yoluna `POST` yerine `GET` isteği gönderildiğinde uygun hata dönmesi
- **Girdi/Durum:** `GET /predict`
- **Beklenen Çıktı/Davranış:** HTTP 405 Method Not Allowed
- **Kenar Durum:** —

---

**Senaryo 1.5.5 — Sayısal Olmayan Sensör Değerleri**

- **Test Senaryosu:** `accelerometer.x` değerinin `string` türünde gönderilmesinde Pydantic doğrulamasının devreye girmesi
- **Girdi/Durum:** `"accelerometer": {"x": "abc", "y": 0, "z": 0}`
- **Beklenen Çıktı/Davranış:** HTTP 422; `x` alanının `float` türünde olması gerektiği belirtilmeli
- **Kenar Durum:** `"x": null` — null değer Pydantic tarafından reddedilmeli

---

---

## 2. Web Yönetim Paneli

> **Teknoloji Yığını:** React 18, Vite, Tailwind CSS, Recharts, Socket.IO Client, React Router v6  
> **Test Türleri:** Birim (Unit), Entegrasyon (Integration), UI/Bileşen

---

### 2.1 Kimlik Doğrulama ve Rota Koruma Testleri

---

**Senaryo 2.1.1 — Token Yokken Korumalı Rotaya Erişim Girişimi**

- **Test Senaryosu:** `AuthContext`'te token bulunmuyorken `/dashboard` gibi korumalı bir rotaya doğrudan URL girişi yapıldığında yönlendirme
- **Girdi/Durum:** `localStorage`'da token yok; kullanıcı tarayıcıdan `http://panel/dashboard` adresine gidiyor
- **Beklenen Çıktı/Davranış:** Kullanıcı `/login` sayfasına yönlendirilmeli; Dashboard render edilmemeli
- **Kenar Durum:** Yönlendirme sonsuz döngüye girmemeli (`/login`'den tekrar `/login`'e yönlendirme)

---

**Senaryo 2.1.2 — Admin Olmayan Token ile Korumalı Rotaya Erişim**

- **Test Senaryosu:** `role: "user"` içeren geçerli bir token ile panele giriş yapılmaya çalışıldığında `ProtectedRoute` bileşeninin engel koyması
- **Girdi/Durum:** `AuthContext.user.role = "user"` olan geçerli bir token mevcut; `/dashboard` rotasına erişim deneniyor
- **Beklened Çıktı/Davranış:** `logout()` çağrılmalı (token temizlenmeli), kullanıcı `/login`'e yönlendirilmeli
- **Kenar Durum:** `user` nesnesi mevcut ama `role` alanı undefined — savunma katmanının davranışı test edilmeli

---

**Senaryo 2.1.3 — Başarılı Admin Girişi Sonrası Yönlendirme**

- **Test Senaryosu:** Geçerli admin kimlik bilgileriyle `/login` sayfasından giriş yapıldıktan sonra `/dashboard`'a otomatik yönlendirme
- **Girdi/Durum:** E-posta ve şifre doğru; API'den `role: "admin"` içeren token yanıtı geliyor
- **Beklenen Çıktı/Davranış:** Token `AuthContext`'e kaydedilmeli; kullanıcı `/dashboard`'a yönlendirilmeli
- **Kenar Durum:** Giriş formu Submit sırasında devre dışı (disabled) bırakılmalı; çift gönderim engellenmeli

---

**Senaryo 2.1.4 — Hatalı Kimlik Bilgileriyle Giriş Denemesi**

- **Test Senaryosu:** Yanlış şifre ile giriş denemesinde hata mesajının UI'da görünmesi
- **Girdi/Durum:** Backend'den HTTP 401 yanıtı; "Geçersiz kimlik bilgileri" gibi hata mesajı
- **Beklenen Çıktı/Davranış:** Hata mesajı kullanıcıya gösterilmeli; token kaydedilmemeli; `/login` sayfasında kalınmalı
- **Kenar Durum:** Form alanları hata sonrası temizlenmemeli (şifre dışında)

---

**Senaryo 2.1.5 — `AuthContext` Durumu Sayfa Yenilenmesinde Korunması**

- **Test Senaryosu:** Sayfa yenilendiğinde `AuthContext`'in `localStorage`'dan token'ı okuyarak durumunu restore etmesi
- **Girdi/Durum:** `localStorage`'da geçerli admin token'ı mevcut; sayfa yenileniyor
- **Beklenen Çıktı/Davranış:** Kullanıcı tekrar login ekranına düşmemeli; korumalı sayfa doğrudan yüklenmeli
- **Kenar Durum:** `localStorage`'da bozuk (malformed) JWT string — parse hatası UI'ı kilitleme olmadan yönetilmeli

---

**Senaryo 2.1.6 — Çıkış İşlemi (Logout)**

- **Test Senaryosu:** Kullanıcı çıkış yaptığında `AuthContext`'in sıfırlanması ve rotanın temizlenmesi
- **Girdi/Durum:** Admin oturumu açık; logout butonu tıklanıyor
- **Beklenen Çıktı/Davranış:** `localStorage` temizlenmeli; `AuthContext.token = null`, `user = null`; kullanıcı `/login`'e yönlendirilmeli
- **Kenar Durum:** Logout sonrası tarayıcı geri tuşuyla korumalı sayfaya dönülemez olmalı

---

### 2.2 Dashboard İstatistik Kartları Testleri

---

**Senaryo 2.2.1 — İstatistik Kartlarının API Yanıtıyla Doğru Render Edilmesi**

- **Test Senaryosu:** `/api/panel/stats` endpoint'inden gelen verinin Dashboard istatistik kartlarına doğru yansıması
- **Girdi/Durum:** API yanıtı: `totalUsers: 42`, `totalAlarms: 15`, `unresolvedAlarms: 3`, `todayFalls: 2`, `totalSensorRecords: 1200`
- **Beklenen Çıktı/Davranış:** Her kart ilgili değeri göstermeli; `unresolvedAlarms` kartı kırmızı veya uyarı renginde vurgulanmalı (varsa)
- **Kenar Durum:** Tüm değerler 0 olduğunda kartlar boş değil `"0"` göstermeli

---

**Senaryo 2.2.2 — API Yüklenirken Yükleme Durumu (Loading State)**

- **Test Senaryosu:** `/api/panel/stats` isteği beklemedeyken UI'ın loading durumunu göstermesi
- **Girdi/Durum:** API yanıtı kasıtlı olarak geciktiriliyor (mock/stub)
- **Beklenen Çıktı/Davranış:** Kartlarda skeleton loader veya spinner görünmeli; değer alanları undefined/null göstermemeli
- **Kenar Durum:** —

---

**Senaryo 2.2.3 — API Hatası Durumunda Graceful Degradation**

- **Test Senaryosu:** `/api/panel/stats` endpoint'i HTTP 500 döndürdüğünde Dashboard'un çökmemesi
- **Girdi/Durum:** Mock API HTTP 500 ile yanıt veriyor
- **Beklened Çıktı/Davranış:** Hata mesajı gösterilmeli; sayfa beyaz ekrana (uncaught error) dönmemeli
- **Kenar Durum:** Ağ bağlantısı tamamen kesildiğinde (network error) aynı graceful degradation uygulanmalı

---

**Senaryo 2.2.4 — Dashboard Sayfasında `RecentAlarms` Listesinin Render Edilmesi**

- **Test Senaryosu:** `/api/panel/recent-alarms` endpoint'inden gelen 10 alarm verisinin liste bileşeninde doğru gösterilmesi
- **Girdi/Durum:** 10 alarm kaydı içeren API yanıtı; karışık çözülmüş/çözülmemiş durumlar
- **Beklenen Çıktı/Davranış:** 10 alarm kartı render edilmeli; her alarm `alarmType`, `severity`, `isResolved` bilgilerini göstermeli; çözülmemiş alarmlar önce listelenmeli
- **Kenar Durum:** Alarm listesi boş gelirse "alarm yok" gibi empty state mesajı gösterilmeli

---

### 2.3 Sensör Grafiği (SensorChart) Testleri

---

**Senaryo 2.3.1 — Zaman Aralığı Filtresinin API İsteğine Yansıması**

- **Test Senaryosu:** Kullanıcı `hours` filtresi değiştirdiğinde API'ye gönderilen isteğin `?hours=` parametresini doğru içermesi
- **Girdi/Durum:** Dropdown'dan `hours=6` seçiliyor
- **Beklened Çıktı/Davranış:** API çağrısı `GET /api/panel/sensor-chart?hours=6` şeklinde yapılmalı; grafik yeni veriyle güncellenmeli
- **Kenar Durum:** `hours` değeri 24'ten büyük girilirse (manuel URL manipülasyonu) backend 1–24 aralığına clamp etmeli

---

**Senaryo 2.3.2 — Cihaz ID Filtresiyle Grafik Güncellenmesi**

- **Test Senaryosu:** Belirli bir `deviceId` seçildiğinde grafiğin yalnızca o cihazın verilerini göstermesi
- **Girdi/Durum:** `deviceId="phone-123"` filtresi seçiliyor; API yanıtında sadece bu cihazın verileri
- **Beklenen Çıktı/Davranış:** Recharts grafiği yalnızca `phone-123` verilerini çizmeli; diğer cihaz verileri görünmemeli
- **Kenar Durum:** Seçilen cihazın o zaman aralığında verisi yoksa grafik boş olmalı ve kullanıcıya bilgi verilmeli

---

**Senaryo 2.3.3 — İvmeölçer ve Jiroskop Serilerinin Aynı Anda Görüntülenmesi**

- **Test Senaryosu:** Grafik bileşeninin hem `accelerometer.magnitude` hem de `gyroscopeMagnitude` değerlerini ayrı seriler olarak çizmesi
- **Girdi/Durum:** API yanıtında her iki alan da dolu veri noktaları var
- **Beklened Çıktı/Davranış:** Recharts'ta iki farklı `<Line>` bileşeni render edilmeli; iki seri birbirinden ayırt edilebilir renkte olmalı
- **Kenar Durum:** Bazı veri noktalarında `gyroscopeMagnitude` alanı yoksa grafik o noktada kopmamalı (null-safe)

---

**Senaryo 2.3.4 — Düşme Tespit Noktalarının Grafik Üzerinde İşaretlenmesi**

- **Test Senaryosu:** `isFallDetected: true` olan veri noktalarının grafik üzerinde görsel olarak belirtilmesi
- **Girdi/Durum:** API yanıtında bazı noktalar `isFallDetected: true`
- **Beklenen Çıktı/Davranış:** Bu noktalarda referans çizgisi, işaret simgesi veya renk değişimi görünmeli
- **Kenar Durum:** Tüm noktalar `isFallDetected: false` ise herhangi bir işaret olmamalı

---

**Senaryo 2.3.5 — Boş Veri Durumunda Grafik Davranışı**

- **Test Senaryosu:** Seçilen zaman aralığında hiç sensör verisi bulunmadığında grafiğin çökmemesi
- **Girdi/Durum:** API `count: 0`, `data: []` döndürüyor
- **Beklened Çıktı/Davranış:** "Bu aralıkta veri yok" gibi bilgilendirici mesaj gösterilmeli; Recharts render hatası olmamalı
- **Kenar Durum:** —

---

**Senaryo 2.3.6 — Çok Fazla Veri Noktası ile Grafik Performansı**

- **Test Senaryosu:** 24 saatlik aralıkta binlerce veri noktası olduğunda grafiğin render edilebilir kalması
- **Girdi/Durum:** API `data` dizisi 10.000+ eleman içeriyor
- **Beklenen Çıktı/Davranış:** Grafik yanıt verebilir durumda kalmalı; UI donmamalı (mümkünse veri örneklemesi veya sayfalama uygulanmalı)
- **Kenar Durum:** —

---

### 2.4 Socket.IO Gerçek Zamanlı Event Testleri

---

**Senaryo 2.4.1 — `device_status` Event'inin Grafik State'ini Güncellemesi**

- **Test Senaryosu:** Backend'den gelen `device_status` Socket.IO event'inin, SensorChart bileşenindeki anlık veri state'ine eklenmesi
- **Girdi/Durum:** `{ deviceId: "phone-123", magnitude: 1.23, gyroscopeMagnitude: 0.45, timestamp: "..." }` event'i emit ediliyor
- **Beklenen Çıktı/Davranış:** Grafik, yeni veri noktasını saniyeler içinde eklemeli; sayfa yenilemesi gerekmemeli
- **Kenar Durum:** Saniyede çok sayıda event geldiğinde (flood) UI donmamalı; debounce veya throttle uygulanıyorsa test edilmeli

---

**Senaryo 2.4.2 — `fall_detected` Event'inin Dashboard'da Görsel Uyarı Tetiklemesi**

- **Test Senaryosu:** Backend'den `fall_detected` event'i geldiğinde Dashboard'da acil durum bildirimi, toast/banner veya alarm vurgusu gösterilmesi
- **Girdi/Durum:** `{ alarmId: "abc123", fallScore: 0.91, detectionMethod: "ai-model", countdownSec: 10 }` event'i
- **Beklenen Çıktı/Davranış:** Kullanıcı uyarısı gösterilmeli; alarm ID Dashboard'daki son alarmlar listesine eklenmeli ya da güncellenmeli
- **Kenar Durum:** Panelde aktif sekme yokken (arka planda) event geldiğinde sekmeye dönüldüğünde uyarı hâlâ görünmeli

---

**Senaryo 2.4.3 — `emergency_alert` Event'inin Hareketsizlik Alarmını UI'a Yansıtması**

- **Test Senaryosu:** `emergency_alert` event'inin `type: "inactivity"` içermesi durumunda düşme bildirimi yerine hareketsizlik bildirimi gösterilmesi
- **Girdi/Durum:** `{ alarmId: "xyz789", type: "inactivity" }` event'i
- **Beklened Çıktı/Davranış:** UI'da alarm türüne uygun mesaj gösterilmeli ("Düşme Alarmı" yerine "Hareketsizlik Alarmı")
- **Kenar Durum:** Aynı `alarmId` için tekrarlanan event geldiğinde duplicate uyarı gösterilmemeli

---

**Senaryo 2.4.4 — `alarm_resolved` Event'inin Alarm Listesini Güncellemesi**

- **Test Senaryosu:** Kullanıcı mobil uygulamadan alarmı kapattığında panele gelen `alarm_resolved` event'i ile ilgili alarm kartının resolved olarak güncellenmesi
- **Girdi/Durum:** `{ alarmId: "abc123", resolvedBy: "user", alarmType: "fall" }` event'i
- **Beklenen Çıktı/Davranış:** İlgili alarm kartı "Çözüldü" olarak işaretlenmeli veya listeden kaldırılmalı; sayfa yenilenmeden
- **Kenar Durum:** `alarmId` panelin mevcut listesinde yoksa (henüz yüklenmemişse) event sessizce görmezden gelinmeli

---

**Senaryo 2.4.5 — Socket Bağlantı Kesilmesinde ve Yeniden Bağlanmada Panel Davranışı**

- **Test Senaryosu:** Socket bağlantısı geçici olarak kesildiğinde ve yeniden kurulduğunda panelin düzgün çalışmaya devam etmesi
- **Girdi/Durum:** `disconnect` event'i tetikleniyor; ardından `connect` event'i
- **Beklened Çıktı/Davranış:** Bağlantı durumu göstergesi varsa güncellenmeli; yeniden bağlanma sonrası event dinleme yeniden aktif olmalı; çift listener eklenmemeli
- **Kenar Durum:** Bağlantı kesildiğinde arabelleğe alınan event'ler yeniden bağlanmada işlenmeli veya veriler REST API ile yenilenmeli

---

### 2.5 Alarm Geçmişi Sayfası Testleri

---

**Senaryo 2.5.1 — Alarm Listesinin API'den Alınarak Render Edilmesi**

- **Test Senaryosu:** `AlarmHistoryPage` yüklendiğinde `/api/panel/recent-alarms` çağrısının yapılması ve verilerin listelenmesi
- **Girdi/Durum:** API 10 alarm kaydı döndürüyor; her birinde `alarmType`, `severity`, `isResolved`, `message` alanları mevcut
- **Beklened Çıktı/Davranış:** 10 alarm kartı render edilmeli; çözülmemiş alarmlar önce gösterilmeli (sıralama mantığı kontrol)
- **Kenar Durum:** —

---

**Senaryo 2.5.2 — Alarmın Resolve Edilmesi (UI Güncelleme)**

- **Test Senaryosu:** Alarm kartındaki "Çöz" butonu tıklandığında `PATCH /api/alarms/:id/resolve` isteğinin yapılması ve kartın durumunun güncellenmesi
- **Girdi/Durum:** Çözülmemiş alarm kartında resolve butonu tıklanıyor
- **Beklened Çıktı/Davranış:** API isteği başarılıysa kart "Çözüldü" olarak güncellenmeli; button disabled hale gelmeli veya kaldırılmalı
- **Kenar Durum:** API isteği başarısız olursa hata mesajı gösterilmeli; kart durumu değişmemeli

---

**Senaryo 2.5.3 — `alarmType`'a Göre Farklı Görsel Stil**

- **Test Senaryosu:** `alarmType: "fall"` ve `alarmType: "inactivity"` alarmlarının farklı renk veya ikonla ayrıştırılması
- **Girdi/Durum:** Listede karışık türde alarmlar mevcut
- **Beklened Çıktı/Davranış:** Düşme alarmları (kırmızı/turuncu), hareketsizlik alarmları (sarı/mor) gibi ayırt edici stil uygulanmalı
- **Kenar Durum:** —

---

### 2.6 Cihaz Listesi Sayfası Testleri

---

**Senaryo 2.6.1 — Çevrimiçi/Çevrimdışı Durum Göstergesi**

- **Test Senaryosu:** `isOnline` alanının (son 5 dakikada veri geldiyse `true`) cihaz kartında doğru yansıtılması
- **Girdi/Durum:** API yanıtında bir cihaz `isOnline: true`, diğeri `isOnline: false`
- **Beklened Çıktı/Davranış:** Çevrimiçi cihaz yeşil/aktif göstergeli; çevrimdışı cihaz kırmızı/pasif göstergeli
- **Kenar Durum:** `lastSeen` değeri 4 dakika 59 saniye önce → `isOnline: true`; tam 5 dakika → `isOnline: false`

---

**Senaryo 2.6.2 — Cihaz Düşme Sayısının Doğru Gösterilmesi**

- **Test Senaryosu:** `fallCount` alanının cihaz kartında sayısal olarak gösterilmesi
- **Girdi/Durum:** API aggregation yanıtında `fallCount: 7` olan bir cihaz
- **Beklenen Çıktı/Davranış:** Cihaz kartında "7 Düşme" veya benzeri etiket render edilmeli
- **Kenar Durum:** `fallCount: 0` durumunda "Hiç Düşme Yok" veya `0` gösterilmeli; undefined gösterilmemeli

---

---

## 3. Mobil Uygulama

> **Teknoloji Yığını:** React Native, Expo ~54, Expo Router, TypeScript, Socket.IO Client, AsyncStorage  
> **Test Türleri:** Birim (Unit), Entegrasyon (Integration), E2E/UI

---

### 3.1 Sensör Veri Toplama ve Pencereleme Testleri

---

**Senaryo 3.1.1 — 75 Örneklik Pencerenin Oluşturulması ve Gönderilmesi**

- **Test Senaryosu:** Sensörden 75 örnek biriktiğinde `sensor_window` event'inin oluşturulup Socket.IO ile gönderilmesi; 74 örnekte gönderim yapılmaması
- **Girdi/Durum:** Mock sensör, 50 Hz'de ivme ve jiroskop değerleri üretiyor
- **Beklened Çıktı/Davranış:** Her 75 örnekte tam olarak 1 kez `emitSensorWindow()` çağrılmalı; gönderilen payload içinde `readings` dizisinin uzunluğu 75 olmalı
- **Kenar Durum:** 74. örnekte bağlantı kesilirse tamamlanmamış pencere kuyruğa eklenmemeli ya da gönderilmemeli

---

**Senaryo 3.1.2 — `sampleRateHz` Değerinin Payload'da Doğru Yer Alması**

- **Test Senaryosu:** Gönderilen `sensor_window` payload'ında `sampleRateHz` değerinin tanımlanan örnekleme frekansıyla uyumlu olması
- **Girdi/Durum:** Sensör 20 ms örnekleme aralığıyla çalışıyor (50 Hz)
- **Beklenen Çıktı/Davranış:** `payload.sampleRateHz === 50`
- **Kenar Durum:** Cihazın CPU yükü yüksekken gerçek örnekleme frekansı düşebilir; bu durum payload değerini etkilememeli

---

**Senaryo 3.1.3 — `windowStart` ve `windowEnd` Zaman Damgalarının Doğruluğu**

- **Test Senaryosu:** Pencerenin başlangıç ve bitiş zaman damgalarının pencerenin ilk ve son okumasına karşılık gelmesi
- **Girdi/Durum:** 75 okuma; ilk okumanın timestamp'ı `T0`, son okumanın timestamp'ı `T74`
- **Beklened Çıktı/Davranış:** `windowStart = T0`, `windowEnd = T74`; zaman damgaları geçerli ISO 8601 formatında
- **Kenar Durum:** `windowStart > windowEnd` olmamalı; zaman geri gitmemeli

---

**Senaryo 3.1.4 — Sensör İzni Reddedildiğinde Hata Yönetimi**

- **Test Senaryosu:** Kullanıcı sensör iznini reddettiğinde uygulamanın çökmeden uyarı vermesi
- **Girdi/Durum:** `permissions.ts` izin isteği; kullanıcı "İzin Verme" seçiyor
- **Beklened Çıktı/Davranış:** Kullanıcıya sensör izni gerektiği açıklanmalı; uygulama çökmemeli; sensör dinleyicisi başlatılmamalı
- **Kenar Durum:** İzin reddedilip daha sonra ayarlardan verildiğinde uygulamanın sensörü başlatıp başlatmadığı

---

**Senaryo 3.1.5 — Sensör Verisinin Payload Formatıyla Uyumluluğu**

- **Test Senaryosu:** Expo Sensors API'sinden alınan ham değerlerin `SensorReading` interface'ine uygun şekilde dönüştürülmesi
- **Girdi/Durum:** Expo ivmeölçer: `{ x: 0.5, y: 9.8, z: 0.1 }` (g birimi); Expo jiroskop: `{ x: 0.02, y: -0.01, z: 0.00 }` (rad/s)
- **Beklened Çıktı/Davranış:** `readings[i].accelerometer = { x: 0.5, y: 9.8, z: 0.1 }`, `readings[i].gyroscope = { x: 0.02, y: -0.01, z: 0.00 }`; timestamp mevcut
- **Kenar Durum:** Jiroskop değerleri backend'e rad/s olarak iletilmeli; dönüşüm backend/AI servisinde yapılmalı (mobil tarafta dönüşüm yapılmamalı)

---

### 3.2 Çevrimdışı Kuyruk (Offline Queue) Testleri

---

**Senaryo 3.2.1 — Bağlantısız Durumda Pencerenin Kuyruğa Eklenmesi**

- **Test Senaryosu:** Socket bağlantısı yokken `emitSensorWindow()` çağrıldığında verinin `offlineQueue` dizisine eklenmesi
- **Girdi/Durum:** `socket.connected = false`; `emitSensorWindow()` çağrılıyor
- **Beklened Çıktı/Davranış:** Fonksiyon `false` dönmeli; `offlineQueue.length` 1 artmalı; gönderim yapılmamalı
- **Kenar Durum:** Aynı anda birden fazla pencere kuyruğa eklenirse sıra bozulmamalı (FIFO korunmalı)

---

**Senaryo 3.2.2 — Kuyruk Dolunca FIFO ile Eski Verinin Silinmesi**

- **Test Senaryosu:** `offlineQueue` 100 elemana ulaştığında 101. pencere eklenirken en eski (ilk) elemanın silinmesi
- **Girdi/Durum:** Kuyrukta tam 100 eleman; `emitSensorWindow()` tekrar çağrılıyor (bağlantı yok)
- **Beklened Çıktı/Davranış:** `offlineQueue.shift()` çağrılarak en eski eleman çıkarılmalı; 101. pencere kuyruğa eklenebilmeli; `offlineQueue.length === 100`
- **Kenar Durum:** Kuyruk 101 elemana çıkmamalı; kayıp verinin kullanıcıya gösterilmesi (opsiyonel)

---

**Senaryo 3.2.3 — Bağlantı Yeniden Kurulduğunda Kuyruğun Boşaltılması**

- **Test Senaryosu:** Socket `connect` event'i tetiklendiğinde `flushOfflineQueue()` fonksiyonunun çağrılması ve tüm kuyruğun sırasıyla gönderilmesi
- **Girdi/Durum:** Kuyrukta 5 pencere mevcut; Socket bağlantısı yeniden kuruluyor
- **Beklened Çıktı/Davranış:** Her pencere için `socket.emit("sensor_window", ...)` sırasıyla çağrılmalı; kuyruk boşalmalı (`offlineQueue.length === 0`); `queueListeners` bildirim almalı
- **Kenar Durum:** Boşaltma sırasında bağlantı tekrar kesilirse geri kalan elemanlar kaybolmamalı veya yeniden kuyruğa alınmalı

---

**Senaryo 3.2.4 — Bağlantılıyken Kuyruğa Eklenmeme**

- **Test Senaryosu:** Socket bağlı durumdayken `emitSensorWindow()` çağrıldığında kuyruğa ekleme yapılmadan doğrudan emit yapılması
- **Girdi/Durum:** `socket.connected = true`; `emitSensorWindow()` çağrılıyor
- **Beklened Çıktı/Davranış:** Fonksiyon `true` dönmeli; `socket.emit("sensor_window", ...)` çağrılmalı; `offlineQueue` değişmemeli
- **Kenar Durum:** —

---

**Senaryo 3.2.5 — Kuyruk Boyutu Değişiminin `queueListeners`'a Bildirimi**

- **Test Senaryosu:** Kuyruk boyutu her değiştiğinde `onOfflineQueueChange` ile kaydedilen callback'lerin tetiklenmesi
- **Girdi/Durum:** `onOfflineQueueChange(fn)` ile bir listener kaydediliyor; ardından kuyruk uzuyor
- **Beklened Çıktı/Davranış:** `fn` her ekleme ve boşaltma sonrası güncel `offlineQueue.length` ile çağrılmalı
- **Kenar Durum:** Listener kaldırıldıktan (unsubscribe) sonra kuyruk değişse de `fn` çağrılmamalı

---

**Senaryo 3.2.6 — Boş Kuyrukta `flushOfflineQueue` Çağrısı**

- **Test Senaryosu:** Kuyruk boşken `flushOfflineQueue()` çağrıldığında hata fırlatılmaması
- **Girdi/Durum:** `offlineQueue.length === 0`; socket bağlı
- **Beklened Çıktı/Davranış:** Fonksiyon sessizce tamamlanmalı; `socket.emit` çağrılmamalı
- **Kenar Durum:** —

---

### 3.3 Socket.IO Alarm Event UI Testleri

---

**Senaryo 3.3.1 — `fall_detected` Event'inde Geri Sayım Alarm Ekranının Açılması**

- **Test Senaryosu:** Backend'den `fall_detected` event'i geldiğinde uygulamanın alarm modali/ekranını açması ve geri sayımı başlatması
- **Girdi/Durum:** `{ alarmId: "abc", fallScore: 0.91, countdownSec: 10 }` event'i alınıyor
- **Beklened Çıktı/Davranış:** Alarm ekranı render edilmeli; geri sayım `countdownSec` değerinden başlamalı (10); "İyiyim (İptal Et)" ve "Yardım Çağır" butonları görünmeli
- **Kenar Durum:** Uygulama arka plandayken event geldiğinde ön plana alınmalı veya bildirim gösterilmeli

---

**Senaryo 3.3.2 — Geri Sayım Tamamlandığında Akış**

- **Test Senaryosu:** Kullanıcı 10 saniyelik geri sayım boyunca "İyiyim" butonuna basmadığında sistemin alarm onay durumunu yönetmesi
- **Girdi/Durum:** Geri sayım `10 → 0` ilerliyor; kullanıcı etkileşim yok
- **Beklened Çıktı/Davranış:** Geri sayım 0'a ulaştığında alarm "onaylanmış" olarak işaretlenmeli; UI kullanıcıya alarm gönderildiğini bildirmeli
- **Kenar Durum:** —

---

**Senaryo 3.3.3 — "İyiyim" Butonuna Basıldığında `fall_cancel` Event Gönderilmesi**

- **Test Senaryosu:** Kullanıcı alarm geri sayım ekranında "İyiyim" butonuna bastığında `emitFallCancel(alarmId)` çağrılması
- **Girdi/Durum:** Alarm ekranı açık; kullanıcı butona basıyor
- **Beklened Çıktı/Davranış:** `socket.emit("fall_cancel", { alarmId: "abc" })` gönderilmeli; alarm ekranı kapanmalı; kullanıcı normal ekrana dönmeli
- **Kenar Durum:** Butona basılı tutulduğunda ya da hızlı çift tıklandığında yalnızca bir kez emit yapılmalı

---

**Senaryo 3.3.4 — "İyiyim" Basıldığında Socket Bağlı Değilse Davranış**

- **Test Senaryosu:** Alarm ekranında "İyiyim" butonuna basıldığı anda socket bağlantısı yoksa sistemin durumu yönetmesi
- **Girdi/Durum:** `socket.connected = false`; kullanıcı "İyiyim" butonuna basıyor
- **Beklened Çıktı/Davranış:** `emitFallCancel()` sessizce tamamlanmalı (emit çalışmaz); kullanıcıya bağlantı sorunu bildirilebilir; alarm ekranı hâlâ kapatılmalı
- **Kenar Durum:** Kullanıcı iyi olmasına rağmen backend alarm iptalini alamayabilir; bu durum için akış tasarımı gözden geçirilmeli

---

**Senaryo 3.3.5 — `inactivity_pre_alarm` Event'inde Hareketsizlik Geri Sayımının Açılması**

- **Test Senaryosu:** Backend'den `inactivity_pre_alarm` event'i geldiğinde uygulamanın "Ben Buradayım" geri sayım bildirimini göstermesi
- **Girdi/Durum:** `{ countdownSec: 60 }` event'i alınıyor
- **Beklened Çıktı/Davranış:** Farklı bir UI bileşeni (düşme alarmından ayrı) açılmalı; 60 saniyelik geri sayım başlamalı; "Ben Buradayım" butonu görünmeli
- **Kenar Durum:** Hareketsizlik pre-alarm açıkken aynı anda `fall_detected` event'i gelirse öncelik sıralaması belirlenmeli

---

**Senaryo 3.3.6 — "Ben Buradayım" Butonunda `inactivity_cancel` Event Gönderilmesi**

- **Test Senaryosu:** Hareketsizlik geri sayım ekranında butona basıldığında `emitInactivityCancel()` çağrılması
- **Girdi/Durum:** Hareketsizlik pre-alarm ekranı açık; kullanıcı "Ben Buradayım" butonuna basıyor
- **Beklened Çıktı/Davranış:** `socket.emit("inactivity_cancel")` gönderilmeli; geri sayım ekranı kapanmalı
- **Kenar Durum:** —

---

**Senaryo 3.3.7 — `inactivity_cancelled` Event Geldiğinde Otomatik Ekran Kapatma**

- **Test Senaryosu:** Backend'den `inactivity_cancelled` event'i geldiğinde (hareket tespit edildiğinde) geri sayım ekranının otomatik kapanması
- **Girdi/Durum:** `inactivity_pre_alarm` ekranı açık; `inactivity_cancelled` event'i alınıyor
- **Beklened Çıktı/Davranış:** Ekran otomatik kapanmalı; kullanıcıdan bir işlem beklenmemeli
- **Kenar Durum:** `_cancelled: true` bayrağı socket servisinde özel bir flag olarak gönderiliyor; bu flag'in listener'da doğru işlenmesi

---

**Senaryo 3.3.8 — `emergency_alert` Event'inin Onay Sonrası Acil Durum Ekranını Göstermesi**

- **Test Senaryosu:** Hareketsizlik veya düşme CONFIRMED sonrası gelen `emergency_alert` event'inin kalıcı bir acil durum ekranını tetiklemesi
- **Girdi/Durum:** `{ alarmId: "xyz", type: "inactivity" }` event'i alınıyor; pre-alarm süresi dolmuş
- **Beklened Çıktı/Davranış:** Kalıcı (geri sayımsız) acil durum ekranı gösterilmeli; kullanıcı bilgilendirilmeli; REST API ile alarm kapatılabilmeli
- **Kenar Durum:** —

---

### 3.4 JWT ve AsyncStorage Testleri

---

**Senaryo 3.4.1 — Başarılı Girişte Token'ın AsyncStorage'a Kaydedilmesi**

- **Test Senaryosu:** Login API'sinden başarılı yanıt geldiğinde JWT token'ın AsyncStorage'a yazılması
- **Girdi/Durum:** API `{ token: "jwt.abc.def", user: {...} }` yanıtı döndürüyor
- **Beklened Çıktı/Davranış:** `AsyncStorage.setItem("token", "jwt.abc.def")` çağrılmalı; mock AsyncStorage'da değer mevcut olmalı
- **Kenar Durum:** AsyncStorage yazma hatası fırlarsa kullanıcıya hata gösterilmeli; oturum stateye kaydedilmemeli

---

**Senaryo 3.4.2 — Uygulama Yeniden Açıldığında Token'ın Okunması**

- **Test Senaryosu:** Uygulama başlatıldığında AsyncStorage'daki token'ın okunarak kullanıcı oturumunun restore edilmesi
- **Girdi/Durum:** `AsyncStorage`'da geçerli bir token mevcut; uygulama yeniden açılıyor
- **Beklened Çıktı/Davranış:** Kullanıcı login ekranına düşmemeli; token otomatik olarak Socket.IO bağlantısı ve API isteklerinde kullanılmalı
- **Kenar Durum:** Token mevcut ama süresi dolmuşsa backend 401 döndürmeli; bu durumda kullanıcı login ekranına yönlendirilmeli

---

**Senaryo 3.4.3 — Çıkışta Token'ın AsyncStorage'dan Silinmesi**

- **Test Senaryosu:** Kullanıcı çıkış yaptığında AsyncStorage'daki token'ın temizlenmesi
- **Girdi/Durum:** Kullanıcı profil ekranından veya menüden çıkış yapıyor
- **Beklened Çıktı/Davranış:** `AsyncStorage.removeItem("token")` çağrılmalı; uygulama state'inden kullanıcı bilgisi temizlenmeli; Socket bağlantısı kapatılmalı
- **Kenar Durum:** Çıkış sonrası geri tuşuyla korumalı ekrana ulaşılamamalı

---

**Senaryo 3.4.4 — AsyncStorage'da Bozuk Token Verisi**

- **Test Senaryosu:** `AsyncStorage`'da JSON parse edilemeyen veya geçersiz bir değer varken uygulamanın çökmeden login ekranına yönlendirmesi
- **Girdi/Durum:** `AsyncStorage.getItem("token")` → `"INVALID_TOKEN_###"` döndürüyor
- **Beklened Çıktı/Davranış:** Parse hatası yakalanmalı; bozuk değer silinmeli; kullanıcı login ekranına yönlendirilmeli; uygulama çökmemeli
- **Kenar Durum:** `null` dönen AsyncStorage değeri de login ekranına yönlendirmeli

---

**Senaryo 3.4.5 — Socket Bağlantısında Token'ın `auth` Parametresine Aktarılması**

- **Test Senaryosu:** `connectSocket()` çağrısında `getToken()` sonucunun `io(BASE_URL, { auth: { token } })` parametresine doğru aktarılması
- **Girdi/Durum:** `AsyncStorage`'da geçerli token mevcut
- **Beklened Çıktı/Davranış:** `io()` çağrısının `auth.token` parametresinde token değeri bulunmalı; backend JWT doğrulama başarılı olmalı
- **Kenar Durum:** Token `null` ise socket bağlantısı kurulmamalı veya `auth.token = null` ile bağlantı denenmeli; backend kimlik doğrulama hatası vermeli

---

### 3.5 Profil ve Acil Durum Kişisi Yönetimi Testleri

---

**Senaryo 3.5.1 — Profil Tipinin API'ye Kaydedilmesi**

- **Test Senaryosu:** Profil ekranında kullanıcı `profileType` olarak "elderly" seçtiğinde `PUT /api/auth/profile` isteğinin doğru payload ile gönderilmesi
- **Girdi/Durum:** Dropdown'dan "Yaşlı (Elderly)" seçiliyor; kaydet butonuna basılıyor
- **Beklened Çıktı/Davranış:** API isteği `{ profileType: "elderly" }` içermeli; başarı mesajı gösterilmeli
- **Kenar Durum:** Geçersiz bir profileType değeri (örn. frontend doğrulama atlanırsa) — backend enum doğrulaması devreye girmeli

---

**Senaryo 3.5.2 — Uyku Takviminin API'ye Kaydedilmesi**

- **Test Senaryosu:** `sleepSchedule.nightStart` ve `nightEnd` değerlerinin saat formatı `HH:MM` olarak kaydedilmesi
- **Girdi/Durum:** Gece başlangıcı `22:30`, bitiş `06:30` girilip kaydediliyor
- **Beklened Çıktı/Davranış:** API isteği `{ sleepSchedule: { nightStart: "22:30", nightEnd: "06:30" } }` içermeli
- **Kenar Durum:** `nightStart: "25:00"` gibi geçersiz saat — frontend doğrulaması ile engellenmeli

---

**Senaryo 3.5.3 — Acil Durum Kişisi Bilgilerinin Kaydedilmesi ve Gösterilmesi**

- **Test Senaryosu:** Acil durum kişisi adı ve telefon numarasının API'ye gönderilmesi ve profil sayfasında görüntülenmesi
- **Girdi/Durum:** İsim: "Ahmet Yılmaz", Telefon: "+90 555 123 4567"; kaydet butonu tıklanıyor
- **Beklened Çıktı/Davranış:** `{ emergencyContactName: "Ahmet Yılmaz", emergencyContactPhone: "+90 555 123 4567" }` API'ye gönderilmeli; profil sayfası güncellenen değeri göstermeli
- **Kenar Durum:** Telefon alanına harf girilmesi; API doğrulama hatası varsa uygun mesaj gösterilmeli

---

---

## Özet Tablo

| Modül | Senaryo Sayısı | Birim | Entegrasyon | UI/E2E |
|-------|:--------------:|:-----:|:-----------:|:------:|
| **ai-service** | 26 | 20 | 6 | — |
| **web-panel** | 25 | 5 | 10 | 10 |
| **mobile** | 25 | 8 | 10 | 7 |
| **Toplam** | **76** | **33** | **26** | **17** |

---

> **Öncelik Sıralaması Önerisi:**
> 1. **Yüksek Öncelik:** 1.4.* (Eşik sınır testleri), 1.5.1 (Model yüklenememe), 3.2.2 (Kuyruk FIFO), 3.3.3 ("İyiyim" flow), 2.1.2 (Admin rota koruması)
> 2. **Orta Öncelik:** 1.3.* (Öznitelik doğruluğu), 2.4.* (Socket event UI), 3.4.* (JWT/AsyncStorage)
> 3. **Düşük Öncelik:** 2.3.6 (Büyük veri performansı), 3.5.* (Profil yönetimi)
