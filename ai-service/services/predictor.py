import math
import os
import pickle

import numpy as np
import pandas as pd

_MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "fall_model.pkl")

try:
    with open(_MODEL_PATH, "rb") as _f:
        _model = pickle.load(_f)
    print(f"[Predictor] Model başarıyla yüklendi: {_MODEL_PATH}")
except Exception as _e:
    _model = None
    print(f"[Predictor] UYARI — model yüklenemedi: {_e}")

_SAFE_DEFAULT = {
    "prediction": 0,
    "probability": 0.0,
}


def is_model_loaded() -> bool:
    return _model is not None


_RAD_TO_DEG = 57.2958  # expo-sensors jiroskop rad/s verir; model derece/s ile eğitildi


def _smv_series(readings: list, sensor_key: str, scale: float = 1.0) -> list[float]:
    """Her okuma için Sinyal Büyüklük Vektörü (SMV = sqrt(x²+y²+z²)) listesi döner.

    scale: değerlere SMV hesabından önce uygulanacak çarpan (örn. rad→derece için 57.2958).
    """
    result = []
    for r in readings:
        s = r.get(sensor_key, {})
        x = float(s.get("x", 0)) * scale
        y = float(s.get("y", 0)) * scale
        z = float(s.get("z", 0)) * scale
        result.append(math.sqrt(x * x + y * y + z * z))
    return result


def predict(payload: dict) -> dict:
    """
    Node.js'ten gelen sensör penceresi payload'ı üzerinde düşme tahmini yapar.
    Tamamen stateless — threshold, state ve history bu fonksiyonda YOKTUR.

    Beklenen payload anahtarları:
      - readings: list[dict]  — accelerometer + gyroscope x/y/z içeren okuma listesi
      - profile: str | None   — "yasli" ise Yas_Grubu = 1, aksi hâlde 0

    Döndürülen sözleşme (raw):
      { prediction: int (0|1), probability: float (0-1) }
    """
    if _model is None:
        return _SAFE_DEFAULT.copy()

    readings = payload.get("readings", [])
    if not readings:
        return _SAFE_DEFAULT.copy()

    profile = payload.get("profile") or ""
    yas_grubu = 1 if profile == "yasli" else 0

    try:
        # İvmeölçer g biriminde gelir — dönüşüm gerekmez
        acc_smv = _smv_series(readings, "accelerometer")
        # Jiroskop rad/s gelir; model derece/s ile eğitildi → 57.2958 ile çarp
        gyro_smv = _smv_series(readings, "gyroscope", scale=_RAD_TO_DEG)

        acc_arr = np.array(acc_smv, dtype=float)
        gyro_arr = np.array(gyro_smv, dtype=float)

        acc_min = float(np.min(acc_arr))
        acc_max = float(np.max(acc_arr))
        acc_var = float(np.var(acc_arr))
        gyro_max = float(np.max(gyro_arr)) if len(gyro_arr) > 0 else 0.0
        gyro_var = float(np.var(gyro_arr)) if len(gyro_arr) > 0 else 0.0

        # pd.DataFrame kullanımı "X does not have valid feature names" uyarısını engeller
        features = pd.DataFrame(
            [{"Yas_Grubu": yas_grubu, "Acc_Min": acc_min, "Acc_Max": acc_max,
              "Acc_Var": acc_var, "Gyro_Max": gyro_max, "Gyro_Var": gyro_var}]
        )

        prediction = int(_model.predict(features)[0])
        proba = _model.predict_proba(features)[0]

        # Düşme sınıfı (1) için olasılık; model classes_ sırası 0,1 varsayılır
        fall_class_index = list(_model.classes_).index(1) if 1 in _model.classes_ else -1
        probability = float(proba[fall_class_index]) if fall_class_index >= 0 else float(max(proba))

        return {
            "prediction": prediction,
            "probability": probability,
        }

    except Exception as exc:
        print(f"[Predictor] Tahmin hatası: {exc}")
        return _SAFE_DEFAULT.copy()
