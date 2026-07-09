"""
🍽️ CHEF — Train YOLOv8 on Food-101 Dataset
=============================================

HOW TO USE THIS IN GOOGLE COLAB:
1. Go to https://colab.research.google.com
2. Click File → New notebook
3. Change runtime to GPU: Runtime → Change runtime type → T4 GPU → Save
4. Copy-paste each section below into separate cells (or paste everything into one cell)
5. Click Runtime → Run all
6. Training takes ~2-3 hours on the free T4 GPU
7. The trained model file will auto-download when finished
8. Place the downloaded 'food101_yolov8.pt' file in your CHEF/backend/ directory
"""

# ══════════════════════════════════════════════════════════════
#  CELL 1: Install Dependencies & Mount Drive
# ══════════════════════════════════════════════════════════════

!pip install ultralytics roboflow datasets Pillow tqdm

from google.colab import drive
import os

print("Mounting Google Drive to save progress...")
drive.mount('/content/drive')

# Create a folder in Google Drive to save the model
DRIVE_SAVE_PATH = "/content/drive/MyDrive/CHEF_Model_Training"
os.makedirs(DRIVE_SAVE_PATH, exist_ok=True)
print(f"Checkpoints will be safely saved to: {DRIVE_SAVE_PATH}")

# ══════════════════════════════════════════════════════════════
#  CELL 2: Download & Prepare Food-101 Dataset
# ══════════════════════════════════════════════════════════════

import os
from pathlib import Path
from datasets import load_dataset
from PIL import Image
from tqdm import tqdm

print("📥 Downloading Food-101 dataset from Hugging Face...")
ds = load_dataset("ethz/food101")

# Get class names
class_names = ds["train"].features["label"].names
num_classes = len(class_names)
print(f"✅ {num_classes} classes: {class_names[:10]}... (showing first 10)")

# Create YOLOv8 classification directory structure
# YOLOv8 classification expects: dataset/train/class_name/image.jpg

BASE_DIR = Path("/content/food101_yolo")

for split in ["train", "validation"]:
    split_name = "val" if split == "validation" else "train"
    print(f"\n📂 Preparing {split_name} split...")

    for cls_name in class_names:
        (BASE_DIR / split_name / cls_name).mkdir(parents=True, exist_ok=True)

    for i, sample in enumerate(tqdm(ds[split], desc=f"Saving {split_name}")):
        label_idx = sample["label"]
        cls_name = class_names[label_idx]
        img: Image.Image = sample["image"]

        # Save as JPEG
        save_path = BASE_DIR / split_name / cls_name / f"{i:06d}.jpg"
        if img.mode != "RGB":
            img = img.convert("RGB")
        img.save(save_path, "JPEG", quality=85)

print(f"\n✅ Dataset prepared at {BASE_DIR}")
print(f"   Train: {len(ds['train'])} images")
print(f"   Val:   {len(ds['validation'])} images")


# ══════════════════════════════════════════════════════════════
#  CELL 3: Train YOLOv8 Classification Model
# ══════════════════════════════════════════════════════════════

from ultralytics import YOLO
from pathlib import Path

checkpoint_path = Path(f"{DRIVE_SAVE_PATH}/food101_yolov8/weights/last.pt")

if checkpoint_path.exists():
    print(f"🔄 Found checkpoint in Google Drive! Resuming from {checkpoint_path}")
    model = YOLO(str(checkpoint_path))
else:
    print("🚀 Starting fresh training... This will take ~2-3 hours on a T4 GPU.")
    model = YOLO("yolov8n-cls.pt")

print("🚀 Starting training... This will take ~2-3 hours on a T4 GPU.")
print("   You can close this tab — Colab will keep running.")
print()

# Train on Food-101
results = model.train(
    data=str(BASE_DIR),
    epochs=30,
    imgsz=224,
    batch=64,
    patience=5,           # Early stopping if no improvement for 5 epochs
    optimizer="AdamW",
    lr0=0.001,
    weight_decay=0.01,
    augment=True,
    project=DRIVE_SAVE_PATH,      # Save directly to Google Drive!
    name="food101_yolov8",
    exist_ok=True,
    verbose=True,
    resume=True,                  # Automatically resume if interrupted and restarted
)

print("\n🎉 Training complete!")


# ══════════════════════════════════════════════════════════════
#  CELL 4: Evaluate & Export the Model
# ══════════════════════════════════════════════════════════════

# Validate on the test set
metrics = model.val()
print(f"\n📊 Validation Results:")
print(f"   Top-1 Accuracy: {metrics.top1:.2%}")
print(f"   Top-5 Accuracy: {metrics.top5:.2%}")

import shutil
from google.colab import files

# Copy best weights to a clean filename
# Copy best weights to a clean filename in your Drive
best_weights = Path(f"{DRIVE_SAVE_PATH}/food101_yolov8/weights/best.pt")
output_path = Path(f"{DRIVE_SAVE_PATH}/food101_yolov8.pt")

if best_weights.exists():
    shutil.copy(best_weights, output_path)
    size_mb = output_path.stat().st_size / (1024 * 1024)
    print(f"✅ Model saved: {output_path} ({size_mb:.1f} MB)")
    print("\n📦 Downloading to your computer...")
    files.download(str(output_path))
else:
    print("❌ Best weights not found. Check training logs above.")
    # Try last weights as fallback
    last_weights = Path(f"{DRIVE_SAVE_PATH}/food101_yolov8/weights/last.pt")
    if last_weights.exists():
        shutil.copy(last_weights, output_path)
        print(f"⚠️  Using last checkpoint instead: {output_path}")
        files.download(str(output_path))


# ══════════════════════════════════════════════════════════════
#  CELL 5: Quick Test (Optional)
# ══════════════════════════════════════════════════════════════

from google.colab import files as colab_files

print("📸 Upload a food image to test the model:")
uploaded = colab_files.upload()

if uploaded:
    test_model = YOLO(str(output_path))
    for filename in uploaded.keys():
        results = test_model.predict(filename, verbose=False)
        for r in results:
            top5 = r.probs.top5
            top5conf = r.probs.top5conf.tolist()
            print(f"\n🍽️ Predictions for {filename}:")
            for i, (cls_id, conf) in enumerate(zip(top5, top5conf)):
                print(f"   {i+1}. {r.names[cls_id]:25s} → {conf:.1%}")

# ══════════════════════════════════════════════════════════════
#  DONE!
#
#  Your food101_yolov8.pt file has been downloaded.
#
#  Next step: Place it in your CHEF project:
#
#  CHEF/
#    backend/
#      food101_yolov8.pt   ← put it here
#      app/
#      ...
#
#  The backend will automatically detect and use the
#  Food-101 model on the next startup!
# ══════════════════════════════════════════════════════════════
