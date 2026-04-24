FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY ml/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the ml folder
COPY ml/ ./ml/

# Railway passes the PORT uniquely via environment variable, defaulting to 8000 locally
ENV PORT=8000

# Start server
CMD uvicorn ml.api.main:app --host 0.0.0.0 --port $PORT
