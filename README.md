# Finvo — Cloud Kitchen Cost Manager

In-house software for tracking cloud kitchen finances: delivery costs, platform commissions (Foodpanda, Pathao Food, Foodi), fixed costs, ingredient purchases, and order sources (apps vs social media).

**Stack:** React (Vite) frontend + FastAPI backend + Firebase Firestore (Firestore-ready)

## Quick Start (< 1 hour)

### 1. Frontend

```bash
npm install
npm run dev
```

Open http://localhost:5173

### 2. Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 3. Connect them

In dev, the Vite proxy forwards `/api` to `localhost:8000` automatically — no config needed.

For production, copy `.env.example` to `.env` and set your backend URL:

```
VITE_API_URL=https://your-api.example.com
```

## Features

| Page | What it tracks |
|------|----------------|
| **Dashboard** | Monthly revenue, costs, profit, order source breakdown |
| **Delivery Costs** | Per-order delivery fees and rider tips |
| **Platform Commissions** | Foodpanda, Pathao Food, Foodi commission charges |
| **Fixed Costs** | Rent, gas, electricity, staff salaries |
| **Ingredients** | Raw material purchases with qty and cost |
| **Order Sources** | Orders from delivery apps vs Facebook/Instagram/WhatsApp |

## Deploy

### Frontend (Vercel / Netlify / any static host)

```bash
npm run build
# Deploy the `dist/` folder
```

Set `VITE_API_URL` to your deployed API URL in the host's environment variables.

### Backend (Railway / Render / any Python host)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port $PORT
```


## Firebase / Firestore

This repository includes a Firestore-capable FastAPI backend (see `backend/main.py`). The backend will use the same API contract as the original SQLite implementation so the frontend requires no changes.

To enable Firestore:

1. Create a Firebase project and generate a service account JSON (IAM → Service Accounts → Create key).
2. Provide credentials to the backend via one of these environment variables:
   - `FIREBASE_SERVICE_ACCOUNT_PATH` — path to the downloaded JSON file (recommended)
   - `FIREBASE_SERVICE_ACCOUNT_JSON` — full service account JSON as a string (useful on platforms that only accept env vars)
   See `backend/.env.example` for examples and notes. The main backend code contains comments showing where to supply keys.
3. Install backend requirements (includes `firebase-admin`) and start the backend.

For small/medium projects the backend aggregates dashboard values in Python after reading documents. For large-scale usage, consider maintaining pre-aggregated counters or Firestore aggregation queries.

Deployment files (Dockerfile, Procfile) were added under `backend/` to simplify deploys to Docker-friendly hosts or PaaS providers.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET/POST/DELETE | `/api/delivery-costs` | Delivery cost records |
| GET/POST/DELETE | `/api/commissions` | Platform commission records |
| GET/POST/DELETE | `/api/fixed-costs` | Fixed cost records |
| GET/POST/DELETE | `/api/ingredients` | Ingredient purchase records |
| GET/POST/DELETE | `/api/order-sources` | Order source records |
| GET | `/api/dashboard/summary?month=YYYY-MM` | Dashboard aggregates |

## Project Structure

```
finvo/
├── src/
│   ├── api/           # API client & service calls
│   ├── components/    # Shared UI components
│   ├── pages/         # Route pages
│   ├── utils/         # Formatting helpers
│   └── config.js      # Platform & cost type constants
├── backend/
│   ├── main.py        # FastAPI app
│   └── requirements.txt
├── public/
└── package.json
```
