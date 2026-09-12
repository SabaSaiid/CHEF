# Machine Learning & Computer Vision Assets

This directory documents the computer vision architecture, model weights, training pipelines, and portion estimation algorithms utilized by **CHEF**.

---

## 🧠 Model Architecture & Multi-Tier Pipeline

Food detection is handled by `backend/app/routers/detection.py` through a resilient, three-tier fallback pipeline:

```
                  ┌──────────────────────────────────────────────┐
                  │          Uploaded Food Image                 │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │ Tier 1: Custom YOLOv8 on Food-101 (Primary)   │
                  │   • 101 Prepared Dish Classes                │
                  │   • Bounding Box Area Geometric Analysis     │
                  │   • Portion & Caloric Derivation             │
                  └──────────────────────┬───────────────────────┘
                                         │ (If weights not found)
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │ Tier 2: Pre-trained YOLOv8n (COCO Fallback)  │
                  │   • 10 Base Food Classes (Fruits/Produce)    │
                  │   • 0.25 Confidence Threshold                │
                  └──────────────────────┬───────────────────────┘
                                         │ (If PyTorch/Ultralytics omitted)
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │ Tier 3: Heuristic Mock Inference Mode        │
                  │   • Deterministic sample detection for       │
                  │     resource-constrained cloud hosting (HF)  │
                  └──────────────────────────────────────────────┘
```

---

## 🍽️ Tier 1: Food-101 Dish Classes (101 Categories)

Trained on the ETH Zurich Food-101 benchmark dataset, supporting complex prepared dishes:
- **Salads & Soups**: Caesar salad, Greek salad, Caprese salad, Miso soup, Clam chowder, Pho, French onion soup, Hot and sour soup.
- **Entrees & Mains**: Chicken curry, Pad Thai, Lasagna, Gnocchi, Risotto, Steak (Filet mignon), Grilled salmon, Paella, Bibimbap, Ravioli, Spaghetti bolognese.
- **Street Foods & Snacks**: Samosa, Falafel, Tacos, Nachos, Hamburger, Hot dog, Dumplings, Gyoza, Spring rolls, French fries, Onion rings.
- **Breakfast Items**: Pancakes, Waffles, French toast, Eggs benedict, Omelette, Huevos rancheros.
- **Desserts & Sweets**: Baklava, Apple pie, Cheesecake, Tiramisu, Churros, Macarons, Creme brulee, Chocolate cake, Cannoli, Beignets.

---

## ⚖️ Geometric Portion Size & Calorie Estimation

The computer vision engine estimates food mass directly from visual bounding box geometry:

1. **Normalized Bounding Box Area**:
   $$\text{Area} = (x_2 - x_1) \times (y_2 - y_1)$$
2. **Serving Scale Factor**:
   A reference bounding box occupying $\sim 25\%$ of the image ($0.25$) corresponds to a standard single serving:
   $$\text{Scale} = \sqrt{\frac{\text{Area}}{0.25}}$$
3. **Gram Weight Derivation**:
   $$\text{Weight}_{\text{estimated}} = \text{clamp}\left(\text{round}(\text{Serving}_{\text{base}} \times \text{Scale}), \text{Min}_{\text{portion}}, \text{Max}_{\text{portion}}\right)$$
4. **Caloric Calculation**:
   $$\text{Calories}_{\text{estimated}} = \text{round}\left(\text{Weight}_{\text{estimated}} \times \frac{\text{Cal}_{\text{per 100g}}}{100}\right)$$

---

## 🏋️ Training Pipeline & Colab Script

To fine-tune YOLOv8 Nano on the Food-101 dataset:
- Script: [`scripts/train_food101_colab.py`](../scripts/train_food101_colab.py)
- Features: Automatic dataset download from Kaggle/ETH, conversion of annotations to YOLO format, hyperparameter configuration (batch size 16, 50 epochs), and export of `best.pt`.
- Deployment: Place fine-tuned weights file at `backend/yolov8_food101.pt` or `models/yolov8_food101.pt`. The detection service will automatically detect and prioritize it over stock YOLOv8n.

*(Note: Pre-trained `.pt` weights files are excluded from Git version control via `.gitignore` to maintain a lightweight repository size).*
