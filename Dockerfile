FROM python:3.11-slim

WORKDIR /app

# Install dependencies explicitly bypassing PyPI's default CUDA-heavy PyTorch package.
# We install the CPU-only version which saves around ~4GB of image space.
COPY ml/requirements.txt .
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Copy only exactly what we need (the ML folder)
COPY ml/ ./ml/

ENV PORT=8000

# Start server
CMD uvicorn ml.api.main:app --host 0.0.0.0 --port $PORT
