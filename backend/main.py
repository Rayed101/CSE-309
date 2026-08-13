"""Finvo Cloud Kitchen API — FastAPI backend using Firebase Firestore.

This replaces the previous SQLite implementation with Firestore while keeping the
same API contract so the frontend requires no changes. To use Firestore you must
provide Firebase service account credentials; see backend/.env.example for
examples and the comments below inside this file.
"""

import os
import json
import uuid
from datetime import datetime
from typing import Optional, List, Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# SQLite fallback helpers
import sqlite3
from contextlib import contextmanager
from pathlib import Path

# Firebase Admin SDK
import firebase_admin
from firebase_admin import credentials, firestore


# --- Firebase initialization ---
# The application will attempt to initialize Firebase on startup using one of:
# 1) FIREBASE_SERVICE_ACCOUNT_PATH - path to the service account JSON file
# 2) FIREBASE_SERVICE_ACCOUNT_JSON - raw JSON string of the service account
#
# Provide one of the above in your environment (for deploy hosts, use env vars).
# The file backend/.env.example has examples.

FIREBASE_SERVICE_ACCOUNT_PATH = os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH")
FIREBASE_SERVICE_ACCOUNT_JSON = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")

firebase_app = None
db = None


def init_firebase():
    global firebase_app, db
    if firebase_app is not None:
        return

    cred = None
    if FIREBASE_SERVICE_ACCOUNT_PATH:
        # Path to downloaded service account JSON (recommended)
        if not os.path.exists(FIREBASE_SERVICE_ACCOUNT_PATH):
            raise RuntimeError(f"FIREBASE_SERVICE_ACCOUNT_PATH set but file not found: {FIREBASE_SERVICE_ACCOUNT_PATH}")
        cred = credentials.Certificate(FIREBASE_SERVICE_ACCOUNT_PATH)
    elif FIREBASE_SERVICE_ACCOUNT_JSON:
        # Raw JSON in env var (useful for platforms that only accept env vars)
        try:
            sa_dict = json.loads(FIREBASE_SERVICE_ACCOUNT_JSON)
            cred = credentials.Certificate(sa_dict)
        except Exception as exc:
            raise RuntimeError("FIREBASE_SERVICE_ACCOUNT_JSON is set but invalid JSON") from exc
    else:
        # No credentials provided; the admin SDK will try application default credentials.
        # This may work on some managed platforms (e.g., GCP). If not, calls will fail.
        cred = None

    try:
        if cred:
            firebase_app = firebase_admin.initialize_app(cred)
        else:
            # Initialize with default credentials (may work on GCP environments)
            firebase_app = firebase_admin.initialize_app()
        db = firestore.client()
    except Exception as exc:
        # Surface helpful error at startup
        raise RuntimeError(f"Failed to initialize Firebase Admin SDK: {exc}") from exc


