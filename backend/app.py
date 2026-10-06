from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import numpy as np
import io
import os
import sys
import time
import socket
import urllib.request
from pathlib import Path
import uvicorn
import gradio as gr

# 1. Initialize FastAPI app
app = FastAPI(title="Bazgar Sangat AI - Apple Disease Detection API")

# Enable CORS for frontend (Vercel, localhost, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base directory for resolving file paths
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "apple_disease_model.tflite"

# GitHub raw URL fallback if local file is missing, corrupt, or an LFS pointer
GITHUB_MODEL_URL = "https://raw.githubusercontent.com/Rameez-ai/Bazgar-AI/main/backend/apple_disease_model.tflite"

# Disease classes
CLASSES = ['Blotch Apple', 'Normal Apple', 'Rot Apple', 'Scab Apple']

def verify_and_prepare_model_file(path: Path) -> Path:
    """Verifies that the model file exists, is valid, and not an empty or LFS pointer file."""
    # A genuine TFLite model for this project is ~12.5 MB (12,566,528 bytes)
    # LFS text pointers or corrupted files are typically < 1 MB
    is_invalid = False
    if not path.exists():
        print(f"⚠️ Model file does not exist at: {path}")
        is_invalid = True
    else:
        file_size = path.stat().st_size
        print(f"Found model file: {path} (size: {file_size} bytes)")
        if file_size < 5_000_000:
            print(f"⚠️ Model file is too small ({file_size} bytes), expected ~12.5 MB. Likely a Git LFS pointer or incomplete upload.")
            is_invalid = True

    if is_invalid:
        print("⬇️ Downloading authentic 12.5 MB model from GitHub...")
        try:
            urllib.request.urlretrieve(GITHUB_MODEL_URL, str(path))
            print(f"✅ Successfully downloaded model from GitHub! Size: {path.stat().st_size} bytes.")
        except Exception as err:
            print(f"❌ Failed to download model from GitHub: {err}")
    
    return path

# Safe Model Loader compatible with Python 3.12 (ai_edge_litert, tflite_runtime, or tensorflow)
def load_tflite_model(model_file: Path):
    model_file = verify_and_prepare_model_file(model_file)
    print(f"Loading TFLite model from: {model_file}...")
    interp = None
    
    # 1. Try modern Google LiteRT (recommended for Python 3.12)
    try:
        from ai_edge_litert.interpreter import Interpreter
        print("Using ai_edge_litert...")
        interp = Interpreter(model_path=str(model_file))
        interp.allocate_tensors()
        print("✅ Model loaded successfully with ai_edge_litert!")
        return interp
    except Exception as e:
        print(f"ai_edge_litert load note: {e}")

    # 2. Try tflite_runtime
    try:
        from tflite_runtime.interpreter import Interpreter
        print("Using tflite_runtime...")
        interp = Interpreter(model_path=str(model_file))
        interp.allocate_tensors()
        print("✅ Model loaded successfully with tflite_runtime!")
        return interp
    except Exception as e:
        print(f"tflite_runtime load note: {e}")

    # 3. Try standard tensorflow as fallback
    try:
        import tensorflow as tf
        print("Using tensorflow.lite...")
        interp = tf.lite.Interpreter(model_path=str(model_file))
        interp.allocate_tensors()
        print("✅ Model loaded successfully with tensorflow!")
        return interp
    except Exception as e:
        print(f"tensorflow load note: {e}")

    print("❌ CRITICAL: Failed to load TFLite model across all available runtimes.")
    return None

interpreter = load_tflite_model(MODEL_PATH)
if interpreter:
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
else:
    input_details = None
    output_details = None

def preprocess_pil_image(image: Image.Image):
    """Preprocess PIL Image for TFLite model"""
    if image.mode != 'RGB':
        image = image.convert('RGB')
    image = image.resize((224, 224))
    image_array = np.array(image, dtype=np.float32) / 255.0
    return np.expand_dims(image_array, axis=0)

