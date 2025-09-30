# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY nest-cli.json ./
COPY tsconfig*.json ./

# Install ALL dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY apps/ ./apps/
COPY config/ ./config/

# Build ONLY the neural-data-ingest application
# RUN npx nest build neural-data-ingest

# Build the application
RUN npm run build

# Debug: List what was built
# RUN echo "=== Build output ==="
# RUN find /app/dist -type f -name "*.js" | head -20
# RUN echo "=== Looking for neural-data-ingest ==="
# RUN find /app/dist -path "*neural-data-ingest*" -type f | head -10
# RUN echo "=== Looking for main.js ==="
# RUN find /app/dist -name "main.js" | head -10

# Production stage
FROM node:20-alpine AS production

# Install Python and required packages
RUN apk add --no-cache python3 py3-pip

# Install Python dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    py3-numpy \
    py3-scipy \
    py3-matplotlib \
    py3-pandas \
    py3-dotenv \
    curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy config files
COPY --from=builder /app/config ./config

# Copy python script
COPY --from=builder /app/apps/neural-data-ingest/src/extract-data.py ./dist/neural-data-ingest/src/extract-data.py

# Debug: List what was copied to production
# RUN echo "=== Production files ==="
# RUN find /app/dist -type f -name "*.js" | head -20
# RUN echo "=== Looking for neural-data-ingest in production ==="
# RUN find /app/dist -path "*neural-data-ingest*" -type f | head -10

# Expose port
EXPOSE 3002

# Start the application (production-optimized)
CMD ["npm", "run", "start:ingest:prod"]