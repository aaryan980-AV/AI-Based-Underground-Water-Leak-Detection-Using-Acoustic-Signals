import io
import os
import json
import base64
import numpy as np
import soundfile as sf
import librosa
import torch
import torch.nn as nn

TARGET_SR = 8000
WINDOW_DURATION = 1.0
WINDOW_SAMPLES = int(TARGET_SR * WINDOW_DURATION)  # 8000 samples
N_MELS = 64
N_FFT = 512
HOP_LENGTH = 160


class LeakCNN(nn.Module):
    """CNN Classifier matching the trained architecture."""
    def __init__(self, dropout_rate=0.25):
        super(LeakCNN, self).__init__()
        self.conv_blocks = nn.Sequential(
            nn.Conv2d(1, 32, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
            nn.Dropout2d(0.15),

            nn.Conv2d(32, 64, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
            nn.Dropout2d(0.20),

            nn.Conv2d(64, 128, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
            nn.Dropout2d(0.25),

            nn.Conv2d(128, 128, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d((1, 1)),
            nn.Flatten()
        )
        self.fc = nn.Sequential(
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(dropout_rate),
            nn.Linear(64, 1)
        )

    def forward(self, x):
        features = self.conv_blocks(x)
        logits = self.fc(features).squeeze(-1)
        return logits


class LeakInferenceEngine:
    """Singleton inference engine with model caching."""
    def __init__(self, model_path: str = None):
        if model_path is None:
            # Default to relative or package artifact path
            base_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.join(base_dir, 'artifacts', 'leak_detector.pt')

        self.model_path = model_path
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = LeakCNN()
        if os.path.exists(model_path):
            state = torch.load(model_path, map_location=self.device)
            self.model.load_state_dict(state)
            print(f"Loaded trained LeakCNN model from {model_path}")
        else:
            print(f"Warning: Model file not found at {model_path}. Using uninitialized weights.")
        self.model.to(self.device)
        self.model.eval()

    def preprocess_audio(self, audio_input) -> tuple[torch.Tensor, np.ndarray, np.ndarray]:
        """
        Accepts:
          - file path (str)
          - raw audio bytes or io.BytesIO
          - numpy array waveform
        Returns:
          - tensor (1, 1, 64, 51)
          - waveform (np.ndarray)
          - spectrogram in dB (np.ndarray)
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

        # Resample to 8000 Hz if necessary
        if sr != TARGET_SR:
            data = librosa.resample(data, orig_sr=sr, target_sr=TARGET_SR)

        # Normalize waveform
        max_val = np.max(np.abs(data))
        if max_val > 1e-5:
            data = data / max_val
        else:
            data = data - np.mean(data)

        # Ensure minimum length of 1.0s window
        if len(data) < WINDOW_SAMPLES:
            data = np.pad(data, (0, WINDOW_SAMPLES - len(data)), mode='constant')
        elif len(data) > WINDOW_SAMPLES:
            # Use central or first 1.0s window for standard prediction
            data = data[:WINDOW_SAMPLES]

        # Log mel spectrogram
        mel = librosa.feature.melspectrogram(
            y=data,
            sr=TARGET_SR,
            n_fft=N_FFT,
            hop_length=HOP_LENGTH,
            n_mels=N_MELS,
            fmin=40,
            fmax=TARGET_SR // 2,
            power=2.0
        )
        log_mel_raw = librosa.power_to_db(mel, ref=np.max)
        norm_spec = (log_mel_raw - np.mean(log_mel_raw)) / (np.std(log_mel_raw) + 1e-6)

        spec_tensor = torch.tensor(norm_spec, dtype=torch.float32).unsqueeze(0).unsqueeze(0)  # (1, 1, 64, 51)
        return spec_tensor.to(self.device), data, log_mel_raw

    def predict(self, audio_window) -> dict:
        """
        Runs model inference on an audio window.
        Returns: {
            "label": "LEAK" | "NO_LEAK",
            "confidence": float (0.0 to 1.0),
            "raw_leak_prob": float (0.0 to 1.0),
            "is_leak": bool
        }
        """
        spec_tensor, _, _ = self.preprocess_audio(audio_window)
        with torch.no_grad():
            logit = self.model(spec_tensor)
            leak_prob = float(torch.sigmoid(logit).cpu().item())

        is_leak = leak_prob >= 0.5
        label = "LEAK" if is_leak else "NO_LEAK"
        # Confidence is distance to 0.5 scaled or probability of selected class
        confidence = leak_prob if is_leak else (1.0 - leak_prob)

        return {
            "label": label,
            "confidence": round(confidence, 4),
            "raw_leak_prob": round(leak_prob, 4),
            "is_leak": is_leak
        }


# Global engine instance
_engine = None

def get_engine():
    global _engine
    if _engine is None:
        _engine = LeakInferenceEngine()
    return _engine


def predict(audio_window) -> dict:
    """Primary inference helper function specified in prompt."""
    return get_engine().predict(audio_window)


class DebounceDetector:
    """
    Debounce Rule Implementation:
    Raise a leak alert only after:
    1. 2 consecutive LEAK windows, OR
    2. confidence > 0.85 (configurable threshold)
    """
    def __init__(self, consecutive_threshold: int = 2, high_conf_threshold: float = 0.85):
        self.consecutive_threshold = consecutive_threshold
        self.high_conf_threshold = high_conf_threshold
        # Tracks state per sensor: {sensor_id: consecutive_leak_count}
        self.sensor_state = {}

    def process_reading(self, sensor_id: str, prediction_result: dict) -> dict:
        """
        Evaluates prediction result against debounce rules.
        Returns: {
            "should_alert": bool,
            "reason": str,
            "consecutive_leaks": int,
            "confidence": float
        }
        """
        is_leak = prediction_result.get("is_leak", False)
        conf = prediction_result.get("confidence", 0.0)

        current_count = self.sensor_state.get(sensor_id, 0)

        if is_leak:
            current_count += 1
            self.sensor_state[sensor_id] = current_count
        else:
            # Reset on normal reading
            self.sensor_state[sensor_id] = 0
            return {
                "should_alert": False,
                "reason": "Normal acoustic signature (NO_LEAK)",
                "consecutive_leaks": 0,
                "confidence": conf
            }

        # Rule 1: High confidence leak immediately alerts (> 0.85)
        if conf >= self.high_conf_threshold:
            return {
                "should_alert": True,
                "reason": f"High confidence leak detected ({conf*100:.1f}% >= {self.high_conf_threshold*100:.0f}%)",
                "consecutive_leaks": current_count,
                "confidence": conf
            }

        # Rule 2: Consecutive leak windows threshold met (>= 2)
        if current_count >= self.consecutive_threshold:
            return {
                "should_alert": True,
                "reason": f"Debounce threshold met ({current_count} consecutive LEAK windows)",
                "consecutive_leaks": current_count,
                "confidence": conf
            }

        # Consecutive count is currently 1 and confidence < threshold
        return {
            "should_alert": False,
            "reason": f"Debounce pending: 1 LEAK window detected (awaiting confirmation)",
            "consecutive_leaks": current_count,
            "confidence": conf
        }

    def reset_sensor(self, sensor_id: str):
        if sensor_id in self.sensor_state:
            self.sensor_state[sensor_id] = 0
