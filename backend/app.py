from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import numpy as np
import io
import os
import sys
import traceback
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

# Disease classes
CLASSES = ['Blotch Apple', 'Normal Apple', 'Rot Apple', 'Scab Apple']

# Safe Model Loader compatible with Python 3.12 (ai_edge_litert, tflite_runtime, or tensorflow)
def load_tflite_model(path: Path):
    print(f"Loading model from: {path}...")
    interp = None
    # 1. Try modern Google LiteRT (recommended for Python 3.12)
    try:
        from ai_edge_litert.interpreter import Interpreter
        print("Using ai_edge_litert...")
        interp = Interpreter(model_path=str(path))
        interp.allocate_tensors()
        print("Model loaded successfully with ai_edge_litert!")
        return interp
    except Exception as e:
        print(f"ai_edge_litert load note: {e}")

    # 2. Try tflite_runtime
    try:
        from tflite_runtime.interpreter import Interpreter
        print("Using tflite_runtime...")
        interp = Interpreter(model_path=str(path))
        interp.allocate_tensors()
        print("Model loaded successfully with tflite_runtime!")
        return interp
    except Exception as e:
        print(f"tflite_runtime load note: {e}")

    # 3. Try standard tensorflow as fallback
    try:
        import tensorflow as tf
        print("Using tensorflow.lite...")
        interp = tf.lite.Interpreter(model_path=str(path))
        interp.allocate_tensors()
        print("Model loaded successfully with tensorflow!")
        return interp
    except Exception as e:
        print(f"tensorflow load note: {e}")

    print("CRITICAL: Failed to load TFLite model across all available runtimes.")
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
        return "Model not loaded."
    
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
    print(f"🚀 Starting Bazgar AI server on 0.0.0.0:{port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