def run_inference(image_array):
    """Runs inference and returns dict of results"""
    if not interpreter:
        raise RuntimeError("Model is not loaded")
    interpreter.set_tensor(input_details[0]['index'], image_array)
    interpreter.invoke()
    predictions = interpreter.get_tensor(output_details[0]['index'])
    
    predicted_class_idx = int(np.argmax(predictions[0]))
    confidence = float(np.max(predictions[0]) * 100)
    predicted_class = CLASSES[predicted_class_idx]
    
    all_probabilities = {
        CLASSES[i]: float(predictions[0][i] * 100)
        for i in range(len(CLASSES))
    }
    return predicted_class_idx, predicted_class, confidence, all_probabilities

# ================= FASTAPI ENDPOINTS =================
@app.get("/health")
async def health():
    if interpreter:
        return {"status": "ready", "model_loaded": True}
    return JSONResponse(status_code=500, content={"status": "error", "model_loaded": False})

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """Predict disease from uploaded apple image file"""
    if not interpreter:
        raise HTTPException(status_code=500, detail="Model not loaded on server")
    if not file.content_type.startswith('image/'):
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
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@app.post("/predict-batch")
async def predict_batch(files: list[UploadFile] = File(...)):
    """Predict for multiple images"""
    results = []
    for file in files:
        try:
            image_bytes = await file.read()
            image = Image.open(io.BytesIO(image_bytes))
            processed_image = preprocess_pil_image(image)
            _, class_name, confidence, _ = run_inference(processed_image)
            results.append({
                "filename": file.filename,
                "class_name": class_name,
                "confidence": round(confidence, 2)
            })
        except Exception as e:
            results.append({
                "filename": file.filename,
                "error": str(e)
            })
    return JSONResponse({"success": True, "results": results})

# ================= GRADIO UI INTERFACE =================
def gradio_predict(img):
    if img is None:
        return "Please upload an image."
    if not interpreter:
        return "Model not loaded on server."
    
    pil_img = Image.fromarray(img) if isinstance(img, np.ndarray) else img
    processed = preprocess_pil_image(pil_img)
    _, _, _, all_probs = run_inference(processed)
    
    # Return normalized probability dictionary for Gradio Label
    return {k: v / 100.0 for k, v in all_probs.items()}

with gr.Blocks(title="Bazgar Sangat AI - Backend") as demo:
    gr.Markdown("# 🍎 Bazgar Sangat AI - Apple Disease Detection API")
    gr.Markdown(
        "This Space hosts the **FastAPI REST API** (`/predict`, `/health`) for the Bazgar Sangat PWA, "
        "and provides this interactive demo interface."
    )
    with gr.Row():
        with gr.Column():
            input_image = gr.Image(type="numpy", label="Upload Apple Leaf Image")
            predict_btn = gr.Button("Analyze Apple Disease", variant="primary")
        with gr.Column():
            output_label = gr.Label(num_top_classes=4, label="Diagnosis & Confidence")
    
    predict_btn.click(fn=gradio_predict, inputs=input_image, outputs=output_label)
    
    gr.Markdown("---")
    gr.Markdown("### API Endpoints\n- Health: `/health`\n- Predict (POST): `/predict`\n- Swagger Docs: `/docs`")

# Mount Gradio UI onto FastAPI app
app = gr.mount_gradio_app(app, demo, path="/")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    print(f"🚀 Preparing to start Bazgar AI server on 0.0.0.0:{port}...")
    
    # Wait for port to be cleared if left in TIME_WAIT from a previous restart
    for attempt in range(6):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                s.bind(('0.0.0.0', port))
                s.close()
                break
            except OSError:
                print(f"Port {port} busy, waiting 2s for release (attempt {attempt + 1}/6)...")
                time.sleep(2)

    uvicorn.run(app, host="0.0.0.0", port=port)
