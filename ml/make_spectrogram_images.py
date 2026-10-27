import os
import re
import glob
import random
import yaml
import numpy as np
import soundfile as sf
import librosa
import matplotlib.pyplot as plt
from PIL import Image
from scipy.ndimage import label, binary_closing, binary_opening
from sklearn.model_selection import train_test_split
import cv2

# Reproducibility
SEED = 42
random.seed(SEED)
np.random.seed(SEED)

# Audio Parameters (Matching CNN exactly)
TARGET_SR = 8000
WINDOW_DURATION = 1.0  # seconds
WINDOW_SAMPLES = int(TARGET_SR * WINDOW_DURATION)  # 8000 samples
N_MELS = 64
N_FFT = 512
HOP_LENGTH = 160  # 8000 / 160 = 50 frames/s (~51 frames)
FMIN = 40
FMAX = TARGET_SR // 2  # 4000 Hz

IMAGE_SIZE = (640, 640)


def extract_recording_id(filename: str) -> str:
    """Extract base recording identifier by removing trailing index like _1, _2."""
    base = os.path.splitext(os.path.basename(filename))[0]
    m = re.match(r'^(.*?)_\d+$', base)
    return m.group(1) if m else base


def audio_to_log_mel(audio: np.ndarray, sr: int = TARGET_SR) -> np.ndarray:
    """
    Standardize waveform and convert to normalized log-mel spectrogram.
    Returns: np.ndarray of shape (N_MELS, T) -> (64, 51)
    """
    max_val = np.max(np.abs(audio))
    if max_val > 1e-5:
        audio = audio / max_val
    else:
        audio = audio - np.mean(audio)

    # Compute mel spectrogram
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
    # Log scale (dB)
    log_mel = librosa.power_to_db(mel, ref=np.max)
    # Normalize (zero mean, unit variance)
    mean = np.mean(log_mel)
    std = np.std(log_mel) + 1e-6
    norm_spec = (log_mel - mean) / std
    return norm_spec.astype(np.float32)


def spec_to_rgb_image(norm_spec: np.ndarray, target_size=IMAGE_SIZE) -> np.ndarray:
    """
    Convert normalized log-mel spectrogram (64, 51) into 640x640 RGB image.
    High frequencies at top (mel bin 63), low frequencies at bottom (mel bin 0).
    """
    # Flip vertically so mel bin 63 (high freq) is top row, mel bin 0 is bottom row
    spec_flipped = np.flipud(norm_spec)
    # Clip normalized values to [-3.0, 3.0] and map to [0.0, 1.0]
    spec_clipped = np.clip(spec_flipped, -3.0, 3.0)
    spec_scaled = (spec_clipped - (-3.0)) / 6.0

    colormap = plt.get_cmap('viridis')
    rgba = colormap(spec_scaled)
    rgb = (rgba[:, :, :3] * 255.0).astype(np.uint8)

    img = Image.fromarray(rgb).resize(target_size, Image.Resampling.BILINEAR)
    return np.array(img)


