import io
import os
import json
import numpy as np
import soundfile as sf
import librosa
import torch
import torch.nn as nn

DEFAULT_TARGET_SR = 22050
DEFAULT_DURATION = 5.0
DEFAULT_N_MELS = 64
DEFAULT_N_FFT = 1024
DEFAULT_HOP_LENGTH = 256


class WaterLeakCNN(nn.Module):
    """
    water_leak_cnn architecture matching the trained model checkpoint.
    Features: 3 Conv2d-BatchNorm2d-ReLU-Pool blocks -> AdaptiveAvgPool2d((4, 4))
    Classifier: Dropout -> Linear(1024, 64) -> ReLU -> Dropout -> Linear(64, 2)
    """
    def __init__(self, dropout_rate: float = 0.3):
        super(WaterLeakCNN, self).__init__()
        self.features = nn.Sequential(
            # Block 1
            nn.Conv2d(1, 16, kernel_size=3, padding=1),
            nn.BatchNorm2d(16),
            nn.ReLU(),
            nn.MaxPool2d(kernel_size=2, stride=2),

            # Block 2
            nn.Conv2d(16, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(kernel_size=2, stride=2),

            # Block 3
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d((4, 4))
        )
        self.classifier = nn.Sequential(
            nn.Dropout(dropout_rate),
            nn.Linear(1024, 64),
            nn.ReLU(),
            nn.Dropout(dropout_rate),
            nn.Linear(64, 2)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        feat = self.features(x)
        flat = torch.flatten(feat, 1)
        logits = self.classifier(flat)
        return logits


class LeakCNN(nn.Module):
    """Legacy CNN Classifier for single-output binary sigmoid models."""
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
    """Singleton inference engine with model caching and dynamic metadata resolution."""
    def __init__(self, model_path: str = None):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        root_dir = os.path.dirname(base_dir)

        if model_path is None:
            # Look for water_leak_cnn.pth in root workspace and ml/artifacts
            candidate_paths = [
                os.path.join(root_dir, 'water_leak_cnn.pth'),
                os.path.join(base_dir, 'artifacts', 'water_leak_cnn.pth'),
                'water_leak_cnn.pth',
                os.path.join(base_dir, 'artifacts', 'leak_detector.pt')
            ]
            for cp in candidate_paths:
                if os.path.exists(cp):
                    model_path = cp
                    break

        self.model_path = model_path
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Audio preprocessing parameters (loaded from model metadata if present)
        self.sample_rate = DEFAULT_TARGET_SR
        self.duration = DEFAULT_DURATION
        self.n_mels = DEFAULT_N_MELS
        self.n_fft = DEFAULT_N_FFT
        self.hop_length = DEFAULT_HOP_LENGTH
        self.class_names = {0: "No Leak", 1: "Leak"}
        self.model_name = "water_leak_cnn"

        if model_path and os.path.exists(model_path):
            checkpoint = torch.load(model_path, map_location=self.device)
            if isinstance(checkpoint, dict) and 'model_state_dict' in checkpoint:
                # water_leak_cnn checkpoint with metadata
                self.model_name = "water_leak_cnn"
                self.sample_rate = checkpoint.get('sample_rate', DEFAULT_TARGET_SR)
                self.duration = checkpoint.get('duration', DEFAULT_DURATION)
                self.n_mels = checkpoint.get('n_mels', DEFAULT_N_MELS)
                self.n_fft = checkpoint.get('n_fft', DEFAULT_N_FFT)
                self.hop_length = checkpoint.get('hop_length', DEFAULT_HOP_LENGTH)
                self.class_names = checkpoint.get('class_names', {0: "No Leak", 1: "Leak"})

                self.model = WaterLeakCNN()
                self.model.load_state_dict(checkpoint['model_state_dict'])
                print(f"[InferenceEngine] Successfully loaded {self.model_name} from {model_path} "
                      f"(SR={self.sample_rate}Hz, Duration={self.duration}s, Classes={self.class_names})")
            elif isinstance(checkpoint, dict) and 'conv_blocks.0.weight' in checkpoint:
                # Legacy model checkpoint
                self.model_name = "leak_detector"
                self.sample_rate = 8000
                self.duration = 1.0
                self.n_mels = 64
                self.n_fft = 512
                self.hop_length = 160
                self.model = LeakCNN()
                self.model.load_state_dict(checkpoint)
                print(f"[InferenceEngine] Loaded legacy LeakCNN model from {model_path}")
            else:
                self.model = WaterLeakCNN()
                print(f"[InferenceEngine] Warning: Unrecognized checkpoint format at {model_path}")
        else:
            print(f"[InferenceEngine] Warning: Model file not found at {model_path}. Initializing default WaterLeakCNN.")
            self.model = WaterLeakCNN()

        self.window_samples = int(self.sample_rate * self.duration)
        self.model.to(self.device)
        self.model.eval()

    def preprocess_audio(self, audio_input) -> tuple[torch.Tensor, np.ndarray, np.ndarray]:
        """
        Accepts:
          - file path (str)
          - raw audio bytes or io.BytesIO
          - numpy array waveform
        Returns:
          - tensor (1, 1, n_mels, T)
          - waveform (np.ndarray)
          - log-mel spectrogram in dB (np.ndarray)
        """
        if isinstance(audio_input, str):
            data, sr = sf.read(audio_input)
        elif isinstance(audio_input, (bytes, io.BytesIO)):
            if isinstance(audio_input, bytes):
                audio_input = io.BytesIO(audio_input)
            data, sr = sf.read(audio_input)
        elif isinstance(audio_input, np.ndarray):
            data = audio_input
            sr = self.sample_rate
        else:
            raise ValueError(f"Unsupported audio input type: {type(audio_input)}")

        # Convert to mono if multi-channel
        if data.ndim > 1:
            data = data.mean(axis=1)

        # Ensure float32 representation in [-1.0, 1.0] without altering natural dynamic range
        if np.issubdtype(data.dtype, np.integer):
            max_int = np.iinfo(data.dtype).max
            data = data.astype(np.float32) / max_int
        else:
            data = data.astype(np.float32)

        # Resample to target model sample rate if necessary (e.g. 8000 -> 22050)
        if sr != self.sample_rate:
            data = librosa.resample(data, orig_sr=sr, target_sr=self.sample_rate)

        # Pad with zeros or truncate to exact model duration window (5.0s for water_leak_cnn)
        if len(data) < self.window_samples:
            data = np.pad(data, (0, self.window_samples - len(data)), mode='constant')
        elif len(data) > self.window_samples:
            data = data[:self.window_samples]

        # Compute Log-Mel Spectrogram (matching water_leak_cnn training parameters)
        mel = librosa.feature.melspectrogram(
            y=data,
            sr=self.sample_rate,
            n_fft=self.n_fft,
            hop_length=self.hop_length,
            n_mels=self.n_mels,
            power=2.0
        )
        log_mel_raw = librosa.power_to_db(mel, ref=np.max)
        norm_spec = (log_mel_raw - np.mean(log_mel_raw)) / (np.std(log_mel_raw) + 1e-6)

        spec_tensor = torch.tensor(norm_spec, dtype=torch.float32).unsqueeze(0).unsqueeze(0)
        return spec_tensor.to(self.device), data, log_mel_raw

    def predict(self, audio_window) -> dict:
        """
        Runs model inference on an audio input.
        Returns: {
            "model_name": "water_leak_cnn",
            "label": "LEAK" | "NO_LEAK",
            "confidence": float (0.0 to 1.0),
            "raw_leak_prob": float (0.0 to 1.0),
            "raw_no_leak_prob": float (0.0 to 1.0),
            "is_leak": bool,
            "class_names": {0: "No Leak", 1: "Leak"}
        }
        """
        spec_tensor, _, _ = self.preprocess_audio(audio_window)
        with torch.no_grad():
            logits = self.model(spec_tensor)
            if logits.ndim > 1 and logits.shape[-1] == 2:
                # 2-class softmax from WaterLeakCNN
                probs = torch.softmax(logits, dim=-1)[0]
                prob_no_leak = float(probs[0].cpu().item())
                prob_leak = float(probs[1].cpu().item())
                is_leak = prob_leak >= 0.5
                label = "LEAK" if is_leak else "NO_LEAK"
                confidence = prob_leak if is_leak else prob_no_leak
            else:
                # 1-class sigmoid fallback
                prob_leak = float(torch.sigmoid(logits.squeeze()).cpu().item())
                prob_no_leak = 1.0 - prob_leak
                is_leak = prob_leak >= 0.5
                label = "LEAK" if is_leak else "NO_LEAK"
                confidence = prob_leak if is_leak else prob_no_leak

        return {
            "model_name": self.model_name,
            "label": label,
            "confidence": round(confidence, 4),
            "raw_leak_prob": round(prob_leak, 4),
            "raw_no_leak_prob": round(prob_no_leak, 4),
            "is_leak": is_leak,
            "class_names": self.class_names
        }


# Global engine instance
_engine = None

def get_engine():
    global _engine
    if _engine is None:
        _engine = LeakInferenceEngine()
    return _engine


def predict(audio_window) -> dict:
    """Primary inference helper function."""
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
        self.sensor_state = {}

    def process_reading(self, sensor_id: str, prediction_result: dict) -> dict:
        is_leak = prediction_result.get("is_leak", False)
        conf = prediction_result.get("confidence", 0.0)

        current_count = self.sensor_state.get(sensor_id, 0)

        if is_leak:
            current_count += 1
            self.sensor_state[sensor_id] = current_count
        else:
            self.sensor_state[sensor_id] = 0
            return {
                "should_alert": False,
                "reason": "Normal acoustic signature (NO_LEAK)",
                "consecutive_leaks": 0,
                "confidence": conf
            }

        if conf >= self.high_conf_threshold:
            return {
                "should_alert": True,
                "reason": f"High confidence leak detected ({conf*100:.1f}% >= {self.high_conf_threshold*100:.0f}%)",
                "consecutive_leaks": current_count,
                "confidence": conf
            }

        if current_count >= self.consecutive_threshold:
            return {
                "should_alert": True,
                "reason": f"Debounce threshold met ({current_count} consecutive LEAK windows)",
                "consecutive_leaks": current_count,
                "confidence": conf
            }

        return {
            "should_alert": False,
            "reason": f"Debounce pending: 1 LEAK window detected (awaiting confirmation)",
            "consecutive_leaks": current_count,
            "confidence": conf
        }

    def reset_sensor(self, sensor_id: str):
        if sensor_id in self.sensor_state:
            self.sensor_state[sensor_id] = 0
