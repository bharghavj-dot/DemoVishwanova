# ── Trilens Backend — Dockerfile ──────────────────────────────
# FastAPI + XGBoost + OpenCV on Python 3.11 slim
# ──────────────────────────────────────────────────────────────

FROM python:3.11-slim

# Install system dependencies for OpenCV, psycopg2, and general build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Set working directory to the project root (not /app/backend)
# This is important because imports use `from backend.xxx import ...`
WORKDIR /app

# Copy requirements first for Docker layer caching
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy ml_modules (needed by the pipeline)
COPY ml_modules/ /app/ml_modules/

# Copy classifier (XGBoost model files)
COPY classifier/ /app/classifier/

# Copy backend source code
COPY backend/ /app/backend/

# Create uploads directory
RUN mkdir -p /app/backend/uploads

# Expose port (Render sets $PORT at runtime)
EXPOSE 8000

# Start command: uvicorn from repo root so `backend.main:app` resolves correctly
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
