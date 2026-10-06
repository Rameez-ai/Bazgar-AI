import gradio as gr
from fastapi import File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import numpy as np
import io
import os
import warnings
from pathlib import Path

# Suppress TF deprecation warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
warnings.filterwarnings('ignore')

# Base directory for resolving file paths
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "apple_disease_model.tflite"

# Disease classes
CLASSES = ['Blotch Apple', 'Normal Apple', 'Rot Apple', 'Scab Apple']

# Load TFLite Model
print(f"Loading model from: {MODEL_PATH}...")
interpreter = None
try:
    import tensorflow as tf
    interpreter = tf.lite.Interpreter(model_path=str(MODEL_PATH))
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    print(f"✅ Model loaded successfully! Input shape: {input_details[0]['shape']}")
except Exception as e:
    print(f"❌ Model loading failed: {e}")
    input_details = None
    output_details = None

def preprocess_pil_image(image: Image.Image):
    if image.mode != 'RGB':
        image = image.convert('RGB')
    image = image.resize((224, 224))
    image_array = np.array(image, dtype=np.float32) / 255.0
    return np.expand_dims(image_array, axis=0)

def run_inference(image_array):
    if not interpreter:
        raise RuntimeError("Model is not loaded")
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

# ================= GRADIO UI =================
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
    gr.Markdown(
        "Upload an apple leaf image to detect diseases. "
        "Also available as REST API: `POST /predict`, `GET /health`"
    )
    with gr.Row():
        with gr.Column():
            input_image = gr.Image(type="numpy", label="Upload Apple Leaf Image")
            predict_btn = gr.Button("Analyze Disease", variant="primary")
        with gr.Column():
            output_label = gr.Label(num_top_classes=4, label="Diagnosis & Confidence")
    predict_btn.click(fn=gradio_predict, inputs=input_image, outputs=output_label)
    gr.Markdown("---")
    gr.Markdown("### REST API\n- `GET /health` — Check model status\n- `POST /predict` — Upload image file\n- `GET /docs` — Swagger documentation")

# ================= ADD CUSTOM FASTAPI ROUTES =================
# Gradio internally creates a FastAPI app — we add our routes to it
fastapi_app = demo.app

# Add CORS
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@fastapi_app.get("/health")
async def health():
    if interpreter:
        return {"status": "ready", "model_loaded": True}
    return JSONResponse(status_code=500, content={"status": "error", "model_loaded": False})

@fastapi_app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if not interpreter:
        raise HTTPException(status_code=500, detail="Model not loaded")
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
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@fastapi_app.post("/predict-batch")
async def predict_batch(files: list[UploadFile] = File(...)):
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

# ================= LAUNCH =================
if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)
