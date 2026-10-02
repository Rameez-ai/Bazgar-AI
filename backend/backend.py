from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import tensorflow as tf
from PIL import Image
import numpy as np
import io
import uvicorn

app = FastAPI(title="Apple Disease Detection API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, I will replace with my frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os
from pathlib import Path

# Base directory for resolving file paths
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "apple_disease_model.tflite"

# Load the TFLite model
print(f"Loading model from: {MODEL_PATH}...")
try:
    interpreter = tf.lite.Interpreter(model_path=str(MODEL_PATH))
    interpreter.allocate_tensors()
    print("Model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")
    interpreter = None

# Get input and output details
if interpreter:
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    input_shape = input_details[0]['shape']
    print(f"Input shape: {input_shape}")

# Disease classes
CLASSES = ['Blotch Apple', 'Normal Apple', 'Rot Apple', 'Scab Apple']

def preprocess_image(image_bytes):
    """Preprocess image for model input"""
    # Open image
    image = Image.open(io.BytesIO(image_bytes))
    
    # Convert to RGB if needed
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Resize to 224x224 (or whatevermodel expects)
    image = image.resize((224, 224))
    
    # Convert to numpy array and normalize
    image_array = np.array(image, dtype=np.float32)
    image_array = image_array / 255.0
    
    # Add batch dimension
    image_array = np.expand_dims(image_array, axis=0)
    
    return image_array

@app.get("/")
async def root():
    return {"message": "Apple Disease Detection API is running", "status": "active"}

@app.get("/health")
async def health():
    if interpreter:
        return {"status": "ready", "model_loaded": True}
    else:
        return {"status": "error", "model_loaded": False}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """Predict disease from uploaded apple image"""
    
    if not interpreter:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    # Check file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Read image bytes
        image_bytes = await file.read()
        
        # Preprocess image
        processed_image = preprocess_image(image_bytes)
        
        # Run inference
        interpreter.set_tensor(input_details[0]['index'], processed_image)
        interpreter.invoke()
        
        # Get predictions
        predictions = interpreter.get_tensor(output_details[0]['index'])
        
        # Get class with highest probability
        predicted_class_idx = np.argmax(predictions[0])
        confidence = float(np.max(predictions[0]) * 100)
        predicted_class = CLASSES[predicted_class_idx]
        
        # Get all class probabilities
        all_probabilities = {
            CLASSES[i]: float(predictions[0][i] * 100) 
            for i in range(len(CLASSES))
        }
        
        return JSONResponse({
            "success": True,
            "prediction": {
                "class_index": int(predicted_class_idx),
                "class_name": predicted_class,
                "confidence": round(confidence, 2),
                "all_probabilities": all_probabilities
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
            processed_image = preprocess_image(image_bytes)
            
            interpreter.set_tensor(input_details[0]['index'], processed_image)
            interpreter.invoke()
            predictions = interpreter.get_tensor(output_details[0]['index'])
            
            predicted_class_idx = np.argmax(predictions[0])
            confidence = float(np.max(predictions[0]) * 100)
            
            results.append({
                "filename": file.filename,
                "class_name": CLASSES[predicted_class_idx],
                "confidence": round(confidence, 2)
            })
        except Exception as e:
            results.append({
                "filename": file.filename,
                "error": str(e)
            })
    
    return JSONResponse({"success": True, "results": results})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)