def extract_leak_bounding_boxes(norm_spec: np.ndarray, percentile: float = 75.0) -> list:
    """
    Auto-generate YOLO bounding boxes for LEAK clips by finding
    the high-energy time-frequency signature in the spectrogram.
    Returns: list of (x_center, y_center, width, height) normalized in [0, 1].
    """
    spec_flipped = np.flipud(norm_spec)
    H, W = spec_flipped.shape  # 64, 51

    thresh = np.percentile(spec_flipped, percentile)
    mask = spec_flipped > thresh

    # Morphological cleanup
    mask = binary_opening(mask, structure=np.ones((2, 2)))
    mask = binary_closing(mask, structure=np.ones((3, 3)))
    labeled_mask, num_features = label(mask)

    if num_features == 0:
        thresh = np.percentile(spec_flipped, 70.0)
        mask = spec_flipped > thresh
        labeled_mask, num_features = label(mask)

    boxes = []
    if num_features > 0:
        component_sizes = [(labeled_mask == i).sum() for i in range(1, num_features + 1)]
        sorted_indices = np.argsort(component_sizes)[::-1]
        max_size = component_sizes[sorted_indices[0]]

        for idx in sorted_indices[:2]:
            c_size = component_sizes[idx]
            if c_size < 0.25 * max_size and len(boxes) >= 1:
                continue

            c_mask = (labeled_mask == (idx + 1))
            rows, cols = np.where(c_mask)
            r_min, r_max = rows.min(), rows.max()
            c_min, c_max = cols.min(), cols.max()

            # Add small padding for acoustic resonance envelope
            r_min = max(0, r_min - 2)
            r_max = min(H - 1, r_max + 2)
            c_min = max(0, c_min - 2)
            c_max = min(W - 1, c_max + 2)

            x_center = float(((c_min + c_max) / 2.0 + 0.5) / W)
            y_center = float(((r_min + r_max) / 2.0 + 0.5) / H)
            width = float(max(0.08, (c_max - c_min + 1) / W))
            height = float(max(0.08, (r_max - r_min + 1) / H))

            x_center = min(max(x_center, width / 2.0), 1.0 - width / 2.0)
            y_center = min(max(y_center, height / 2.0), 1.0 - height / 2.0)
            boxes.append((x_center, y_center, width, height))

    if not boxes:
        # Fallback bounding box in typical leak band
        boxes.append((0.5, 0.65, 0.8, 0.4))

    return boxes


