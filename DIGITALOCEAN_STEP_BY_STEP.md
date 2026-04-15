# DigitalOcean App Platform Deployment (Browser-Only)

This guide is for deploying this repo from GitHub when DigitalOcean shows no components detected.

## 1. Prepare MongoDB Atlas first

1. Open Atlas and rotate the `relabUser` password.
2. In Network Access, add `0.0.0.0/0` temporarily.
3. Use this connection format:

`mongodb+srv://relabUser:NEW_PASSWORD@cluster0.cnc1zfo.mongodb.net/page-check?retryWrites=true&w=majority&appName=Cluster0`

4. If password contains special characters, URL-encode it.

## 2. Open DigitalOcean app creation

1. Go to `https://cloud.digitalocean.com/apps/new`.
2. Select GitHub.
3. Repository: `Sampreeth03/project`.
4. Branch: `main`.

## 3. Fix "No components detected"

You have two valid ways:

### Option A (recommended): use app spec

1. Click option to use app spec (or import from repository file).
2. Select `.do/app.yaml`.
3. Continue to review screen.

### Option B: set source directories manually

1. In Source directories field, enter:

`source,client`

2. Click Next.
3. Add one Web Service for `source` and one Static Site for `client`.

## 4. Backend service settings

If using manual setup, backend must be:

- Type: Web Service
- Source directory: `source`
- Build command: `npm ci`
- Run command: `npm start`
- HTTP Port: `5000`

Set env vars:

- `NODE_ENV=production`
- `PORT=5000`
- `MONGODB_URI=<atlas-uri>`
- `JWT_SECRET=<long-random-secret>`
- `JWT_EXPIRES_IN=7d`
- `COOKIE_SAME_SITE=none`
- `COOKIE_SECURE=true`
- `PUBLIC_API_BASE_URL=https://<backend-domain>`
- `CORS_ALLOWED_ORIGINS=https://<frontend-domain>`
- `LOGIN_OTP_REQUIRED=true`
- `LOGIN_OTP_BYPASS_EMAILS=srihesh@gm.co,priya@gm.co,shiva@gm.co,arjun@gm.co`
- `REDIS_ENABLED=false`
- `SOLR_SYNC_ENABLED=false`
- `MOCK_PAYMENTS=true`

## 5. Frontend static site settings

- Type: Static Site
- Source directory: `client`
- Build command: `npm ci && npm run build`
- Output directory: `dist`

Set env vars:

- `VITE_API_BASE_URL=https://<backend-domain>`
- `VITE_SOCKET_URL=https://<backend-domain>`

## 6. Deploy

1. Click Create Resources.
2. Wait until both components are healthy.

## 7. Final domain pass

After first deploy, copy real domains and update:

- Backend `PUBLIC_API_BASE_URL`
- Backend `CORS_ALLOWED_ORIGINS`
- Frontend `VITE_API_BASE_URL`
- Frontend `VITE_SOCKET_URL`

Then redeploy.

## 8. Verify

1. Open frontend and log in with `srihesh@gm.co`.
2. It should not require email OTP for bypass users.
3. Open:
   - `https://<backend-domain>/api/docs`
   - `https://<backend-domain>/api/docs-home`
4. Open Projects page and verify no crash.
