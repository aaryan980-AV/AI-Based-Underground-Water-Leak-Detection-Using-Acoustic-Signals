import os
import glob
import json
import unittest
import numpy as np

from backend.yolo_service import YOLOService, fuse_predictions, audio_to_log_mel
from ml.make_spectrogram_images import extract_leak_bounding_boxes


class TestHybridCNNAndYOLO(unittest.TestCase):
    """
    Unit test suite covering:
    1. Pseudo-label generation & bounding box geometric bounds [0, 1].
    2. Decision Fusion logic across all 4 operational agreement cases.
    3. Fallback behavior when YOLO weights are missing.
    4. API endpoint response structures.
    """

    # =========================================================
    # 1. Label Generation & Bounding Box Geometric Verification
    # =========================================================
    def test_pseudo_label_boxes_inside_image_bounds(self):
        """Verify algorithmic bounding boxes strictly lie within [0.0, 1.0]."""
        # Create a synthetic normalized log-mel spectrogram (64 mel bins, 51 time frames)
        # with a simulated acoustic resonant leak cluster
        mock_spec = np.zeros((64, 51), dtype=np.float32)
        # Resonant high-energy burst around mel bin 20-40, time frame 15-35
        mock_spec[20:40, 15:35] = 3.5

        boxes = extract_leak_bounding_boxes(mock_spec)
        self.assertGreater(len(boxes), 0, "Should generate at least one leak bounding box")

        for box in boxes:
            xc, yc, w, h = box

            # Check normalized center within [0, 1]
            self.assertGreaterEqual(xc, 0.0)
            self.assertLessEqual(xc, 1.0)
            self.assertGreaterEqual(yc, 0.0)
            self.assertLessEqual(yc, 1.0)

            # Check positive dimensions
            self.assertGreater(w, 0.0)
            self.assertLessEqual(w, 1.0)
            self.assertGreater(h, 0.0)
            self.assertLessEqual(h, 1.0)

            # Check corners stay strictly within image boundaries
            x_min = xc - w / 2.0
            x_max = xc + w / 2.0
            y_min = yc - h / 2.0
            y_max = yc + h / 2.0

            self.assertGreaterEqual(x_min, -1e-4)
            self.assertLessEqual(x_max, 1.0 + 1e-4)
            self.assertGreaterEqual(y_min, -1e-4)
            self.assertLessEqual(y_max, 1.0 + 1e-4)

    def test_dataset_label_files_validity(self):
        """Inspect actual generated YOLO label files on disk if present."""
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        label_files = glob.glob(os.path.join(base_dir, 'ml', 'yolo_dataset', 'labels', '**', '*.txt'), recursive=True)

        # Check at least train and val labels exist
        if label_files:
            non_empty_count = 0
            for lf in label_files[:50]:  # Sample 50 files
                stem = os.path.basename(lf)
                with open(lf, 'r') as f:
                    lines = [line.strip() for line in f if line.strip()]

                if 'noleak' in stem:
                    # NO_LEAK clips must be pure background (empty label files)
                    self.assertEqual(len(lines), 0, f"No-leak label file must be empty: {lf}")
                elif 'leak' in stem:
                    if len(lines) > 0:
                        non_empty_count += 1
                        for l in lines:
                            parts = l.split()
                            self.assertEqual(len(parts), 5)
                            cls_id = int(parts[0])
                            xc, yc, w, h = [float(x) for x in parts[1:]]
                            self.assertEqual(cls_id, 0)
                            self.assertTrue(0.0 <= xc <= 1.0)
                            self.assertTrue(0.0 <= yc <= 1.0)
                            self.assertTrue(0.0 < w <= 1.0)
                            self.assertTrue(0.0 < h <= 1.0)

            self.assertGreater(non_empty_count, 0, "LEAK clips should have generated pseudo-labels")

    # =========================================================
    # 2. Hybrid Decision Fusion Logic (All 4 Operational Cases)
    # =========================================================
    def test_fusion_case_1_both_agree_leak(self):
        """Case 1: Both agree LEAK -> Final LEAK, High Confidence."""
        cnn_pred = {"label": "LEAK", "confidence": 0.92, "is_leak": True}
        yolo_dets = [
            {"t_start": 0.2, "t_end": 0.7, "f_low": 400.0, "f_high": 2200.0, "confidence": 0.88, "bbox_norm": [0.2, 0.3, 0.7, 0.8]}
        ]

        result = fuse_predictions(cnn_pred, yolo_dets)

        self.assertEqual(result["decision"], "LEAK")
        self.assertTrue(result["is_leak"])
        self.assertEqual(result["agreement"], "both_leak")
        self.assertGreaterEqual(result["fused_confidence"], 0.85, "Consensus leak must yield high confidence")
        self.assertIn("Dual-model consensus", result["reason"])

    def test_fusion_case_2_cnn_leak_yolo_no_box(self):
        """Case 2: CNN LEAK but YOLO finds no box -> LEAK with medium confidence."""
        cnn_pred = {"label": "LEAK", "confidence": 0.90, "is_leak": True}
        yolo_dets = []  # No bounding box detected

        result = fuse_predictions(cnn_pred, yolo_dets)

        self.assertEqual(result["decision"], "LEAK")
        self.assertTrue(result["is_leak"])
        self.assertEqual(result["agreement"], "cnn_only")
        # Assigned medium confidence capped at <= 0.75
        self.assertLessEqual(result["fused_confidence"], 0.75)
        self.assertGreaterEqual(result["fused_confidence"], 0.50)
        self.assertIn("medium confidence", result["reason"].lower())

    def test_fusion_case_3_cnn_noleak_yolo_high_box(self):
        """Case 3: CNN NO_LEAK but YOLO box confidence > 0.6 -> flag 'suspected leak', send to debounce."""
        cnn_pred = {"label": "NO_LEAK", "confidence": 0.85, "is_leak": False}
        yolo_dets = [
            {"t_start": 0.1, "t_end": 0.4, "f_low": 800.0, "f_high": 2500.0, "confidence": 0.76, "bbox_norm": [0.1, 0.2, 0.4, 0.6]}
        ]

        result = fuse_predictions(cnn_pred, yolo_dets)

        self.assertEqual(result["decision"], "SUSPECTED_LEAK")
        self.assertTrue(result["is_leak"], "Must be flagged as True to send through debounce engine")
        self.assertEqual(result["agreement"], "yolo_only")
        self.assertGreater(result["fused_confidence"], 0.60)
        self.assertIn("SUSPECTED_LEAK", result["status_label"])

    def test_fusion_case_4_both_no_leak(self):
        """Case 4: Both NO_LEAK -> Confirmed NO_LEAK."""
        cnn_pred = {"label": "NO_LEAK", "confidence": 0.95, "is_leak": False}
        yolo_dets = []

        result = fuse_predictions(cnn_pred, yolo_dets)

        self.assertEqual(result["decision"], "NO_LEAK")
        self.assertFalse(result["is_leak"])
        self.assertEqual(result["agreement"], "both_no_leak")
        self.assertEqual(result["fused_confidence"], 0.95)

    # =========================================================
    # 3. Graceful Fallback Handling (Missing Weights)
    # =========================================================
    def test_yolo_service_fallback_when_weights_missing(self):
        """Ensure YOLOService does not crash when weights path does not exist."""
        non_existent_path = "ml/artifacts/non_existent_weights_12345.pt"
        service = YOLOService(model_path=non_existent_path)

        # Generate a dummy 1-second audio array (8000 samples)
        dummy_audio = np.random.uniform(-0.1, 0.1, size=8000).astype(np.float32)

        pred = service.predict_spectrogram(dummy_audio)

        self.assertIsInstance(pred, dict)
        self.assertEqual(pred["detections"], [])
        self.assertEqual(pred["max_confidence"], 0.0)
        self.assertFalse(pred["has_detection"])
        self.assertFalse(pred["is_available"])
        self.assertTrue(pred["annotated_image_base64"].startswith("data:image/png;base64,"))

    # =========================================================
    # 4. API Endpoints & Response Shape Verification
    # =========================================================
    def test_model_comparison_endpoint_structure(self):
        """Verify /api/model-comparison schema."""
        from fastapi.testclient import TestClient
        from backend.main import app

        client = TestClient(app)
        response = client.get("/api/model-comparison")

        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn("cnn_only", data)
        self.assertIn("yolo_only", data)
        self.assertIn("fused", data)

        for key in ["cnn_only", "yolo_only", "fused"]:
            metrics = data[key]
            self.assertIn("accuracy", metrics)
            self.assertIn("precision", metrics)
            self.assertIn("recall", metrics)
            self.assertIn("f1_score", metrics)
            self.assertTrue(0.0 <= metrics["accuracy"] <= 1.0)
            self.assertTrue(0.0 <= metrics["f1_score"] <= 1.0)


if __name__ == "__main__":
    unittest.main()
