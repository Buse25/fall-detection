"""Senaryo 1.2 ve 1.5 — /predict endpoint ve hata yönetimi testleri."""

from __future__ import annotations

from datetime import datetime
from unittest.mock import MagicMock, patch

import numpy as np
import pandas as pd
import pytest

from services import predictor
from services.predictor import predict
from tests.conftest import make_payload, make_reading


class TestPredictEndpointSuccess:
    """1.2 — Başarılı /predict senaryoları."""

    def test_1_2_1_valid_payload_returns_expected_fields(self, client):
        """Geçerli payload → prediction, probability, is_fall, timestamp."""
        mock_result = {"prediction": 0, "probability": 0.12}

        with patch("main.predict", return_value=mock_result):
            response = client.post("/predict", json=make_payload())

        assert response.status_code == 200
        body = response.json()
        assert body["prediction"] in (0, 1)
        assert isinstance(body["probability"], float)
        assert 0.0 <= body["probability"] <= 1.0
        assert isinstance(body["is_fall"], bool)
        assert "timestamp" in body
        datetime.fromisoformat(body["timestamp"].replace("Z", "+00:00"))

    def test_1_2_1_edge_extreme_probabilities(self, client):
        """probability 0.0 ve 1.0 sınır değerleri geçerli yanıt döner."""
        for prob in (0.0, 1.0):
            with patch("main.predict", return_value={"prediction": int(prob), "probability": prob}):
                response = client.post("/predict", json=make_payload())

            assert response.status_code == 200
            assert response.json()["probability"] == pytest.approx(prob)

    def test_1_2_2_is_fall_false_when_prediction_one_but_probability_below_threshold(self, client):
        """prediction=1, probability=0.84 → is_fall false."""
        with patch("main.predict", return_value={"prediction": 1, "probability": 0.84}):
            response = client.post("/predict", json=make_payload())

        assert response.status_code == 200
        assert response.json()["is_fall"] is False

    def test_1_2_2_is_fall_false_when_prediction_zero_despite_high_probability(self, client):
        """prediction=0, probability=0.90 → is_fall false."""
        with patch("main.predict", return_value={"prediction": 0, "probability": 0.90}):
            response = client.post("/predict", json=make_payload())

        assert response.status_code == 200
        assert response.json()["is_fall"] is False

    def test_1_2_3_profile_yasli_sets_yas_grubu_one(self):
        """profile yasli → Yas_Grubu=1; diğer değerler → 0."""
        captured: list[pd.DataFrame] = []

        mock_model = MagicMock()
        mock_model.classes_ = np.array([0, 1])
        mock_model.predict_proba.return_value = np.array([[0.8, 0.2]])

        def capture_predict(features: pd.DataFrame):
            captured.append(features.copy())
            return np.array([0])

        mock_model.predict.side_effect = capture_predict

        with patch.object(predictor, "_model", mock_model):
            predict(make_payload(profile="yasli"))
            predict(make_payload(profile=None))
            predict(make_payload(profile="other"))

        assert captured[0]["Yas_Grubu"].iloc[0] == 1
        assert captured[1]["Yas_Grubu"].iloc[0] == 0
        assert captured[2]["Yas_Grubu"].iloc[0] == 0

    def test_1_2_3_edge_profile_yasli_case_sensitive(self):
        """profile YASLI büyük harf → Yas_Grubu=0 (case-sensitive)."""
        captured: list[pd.DataFrame] = []

        mock_model = MagicMock()
        mock_model.classes_ = np.array([0, 1])
        mock_model.predict_proba.return_value = np.array([[0.8, 0.2]])
        mock_model.predict.side_effect = lambda df: (captured.append(df.copy()), np.array([0]))[1]

        with patch.object(predictor, "_model", mock_model):
            predict(make_payload(profile="YASLI"))

        assert captured[0]["Yas_Grubu"].iloc[0] == 0

    def test_1_2_4_empty_readings_returns_safe_default(self, client):
        """readings: [] → prediction 0, probability 0.0, is_fall false."""
        response = client.post("/predict", json=make_payload(readings=[]))

        assert response.status_code == 200
        body = response.json()
        assert body["prediction"] == 0
        assert body["probability"] == pytest.approx(0.0)
        assert body["is_fall"] is False

    def test_1_2_4_edge_missing_readings_field_returns_422(self, client):
        """readings alanı hiç gönderilmezse Pydantic 422."""
        payload = make_payload()
        del payload["readings"]

        response = client.post("/predict", json=payload)

        assert response.status_code == 422
        detail = response.json()["detail"]
        assert any("readings" in str(item.get("loc", "")) for item in detail)

    def test_1_2_5_single_reading_min_equals_max_variance_zero(self, client):
        """Tek okuma → Acc_Min == Acc_Max, Acc_Var = 0.0; HTTP 200."""
        readings = [make_reading(1.0, 0.0, 0.0)]
        response = client.post("/predict", json=make_payload(readings=readings))

        assert response.status_code == 200
        body = response.json()
        assert body["prediction"] in (0, 1)
        assert isinstance(body["probability"], float)


