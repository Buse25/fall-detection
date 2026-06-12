"""Senaryo 1.1 — /health endpoint testleri."""

from unittest.mock import patch

from main import FALL_PROBABILITY_THRESHOLD


class TestHealthEndpoint:
    """1.1 /health endpoint senaryoları."""

    def test_1_1_1_model_loaded_returns_ok(self, client):
        """Model yüklüyken HTTP 200, status ok, modelLoaded true."""
        with patch("main.is_model_loaded", return_value=True):
            response = client.get("/health")

        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "ok"
        assert body["modelLoaded"] is True
        assert body["fallProbabilityThreshold"] == 0.85
        assert body["service"] == "catchme-ai-service"

    def test_1_1_1_edge_corrupt_model_returns_degraded(self, client):
        """Bozuk model dosyası simülasyonunda degraded durum."""
        with patch("main.is_model_loaded", return_value=False):
            response = client.get("/health")

        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "degraded"
        assert body["modelLoaded"] is False

    def test_1_1_2_model_missing_returns_degraded_not_5xx(self, client):
        """Model yokken servis ayakta kalır; 5xx dönmez."""
        with patch("main.is_model_loaded", return_value=False):
            response = client.get("/health")

        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "degraded"
        assert body["modelLoaded"] is False

    def test_1_1_3_threshold_matches_main_constant(self, client, threshold):
        """fallProbabilityThreshold main.py sabitiyle eşleşmeli."""
        with patch("main.is_model_loaded", return_value=True):
            response = client.get("/health")

        assert response.status_code == 200
        assert response.json()["fallProbabilityThreshold"] == threshold
        assert threshold == FALL_PROBABILITY_THRESHOLD
