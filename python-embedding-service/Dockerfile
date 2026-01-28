FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
# Use CPU-only PyTorch wheels to avoid pulling CUDA/NVIDIA packages during build.
# See: https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt

# Copy application code
COPY app/ ./app/

# Expose port (Railway will set PORT env var)
EXPOSE 8080

# Run application (use PORT from environment, Railway sets this automatically)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
