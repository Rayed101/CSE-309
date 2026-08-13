"""Finvo Cloud Kitchen API — FastAPI backend with SQLite (Firebase-ready)."""

import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

DB_PATH = Path(__file__).parent / "finvo.db"

app = FastAPI(title="Finvo API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
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


def row_to_dict(row):
    return dict(row) if row else None


def new_id():
    return str(uuid.uuid4())[:8]


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


# --- Health ---

@app.on_event("startup")
def startup():
    init_db()


@app.get("/api/health")
def health():
    return {"status": "ok"}


# --- Delivery Costs ---

@app.get("/api/delivery-costs")
def list_delivery_costs():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM delivery_costs ORDER BY date DESC").fetchall()
        return [row_to_dict(r) for r in rows]


@app.post("/api/delivery-costs")
def create_delivery_cost(data: DeliveryCostIn):
    rid = new_id()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO delivery_costs VALUES (?,?,?,?,?,?)",
            (rid, data.date, data.order_id, data.delivery_fee, data.rider_tip, data.notes),
        )
    return {"id": rid, **data.model_dump()}


@app.delete("/api/delivery-costs/{item_id}")
def delete_delivery_cost(item_id: str):
    with get_db() as conn:
        conn.execute("DELETE FROM delivery_costs WHERE id=?", (item_id,))
    return {"ok": True}


# --- Commissions ---

@app.get("/api/commissions")
def list_commissions():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM commissions ORDER BY date DESC").fetchall()
        return [row_to_dict(r) for r in rows]


@app.post("/api/commissions")
def create_commission(data: CommissionIn):
    rid = new_id()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO commissions VALUES (?,?,?,?,?,?,?)",
            (rid, data.date, data.platform, data.order_id, data.order_amount,
             data.commission_rate, data.commission_amount),
        )
    return {"id": rid, **data.model_dump()}


@app.delete("/api/commissions/{item_id}")
def delete_commission(item_id: str):
    with get_db() as conn:
        conn.execute("DELETE FROM commissions WHERE id=?", (item_id,))
    return {"ok": True}


# --- Fixed Costs ---

@app.get("/api/fixed-costs")
def list_fixed_costs():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM fixed_costs ORDER BY month DESC").fetchall()
        return [row_to_dict(r) for r in rows]


@app.post("/api/fixed-costs")
def create_fixed_cost(data: FixedCostIn):
    rid = new_id()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO fixed_costs VALUES (?,?,?,?,?)",
            (rid, data.month, data.type, data.amount, data.description),
        )
    return {"id": rid, **data.model_dump()}


@app.delete("/api/fixed-costs/{item_id}")
def delete_fixed_cost(item_id: str):
    with get_db() as conn:
        conn.execute("DELETE FROM fixed_costs WHERE id=?", (item_id,))
    return {"ok": True}


# --- Ingredients ---

@app.get("/api/ingredients")
def list_ingredients():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM ingredients ORDER BY date DESC").fetchall()
        return [row_to_dict(r) for r in rows]


@app.post("/api/ingredients")
def create_ingredient(data: IngredientIn):
    rid = new_id()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO ingredients VALUES (?,?,?,?,?,?,?,?)",
            (rid, data.date, data.item_name, data.quantity, data.unit,
             data.unit_cost, data.total_cost, data.supplier),
        )
    return {"id": rid, **data.model_dump()}


@app.delete("/api/ingredients/{item_id}")
def delete_ingredient(item_id: str):
    with get_db() as conn:
        conn.execute("DELETE FROM ingredients WHERE id=?", (item_id,))
    return {"ok": True}


# --- Order Sources ---

@app.get("/api/order-sources")
def list_order_sources():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM order_sources ORDER BY date DESC").fetchall()
        return [row_to_dict(r) for r in rows]


@app.post("/api/order-sources")
def create_order_source(data: OrderSourceIn):
    rid = new_id()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO order_sources VALUES (?,?,?,?,?,?)",
            (rid, data.date, data.source, data.order_count, data.revenue, data.notes),
        )
    return {"id": rid, **data.model_dump()}


@app.delete("/api/order-sources/{item_id}")
def delete_order_source(item_id: str):
    with get_db() as conn:
        conn.execute("DELETE FROM order_sources WHERE id=?", (item_id,))
    return {"ok": True}


# --- Dashboard ---

@app.get("/api/dashboard/summary")
def dashboard_summary(month: str | None = None):
    if not month:
        month = datetime.now().strftime("%Y-%m")

    with get_db() as conn:
        delivery = conn.execute(
            "SELECT COALESCE(SUM(delivery_fee + rider_tip), 0) FROM delivery_costs WHERE date LIKE ?",
            (f"{month}%",),
        ).fetchone()[0]

        commission = conn.execute(
            "SELECT COALESCE(SUM(commission_amount), 0) FROM commissions WHERE date LIKE ?",
            (f"{month}%",),
        ).fetchone()[0]

        fixed = conn.execute(
            "SELECT COALESCE(SUM(amount), 0) FROM fixed_costs WHERE month = ?",
            (month,),
        ).fetchone()[0]

        ingredients_total = conn.execute(
            "SELECT COALESCE(SUM(total_cost), 0) FROM ingredients WHERE date LIKE ?",
            (f"{month}%",),
        ).fetchone()[0]

        revenue = conn.execute(
            "SELECT COALESCE(SUM(revenue), 0) FROM order_sources WHERE date LIKE ?",
            (f"{month}%",),
        ).fetchone()[0]

        source_rows = conn.execute(
            "SELECT source, SUM(order_count) as cnt FROM order_sources WHERE date LIKE ? GROUP BY source",
            (f"{month}%",),
        ).fetchall()

        total_orders = conn.execute(
            "SELECT COALESCE(SUM(order_count), 0) FROM order_sources WHERE date LIKE ?",
            (f"{month}%",),
        ).fetchone()[0]

    orders_by_source = {r["source"]: r["cnt"] for r in source_rows}
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