class TestPredictValidationErrors:
    """1.2.6 – 1.2.8 ve 1.5.5 — Doğrulama hataları."""

    @pytest.mark.parametrize(
        "missing_field",
        ["userId", "deviceId", "readings", "windowStart", "windowEnd"],
        ids=[
            "1.2.6-missing-userId",
            "1.2.6-missing-deviceId",
            "1.2.6-missing-readings",
            "1.2.6-missing-windowStart",
            "1.2.6-missing-windowEnd",
        ],
    )
    def test_1_2_6_missing_required_field_returns_422(self, client, missing_field: str):
        payload = make_payload()
        del payload[missing_field]

        response = client.post("/predict", json=payload)

        assert response.status_code == 422
        detail = response.json()["detail"]
        assert any(missing_field in str(item.get("loc", "")) for item in detail)

    def test_1_2_7_missing_accelerometer_z_at_api_returns_422(self, client):
        """API katmanında eksik z → Pydantic 422."""
        payload = make_payload(readings_count=1)
        del payload["readings"][0]["accelerometer"]["z"]

        response = client.post("/predict", json=payload)

        assert response.status_code == 422

    def test_1_2_7_predictor_fallback_missing_z_uses_zero(self):
        """predictor.py s.get('z', 0) fallback — doğrudan dict ile."""
        mock_model = MagicMock()
        mock_model.classes_ = np.array([0, 1])
        mock_model.predict.return_value = np.array([0])
        mock_model.predict_proba.return_value = np.array([[0.9, 0.1]])

        raw_payload = {
            "readings": [
                {
                    "timestamp": "2026-06-12T10:00:00.000Z",
                    "accelerometer": {"x": 3.0, "y": 4.0},
                    "gyroscope": {"x": 0.0, "y": 0.0, "z": 0.0},
                }
            ]
        }

        with patch.object(predictor, "_model", mock_model):
            result = predict(raw_payload)

        assert result["prediction"] == 0
        mock_model.predict.assert_called_once()

    def test_1_2_8_invalid_json_body_returns_422(self, client):
        """Bozuk JSON → HTTP 422, servis çökmez."""
        response = client.post(
            "/predict",
            content='{"userId": "abc"',
            headers={"Content-Type": "application/json"},
        )

        assert response.status_code == 422

    def test_1_2_8_edge_empty_body_returns_422(self, client):
        """Boş gövde → HTTP 422."""
        response = client.post(
            "/predict",
            content="",
            headers={"Content-Type": "application/json"},
        )

        assert response.status_code == 422

    def test_1_2_9_large_payload_with_ten_thousand_readings(self, client):
        """10.000 okuma içeren payload yanıt alabilmeli."""
        readings = [make_reading(0.1, 0.2, 0.3) for _ in range(10_000)]

        with patch("main.predict", return_value={"prediction": 0, "probability": 0.05}):
            response = client.post("/predict", json=make_payload(readings=readings))

        assert response.status_code == 200
        assert "prediction" in response.json()


class TestPredictErrorHandling:
    """1.5 — Hata yönetimi senaryoları."""

    def test_1_5_1_model_none_returns_safe_default(self, client):
        """_model=None → HTTP 200, güvenli varsayılan."""
        with patch.object(predictor, "_model", None):
            response = client.post("/predict", json=make_payload())

        assert response.status_code == 200
        body = response.json()
        assert body["prediction"] == 0
        assert body["probability"] == pytest.approx(0.0)
        assert body["is_fall"] is False

    def test_1_5_2_model_predict_raises_returns_safe_default(self, client):
        """model.predict() exception → _SAFE_DEFAULT, HTTP 200."""
        mock_model = MagicMock()
        mock_model.predict.side_effect = ValueError("unexpected failure")
        mock_model.classes_ = np.array([0, 1])

        with patch.object(predictor, "_model", mock_model):
            response = client.post("/predict", json=make_payload())

        assert response.status_code == 200
        body = response.json()
        assert body["prediction"] == 0
        assert body["probability"] == pytest.approx(0.0)
        assert body["is_fall"] is False
        assert "unexpected failure" not in response.text

    def test_1_5_3_classes_without_one_uses_max_proba(self):
        """classes_=[0] iken max(proba) kullanılır; IndexError yok."""
        mock_model = MagicMock()
        mock_model.classes_ = np.array([0])
        mock_model.predict.return_value = np.array([0])
        mock_model.predict_proba.return_value = np.array([[0.73]])

        with patch.object(predictor, "_model", mock_model):
            result = predict(make_payload(readings_count=3))

        assert result["probability"] == pytest.approx(0.73)
        assert result["prediction"] == 0

    def test_1_5_4_get_predict_returns_405(self, client):
        """GET /predict → HTTP 405 Method Not Allowed."""
        response = client.get("/predict")

        assert response.status_code == 405

    def test_1_5_5_non_numeric_accelerometer_x_returns_422(self, client):
        """accelerometer.x string → HTTP 422."""
        payload = make_payload(readings_count=1)
        payload["readings"][0]["accelerometer"]["x"] = "abc"

        response = client.post("/predict", json=payload)

        assert response.status_code == 422
        detail = response.json()["detail"]
        assert any("x" in str(item.get("loc", "")) for item in detail)

    def test_1_5_5_edge_null_accelerometer_x_returns_422(self, client):
        """accelerometer.x null → HTTP 422."""
        payload = make_payload(readings_count=1)
        payload["readings"][0]["accelerometer"]["x"] = None

        response = client.post("/predict", json=payload)

        assert response.status_code == 422
