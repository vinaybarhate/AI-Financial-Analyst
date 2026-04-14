# # Use lightweight Python image
# FROM python:3.12-slim

# # Environment settings
# ENV PYTHONDONTWRITEBYTECODE=1
# ENV PYTHONUNBUFFERED=1

# # Set working directory
# WORKDIR /app

# # Install system dependencies
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     build-essential \
#     && rm -rf /var/lib/apt/lists/*

# # Copy requirements first (for caching)
# COPY requirements.txt .

# # Upgrade pip + install dependencies (CPU-only torch)
# RUN pip install --upgrade pip \
#     && pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt

# # Copy application code
# COPY . .

# # Create non-root user
# RUN useradd -m appuser
# USER appuser

# # Expose port
# EXPOSE 8000

# # Run FastAPI app
# CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# 🔥 FIXED DEPENDENCIES
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --upgrade pip \
    && pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt

COPY . .

RUN useradd -m appuser
USER appuser

EXPOSE 8000

# 🔥 FIXED PORT HANDLING
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]