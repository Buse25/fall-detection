"""Senaryo 1.4 — Olasılık eşiği sınır testleri."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from tests.conftest import make_payload


class TestProbabilityThresholdBoundaries:
    """1.4 — is_fall eşik sınır testleri (mock predictor, gerçek .pkl yok)."""

    @pytest.mark.parametrize(
        "prediction,probability,expected_is_fall",
        [
            pytest.param(1, 0.8499, False, id="1.4.1-below-threshold-0.8499"),
            pytest.param(1, 0.8500, True, id="1.4.2-at-threshold-0.8500"),
            pytest.param(1, 0.8501, True, id="1.4.3-above-threshold-0.8501"),
            pytest.param(0, 0.90, False, id="1.4.4-prediction-zero-high-probability"),
            pytest.param(1, 1.0, True, id="1.4.5-maximum-probability-1.0"),
            pytest.param(0, 0.0, False, id="1.4.6-minimum-probability-0.0"),
        ],
    )
    def test_is_fall_boundary_logic(
        self,
        client,
        prediction: int,
        probability: float,
        expected_is_fall: bool,
    ):
        mock_result = {"prediction": prediction, "probability": probability}

        with patch("main.predict", return_value=mock_result):
            response = client.post("/predict", json=make_payload())

        assert response.status_code == 200
        body = response.json()
        assert body["prediction"] == prediction
        assert body["probability"] == pytest.approx(probability)
        assert body["is_fall"] is expected_is_fall
        assert "timestamp" in body

    def test_1_4_6_probability_zero_is_float_not_null(self, client):
        """probability=0.0 JSON'da float olarak dönmeli."""
        with patch("main.predict", return_value={"prediction": 0, "probability": 0.0}):
            response = client.post("/predict", json=make_payload())

        body = response.json()
        assert body["probability"] == 0.0
        assert isinstance(body["probability"], float)

    def test_1_4_5_no_overflow_at_probability_one(self, client):
        """probability=1.0 stabil çalışır; is_fall true (prediction=1)."""
        with patch("main.predict", return_value={"prediction": 1, "probability": 1.0}):
            response = client.post("/predict", json=make_payload())

        assert response.status_code == 200
        body = response.json()
        assert body["probability"] == pytest.approx(1.0)
        assert body["is_fall"] is True
