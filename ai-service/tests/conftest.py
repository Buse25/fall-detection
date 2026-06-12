"""Shared pytest fixtures and payload helpers for ai-service tests."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from main import FALL_PROBABILITY_THRESHOLD, app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def threshold() -> float:
    return FALL_PROBABILITY_THRESHOLD


def make_reading(
    acc_x: float,
    acc_y: float,
    acc_z: float,
    gyro_x: float = 0.0,
    gyro_y: float = 0.0,
    gyro_z: float = 0.0,
    timestamp: str = "2026-06-12T10:00:00.000Z",
) -> dict:
    return {
        "timestamp": timestamp,
        "accelerometer": {"x": acc_x, "y": acc_y, "z": acc_z},
        "gyroscope": {"x": gyro_x, "y": gyro_y, "z": gyro_z},
    }


def make_payload(
    readings_count: int = 75,
    profile: str | None = None,
    readings: list[dict] | None = None,
) -> dict:
    if readings is None:
        readings = [
            make_reading(0.1, 0.2, 0.3, 0.01, 0.02, 0.03)
            for _ in range(readings_count)
        ]

    payload: dict = {
        "userId": "user-1",
        "deviceId": "device-1",
        "windowStart": "2026-06-12T10:00:00.000Z",
        "windowEnd": "2026-06-12T10:00:01.500Z",
        "sampleRateHz": 50,
        "readings": readings,
    }

    if profile is not None:
        payload["profile"] = profile

    return payload
