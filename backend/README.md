---
title: Bazgar AI Backend
emoji: 🍏
colorFrom: green
colorTo: green
sdk: gradio
sdk_version: 4.44.0
app_file: app.py
pinned: false
---

# Bazgar Sangat AI - FastAPI & Gradio Backend

FastAPI REST microservice and Gradio demo for Apple Disease Detection using TensorFlow Lite.

## Endpoints:
- `GET /`: Gradio Interactive UI
- `GET /health`: Health and model readiness check
- `POST /predict`: Upload image for single apple disease prediction
- `POST /predict-batch`: Upload multiple images for batch prediction
- `GET /docs`: Interactive Swagger API documentation
