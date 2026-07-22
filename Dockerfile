# ─────────────────────────────────────────────────────────────
#  CHEF — Multi-stage Dockerfile
#
#  Targets:
#    frontend-builder  → Builds the React app (npm run build)
#    backend-dev       → Development backend (for docker-compose.yml)
#    backend-prod      → Production backend (built frontend embedded)
#    frontend-prod     → Nginx serving static frontend files
#
#  Build examples:
#    docker compose up                    → uses backend-dev target
#    docker build --target backend-prod . → production backend with frontend
# ─────────────────────────────────────────────────────────────


# ══════════════════════════════════════════════════════════════
#  Stage 1: Build the React frontend
# ══════════════════════════════════════════════════════════════
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend-react
COPY frontend-react/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend-react/ ./
RUN npm run build


# ══════════════════════════════════════════════════════════════
#  Stage 2: Backend base (shared between dev and prod)
# ══════════════════════════════════════════════════════════════
FROM python:3.11-slim AS backend-base
WORKDIR /app/backend

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY backend/ ./


# ══════════════════════════════════════════════════════════════
#  Stage 3a: Development backend (hot-reload, mounted source)
# ══════════════════════════════════════════════════════════════
FROM backend-base AS backend-dev

EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]


# ══════════════════════════════════════════════════════════════
#  Stage 4: Production frontend (nginx static server)
# ══════════════════════════════════════════════════════════════
FROM nginx:alpine AS frontend-prod

# Copy built React app into nginx
COPY --from=frontend-builder /app/frontend-react/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]


# ══════════════════════════════════════════════════════════════
#  Stage 3b: Production backend (frontend embedded, non-root)
# ══════════════════════════════════════════════════════════════
FROM backend-base AS backend-prod

# Copy the pre-built frontend from Stage 1
COPY --from=frontend-builder /app/frontend-react/dist /app/frontend-react/dist

# Create a non-root user for security
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user

EXPOSE 7860

CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860} --workers 1"
