from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import tensorflow as tf
from PIL import Image
import numpy as np
import io
import os
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

# Load TFLite Model
print(f"Loading model from: {MODEL_PATH}...")
try:
    interpreter = tf.lite.Interpreter(model_path=str(MODEL_PATH))
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    print("Model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")
    interpreter = None

def preprocess_pil_image(image: Image.Image):
    """Preprocess PIL Image for TFLite model"""
    if image.mode != 'RGB':
        image = image.convert('RGB')
    image = image.resize((224, 224))
    image_array = np.array(image, dtype=np.float32) / 255.0
    return np.expand_dims(image_array, axis=0)

def run_inference(image_array):
    """Runs inference and returns dict of results"""
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
        raise HTTPException(status_code=500, detail="Model not loaded")
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
    uvicorn.run(app, host="0.0.0.0", port=port)
