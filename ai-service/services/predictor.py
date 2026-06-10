def predict(payload: dict) -> dict:
    """
    CatchMe AI tahmin stub'u.

    Bu fonksiyon AI geliştiricisi tarafından gerçek model çıkarımı ile
    değiştirilmelidir. Beklenen çalışma akışı:

    1) `payload["readings"]` içindeki 1.5-2 saniyelik pencereyi al
       (her okuma: accelerometer + gyroscope x/y/z).
    2) Gerekli feature extraction adımlarını uygula
       (örn. magnitude, variance, frequency-domain features vb.).
    3) Eğitilmiş modeli yükle (models/ altında saklanacak)
       ve pencere için tahmin üret.
    4) Sonucu aşağıdaki sözleşmeye uygun döndür:
       {
         "isFallDetected": bool,
         "fallScore": float,      # model skoru / anomaly score
         "confidence": float,     # 0-1 arası güven
         "detectionMethod": "ai-model"
       }
    5) Hata durumunda güvenli default döndür (false/0 skor).
    """

    # Şimdilik sabit \"düşme yok\" sonucu
    return {
        "isFallDetected": False,
        "fallScore": 0.0,
        "confidence": 0.0,
        "detectionMethod": "ai-model",
    }
