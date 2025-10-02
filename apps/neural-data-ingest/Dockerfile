# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY nest-cli.json ./
COPY tsconfig*.json ./

RUN npm ci

COPY apps/ ./apps/

RUN npm run build

# Production stage
FROM node:20-alpine AS production

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

COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist

COPY --from=builder /app/apps/neural-data-ingest/src/extract-data.py ./dist/neural-data-ingest/src/extract-data.py

EXPOSE 3001

CMD ["npm", "run", "start:ingest:prod"]