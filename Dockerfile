# Production Dockerfile for AUTORA Next.js SaaS (Debian glibc for rock-solid better-sqlite3 and ffmpeg)
FROM node:20-slim AS base

# Install ffmpeg, python, make, g++ for native C++ addons
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    make \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Ensure storage and data directories exist with write permissions
RUN mkdir -p /app/data /app/storage && chmod -R 777 /app/data /app/storage

# Install dependencies (fresh resolution for Linux glibc)
COPY package.json ./
RUN npm install
RUN npm rebuild better-sqlite3 --build-from-source

# Copy application source
COPY . .

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Expose default port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start production server
CMD ["npm", "run", "start"]
