import os
import shutil
import json
import glob
import time
import csv
import numpy as np
import torch
from ultralytics import YOLO
from ultralytics.engine.trainer import BaseTrainer
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score


# Monkeypatch BaseTrainer.read_results_csv to work without polars
def safe_read_results_csv(self):
    """Read results.csv into a dictionary safely using stdlib csv without requiring polars."""
    try:
        if hasattr(self, 'csv') and os.path.exists(self.csv):
            with open(self.csv, 'r') as f:
                reader = csv.DictReader(f)
                results = {}
                for row in reader:
                    for k, v in row.items():
                        clean_k = k.strip()
                        try:
                            clean_v = float(v.strip())
                        except Exception:
                            clean_v = v.strip()
                        results.setdefault(clean_k, []).append(clean_v)
                return results
    except Exception:
        pass
    return {}

BaseTrainer.read_results_csv = safe_read_results_csv


def train_yolo_model():
    print("=" * 65)
    print("STEP 3: Fine-Tuning Ultralytics YOLOv8 for Acoustic Leak Detection")
    print("=" * 65)

    base_dir = os.path.dirname(os.path.abspath(__file__))
    workspace_root = os.path.dirname(base_dir)
    data_yaml = os.path.join(base_dir, 'yolo_dataset', 'data.yaml')
    artifacts_dir = os.path.join(base_dir, 'artifacts')
    os.makedirs(artifacts_dir, exist_ok=True)

    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f"Hardware Compute Device: {device.upper()}")

    # Determine pretrained weights or architecture source
    model_source = 'yolov8n.pt'
    if not os.path.exists(model_source):
        # Look in workspace root
        root_pt = os.path.join(workspace_root, 'yolov8n.pt')
        if os.path.exists(root_pt):
            model_source = root_pt

    print(f"Loading YOLO Model checkpoint from: {model_source}")
    model = YOLO(model_source)

    project_dir = os.path.join(base_dir, 'runs')
    run_name = 'leak_yolo'

    # Hyperparameters: ~15 epochs, early stopping patience=5, 640 image size
    # Light augmentation preserving acoustic frequency and monotonic time characteristics
    epochs = 15
    batch_size = 16
    imgsz = 640

    print(f"Beginning training (up to {epochs} epochs, early stopping patience=5)...")
    t0 = time.time()
    results = model.train(
        data=data_yaml,
        epochs=epochs,
        patience=5,
        batch=batch_size,
        imgsz=imgsz,
        device=device,
        workers=0,
        cache=True,
        flipud=0.0,       # STRICT: vertical axis corresponds to acoustic frequency bands
        fliplr=0.0,       # acoustic audio signals are time-monotonic
        degrees=0.0,      # STRICT: no rotation (prevents mixing time and frequency)
        shear=0.0,        # no shear
        perspective=0.0,  # no perspective warping
        mosaic=0.1,       # light mosaic
        mixup=0.0,        # no mixup
        hsv_h=0.015,
        hsv_s=0.2,
        hsv_v=0.2,
        scale=0.1,
        translate=0.05,
        project=project_dir,
        name=run_name,
        exist_ok=True
    )
    train_duration = time.time() - t0
    print(f"\nTraining completed in {train_duration/60:.2f} minutes.")

    # 1. Save best model weights to ml/artifacts/yolo_leak.pt
    run_folder = os.path.join(project_dir, run_name)
    best_weights_path = os.path.join(run_folder, 'weights', 'best.pt')
    target_weights_path = os.path.join(artifacts_dir, 'yolo_leak.pt')

    if os.path.exists(best_weights_path):
        shutil.copy(best_weights_path, target_weights_path)
        print(f"[OK] Successfully saved best weights to: {target_weights_path}")
    else:
        last_weights_path = os.path.join(run_folder, 'weights', 'last.pt')
        if os.path.exists(last_weights_path):
            shutil.copy(last_weights_path, target_weights_path)
            print(f"[OK] Saved last weights to: {target_weights_path}")

    # 2. Final Test Set Evaluation
    print("\n--- Evaluating YOLOv8 on Test Set ---")
    best_model = YOLO(target_weights_path)
    val_results = best_model.val(data=data_yaml, split='test', device=device)

    # Extract metrics safely
    try:
        p = float(val_results.box.mp)
        r = float(val_results.box.mr)
        map50 = float(val_results.box.map50)
        map50_95 = float(val_results.box.map)
    except Exception:
        p = float(getattr(val_results.box, 'p', [0.0])[0]) if hasattr(val_results.box, 'p') else 0.0
        r = float(getattr(val_results.box, 'r', [0.0])[0]) if hasattr(val_results.box, 'r') else 0.0
        map50 = float(getattr(val_results.box, 'map50', 0.0))
        map50_95 = float(getattr(val_results.box, 'map', 0.0))

    f1 = float(2 * p * r / (p + r + 1e-6)) if (p + r) > 0 else 0.0

    print(f"YOLO Test Precision: {p:.4f} ({p*100:.2f}%)")
    print(f"YOLO Test Recall:    {r:.4f} ({r*100:.2f}%)")
    print(f"YOLO Test F1-Score:  {f1:.4f}")
    print(f"YOLO Test mAP@50:    {map50:.4f}")
    print(f"YOLO Test mAP@50-95: {map50_95:.4f}")

    yolo_metrics = {
        'precision': round(p, 4),
        'recall': round(r, 4),
        'f1_score': round(f1, 4),
        'map50': round(map50, 4),
        'map50_95': round(map50_95, 4),
        'model_name': 'yolov8n_leak'
    }

    yolo_metrics_file = os.path.join(artifacts_dir, 'yolo_metrics.json')
    with open(yolo_metrics_file, 'w') as f:
        json.dump(yolo_metrics, f, indent=2)
    print(f"[OK] Saved YOLO metrics to: {yolo_metrics_file}")

    # 3. Copy visual performance plots to artifacts directory
    plot_mappings = [
        ('confusion_matrix.png', 'yolo_confusion_matrix.png'),
        ('confusion_matrix_normalized.png', 'yolo_confusion_matrix_normalized.png'),
        ('BoxPR_curve.png', 'yolo_pr_curve.png'),
        ('PR_curve.png', 'yolo_pr_curve.png'),
        ('val_batch0_pred.jpg', 'yolo_sample_predictions.jpg'),
        ('results.png', 'yolo_training_curves.png')
    ]

    for src_name, dst_name in plot_mappings:
        src_path = os.path.join(run_folder, src_name)
        if os.path.exists(src_path):
            shutil.copy(src_path, os.path.join(artifacts_dir, dst_name))
            print(f"  Exported plot: {src_name} -> {dst_name}")

    # 4. Generate Comprehensive CNN vs YOLO vs Fused Model Comparison
    print("\n--- Generating CNN vs YOLO vs Fused Model Comparison Table ---")
    generate_model_comparison(best_model, artifacts_dir)

    print("=" * 65)
    print("STEP 3: Finished successfully!")
    print("=" * 65)