# --- FastAPI setup ---
app = FastAPI(title="Finvo API (Firestore)", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Helpers ---

def new_id() -> str:
    return str(uuid.uuid4())[:8]


def doc_to_dict(doc) -> Dict:
    d = doc.to_dict() if hasattr(doc, "to_dict") else dict(doc)
    d["id"] = doc.id if hasattr(doc, "id") else d.get("id")
    return d


def ensure_db():
    if db is None:
        raise HTTPException(status_code=503, detail="Backend datastore not initialized")


# --- Models ---
class DeliveryCostIn(BaseModel):
    date: str
    order_id: str
    delivery_fee: float
    rider_tip: float = 0
    notes: str = ""


class CommissionIn(BaseModel):
    date: str
    platform: str
    order_id: str
    order_amount: float
    commission_rate: float
    commission_amount: float


class FixedCostIn(BaseModel):
    month: str
    type: str
    amount: float
    description: str = ""


class IngredientIn(BaseModel):
    date: str
    item_name: str
    quantity: float
    unit: str
    unit_cost: float
    total_cost: float
    supplier: str = ""


class OrderSourceIn(BaseModel):
    date: str
    source: str
    order_count: int
    revenue: float
    notes: str = ""


# --- Startup event ---
@app.on_event("startup")
def startup_event():
    # Initialize Firebase. If credentials are not configured, this will raise a helpful error.
    try:
        init_firebase()
    except Exception as exc:
        # It's helpful to fail loud during startup to avoid silent misconfiguration.
        # In production you can choose to log instead of raising.
        raise


# --- Health ---
@app.get("/api/health")
def health():
    return {"status": "ok"}


# --- Generic collection helpers ---
# Keep a mapping of collection/table names
COLLECTIONS = {
    "delivery_costs": "delivery_costs",
    "commissions": "commissions",
    "fixed_costs": "fixed_costs",
    "ingredients": "ingredients",
    "order_sources": "order_sources",
}

# SQLite DB path used for the fallback (quick demo without Firebase)
SQLITE_DB_PATH = Path(__file__).parent / "finvo.db"
USE_FIRESTORE = False


@contextmanager
def get_db():
    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_sqlite():
    # Create tables mirroring the original schema
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS delivery_costs (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL,
                order_id TEXT NOT NULL,
                delivery_fee REAL NOT NULL,
                rider_tip REAL DEFAULT 0,
                notes TEXT DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS commissions (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL,
                platform TEXT NOT NULL,
                order_id TEXT NOT NULL,
                order_amount REAL NOT NULL,
                commission_rate REAL NOT NULL,
                commission_amount REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS fixed_costs (
                id TEXT PRIMARY KEY,
                month TEXT NOT NULL,
                type TEXT NOT NULL,
                amount REAL NOT NULL,
                description TEXT DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS ingredients (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL,
                item_name TEXT NOT NULL,
                quantity REAL NOT NULL,
                unit TEXT NOT NULL,
                unit_cost REAL NOT NULL,
                total_cost REAL NOT NULL,
                supplier TEXT DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS order_sources (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL,
                source TEXT NOT NULL,
                order_count INTEGER NOT NULL,
                revenue REAL NOT NULL,
                notes TEXT DEFAULT ''
            );
        """)


def list_collection(coll_name: str) -> List[Dict]:
    # Firestore path
    if USE_FIRESTORE:
        ensure_db()
        col = db.collection(coll_name)
        try:
            docs = col.order_by("date", direction=firestore.Query.DESCENDING).stream()
        except Exception:
            docs = col.stream()
        return [doc_to_dict(d) for d in docs]

    # SQLite fallback
    with get_db() as conn:
        if coll_name == COLLECTIONS["fixed_costs"]:
            rows = conn.execute("SELECT * FROM fixed_costs ORDER BY month DESC").fetchall()
        else:
            rows = conn.execute(f"SELECT * FROM {coll_name} ORDER BY date DESC").fetchall()
        return [dict(r) for r in rows]


def create_in_collection(coll_name: str, data: dict) -> dict:
    if USE_FIRESTORE:
        ensure_db()
        col = db.collection(coll_name)
        doc_id = new_id()
        payload = {**data}
        col.document(doc_id).set(payload)
        return {"id": doc_id, **payload}

    # SQLite fallback: map fields per collection
    rid = new_id()
    with get_db() as conn:
        if coll_name == COLLECTIONS["delivery_costs"]:
            conn.execute(
                "INSERT INTO delivery_costs VALUES (?,?,?,?,?,?)",
                (rid, data.get("date"), data.get("order_id"), data.get("delivery_fee"), data.get("rider_tip", 0), data.get("notes", "")),
            )
        elif coll_name == COLLECTIONS["commissions"]:
            conn.execute(
                "INSERT INTO commissions VALUES (?,?,?,?,?,?,?)",
                (rid, data.get("date"), data.get("platform"), data.get("order_id"), data.get("order_amount"), data.get("commission_rate"), data.get("commission_amount")),
            )
        elif coll_name == COLLECTIONS["fixed_costs"]:
            conn.execute(
                "INSERT INTO fixed_costs VALUES (?,?,?,?,?)",
                (rid, data.get("month"), data.get("type"), data.get("amount"), data.get("description", "")),
            )
        elif coll_name == COLLECTIONS["ingredients"]:
            conn.execute(
                "INSERT INTO ingredients VALUES (?,?,?,?,?,?,?,?)",
                (rid, data.get("date"), data.get("item_name"), data.get("quantity"), data.get("unit"), data.get("unit_cost"), data.get("total_cost"), data.get("supplier", "")),
            )
        elif coll_name == COLLECTIONS["order_sources"]:
            conn.execute(
                "INSERT INTO order_sources VALUES (?,?,?,?,?,?)",
                (rid, data.get("date"), data.get("source"), data.get("order_count"), data.get("revenue"), data.get("notes", "")),
            )
        else:
            raise HTTPException(status_code=400, detail="Unknown collection")
    return {"id": rid, **data}


def delete_from_collection(coll_name: str, doc_id: str) -> dict:
    if USE_FIRESTORE:
        ensure_db()
        db.collection(coll_name).document(doc_id).delete()
        return {"ok": True}

    with get_db() as conn:
        conn.execute(f"DELETE FROM {coll_name} WHERE id=?", (doc_id,))
    return {"ok": True}


# --- Delivery Costs ---
@app.get("/api/delivery-costs")
def list_delivery_costs():
    return list_collection(COLLECTIONS["delivery_costs"])


@app.post("/api/delivery-costs")
def create_delivery_cost(data: DeliveryCostIn):
    return create_in_collection(COLLECTIONS["delivery_costs"], data.model_dump())


@app.delete("/api/delivery-costs/{item_id}")
def delete_delivery_cost(item_id: str):
    return delete_from_collection(COLLECTIONS["delivery_costs"], item_id)


# --- Commissions ---
@app.get("/api/commissions")
def list_commissions():
    return list_collection(COLLECTIONS["commissions"])


@app.post("/api/commissions")
def create_commission(data: CommissionIn):
    return create_in_collection(COLLECTIONS["commissions"], data.model_dump())


@app.delete("/api/commissions/{item_id}")
def delete_commission(item_id: str):
    return delete_from_collection(COLLECTIONS["commissions"], item_id)


# --- Fixed Costs ---
@app.get("/api/fixed-costs")
def list_fixed_costs():
    return list_collection(COLLECTIONS["fixed_costs"])


@app.post("/api/fixed-costs")
def create_fixed_cost(data: FixedCostIn):
    return create_in_collection(COLLECTIONS["fixed_costs"], data.model_dump())


@app.delete("/api/fixed-costs/{item_id}")
def delete_fixed_cost(item_id: str):
    return delete_from_collection(COLLECTIONS["fixed_costs"], item_id)


# --- Ingredients ---
@app.get("/api/ingredients")
def list_ingredients():
    return list_collection(COLLECTIONS["ingredients"])


@app.post("/api/ingredients")
def create_ingredient(data: IngredientIn):
    return create_in_collection(COLLECTIONS["ingredients"], data.model_dump())


@app.delete("/api/ingredients/{item_id}")
def delete_ingredient(item_id: str):
    return delete_from_collection(COLLECTIONS["ingredients"], item_id)


# --- Order Sources ---
@app.get("/api/order-sources")
def list_order_sources():
    return list_collection(COLLECTIONS["order_sources"])


@app.post("/api/order-sources")
def create_order_source(data: OrderSourceIn):
    return create_in_collection(COLLECTIONS["order_sources"], data.model_dump())


@app.delete("/api/order-sources/{item_id}")
def delete_order_source(item_id: str):
    return delete_from_collection(COLLECTIONS["order_sources"], item_id)


# --- Dashboard ---
@app.get("/api/dashboard/summary")
def dashboard_summary(month: Optional[str] = None):
    """Return aggregated dashboard values for the specified month (YYYY-MM).

    Implementation note: Firestore does not support aggregation queries like SQL SUM
    easily across large datasets without collection group or aggregated counters.
    For simplicity this function reads matching documents and aggregates in Python.
    This is acceptable for small/medium datasets. For large scale, consider
    Firestore aggregation queries or maintaining pre-aggregated counters.
    """
    ensure_db()
    if not month:
        month = datetime.now().strftime("%Y-%m")

    def sum_field(coll_name: str, field_name: str, by_date_field: str = "date") -> float:
        total = 0.0
        docs = db.collection(coll_name).stream()
        for d in docs:
            data = d.to_dict() or {}
            dt = data.get(by_date_field, "")
            if isinstance(dt, str) and dt.startswith(month):
                val = data.get(field_name, 0) or 0
                try:
                    total += float(val)
                except Exception:
                    pass
        return total

    delivery = sum_field(COLLECTIONS["delivery_costs"], "delivery_fee") + sum_field(COLLECTIONS["delivery_costs"], "rider_tip")
    commission = sum_field(COLLECTIONS["commissions"], "commission_amount")
    fixed = 0.0
    # fixed_costs store month directly
    docs = db.collection(COLLECTIONS["fixed_costs"]).stream()
    for d in docs:
        data = d.to_dict() or {}
        if data.get("month") == month:
            try:
                fixed += float(data.get("amount", 0) or 0)
            except Exception:
                pass

    ingredients_total = sum_field(COLLECTIONS["ingredients"], "total_cost")
    revenue = sum_field(COLLECTIONS["order_sources"], "revenue")

    # orders by source and total orders
    orders_by_source = {}
    total_orders = 0
    docs = db.collection(COLLECTIONS["order_sources"]).stream()
    for d in docs:
        data = d.to_dict() or {}
        dt = data.get("date", "")
        if isinstance(dt, str) and dt.startswith(month):
            src = data.get("source", "unknown")
            cnt = int(data.get("order_count", 0) or 0)
            orders_by_source[src] = orders_by_source.get(src, 0) + cnt
            total_orders += cnt

    total_costs = delivery + commission + fixed + ingredients_total

    return {
        "total_revenue": revenue,
        "total_costs": total_costs,
        "net_profit": revenue - total_costs,
        "delivery_costs": delivery,
        "commission_costs": commission,
        "fixed_costs": fixed,
        "ingredient_costs": ingredients_total,
        "orders_by_source": orders_by_source,
        "total_orders": total_orders,
    }
