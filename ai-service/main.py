from datetime import datetime, timezone
from typing import List, Optional

from fastapi import FastAPI
from pydantic import BaseModel

from services.predictor import is_model_loaded, predict

# Düşme olarak işaretlemek için gereken minimum olasılık eşiği.
# Test sırasında hassasiyete göre ayarlanabilir (0.0 – 1.0).
FALL_PROBABILITY_THRESHOLD = 0.85


class Axis3D(BaseModel):
    x: float
    y: float
    z: float


class SensorReading(BaseModel):
    timestamp: str
    accelerometer: Axis3D
    gyroscope: Axis3D


class SensorWindowPayload(BaseModel):
    userId: str
    deviceId: str
    windowStart: str
    windowEnd: str
    sampleRateHz: float
    readings: List[SensorReading]
    # Backend tarafından eklenir; mobil app göndermez
    profile: Optional[str] = None


class PredictResponse(BaseModel):
    prediction: int      # Ham model çıktısı: 0 = düşme yok, 1 = düşme
    probability: float   # Düşme sınıfı olasılığı (0.0 – 1.0)
    is_fall: bool        # prediction == 1 VE probability >= FALL_PROBABILITY_THRESHOLD
    timestamp: str       # ISO 8601 UTC zaman damgası


app = FastAPI(title="CatchMe AI Service", version="1.0.0")


@app.get("/health")
def health():
    model_loaded = is_model_loaded()
    return {
        "status": "ok" if model_loaded else "degraded",
        "service": "catchme-ai-service",
        "modelLoaded": model_loaded,
        "fallProbabilityThreshold": FALL_PROBABILITY_THRESHOLD,
    }


@app.post("/predict", response_model=PredictResponse)
def predict_fall(payload: SensorWindowPayload):
    raw = predict(payload.model_dump())
    prediction = int(raw["prediction"])
    probability = float(raw["probability"])
    is_fall = prediction == 1 and probability >= FALL_PROBABILITY_THRESHOLD

    return {
        "prediction": prediction,
        "probability": probability,
        "is_fall": is_fall,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