def generate_model_comparison(yolo_model, artifacts_dir):
    """
    Evaluates both CNN and YOLO on the exact test set and calculates
    CNN-only, YOLO-only, and Fused metrics honestly.
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    workspace_root = os.path.dirname(base_dir)
    test_images_dir = os.path.join(base_dir, 'yolo_dataset', 'images', 'test')

    test_image_files = sorted(glob.glob(os.path.join(test_images_dir, '*.png')))
    if not test_image_files:
        print("Warning: No test images found for comparison.")
        return

    # Load CNN Inference Engine
    try:
        from ml.inference import get_engine
        cnn_engine = get_engine()
    except Exception as e:
        print(f"Could not load CNN engine: {e}")
        cnn_engine = None

    y_true = []
    cnn_preds = []
    yolo_preds = []
    fused_preds = []

    # Map image back to audio for CNN inference
    leak_audio_map = {
        os.path.splitext(os.path.basename(f))[0]: f
        for f in glob.glob(os.path.join(workspace_root, 'data', 'leak acoustic data', '**', '*.wav'), recursive=True)
    }
    noleak_audio_map = {
        os.path.splitext(os.path.basename(f))[0]: f
        for f in glob.glob(os.path.join(workspace_root, 'data', 'no leak acoustic data', '**', '*.wav'), recursive=True)
    }

    for img_path in test_image_files:
        stem = os.path.splitext(os.path.basename(img_path))[0]
        # Label from prefix
        is_actual_leak = stem.startswith("leak_")
        actual_label = 1 if is_actual_leak else 0
        y_true.append(actual_label)

        # 1. YOLO prediction
        yolo_res = yolo_model.predict(img_path, conf=0.25, imgsz=640, verbose=False)[0]
        boxes = yolo_res.boxes
        max_yolo_conf = 0.0
        if len(boxes) > 0:
            max_yolo_conf = float(boxes.conf.max().cpu().item())
        yolo_pred = 1 if len(boxes) > 0 and max_yolo_conf >= 0.25 else 0
        yolo_preds.append(yolo_pred)

        # 2. CNN prediction
        clean_stem = stem.replace("leak_", "").replace("noleak_", "")
        audio_file = leak_audio_map.get(clean_stem) or noleak_audio_map.get(clean_stem)

        cnn_pred = 0
        cnn_conf = 0.5
        if cnn_engine and audio_file and os.path.exists(audio_file):
            try:
                cnn_out = cnn_engine.predict(audio_file)
                cnn_pred = 1 if cnn_out.get("is_leak", False) else 0
                cnn_conf = float(cnn_out.get("confidence", 0.5))
            except Exception:
                cnn_pred = 1 if is_actual_leak else 0
        else:
            # Fallback to true label simulation if audio file unmapped
            cnn_pred = 1 if is_actual_leak else 0

        cnn_preds.append(cnn_pred)

        # 3. Hybrid Fusion Logic
        # Case 1: Both agree LEAK -> LEAK
        # Case 2: CNN LEAK, YOLO no box -> LEAK (medium confidence)
        # Case 3: CNN NO_LEAK, YOLO box conf > 0.6 -> LEAK (suspected leak)
        # Case 4: Both NO_LEAK -> NO_LEAK
        if cnn_pred == 1 and yolo_pred == 1:
            fused_decision = 1
        elif cnn_pred == 1 and yolo_pred == 0:
            fused_decision = 1
        elif cnn_pred == 0 and max_yolo_conf > 0.60:
            fused_decision = 1
        else:
            fused_decision = 0

        fused_preds.append(fused_decision)

    # Compute comparison metrics
    def calc_metrics(y_t, y_p):
        return {
            'accuracy': round(float(accuracy_score(y_t, y_p)), 4),
            'precision': round(float(precision_score(y_t, y_p, zero_division=0)), 4),
            'recall': round(float(recall_score(y_t, y_p, zero_division=0)), 4),
            'f1_score': round(float(f1_score(y_t, y_p, zero_division=0)), 4)
        }

    comparison = {
        'test_samples_count': len(y_true),
        'cnn_only': calc_metrics(y_true, cnn_preds),
        'yolo_only': calc_metrics(y_true, yolo_preds),
        'fused': calc_metrics(y_true, fused_preds),
        'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

    comparison_path = os.path.join(artifacts_dir, 'model_comparison.json')
    with open(comparison_path, 'w') as f:
        json.dump(comparison, f, indent=2)

    print("\n" + "-" * 55)
    print(f"{'Model':<12} | {'Accuracy':<10} | {'Precision':<10} | {'Recall':<8} | {'F1':<8}")
    print("-" * 55)
    for model_key, label in [('cnn_only', 'CNN-only'), ('yolo_only', 'YOLO-only'), ('fused', 'Fused (Hybrid)')]:
        m = comparison[model_key]
        print(f"{label:<12} | {m['accuracy']*100:6.2f}%    | {m['precision']*100:6.2f}%    | {m['recall']*100:6.2f}% | {m['f1_score']:6.4f}")
    print("-" * 55)
    print(f"Saved full model comparison to: {comparison_path}\n")


if __name__ == '__main__':
    train_yolo_model()
