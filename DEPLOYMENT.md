# RELABTeams Container, CI, and Deployment Guide

## What Is In This Repository

- Frontend app: client
- Backend API + sockets + Swagger: source
- Additional submitted docs: docs/swagger
- Docker orchestration: docker-compose.yml
- CI: .github/workflows/ci.yml
- Render service definition: render.yaml
- Vercel app routing fallback: client/vercel.json

## Run With Docker Locally

1. Build and start all services:

```bash
docker compose up --build
```

2. Access apps:

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- Swagger UI: http://localhost:5000/api/docs

Services started by compose:

- frontend (Nginx serving Vite build)
- backend (Node/Express)
- mongo (MongoDB)
- redis (Redis)

## CI Pipeline

GitHub Actions workflow at .github/workflows/ci.yml runs on every push and pull request:

- Backend dependency install
- Backend JS syntax checks
- Backend app import smoke check
- Swagger localhost URL guard check
- Frontend dependency install and production build
- Docker image build for backend and frontend

## Deployment Architecture

- Frontend: Vercel
- Backend: Render (Docker)

## Alternative: DigitalOcean App Platform

If provider auto-detection does not find components, use one of these:

- Import app spec file: `.do/app.yaml`
- Or set source directories manually as: `source,client`

Then configure:

- Backend service from `source` with `npm ci` and `npm start`
- Frontend static site from `client` with `npm ci && npm run build` and output `dist`

Use the full browser workflow in `DIGITALOCEAN_STEP_BY_STEP.md`.

## Backend Deployment On Render

Use Blueprint deploy with render.yaml or create service manually with the same values.

Required environment variables you must set in Render:

- CORS_ALLOWED_ORIGINS = https://<your-vercel-domain>
- PUBLIC_API_BASE_URL = https://<your-render-backend-domain>
- MONGODB_URI
- JWT_SECRET
- STRIPE_SECRET_KEY
- STRIPE_PUBLISHABLE_KEY
- EMAIL_HOST
- EMAIL_PORT
- EMAIL_SERVICE
- EMAIL_USER
- EMAIL_PASSWORD
- EMAIL_FROM_NAME
- GMAIL_USER
- GMAIL_APP_PASSWORD

Already configured in render.yaml defaults:

- NODE_ENV=production
- PORT=5000
- REDIS_ENABLED=false
- COOKIE_SAME_SITE=none
- COOKIE_SECURE=true

After deploy, verify:

- https://<your-render-backend-domain>/api/docs
- https://<your-render-backend-domain>/api/docs-home

## Frontend Deployment On Vercel

Deploy client as a separate Vercel project using client as root directory.

Set Vercel environment variables:

- VITE_API_BASE_URL = https://<your-render-backend-domain>
- VITE_SOCKET_URL = https://<your-render-backend-domain>

Build command:

```bash
npm run build
```

Output directory:

```bash
dist
```

## Deployment Validation Checklist

1. Open frontend on Vercel and verify login/signup works.
2. Verify authenticated APIs work (cookies present, no CORS errors).
3. Verify GroupChat socket connection works.
4. Verify file links from project notifications open correctly.
5. Open Swagger docs on Render and run sample endpoints from UI.
6. Share only deployed URLs during demo:
   - Vercel frontend URL
   - Render backend URL
   - Render Swagger URL (/api/docs)
