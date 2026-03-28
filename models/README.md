# Model Assets Placeholder

This directory is reserved for compiled model weights and serialized ML objects (`.pkl`, `.pt`, `.onnx`).

### Current Implementation
- `backend/app/detection.py` currently uses a lightweight heuristic baseline (keyword matching in filenames) for the capstone demo.

### Planned ML Integration (Phase 2)
- **Computer Vision Model**: ResNet-50 for ingredient detection from user uploads.
- **NLP Model**: spaCy/BERT for advanced recipe intent classification.
- **Framework**: PyTorch / TensorFlow.

*(Model weights are ignored in source control via `.gitignore` to prevent repository bloat.)*
