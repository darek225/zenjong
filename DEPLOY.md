# Zenjong Production Deployment Guide
## 100% Free Stack: Vercel + Render + Supabase

---

## 📋 Prerequisites
1. GitHub account with repo pushed
2. Vercel account
3. Render.com account  
4. Supabase account

---

## 🐳 Phase 1: Backend Deployment (Render.com - Free Docker Web Service)

### Option A: Render Dashboard (Recommended - No CLI Needed)
1. Go to https://render.com and sign up/login
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Render will auto-detect `backend/render.yaml`
5. Click "Create Web Service"
6. Render builds from `backend/Dockerfile` and deploys
7. Wait 2-3 minutes for build/deploy
8. **Note your WebSocket URL**: `wss://zenjong-backend.onrender.com`

### Option B: Manual Service Creation
1. In Render dashboard: "New +" → "Web Service"
2. Connect your GitHub repo
3. Configure:
   - Name: `zenjong-backend`
   - Region: Oregon (or closest)
   - Branch: `main`
   - Root Directory: `backend`
   - Dockerfile Path: `backend/Dockerfile`
   - Docker Context: `backend`
   - Plan: Free
4. Under "Environment":
   - Add `NODE_ENV` = `production`
   - Add `PORT` = `2567`
5. Click "Create Web Service"
6. Wait for build/deploy
7. **WebSocket URL**: `wss://<your-service-name>.onrender.com`

### Verification
- Health check: `https://zenjong-backend.onrender.com/` should return Colyseus server response
- WebSocket test: Use browser dev console: `new WebSocket("wss://zenjong-backend.onrender.com")`

### Connect the Vercel frontend
In Vercel, open **Project Settings → Environment Variables** and add this variable for
**Production** (and Preview if you want preview deployments to connect):

```text
NEXT_PUBLIC_SOCKET_URL=wss://zenjong-backend.onrender.com
```

Then redeploy the frontend. This value is substituted during `next build`; changing it
without a new deployment will not update the client bundle. Do not use `ws://` from an
HTTPS Vercel deployment, because browsers block insecure WebSocket connections.

The local `.env.local` may use `ws://localhost:2567`, but that local value must not be
copied into Vercel.