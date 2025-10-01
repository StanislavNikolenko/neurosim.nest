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

# Build ONLY the neural-data-ingest application
# RUN npx nest build neural-data-ingest

# Build the application
RUN npm run build

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

# Copy python script
COPY --from=builder /app/apps/neural-data-ingest/src/extract-data.py ./dist/neural-data-ingest/src/extract-data.py

# Expose port
EXPOSE 3001

# Start the application (production-optimized)
CMD ["npm", "run", "start:ingest:prod"]