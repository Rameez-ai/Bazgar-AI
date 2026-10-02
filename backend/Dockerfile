# Use an official Python runtime as base image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=7860

# Set work directory
WORKDIR /app

# Install system dependencies (build tools for Pillow/NumPy if required)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy all backend code and model file
COPY . .

# Hugging Face Spaces requires running as a user with UID 1000
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

# Hugging Face Spaces default port
EXPOSE 7860

# Run FastAPI app
CMD ["uvicorn", "backend:app", "--host", "0.0.0.0", "--port", "7860"]