def process_and_save_dataset():
    print("=" * 60)
    print("STEP 1 & 2: Generating 640x640 Spectrogram Images & YOLO Pseudo-Labels")
    print("=" * 60)

    base_dir = os.path.dirname(os.path.abspath(__file__))
    workspace_root = os.path.dirname(base_dir)
    data_dir = os.path.join(workspace_root, 'data')
    dataset_root = os.path.join(base_dir, 'yolo_dataset')

    leak_files = glob.glob(os.path.join(data_dir, 'leak acoustic data', '**', '*.wav'), recursive=True)
    no_leak_files = glob.glob(os.path.join(data_dir, 'no leak acoustic data', '**', '*.wav'), recursive=True)

    print(f"Found {len(leak_files)} LEAK audio clips and {len(no_leak_files)} NO_LEAK audio clips.")

    # 1. Group files by parent recording ID (matching train.py exactly)
    rec_to_files = {}
    rec_to_label = {}

    for f in leak_files:
        rec_id = "LEAK_" + extract_recording_id(f)
        rec_to_files.setdefault(rec_id, []).append((f, 1.0))
        rec_to_label[rec_id] = 1.0

    for f in no_leak_files:
        rec_id = "NOLEAK_" + extract_recording_id(f)
        rec_to_files.setdefault(rec_id, []).append((f, 0.0))
        rec_to_label[rec_id] = 0.0

    unique_recs = sorted(list(rec_to_files.keys()))
    rec_labels = [rec_to_label[r] for r in unique_recs]

    # 2. Recording-level train/val/test split (70% train, 15% val, 15% test)
    train_recs, temp_recs, _, temp_lbls = train_test_split(
        unique_recs, rec_labels, test_size=0.30, random_state=SEED, stratify=rec_labels
    )
    val_recs, test_recs, _, _ = train_test_split(
        temp_recs, temp_lbls, test_size=0.50, random_state=SEED, stratify=temp_lbls
    )

    splits = {
        'train': [item for r in train_recs for item in rec_to_files[r]],
        'val': [item for r in val_recs for item in rec_to_files[r]],
        'test': [item for r in test_recs for item in rec_to_files[r]]
    }

    print("\nRecording-level Split Distribution:")
    for split_name, samples in splits.items():
        n_leak = sum(1 for _, lbl in samples if lbl == 1.0)
        n_noleak = len(samples) - n_leak
        print(f"  {split_name.upper():5s}: {len(samples)} clips ({n_leak} LEAK, {n_noleak} NO_LEAK)")

    # Prepare directories
    for split_name in ['train', 'val', 'test']:
        os.makedirs(os.path.join(dataset_root, 'images', split_name), exist_ok=True)
        os.makedirs(os.path.join(dataset_root, 'labels', split_name), exist_ok=True)
    debug_dir = os.path.join(dataset_root, 'debug_samples')
    os.makedirs(debug_dir, exist_ok=True)

    debug_saved_count = 0
    max_debug_images = 12

    print("\nProcessing audio clips and saving images & labels...")

    for split_name, samples in splits.items():
        img_out_dir = os.path.join(dataset_root, 'images', split_name)
        lbl_out_dir = os.path.join(dataset_root, 'labels', split_name)

        for file_path, lbl in samples:
            raw_stem = os.path.splitext(os.path.basename(file_path))[0]
            prefix = "leak_" if lbl == 1.0 else "noleak_"
            clean_name = f"{prefix}{raw_stem}"
            clean_name = re.sub(r'[^a-zA-Z0-9_\-]', '_', clean_name)

            img_filename = f"{clean_name}.png"
            lbl_filename = f"{clean_name}.txt"
            img_path = os.path.join(img_out_dir, img_filename)
            lbl_path = os.path.join(lbl_out_dir, lbl_filename)

            # Load audio
            data, sr = sf.read(file_path)
            if data.ndim > 1:
                data = data.mean(axis=1)
            if sr != TARGET_SR:
                data = librosa.resample(data, orig_sr=sr, target_sr=TARGET_SR)
            if len(data) < WINDOW_SAMPLES:
                data = np.pad(data, (0, WINDOW_SAMPLES - len(data)), mode='constant')
            elif len(data) > WINDOW_SAMPLES:
                data = data[:WINDOW_SAMPLES]

            norm_spec = audio_to_log_mel(data, TARGET_SR)
            rgb_image = spec_to_rgb_image(norm_spec, IMAGE_SIZE)
            Image.fromarray(rgb_image).save(img_path)

            # Generate YOLO Labels
            label_lines = []
            if lbl == 1.0:
                boxes = extract_leak_bounding_boxes(norm_spec)
                for xc, yc, w, h in boxes:
                    label_lines.append(f"0 {xc:.6f} {yc:.6f} {w:.6f} {h:.6f}")

                # Save debug image
                if debug_saved_count < max_debug_images and split_name == 'train':
                    debug_img = rgb_image.copy()
                    for xc, yc, w, h in boxes:
                        x1 = int((xc - w / 2.0) * IMAGE_SIZE[0])
                        y1 = int((yc - h / 2.0) * IMAGE_SIZE[1])
                        x2 = int((xc + w / 2.0) * IMAGE_SIZE[0])
                        y2 = int((yc + h / 2.0) * IMAGE_SIZE[1])
                        cv2.rectangle(debug_img, (x1, y1), (x2, y2), (0, 255, 255), 2)
                        cv2.putText(debug_img, "leak_signature", (x1, max(18, y1 - 6)),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1, cv2.LINE_AA)
                    debug_path = os.path.join(debug_dir, f"debug_{clean_name}.png")
                    Image.fromarray(debug_img).save(debug_path)
                    debug_saved_count += 1
            else:
                # Pure background: empty file
                label_lines = []

            with open(lbl_path, 'w') as lf:
                if label_lines:
                    lf.write("\n".join(label_lines) + "\n")

    print(f"All images and labels generated successfully!")
    print(f"Saved {debug_saved_count} debug visualization images to: {debug_dir}")

    # 3. Write data.yaml
    data_yaml_path = os.path.join(dataset_root, 'data.yaml')
    yaml_content = {
        'path': 'ml/yolo_dataset',
        'train': 'images/train',
        'val': 'images/val',
        'test': 'images/test',
        'names': {
            0: 'leak_signature'
        }
    }
    with open(data_yaml_path, 'w') as yf:
        yaml.dump(yaml_content, yf, default_flow_style=False)

    print(f"Created YOLO dataset configuration at: {data_yaml_path}")
    print("=" * 60 + "\n")


if __name__ == '__main__':
    process_and_save_dataset()
