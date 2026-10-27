import os
import io
import re
import base64
import numpy as np
import soundfile as sf
import librosa
import matplotlib.pyplot as plt
from PIL import Image
import cv2

# Try importing ultralytics YOLO
try:
    from ultralytics import YOLO
    ULTRALYTICS_AVAILABLE = True
except ImportError:
    ULTRALYTICS_AVAILABLE = False


# Preprocessing Constants (identical to CNN)
TARGET_SR = 8000
WINDOW_DURATION = 1.0  # seconds
WINDOW_SAMPLES = int(TARGET_SR * WINDOW_DURATION)  # 8000 samples
N_MELS = 64
N_FFT = 512
HOP_LENGTH = 160
FMIN = 40
FMAX = TARGET_SR // 2  # 4000 Hz
IMAGE_SIZE = (640, 640)


def audio_to_log_mel(audio: np.ndarray, sr: int = TARGET_SR) -> np.ndarray:
    """
    Standardize waveform and convert to normalized log-mel spectrogram (64, 51).
    """
    max_val = np.max(np.abs(audio))
    if max_val > 1e-5:
        audio = audio / max_val
    else:
        audio = audio - np.mean(audio)

    mel = librosa.feature.melspectrogram(
        y=audio,
        sr=sr,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH,
        n_mels=N_MELS,
        fmin=FMIN,
        fmax=FMAX,
        power=2.0
    )
    log_mel = librosa.power_to_db(mel, ref=np.max)
    mean = np.mean(log_mel)
    std = np.std(log_mel) + 1e-6
    return ((log_mel - mean) / std).astype(np.float32)


def spec_to_rgb_image(norm_spec: np.ndarray, target_size=IMAGE_SIZE) -> np.ndarray:
    """
    Convert normalized log-mel spectrogram into 640x640 RGB image.
    High frequencies at top, low frequencies at bottom.
    """
    spec_flipped = np.flipud(norm_spec)
    spec_clipped = np.clip(spec_flipped, -3.0, 3.0)
    spec_scaled = (spec_clipped - (-3.0)) / 6.0

    colormap = plt.get_cmap('viridis')
    rgba = colormap(spec_scaled)
    rgb = (rgba[:, :, :3] * 255.0).astype(np.uint8)

    img = Image.fromarray(rgb).resize(target_size, Image.Resampling.BILINEAR)
    return np.array(img)


