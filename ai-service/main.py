from typing import List, Optional

from fastapi import FastAPI
from pydantic import BaseModel

from services.predictor import is_model_loaded, predict


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
    isFallDetected: bool
    fallScore: float
    confidence: float
    detectionMethod: str


app = FastAPI(title="CatchMe AI Service", version="1.0.0")


@app.get("/health")
def health():
    model_loaded = is_model_loaded()
    return {
        "status": "ok" if model_loaded else "degraded",
        "service": "catchme-ai-service",
        "modelLoaded": model_loaded,
    }


@app.post("/predict", response_model=PredictResponse)
def predict_fall(payload: SensorWindowPayload):
    return predict(payload.model_dump())
