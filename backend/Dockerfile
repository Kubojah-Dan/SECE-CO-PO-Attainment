# ============================================================
# SECE CO-PO Platform — Backend Dockerfile
# Multi-stage: development + production targets
# ============================================================

FROM python:3.12-slim AS base

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# ─── Development Stage ──────────────────────────────────────────────
FROM base AS development

COPY . .

EXPOSE 8000

# ─── Production Stage ───────────────────────────────────────────────
FROM base AS production

# Create non-root user for security
RUN addgroup --system django && adduser --system --group django

COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput --settings=sece_copo.settings.production || true

# Set permissions
RUN chown -R django:django /app
USER django

EXPOSE 8000
