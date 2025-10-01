# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY nest-cli.json ./
COPY tsconfig*.json ./

# Install ALL dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY apps/ ./apps/
# COPY config/ ./config/

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy config files
# COPY --from=builder /app/config ./config

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"] 