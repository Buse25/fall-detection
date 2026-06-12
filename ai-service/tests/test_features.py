"""Senaryo 1.3 — Öznitelik çıkarım algoritması testleri."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import numpy as np
import pandas as pd
import pytest

from services import predictor
from services.predictor import _RAD_TO_DEG, _smv_series, predict
from tests.conftest import make_payload, make_reading


class TestSmvSeries:
    """1.3.1 ve 1.3.2 — SMV hesaplamaları."""

    def test_1_3_1_accelerometer_smv_pythagorean(self):
        """accelerometer {x:3, y:4, z:0} → SMV = 5.0."""
        readings = [{"accelerometer": {"x": 3, "y": 4, "z": 0}}]
        result = _smv_series(readings, "accelerometer")
        assert len(result) == 1
        assert result[0] == pytest.approx(5.0)

    def test_1_3_1_edge_zero_axes(self):
        """x=y=z=0 → SMV = 0.0."""
        readings = [{"accelerometer": {"x": 0, "y": 0, "z": 0}}]
        result = _smv_series(readings, "accelerometer")
        assert result[0] == pytest.approx(0.0)

    def test_1_3_1_edge_negative_values(self):
        """Negatif eksenler mutlak büyüklükte aynı SMV."""
        readings = [{"accelerometer": {"x": -3, "y": -4, "z": 0}}]
        result = _smv_series(readings, "accelerometer")
        assert result[0] == pytest.approx(5.0)

    def test_1_3_2_gyroscope_rad_to_deg_conversion(self):
        """gyroscope {x:1, y:0, z:0} rad/s → SMV = 57.2958 °/s."""
        readings = [{"gyroscope": {"x": 1, "y": 0, "z": 0}}]
        result = _smv_series(readings, "gyroscope", scale=_RAD_TO_DEG)
        assert result[0] == pytest.approx(57.2958, rel=1e-5)

    def test_1_3_2_accelerometer_no_scale_applied(self):
        """İvmeölçerde scale=1.0; dönüşüm uygulanmamalı."""
        readings = [{"accelerometer": {"x": 1, "y": 0, "z": 0}}]
        default = _smv_series(readings, "accelerometer")
        explicit = _smv_series(readings, "accelerometer", scale=1.0)
        assert default[0] == pytest.approx(1.0)
        assert explicit[0] == pytest.approx(1.0)


class TestFeatureExtraction:
    """1.3.3 – 1.3.6 — Acc/Gyro öznitelikleri ve DataFrame sütunları."""

    def _run_predict_and_capture_features(self, payload: dict) -> pd.DataFrame:
        captured: list[pd.DataFrame] = []

        mock_model = MagicMock()
        mock_model.classes_ = np.array([0, 1])
        mock_model.predict.return_value = np.array([0])
        mock_model.predict_proba.return_value = np.array([[0.9, 0.1]])

        def capture_predict(features: pd.DataFrame):
            captured.append(features.copy())
            return np.array([0])

        mock_model.predict.side_effect = capture_predict

        with patch.object(predictor, "_model", mock_model):
            predict(payload)

        assert len(captured) == 1
        return captured[0]

    def test_1_3_3_acc_min_and_acc_max(self):
        """SMV [1.0, 3.5, 2.2] → Acc_Min=1.0, Acc_Max=3.5."""
        readings = [
            make_reading(1.0, 0.0, 0.0),
            make_reading(3.5, 0.0, 0.0),
            make_reading(2.2, 0.0, 0.0),
        ]
        features = self._run_predict_and_capture_features(make_payload(readings=readings))

        assert features["Acc_Min"].iloc[0] == pytest.approx(1.0)
        assert features["Acc_Max"].iloc[0] == pytest.approx(3.5)

    def test_1_3_3_edge_min_equals_max(self):
        """Tüm okumalar aynı SMV → min == max."""
        readings = [make_reading(2.0, 0.0, 0.0) for _ in range(3)]
        features = self._run_predict_and_capture_features(make_payload(readings=readings))

        assert features["Acc_Min"].iloc[0] == pytest.approx(2.0)
        assert features["Acc_Max"].iloc[0] == pytest.approx(2.0)

    def test_1_3_4_acc_var_population_variance(self):
        """SMV [2.0, 4.0] → popülasyon varyansı = 1.0."""
        readings = [
            make_reading(2.0, 0.0, 0.0),
            make_reading(4.0, 0.0, 0.0),
        ]
        features = self._run_predict_and_capture_features(make_payload(readings=readings))

        assert features["Acc_Var"].iloc[0] == pytest.approx(1.0)
        assert float(np.var([2.0, 4.0])) == pytest.approx(1.0)

    def test_1_3_4_edge_single_reading_variance_zero(self):
        """Tek eleman → Acc_Var = 0.0."""
        readings = [make_reading(1.5, 0.0, 0.0)]
        features = self._run_predict_and_capture_features(make_payload(readings=readings))

        assert features["Acc_Var"].iloc[0] == pytest.approx(0.0)

    def test_1_3_5_missing_gyroscope_defaults_to_zero(self):
        """gyroscope yokken Gyro_Max=0.0, Gyro_Var=0.0."""
        readings = [
            {
                "timestamp": "2026-06-12T10:00:00.000Z",
                "accelerometer": {"x": 1.0, "y": 0.0, "z": 0.0},
            }
        ]
        features = self._run_predict_and_capture_features(make_payload(readings=readings))

        assert features["Gyro_Max"].iloc[0] == pytest.approx(0.0)
        assert features["Gyro_Var"].iloc[0] == pytest.approx(0.0)

    def test_1_3_5_empty_gyroscope_object(self):
        """gyroscope {} → eksenler 0 kabul edilir."""
        readings = [
            {
                "timestamp": "2026-06-12T10:00:00.000Z",
                "accelerometer": {"x": 1.0, "y": 0.0, "z": 0.0},
                "gyroscope": {},
            }
        ]
        features = self._run_predict_and_capture_features(make_payload(readings=readings))

        assert features["Gyro_Max"].iloc[0] == pytest.approx(0.0)
        assert features["Gyro_Var"].iloc[0] == pytest.approx(0.0)

    def test_1_3_6_dataframe_column_names_and_order(self):
        """Model beklentisiyle birebir sütun adları."""
        features = self._run_predict_and_capture_features(make_payload(readings_count=3))

        expected = ["Yas_Grubu", "Acc_Min", "Acc_Max", "Acc_Var", "Gyro_Max", "Gyro_Var"]
        assert list(features.columns) == expected

    def test_1_3_6_yas_grubu_profile_mapping(self):
        """profile yasli → Yas_Grubu=1; diğer → 0."""
        elderly = self._run_predict_and_capture_features(make_payload(readings_count=2, profile="yasli"))
        other = self._run_predict_and_capture_features(make_payload(readings_count=2, profile="other"))

        assert elderly["Yas_Grubu"].iloc[0] == 1
        assert other["Yas_Grubu"].iloc[0] == 0