class YOLOService:
    """
    Singleton YOLO service that loads yolo_leak.pt once at startup,
    predicts localized bounding boxes on log-mel spectrograms,
    and supports graceful fallback to CNN-only if weights are missing.
    """
    def __init__(self, model_path: str = None):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.dirname(base_dir)

        if model_path is None:
            candidates = [
                os.path.join(workspace_root, 'ml', 'artifacts', 'yolo_leak.pt'),
                os.path.join(workspace_root, 'ml', 'runs', 'leak_yolo', 'weights', 'best.pt'),
                os.path.join(workspace_root, 'yolo_leak.pt'),
                os.path.join(workspace_root, 'yolov8n.pt')
            ]
            for c in candidates:
                if os.path.exists(c):
                    model_path = c
                    break

        self.model_path = model_path
        self.model = None
        self.is_loaded = False

        if ULTRALYTICS_AVAILABLE and model_path and os.path.exists(model_path):
            try:
                self.model = YOLO(model_path)
                self.is_loaded = True
                print(f"[YOLOService] Successfully loaded YOLO detector from: {model_path}")
            except Exception as e:
                print(f"[YOLOService] Warning: Could not initialize YOLO model from {model_path}: {e}")
                self.model = None
                self.is_loaded = False
        else:
            if not ULTRALYTICS_AVAILABLE:
                print("[YOLOService] Ultralytics package not available; running in CNN-only fallback mode.")
            else:
                print(f"[YOLOService] No weights found at {model_path}; running in CNN-only fallback mode.")

    def reload(self, path: str = None):
        """Allows re-loading weights after training finishes."""
        if path:
            self.model_path = path
        if ULTRALYTICS_AVAILABLE and self.model_path and os.path.exists(self.model_path):
            try:
                self.model = YOLO(self.model_path)
                self.is_loaded = True
                print(f"[YOLOService] Reloaded YOLO detector from: {self.model_path}")
            except Exception as e:
                print(f"[YOLOService] Failed to reload YOLO detector: {e}")

    def preprocess_audio(self, audio_input) -> tuple[np.ndarray, np.ndarray]:
        """
        Loads and standardizes audio input to 8000 Hz, 1.0 second waveform
        and generates the 640x640 RGB spectrogram.
        Returns: (rgb_image, norm_spec)
        """
        if isinstance(audio_input, str):
            data, sr = sf.read(audio_input)
        elif isinstance(audio_input, (bytes, io.BytesIO)):
            if isinstance(audio_input, bytes):
                audio_input = io.BytesIO(audio_input)
            data, sr = sf.read(audio_input)
        elif isinstance(audio_input, np.ndarray):
            data = audio_input
            sr = TARGET_SR
        else:
            raise ValueError(f"Unsupported audio input type: {type(audio_input)}")

        if data.ndim > 1:
            data = data.mean(axis=1)

        if np.issubdtype(data.dtype, np.integer):
            data = data.astype(np.float32) / np.iinfo(data.dtype).max
        else:
            data = data.astype(np.float32)

        if sr != TARGET_SR:
            data = librosa.resample(data, orig_sr=sr, target_sr=TARGET_SR)

        if len(data) < WINDOW_SAMPLES:
            data = np.pad(data, (0, WINDOW_SAMPLES - len(data)), mode='constant')
        elif len(data) > WINDOW_SAMPLES:
            data = data[:WINDOW_SAMPLES]

        norm_spec = audio_to_log_mel(data, TARGET_SR)
        rgb_image = spec_to_rgb_image(norm_spec, IMAGE_SIZE)
        return rgb_image, norm_spec

    def predict_spectrogram(self, audio_input, conf_threshold: float = 0.25) -> dict:
        """
        Runs YOLO leak detection on the log-mel spectrogram image of a 1-second clip.
        Returns: {
            "detections": list of {t_start, t_end, f_low, f_high, confidence, class_name, bbox_norm},
            "max_confidence": float,
            "has_detection": bool,
            "is_available": bool,
            "annotated_image_base64": str,
            "spectrogram_image": np.ndarray (640, 640, 3)
        }
        """
        try:
            rgb_image, norm_spec = self.preprocess_audio(audio_input)
        except Exception as e:
            print(f"[YOLOService] Preprocessing failed: {e}")
            return {
                "detections": [],
                "max_confidence": 0.0,
                "has_detection": False,
                "is_available": self.is_loaded,
                "annotated_image_base64": "",
                "spectrogram_image": None
            }

        detections = []
        max_conf = 0.0

        if self.is_loaded and self.model is not None:
            try:
                results = self.model.predict(rgb_image, conf=conf_threshold, imgsz=640, verbose=False)
                if len(results) > 0 and len(results[0].boxes) > 0:
                    for box in results[0].boxes:
                        xyxyn = box.xyxyn[0].cpu().numpy()
                        x1, y1, x2, y2 = [float(v) for v in xyxyn]
                        conf = float(box.conf[0].cpu().item())
                        cls_id = int(box.cls[0].cpu().item())
                        class_name = "leak_signature"

                        # Time coordinates: 0.0s to 1.0s
                        t_start = round(max(0.0, min(1.0, x1 * WINDOW_DURATION)), 3)
                        t_end = round(max(0.0, min(1.0, x2 * WINDOW_DURATION)), 3)

                        # Frequency coordinates: y=0 is FMAX (4000Hz), y=1 is FMIN (40Hz)
                        f_high = round(max(FMIN, min(FMAX, FMAX - y1 * (FMAX - FMIN))), 1)
                        f_low = round(max(FMIN, min(FMAX, FMAX - y2 * (FMAX - FMIN))), 1)
                        if f_low > f_high:
                            f_low, f_high = f_high, f_low

                        detections.append({
                            "t_start": t_start,
                            "t_end": t_end,
                            "f_low": f_low,
                            "f_high": f_high,
                            "confidence": round(conf, 4),
                            "class_name": class_name,
                            "bbox_norm": [round(x1, 4), round(y1, 4), round(x2, 4), round(y2, 4)]
                        })

                    max_conf = max(d["confidence"] for d in detections)
            except Exception as e:
                print(f"[YOLOService] YOLO inference error: {e}")

        # Render annotated spectrogram image with boxes drawn
        annotated_b64 = self.generate_annotated_base64(rgb_image, detections)

        return {
            "detections": detections,
            "max_confidence": round(max_conf, 4),
            "has_detection": len(detections) > 0 and max_conf >= conf_threshold,
            "is_available": self.is_loaded,
            "annotated_image_base64": annotated_b64,
            "spectrogram_image": rgb_image
        }

    def generate_annotated_base64(
        self,
        rgb_image: np.ndarray,
        detections: list,
        cnn_label: str = None,
        cnn_conf: float = None,
        fused_conf: float = None
    ) -> str:
        """
        Draws precise bounding boxes, frequency/time annotations, and confidence tags
        on the 640x640 spectrogram image, then encodes it as a base64 PNG data URI.
        """
        annotated = rgb_image.copy()

        # Draw grid lines for frequency & time reference
        h, w, _ = annotated.shape
        # 1 kHz, 2 kHz, 3 kHz grid lines
        for khz, freq in [(1, 1000), (2, 2000), (3, 3000)]:
            y_pos = int((FMAX - freq) / (FMAX - FMIN) * h)
            cv2.line(annotated, (0, y_pos), (w, y_pos), (80, 80, 80), 1, cv2.LINE_AA)
            cv2.putText(annotated, f"{khz}kHz", (8, y_pos - 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.38, (180, 180, 180), 1, cv2.LINE_AA)

        # Time markers (0.25s, 0.5s, 0.75s)
        for t_val in [0.25, 0.5, 0.75]:
            x_pos = int(t_val * w)
            cv2.line(annotated, (x_pos, 0), (x_pos, h), (80, 80, 80), 1, cv2.LINE_AA)
            cv2.putText(annotated, f"{t_val}s", (x_pos + 4, h - 8),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.38, (180, 180, 180), 1, cv2.LINE_AA)

        # Draw detected YOLO bounding boxes
        box_color = (0, 240, 255)  # Cyan/Yellow
        for det in detections:
            x1 = int(det["bbox_norm"][0] * w)
            y1 = int(det["bbox_norm"][1] * h)
            x2 = int(det["bbox_norm"][2] * w)
            y2 = int(det["bbox_norm"][3] * h)

            cv2.rectangle(annotated, (x1, y1), (x2, y2), box_color, 2)

            label_text = f"LEAK {int(det['confidence']*100)}% ({int(det['f_low'])}-{int(det['f_high'])}Hz)"
            (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
            cv2.rectangle(annotated, (x1, max(0, y1 - th - 8)), (x1 + tw + 6, max(th + 8, y1)), (20, 20, 20), -1)
            cv2.putText(annotated, label_text, (x1 + 3, max(th + 2, y1 - 4)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, box_color, 1, cv2.LINE_AA)

        # Top status badge
        top_bar_h = 32
        cv2.rectangle(annotated, (0, 0), (w, top_bar_h), (15, 23, 42), -1)

        badge_parts = []
        if cnn_label is not None and cnn_conf is not None:
            badge_parts.append(f"CNN: {cnn_label} ({int(cnn_conf*100)}%)")
        if detections:
            badge_parts.append(f"YOLO: {len(detections)} box(es) ({int(max(d['confidence'] for d in detections)*100)}%)")
        else:
            badge_parts.append("YOLO: No box")
        if fused_conf is not None:
            badge_parts.append(f"Fused: {int(fused_conf*100)}%")

        badge_text = "  |  ".join(badge_parts)
        cv2.putText(annotated, badge_text, (12, 21),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (241, 245, 249), 1, cv2.LINE_AA)

        # Convert to PNG base64
        pil_img = Image.fromarray(annotated)
        buf = io.BytesIO()
        pil_img.save(buf, format="PNG")
        b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{b64_str}"


def fuse_predictions(cnn_result: dict, yolo_detections: list) -> dict:
    """
    Hybrid Decision Fusion combining CNN clip classification and YOLO localization:
    - Both agree LEAK -> final LEAK, high confidence (average / weighted score).
    - CNN LEAK but YOLO finds no box -> LEAK with 'medium' confidence.
    - CNN NO_LEAK but YOLO box confidence > 0.6 -> flag 'suspected leak', send to debounce engine.
    - Both NO_LEAK -> NO_LEAK.
    """
    cnn_label = cnn_result.get("label", "NO_LEAK")
    cnn_conf = float(cnn_result.get("confidence", 0.0))
    cnn_is_leak = bool(cnn_result.get("is_leak", False))

    max_yolo_conf = 0.0
    if yolo_detections:
        max_yolo_conf = max(float(d.get("confidence", 0.0)) for d in yolo_detections)

    yolo_has_box = len(yolo_detections) > 0 and max_yolo_conf >= 0.25

    if cnn_is_leak and yolo_has_box:
        # Case 1: Both agree LEAK -> final LEAK, high confidence
        fused_conf = round(min(0.99, max(cnn_conf, max_yolo_conf) * 0.5 + min(cnn_conf, max_yolo_conf) * 0.5 + 0.04), 4)
        decision = "LEAK"
        is_leak = True
        status_label = "LEAK (Confirmed)"
        reason = f"Dual-model consensus: CNN ({int(cnn_conf*100)}%) and YOLO ({int(max_yolo_conf*100)}%) both detect acoustic leak."
        agreement = "both_leak"

    elif cnn_is_leak and not yolo_has_box:
        # Case 2: CNN LEAK but YOLO finds no box -> LEAK with 'medium' confidence
        fused_conf = round(min(0.75, max(0.55, cnn_conf * 0.82)), 4)
        decision = "LEAK"
        is_leak = True
        status_label = "LEAK (Medium Confidence)"
        reason = f"CNN detected leak ({int(cnn_conf*100)}%), but YOLO found no localized resonance box; assigned medium confidence."
        agreement = "cnn_only"

    elif (not cnn_is_leak) and max_yolo_conf > 0.60:
        # Case 3: CNN NO_LEAK but YOLO box confidence > 0.6 -> flag 'suspected leak'
        fused_conf = round(max_yolo_conf * 0.90, 4)
        decision = "SUSPECTED_LEAK"
        is_leak = True  # send through debounce engine
        status_label = "SUSPECTED_LEAK"
        reason = f"YOLO identified localized leak bounding box ({int(max_yolo_conf*100)}% > 60%) despite normal CNN baseline; flagged for debounce confirmation."
        agreement = "yolo_only"

    else:
        # Case 4: Both NO_LEAK
        fused_conf = round(cnn_conf, 4)
        decision = "NO_LEAK"
        is_leak = False
        status_label = "NO_LEAK"
        reason = "Normal acoustic background verified by both CNN and YOLO models."
        agreement = "both_no_leak"

    return {
        "decision": decision,
        "is_leak": is_leak,
        "fused_confidence": fused_conf,
        "cnn_confidence": round(cnn_conf, 4),
        "yolo_confidence": round(max_yolo_conf, 4),
        "yolo_detections": yolo_detections,
        "status_label": status_label,
        "reason": reason,
        "agreement": agreement
    }


# Global singleton instance
_yolo_service = None

def get_yolo_service():
    global _yolo_service
    if _yolo_service is None:
        _yolo_service = YOLOService()
    return _yolo_service
