import os
# Suppress TensorFlow logging before import
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['PYTHONUNBUFFERED'] = '1'

import sys
try:
    sys.stdout.reconfigure(line_buffering=True)
    sys.stderr.reconfigure(line_buffering=True)
except Exception:
    pass

import time
import socket
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

CLASSES = ['Blotch Apple', 'Normal Apple', 'Rot Apple', 'Scab Apple']

# ================= 1. MODEL LOADING =================
print(f"Loading model from: {MODEL_PATH}...", flush=True)
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

    # Retry socket binding if previous run left socket in TIME_WAIT
    for attempt in range(5):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                s.bind(('0.0.0.0', port))
                break
        except OSError:
            print(f"Port {port} busy, waiting 2s... (attempt {attempt+1}/5)", flush=True)
            time.sleep(2)

    uvicorn.run(app, host="0.0.0.0", port=port)
