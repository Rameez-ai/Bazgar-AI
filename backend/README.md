---
title: Bazgar AI Backend
emoji: 🍏
colorFrom: green
colorTo: emerald
sdk: docker
app_port: 7860
pinned: false
---

# Bazgar Sangat AI - FastAPI & TFLite Backend

FastAPI microservice for Apple Disease Detection using TensorFlow Lite.

## Endpoints:
- `GET /`: API status message
- `GET /health`: Health and model readiness check
- `POST /predict`: Upload image for single apple disease prediction
- `POST /predict-batch`: Upload multiple images for batch prediction
