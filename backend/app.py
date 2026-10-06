import os
# Suppress TensorFlow logging before import
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['PYTHONUNBUFFERED'] = '1'

import sys
import urllib.request
import warnings
warnings.filterwarnings('ignore')

try:
    sys.stdout.reconfigure(line_buffering=True)
    sys.stderr.reconfigure(line_buffering=True)
except Exception:
    pass

from pathlib import Path
from PIL import Image
import numpy as np
import io

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import gradio as gr
import uvicorn

# Base directory
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "apple_disease_model.tflite"
GITHUB_MODEL_URL = "https://github.com/Rameez-ai/Bazgar-AI/raw/main/backend/apple_disease_model.tflite"

CLASSES = ['Blotch Apple', 'Normal Apple', 'Rot Apple', 'Scab Apple']

# ================= 1. VERIFY & LOAD MODEL =================
def ensure_model_file(path: Path) -> Path:
    """Verifies the model file is authentic (~12.5MB and TFL3 header). If corrupt/LFS, downloads from GitHub."""
    needs_download = False
    if not path.exists():
        print(f"⚠️ Model file not found at {path}.", flush=True)
        needs_download = True
    else:
        file_size = path.stat().st_size
        print(f"Found model file: {path} (size: {file_size} bytes)", flush=True)
        if file_size < 10_000_000:
            print(f"⚠️ File size ({file_size} bytes) is too small, expected ~12.5 MB. Likely Git LFS pointer or corrupt upload.", flush=True)
            needs_download = True
        else:
            try:
                with open(path, "rb") as f:
                    header = f.read(16)
                    if len(header) >= 8 and header[4:8] == b"TFL3":
                        print("✅ Model header validated (TFL3).", flush=True)
                    else:
                        print(f"⚠️ Invalid TFLite header: {header[:16]!r}", flush=True)
                        needs_download = True
            except Exception as e:
                print(f"⚠️ Error reading model file: {e}", flush=True)
                needs_download = True

    if needs_download:
        print(f"⬇️ Downloading clean 12.5 MB model from GitHub: {GITHUB_MODEL_URL}...", flush=True)
        try:
            urllib.request.urlretrieve(GITHUB_MODEL_URL, str(path))
            new_size = path.stat().st_size
            print(f"✅ Successfully downloaded model! Size: {new_size} bytes.", flush=True)
        except Exception as e:
            print(f"❌ Failed to download model from GitHub: {e}", flush=True)

    return path

MODEL_PATH = ensure_model_file(MODEL_PATH)

print(f"Loading TFLite model from: {MODEL_PATH}...", flush=True)
interpreter = None
input_details = None
output_details = None

try:
    import tensorflow as tf
    interpreter = tf.lite.Interpreter(model_path=str(MODEL_PATH))
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    print(f"✅ Model loaded successfully! Input shape: {input_details[0]['shape']}", flush=True)
except Exception as e:
    print(f"❌ Error loading model: {e}", flush=True)

# Helper functions
def preprocess_pil_image(image: Image.Image):
    if image.mode != 'RGB':
        image = image.convert('RGB')
    image = image.resize((224, 224))
    image_array = np.array(image, dtype=np.float32) / 255.0
    return np.expand_dims(image_array, axis=0)

def run_inference(image_array):
    if not interpreter:
        raise RuntimeError("Model is not loaded on server")
    interpreter.set_tensor(input_details[0]['index'], image_array)
    interpreter.invoke()
    predictions = interpreter.get_tensor(output_details[0]['index'])
    predicted_class_idx = int(np.argmax(predictions[0]))
    confidence = float(np.max(predictions[0]) * 100)
    all_probabilities = {
        CLASSES[i]: float(predictions[0][i] * 100)
        for i in range(len(CLASSES))
    }
    return predicted_class_idx, CLASSES[predicted_class_idx], confidence, all_probabilities

# ================= 2. FASTAPI APP =================
app = FastAPI(title="Bazgar Sangat AI Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    if interpreter:
        return {"status": "ready", "model_loaded": True}
    return JSONResponse(status_code=503, content={"status": "error", "model_loaded": False})

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if not interpreter:
        raise HTTPException(status_code=503, detail="Model not loaded on server")
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    try:
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes))
        processed_image = preprocess_pil_image(image)
        class_idx, class_name, confidence, all_probs = run_inference(processed_image)
        return JSONResponse({
            "success": True,
            "prediction": {
                "class_index": class_idx,
                "class_name": class_name,
                "confidence": round(confidence, 2),
                "all_probabilities": all_probs
            }
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.post("/predict-batch")
async def predict_batch(files: list[UploadFile] = File(...)):
    if not interpreter:
        raise HTTPException(status_code=503, detail="Model not loaded on server")
    results = []
    for file in files:
        try:
            image_bytes = await file.read()
            image = Image.open(io.BytesIO(image_bytes))
            processed_image = preprocess_pil_image(image)
            _, class_name, confidence, _ = run_inference(processed_image)
            results.append({"filename": file.filename, "class_name": class_name, "confidence": round(confidence, 2)})
        except Exception as e:
            results.append({"filename": file.filename, "error": str(e)})
    return JSONResponse({"success": True, "results": results})

# ================= 3. GRADIO UI =================
def gradio_predict(img):
    if img is None:
        return "Please upload an image."
    if not interpreter:
        return "Model not loaded on server."
    pil_img = Image.fromarray(img) if isinstance(img, np.ndarray) else img
    processed = preprocess_pil_image(pil_img)
    _, _, _, all_probs = run_inference(processed)
    return {k: v / 100.0 for k, v in all_probs.items()}

with gr.Blocks(title="Bazgar Sangat AI") as demo:
    gr.Markdown("# 🍎 Bazgar Sangat AI - Apple Disease Detection")
    gr.Markdown("Upload an apple leaf image to detect diseases. REST API available at `/predict` and `/health`.")
    with gr.Row():
        with gr.Column():
            input_image = gr.Image(type="numpy", label="Upload Apple Leaf Image")
            predict_btn = gr.Button("Analyze Disease", variant="primary")
        with gr.Column():
            output_label = gr.Label(num_top_classes=4, label="Diagnosis & Confidence")
    predict_btn.click(fn=gradio_predict, inputs=input_image, outputs=output_label)

# ================= 4. MOUNT GRADIO ON FASTAPI =================
app = gr.mount_gradio_app(app, demo, path="/")

# ================= 5. START SERVER =================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    print(f"🚀 Starting Bazgar AI server on 0.0.0.0:{port}...", flush=True)
    uvicorn.run(app, host="0.0.0.0", port=port)
