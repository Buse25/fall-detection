# CatchMe AI Service

Bu servis, backend'den gelen sensör pencereleri (`sensor_window`) için düşme/anomali tahmini üretmek üzere tasarlanmış bağımsız bir FastAPI servisidir. Şu anda stub modda çalışır ve her zaman \"düşme yok\" sonucu döndürür.

## Çalıştırma

```bash
uvicorn main:app --reload
```

## API

### `GET /health`

Sağlık kontrolü endpoint'i.

Örnek yanıt:

```json
{
  "status": "ok",
  "service": "catchme-ai-service"
}
```

### `POST /predict`

`SensorWindowPayload` formatında sensör verisi alır.

#### Input

```json
{
  "userId": "string",
  "deviceId": "string",
  "windowStart": "ISO8601",
  "windowEnd": "ISO8601",
  "sampleRateHz": 50,
  "readings": [
    {
      "timestamp": "ISO8601",
      "accelerometer": { "x": 0.1, "y": 0.2, "z": 0.3 },
      "gyroscope": { "x": 0.01, "y": 0.02, "z": 0.03 }
    }
  ]
}
```

#### Output

```json
{
  "isFallDetected": false,
  "fallScore": 0.0,
  "confidence": 0.0,
  "detectionMethod": "ai-model"
}
```

## AI geliştirici nereden başlamalı?

İlk adım olarak [`services/predictor.py`](services/predictor.py) dosyasındaki `predict` fonksiyonunu gerçek model çıkarımı yapacak şekilde doldur. Model dosyalarını `models/` altına koy ve dönüş sözleşmesini (`isFallDetected`, `fallScore`, `confidence`, `detectionMethod`) koru.
