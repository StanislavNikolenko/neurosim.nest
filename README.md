# neurosim.nest

## Description

Backend part of the service for running neural simulations based on the raw neural data.
The Neurosim service gets files with raw neural data from frontend, converts them into JSON files and ingest to DB.

You may store raw data and JSON files locally or in S3 bucket. For local storage set `STORAGE_TYPE=local` in the `.env` file. For S3 storage set `STORAGE_TYPE=s3` in the `.env` file. If you want to use other external storage create your own storage service, put it to the `apps/neurosim/src/storage` and add it to the storage switching logic in the `app.module.ts`.

## Prerequisites

- Node.js (see `.nvmrc` for version)
- Docker and Docker Compose
- PostgreSQL (for production)

## Environment Setup

Copy the `.env.template` file from the project root and rename it to the `.env`.
Specify your own values for environment variables in the `.env` file.

## Development

```bash
# Install Node.js version
$ nvm use

# Install dependencies
$ npm ci

# Start neurosim development server
$ npm run start:dev

# Start neural-data-ingest development server
$ npm run start:ingest
```

## Production
```bash
# Build and start with Docker
$ npm run docker:start:prod
```
## API Endpoints

- `POST /upload` - Upload neural data files
- `GET /spike/:id` - Get spike data by ID
- `GET /health` - Health check

## Project structure
- `apps/` - Applications of the project
  - `neural-data-ingest/` - Microservice which retrieves spike data from raw neural data, converts them into JSON files and ingest to DB.
  - `neurosim/` - API Gateway application that takes requests from frontend and sends them to the neural-data-ingest microservice.
- `.nvmrc` - Current project Node.js version to which you may switch by `nvm use` command
- `docker-compose.dev.yml` - Config for building and running Docker stack for development
- `docker-compose.prod.yml` - Config for building and running Docker stack for production
- `.env.template` - Environment variables template
