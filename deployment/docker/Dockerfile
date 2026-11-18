# =========================================================
# STAGE 1: Biên dịch Frontend React + Vite (Monorepo)
# =========================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# =========================================================
# STAGE 2: Python Core Engine & Production Gunicorn Server
# =========================================================
FROM python:3.11-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080 \
    HOST=0.0.0.0 \
    PYTHONPATH=/app/backend:/app/backend/src

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

# Sao chép file requirements và cài đặt
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt \
    && playwright install chromium

# Tạo non-root user vận hành ứng dụng
RUN addgroup --system appgroup \
    && adduser --system --ingroup appgroup --home /home/appuser appuser

# Sao chép mã nguồn backend & tài nguyên tĩnh từ stage frontend build
COPY backend/ ./backend/
COPY --from=frontend-builder /app/releases/dist ./releases/dist
COPY --from=frontend-builder /app/frontend/public ./frontend/public

RUN mkdir -p /app/backend/src/data/databases \
    && chown -R appuser:appgroup /app/backend/src/data /app/releases

USER appuser
WORKDIR /app/backend

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/api/health')" || exit 1

CMD ["gunicorn", "--workers", "4", "--threads", "4", "--timeout", "180", "-b", "0.0.0.0:8080", "src.server:create_app()"]
