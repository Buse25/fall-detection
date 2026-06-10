from typing import List

from fastapi import FastAPI
from pydantic import BaseModel

from services.predictor import predict


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


class PredictResponse(BaseModel):
    isFallDetected: bool
    fallScore: float
    confidence: float
    detectionMethod: str


app = FastAPI(title="CatchMe AI Service", version="0.1.0")


@app.get("/health")
def health():
    return {"status": "ok", "service": "catchme-ai-service"}


@app.post("/predict", response_model=PredictResponse)
def predict_fall(payload: SensorWindowPayload):
    return predict(payload.model_dump())
