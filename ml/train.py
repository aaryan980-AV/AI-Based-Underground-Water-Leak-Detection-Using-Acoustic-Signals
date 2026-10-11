import os
import re
import glob
import json
import random
import numpy as np
import soundfile as sf
import librosa
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    roc_curve
)

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader

# Set seeds for reproducibility
SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)

TARGET_SR = 8000
WINDOW_DURATION = 1.0  # seconds
WINDOW_SAMPLES = int(TARGET_SR * WINDOW_DURATION)  # 8000 samples
N_MELS = 64
N_FFT = 512
HOP_LENGTH = 160  # 8000 / 160 = 50 frames/s (~51 frames total)


def extract_recording_id(filename: str) -> str:
    """Extract base recording identifier by removing trailing index like _1, _2."""
    base = os.path.splitext(os.path.basename(filename))[0]
    m = re.match(r'^(.*?)_\d+$', base)
    return m.group(1) if m else base


def audio_to_log_mel(audio: np.ndarray, sr: int = TARGET_SR) -> np.ndarray:
    """
    Standardize waveform and convert to normalized log-mel spectrogram.
    Returns: np.ndarray of shape (N_MELS, T)
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
        fmin=40,
        fmax=TARGET_SR // 2,
        power=2.0
    )
    # Log scale (dB)
    log_mel = librosa.power_to_db(mel, ref=np.max)
    # Normalize (zero mean, unit variance)
    mean = np.mean(log_mel)
    std = np.std(log_mel) + 1e-6
    norm_spec = (log_mel - mean) / std
    return norm_spec.astype(np.float32)


class TensorAudioDataset(Dataset):
    """Fast in-memory dataset with on-the-fly PyTorch tensor augmentations."""
    def __init__(self, specs, labels, is_train=False):
        self.specs = specs  # List of torch tensors (1, 64, 51)
        self.labels = labels  # List of floats
        self.is_train = is_train

    def __len__(self):
        return len(self.specs)

    def __getitem__(self, idx):
        spec = self.specs[idx].clone()
        label = self.labels[idx]

        if self.is_train:
            # 1. SpecAugment - Frequency Masking
            if random.random() < 0.4:
                num_mels = spec.shape[1]
                f = random.randint(1, 8)
                f0 = random.randint(0, max(0, num_mels - f))
                spec[0, f0:f0 + f, :] = 0.0

            # 2. SpecAugment - Time Masking
            if random.random() < 0.4:
                num_steps = spec.shape[2]
                t = random.randint(1, 8)
                t0 = random.randint(0, max(0, num_steps - t))
                spec[0, :, t0:t0 + t] = 0.0

            # 3. Additive noise
            if random.random() < 0.3:
                noise = torch.randn_like(spec) * 0.05
                spec = spec + noise

        return spec, torch.tensor(label, dtype=torch.float32)


class LeakCNN(nn.Module):
    """
    3-4 Convolutional Block Architecture with BatchNorm, Dropout & Adaptive Pooling.
    """
    def __init__(self, dropout_rate=0.25):
        super(LeakCNN, self).__init__()
        # Input shape: (B, 1, 64, 51)
        self.conv_blocks = nn.Sequential(
            # Block 1
            nn.Conv2d(1, 32, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),  # -> (32, 32, 25)
            nn.Dropout2d(0.15),

            # Block 2
            nn.Conv2d(32, 64, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),  # -> (64, 16, 12)
            nn.Dropout2d(0.20),

            # Block 3
            nn.Conv2d(64, 128, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),  # -> (128, 8, 6)
            nn.Dropout2d(0.25),

            # Block 4
            nn.Conv2d(128, 128, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d((1, 1)),  # -> (128, 1, 1)
            nn.Flatten()
        )
        self.fc = nn.Sequential(
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(dropout_rate),
            nn.Linear(64, 1)  # Logits
        )

    def forward(self, x):
        features = self.conv_blocks(x)
        logits = self.fc(features).squeeze(-1)
        return logits


def train_and_evaluate():
    print(">>> [STEP 1] Initializing Water Leak Audio Pipeline...", flush=True)

    data_dir = 'data'
    leak_files = glob.glob(os.path.join(data_dir, 'leak acoustic data', '**', '*.wav'), recursive=True)
    no_leak_files = glob.glob(os.path.join(data_dir, 'no leak acoustic data', '**', '*.wav'), recursive=True)

    print(f"Discovered {len(leak_files)} LEAK files and {len(no_leak_files)} NO_LEAK files.", flush=True)

    # 1. Group files by parent recording ID
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

    # 2. Split train/val/test BY ORIGINAL RECORDING (zero data leakage)
    train_recs, temp_recs, _, temp_lbls = train_test_split(
        unique_recs, rec_labels, test_size=0.30, random_state=SEED, stratify=rec_labels
    )
    val_recs, test_recs, _, _ = train_test_split(
        temp_recs, temp_lbls, test_size=0.50, random_state=SEED, stratify=temp_lbls
    )

    train_samples = [item for r in train_recs for item in rec_to_files[r]]
    val_samples = [item for r in val_recs for item in rec_to_files[r]]
    test_samples = [item for r in test_recs for item in rec_to_files[r]]

    print(f"\nRecording-level Split:", flush=True)
    print(f"  Train: {len(train_recs)} recordings -> {len(train_samples)} windows", flush=True)
    print(f"  Val:   {len(val_recs)} recordings -> {len(val_samples)} windows", flush=True)
    print(f"  Test:  {len(test_recs)} recordings -> {len(test_samples)} windows", flush=True)

    # 3. Pre-extract Log-Mel Spectrograms into memory
    print("\nPre-extracting Log-Mel Spectrograms into memory...", flush=True)
    def load_and_preprocess(sample_list):
        specs = []
        labels = []
        for file_path, lbl in sample_list:
            data, sr = sf.read(file_path)
            if data.ndim > 1:
                data = data.mean(axis=1)
            if sr != TARGET_SR:
                data = librosa.resample(data, orig_sr=sr, target_sr=TARGET_SR)
            if len(data) < WINDOW_SAMPLES:
                data = np.pad(data, (0, WINDOW_SAMPLES - len(data)), mode='constant')
            elif len(data) > WINDOW_SAMPLES:
                data = data[:WINDOW_SAMPLES]
            spec = audio_to_log_mel(data, TARGET_SR)
            spec_tensor = torch.tensor(spec, dtype=torch.float32).unsqueeze(0)  # (1, 64, 51)
            specs.append(spec_tensor)
            labels.append(lbl)
        return specs, labels

    train_specs, train_labels = load_and_preprocess(train_samples)
    val_specs, val_labels = load_and_preprocess(val_samples)
    test_specs, test_labels = load_and_preprocess(test_samples)
    print(f"Pre-extraction complete! Total windows: {len(train_specs) + len(val_specs) + len(test_specs)}", flush=True)

    train_ds = TensorAudioDataset(train_specs, train_labels, is_train=True)
    val_ds = TensorAudioDataset(val_specs, val_labels, is_train=False)
    test_ds = TensorAudioDataset(test_specs, test_labels, is_train=False)

    train_loader = DataLoader(train_ds, batch_size=32, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=32, shuffle=False)
    test_loader = DataLoader(test_ds, batch_size=32, shuffle=False)

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = LeakCNN().to(device)

    # Class weighting to prioritize recall on LEAK class
    n_neg = sum(1 for y in train_labels if y == 0.0)
    n_pos = sum(1 for y in train_labels if y == 1.0)
    # Slightly favor leak detection recall
    pos_weight = torch.tensor([float(n_neg) / max(1.0, float(n_pos)) * 1.2], device=device)
    print(f"Calculated BCE pos_weight: {pos_weight.item():.4f}", flush=True)

    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
    optimizer = optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='max', factor=0.5, patience=3)

    epochs = 20
    best_val_f1 = -1.0
    best_state = None
    history = {'train_loss': [], 'val_loss': [], 'val_f1': [], 'val_acc': []}

    print("\n--- Training CNN Classifier (20 Epochs) ---", flush=True)
    for epoch in range(1, epochs + 1):
        model.train()
        total_loss = 0.0
        for specs, lbls in train_loader:
            specs, lbls = specs.to(device), lbls.to(device)
            optimizer.zero_grad()
            logits = model(specs)
            loss = criterion(logits, lbls)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * len(lbls)

        train_loss = total_loss / len(train_ds)

        # Validation
        model.eval()
        val_loss = 0.0
        val_preds_list = []
        val_targets_list = []
        with torch.no_grad():
            for specs, lbls in val_loader:
                specs, lbls = specs.to(device), lbls.to(device)
                logits = model(specs)
                loss = criterion(logits, lbls)
                val_loss += loss.item() * len(lbls)
                probs = torch.sigmoid(logits).cpu().numpy()
                val_preds_list.extend(probs)
                val_targets_list.extend(lbls.cpu().numpy())

        val_loss /= len(val_ds)
        val_preds_bin = (np.array(val_preds_list) >= 0.5).astype(int)
        val_targets = np.array(val_targets_list).astype(int)

        val_acc = accuracy_score(val_targets, val_preds_bin)
        val_f1 = f1_score(val_targets, val_preds_bin, zero_division=0)
        scheduler.step(val_f1)

        history['train_loss'].append(train_loss)
        history['val_loss'].append(val_loss)
        history['val_f1'].append(val_f1)
        history['val_acc'].append(val_acc)

        print(f"Epoch {epoch:02d}/{epochs:02d} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.4f} | Val F1: {val_f1:.4f}", flush=True)

        if val_f1 > best_val_f1:
            best_val_f1 = val_f1
            best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}

    # Load best weights
    if best_state is not None:
        model.load_state_dict(best_state)

    os.makedirs('ml/artifacts', exist_ok=True)
    model_save_path = 'ml/artifacts/leak_detector.pt'
    torch.save(model.state_dict(), model_save_path)
    print(f"\nSaved optimized model weights to: {model_save_path}", flush=True)

    # Evaluate on Test Set
    print("\n--- Final Test Set Evaluation ---", flush=True)
    model.eval()
    test_probs = []
    test_targets = []
    with torch.no_grad():
        for specs, lbls in test_loader:
            specs = specs.to(device)
            logits = model(specs)
            probs = torch.sigmoid(logits).cpu().numpy()
            test_probs.extend(probs)
            test_targets.extend(lbls.numpy())

    test_probs = np.array(test_probs)
    test_targets = np.array(test_targets).astype(int)
    test_preds = (test_probs >= 0.5).astype(int)

    acc = accuracy_score(test_targets, test_preds)
    prec = precision_score(test_targets, test_preds, zero_division=0)
    rec = recall_score(test_targets, test_preds, zero_division=0)
    f1 = f1_score(test_targets, test_preds, zero_division=0)
    roc_auc = roc_auc_score(test_targets, test_probs)
    cm = confusion_matrix(test_targets, test_preds)

    print(f"Test Accuracy:  {acc:.4f} ({acc*100:.2f}%)", flush=True)
    print(f"Test Precision: {prec:.4f} ({prec*100:.2f}%)", flush=True)
    print(f"Test Recall:    {rec:.4f} ({rec*100:.2f}%) [Leak Recall Prioritized]", flush=True)
    print(f"Test F1-Score:  {f1:.4f}", flush=True)
    print(f"Test ROC-AUC:   {roc_auc:.4f}", flush=True)
    print("\nConfusion Matrix:", flush=True)
    print(cm, flush=True)

    # 1. Confusion Matrix Plot
    plt.figure(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=['NO_LEAK', 'LEAK'],
                yticklabels=['NO_LEAK', 'LEAK'],
                cbar=False)
    plt.title(f'Confusion Matrix (Accuracy: {acc*100:.1f}%)')
    plt.xlabel('Predicted Class')
    plt.ylabel('Actual Class')
    plt.tight_layout()
    cm_path = 'ml/artifacts/confusion_matrix.png'
    plt.savefig(cm_path, dpi=200)
    plt.close()
    print(f"Saved confusion matrix plot to: {cm_path}", flush=True)

    # 2. ROC Curve Plot
    fpr, tpr, _ = roc_curve(test_targets, test_probs)
    plt.figure(figsize=(6, 5))
    plt.plot(fpr, tpr, color='#0284c7', lw=2.5, label=f'CNN ROC (AUC = {roc_auc:.3f})')
    plt.plot([0, 1], [0, 1], color='#94a3b8', lw=1.5, linestyle='--')
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate (Recall)')
    plt.title('ROC Curve - Leak Detection')
    plt.legend(loc='lower right')
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    roc_path = 'ml/artifacts/roc_curve.png'
    plt.savefig(roc_path, dpi=200)
    plt.close()
    print(f"Saved ROC curve plot to: {roc_path}", flush=True)

    # 3. Learning Curves Plot
    plt.figure(figsize=(10, 4))
    plt.subplot(1, 2, 1)
    plt.plot(history['train_loss'], label='Train Loss', color='#2563eb', lw=2)
    plt.plot(history['val_loss'], label='Val Loss', color='#dc2626', lw=2)
    plt.title('Loss Progression')
    plt.xlabel('Epoch')
    plt.ylabel('BCE Loss')
    plt.legend()
    plt.grid(True, alpha=0.3)

    plt.subplot(1, 2, 2)
    plt.plot(history['val_f1'], label='Val F1', color='#16a34a', lw=2)
    plt.plot(history['val_acc'], label='Val Accuracy', color='#9333ea', lw=2)
    plt.title('Validation Metrics')
    plt.xlabel('Epoch')
    plt.ylabel('Score')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()

    curves_path = 'ml/artifacts/training_curves.png'
    plt.savefig(curves_path, dpi=200)
    plt.close()
    print(f"Saved training curves to: {curves_path}", flush=True)

    # 4. Save metrics.json for backend & frontend
    metrics_summary = {
        'accuracy': round(float(acc), 4),
        'precision': round(float(prec), 4),
        'recall': round(float(rec), 4),
        'f1_score': round(float(f1), 4),
        'roc_auc': round(float(roc_auc), 4),
        'confusion_matrix': cm.tolist(),
        'test_counts': {
            'total': int(len(test_targets)),
            'leak': int(sum(test_targets)),
            'no_leak': int(len(test_targets) - sum(test_targets))
        },
        'roc_curve': {
            'fpr': [round(float(x), 4) for x in fpr[::max(1, len(fpr)//20)]],
            'tpr': [round(float(x), 4) for x in tpr[::max(1, len(tpr)//20)]]
        }
    }
    with open('ml/artifacts/metrics.json', 'w') as f:
        json.dump(metrics_summary, f, indent=2)
    print("Saved metrics to: ml/artifacts/metrics.json", flush=True)
    print(">>> [STEP 1] Model training and evaluation finished successfully!\n", flush=True)


if __name__ == '__main__':
    train_and_evaluate()
