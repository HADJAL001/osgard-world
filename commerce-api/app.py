#!/usr/bin/env python3
"""OSGARD Commerce API — opt-in analytics, project leads and guarded Stripe Checkout.

No third-party runtime packages are required. Live payments are disabled by default.
Only one-time support/consultation products are supported; there is no entitlement
or subscription engine in this initial service.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import ipaddress
import json
import os
import re
import sqlite3
import threading
import time
import uuid
from collections import defaultdict, deque
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlencode, urlsplit
from urllib.request import Request, urlopen


APP_VERSION = "0.1.0"
GAME_IDS = {"null-shift", "time", "swarm", "inherit", "remix", "civic-cascade", "patina", "signal-run", "cascade-lab"}
EVENT_NAMES = {
    "game_opened", "game_session_started", "game_session_completed", "share_created",
    "referral_session_started", "cross_promo_clicked", "lead_submitted",
    "premium_page_view", "checkout_started",
}
PRODUCT_KEY_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{1,63}$")
EMAIL_RE = re.compile(r"^[^\s@]{1,120}@[^\s@.]{1,120}(?:\.[^\s@.]{1,63})+$")
REFERRAL_RE = re.compile(r"^r[a-f0-9]{12}$")
ID_RE = re.compile(r"^[A-Za-z0-9_-]{8,160}$")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def clamp_text(value: Any, limit: int, *, multiline: bool = False) -> str:
    text = str(value if value is not None else "")
    text = "".join(ch for ch in text if ch in "\n\t" or ord(ch) >= 32)
    if not multiline:
        text = re.sub(r"\s+", " ", text)
    return text.strip()[:limit]


def safe_json(raw: bytes) -> dict[str, Any] | None:
    try:
        value = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None
    return value if isinstance(value, dict) else None


class ClosingConnection(sqlite3.Connection):
    def __exit__(self, exc_type, exc_value, traceback):
        try:
            return super().__exit__(exc_type, exc_value, traceback)
        finally:
            self.close()


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str = ""):
        super().__init__(message or code)
        self.status = status
        self.code = code
        self.message = message or code


class CommerceService:
    def __init__(self, db_path: str | Path, env: dict[str, str] | None = None):
        self.env = dict(os.environ if env is None else env)
        self.db_path = str(db_path)
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self._rate_lock = threading.Lock()
        self._rate: dict[tuple[str, str], deque[float]] = defaultdict(deque)
        self._cleanup_lock = threading.Lock()
        self._last_cleanup = 0.0
        self._init_db()
        self.cleanup_old_data(force=True)

    def connect(self) -> sqlite3.Connection:
        db = sqlite3.connect(self.db_path, timeout=5, factory=ClosingConnection)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys=ON")
        db.execute("PRAGMA busy_timeout=5000")
        return db

    def _init_db(self) -> None:
        with self.connect() as db:
            db.execute("PRAGMA journal_mode=WAL")
            db.executescript("""
                CREATE TABLE IF NOT EXISTS events(
                  event_id TEXT PRIMARY KEY,
                  name TEXT NOT NULL,
                  session_id TEXT NOT NULL,
                  game_id TEXT NOT NULL,
                  source TEXT NOT NULL,
                  path TEXT NOT NULL,
                  duration_seconds INTEGER NOT NULL DEFAULT 0,
                  referral_code TEXT,
                  campaign TEXT,
                  placement TEXT,
                  invite_method TEXT,
                  created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
                CREATE INDEX IF NOT EXISTS idx_events_name_created ON events(name, created_at);
                CREATE INDEX IF NOT EXISTS idx_events_campaign_created ON events(campaign, created_at);
                CREATE TABLE IF NOT EXISTS leads(
                  lead_id TEXT PRIMARY KEY,
                  project_type TEXT NOT NULL,
                  budget TEXT NOT NULL,
                  contact TEXT NOT NULL,
                  description TEXT NOT NULL,
                  source_path TEXT NOT NULL,
                  status TEXT NOT NULL DEFAULT 'new',
                  consent_at TEXT NOT NULL,
                  created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);
                CREATE TABLE IF NOT EXISTS orders(
                  order_id TEXT PRIMARY KEY,
                  product_key TEXT NOT NULL,
                  fulfillment_mode TEXT NOT NULL,
                  email TEXT NOT NULL,
                  amount_total INTEGER NOT NULL,
                  amount_refunded INTEGER NOT NULL DEFAULT 0,
                  currency TEXT NOT NULL,
                  stripe_session_id TEXT UNIQUE,
                  stripe_payment_intent_id TEXT,
                  status TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  updated_at TEXT NOT NULL,
                  paid_at TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
                CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
                CREATE TABLE IF NOT EXISTS stripe_events(
                  stripe_event_id TEXT PRIMARY KEY,
                  event_type TEXT NOT NULL,
                  processed_at TEXT NOT NULL
                );
            """)
            columns = {row["name"] for row in db.execute("PRAGMA table_info(orders)").fetchall()}
            if "amount_refunded" not in columns:
                db.execute("ALTER TABLE orders ADD COLUMN amount_refunded INTEGER NOT NULL DEFAULT 0")

    def cleanup_old_data(self, force: bool = False) -> None:
        now = time.time()
        if not force and now - self._last_cleanup < 3600:
            return
        with self._cleanup_lock:
            if not force and now - self._last_cleanup < 3600:
                return
            event_days = self._retention_days("EVENT_RETENTION_DAYS", 90, 1, 730)
            lead_days = self._retention_days("LEAD_RETENTION_DAYS", 180, 1, 3650)
            order_days = self._retention_days("ORDER_RETENTION_DAYS", 365, 30, 3650)
            with self.connect() as db:
                db.execute("DELETE FROM events WHERE created_at < ?", (self._older_than(event_days),))
                db.execute("DELETE FROM leads WHERE created_at < ? AND status IN ('closed','spam','deleted')", (self._older_than(lead_days),))
                db.execute("DELETE FROM orders WHERE created_at < ? AND status IN ('expired','checkout_error','payment_failed','refunded')", (self._older_than(order_days),))
            self._last_cleanup = now

    @staticmethod
    def _older_than(days: int) -> str:
        return datetime.fromtimestamp(time.time() - days * 86400, timezone.utc).isoformat(timespec="seconds")

    def _retention_days(self, key: str, default: int, low: int, high: int) -> int:
        try:
            value = int(self.env.get(key, default))
        except (TypeError, ValueError):
            value = default
        return min(high, max(low, value))

    def rate_limit(self, ip: str, route: str, limit: int, window_seconds: int) -> None:
        now = time.monotonic()
        key = (ip, route)
        with self._rate_lock:
            bucket = self._rate[key]
            while bucket and now - bucket[0] > window_seconds:
                bucket.popleft()
            if len(bucket) >= limit:
                raise ApiError(429, "rate_limited", "Слишком много запросов. Попробуйте позже.")
            bucket.append(now)
            if len(self._rate) > 5000:
                stale = [k for k, values in self._rate.items() if not values or now - values[-1] > 3600]
                for old in stale[:2000]:
                    self._rate.pop(old, None)

    def payment_mode(self) -> str:
        mode = self.env.get("STRIPE_MODE", "disabled").strip().lower()
        return mode if mode in {"disabled", "test", "live"} else "disabled"

    def stripe_secret(self) -> str:
        return self.env.get("STRIPE_SECRET_KEY", "").strip()

    def stripe_ready(self) -> bool:
        mode = self.payment_mode()
        secret = self.stripe_secret()
        webhook = self.env.get("STRIPE_WEBHOOK_SECRET", "").strip()
        if mode == "disabled" or not secret or not webhook:
            return False
        if mode == "test":
            return secret.startswith("sk_test_")
        legal_ready = all(self.env.get(key, "").strip() for key in (
            "SELLER_LEGAL_NAME", "SELLER_COUNTRY", "SUPPORT_EMAIL",
            "TERMS_URL", "PRIVACY_URL", "LIVE_PAYMENTS_ACK",
        ))
        return secret.startswith("sk_live_") and self.env.get("LIVE_PAYMENTS_ACK") == "I_UNDERSTAND_LIVE_PAYMENTS" and legal_ready

    def products_config(self) -> list[dict[str, Any]]:
        raw = self.env.get("COMMERCE_PRODUCTS_JSON", "[]")
        try:
            items = json.loads(raw)
        except json.JSONDecodeError:
            return []
        if not isinstance(items, list):
            return []
        valid: list[dict[str, Any]] = []
        seen: set[str] = set()
        for item in items[:30]:
            if not isinstance(item, dict):
                continue
            key = clamp_text(item.get("key"), 64)
            price_id = clamp_text(item.get("stripePriceId"), 100)
            label = clamp_text(item.get("label"), 100)
            description = clamp_text(item.get("description"), 500)
            fulfillment = clamp_text(item.get("fulfillmentMode"), 40)
            # This first release only supports non-entitlement one-time payments:
            # support contributions and consultation requests.
            if (not PRODUCT_KEY_RE.fullmatch(key) or key in seen or not price_id.startswith("price_")
                    or not label or not description or fulfillment not in {"support", "consultation"}
                    or item.get("mode", "payment") != "payment"):
                continue
            seen.add(key)
            valid.append({
                "key": key, "label": label, "description": description,
                "stripePriceId": price_id, "fulfillmentMode": fulfillment,
                "mode": "payment", "active": item.get("active") is True,
            })
        return valid

    def stripe_request(self, method: str, path: str, fields: dict[str, Any] | None = None, idempotency_key: str = "") -> dict[str, Any]:
        secret = self.stripe_secret()
        if not secret:
            raise ApiError(503, "payment_provider_not_configured", "Платёжный провайдер не настроен.")
        url = "https://api.stripe.com/v1/" + path.lstrip("/")
        headers = {
            "Authorization": "Basic " + base64.b64encode((secret + ":").encode()).decode(),
            "User-Agent": "OSGARD-Commerce/" + APP_VERSION,
            "Accept": "application/json",
        }
        data = None
        if fields is not None:
            data = urlencode(fields, doseq=True).encode("utf-8")
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key[:255]
        request = Request(url, data=data, headers=headers, method=method.upper())
        try:
            with urlopen(request, timeout=8) as response:
                parsed = safe_json(response.read(1024 * 1024))
                if parsed is None:
                    raise ApiError(502, "invalid_payment_provider_response", "Платёжный провайдер вернул некорректный ответ.")
                return parsed
        except HTTPError as error:
            # Don't return provider bodies: they can contain details that are not
            # appropriate to show in a public UI or log.
            raise ApiError(502, "payment_provider_error", "Платёжный провайдер не подтвердил запрос.") from error
        except (URLError, TimeoutError, OSError) as error:
            raise ApiError(503, "payment_provider_unavailable", "Платёжный провайдер временно недоступен.") from error

    def product_catalog(self) -> list[dict[str, Any]]:
        configured = self.products_config()
        if not configured:
            return []
        ready = self.stripe_ready()
        result: list[dict[str, Any]] = []
        for item in configured:
            row = {
                "key": item["key"], "label": item["label"], "description": item["description"],
                "mode": "payment", "enabled": False, "reason": "live_payments_disabled" if self.payment_mode() == "disabled" else "service_not_ready",
            }
            if not item["active"]:
                row["reason"] = "price_inactive"
                result.append(row)
                continue
            if not ready:
                result.append(row)
                continue
            try:
                price = self.stripe_request("GET", "prices/" + item["stripePriceId"])
                if price.get("active") is not True or price.get("type") != "one_time":
                    row["reason"] = "price_inactive"
                elif bool(price.get("livemode")) != (self.payment_mode() == "live"):
                    row["reason"] = "price_mode_mismatch"
                elif not isinstance(price.get("unit_amount"), int) or price["unit_amount"] < 1:
                    row["reason"] = "price_unavailable"
                elif not re.fullmatch(r"[a-z]{3}", str(price.get("currency", ""))):
                    row["reason"] = "price_unavailable"
                else:
                    row.update({
                        "enabled": True,
                        "reason": "",
                        "price": {"amountMinor": price["unit_amount"], "currency": price["currency"].upper()},
                    })
            except ApiError:
                row["reason"] = "price_unavailable"
            result.append(row)
        return result

    def create_checkout(self, body: dict[str, Any]) -> dict[str, Any]:
        if not self.stripe_ready():
            raise ApiError(503, "checkout_disabled", "Оплата не активирована: сервер не настроен для выбранного режима.")
        key = clamp_text(body.get("productKey"), 64)
        email = clamp_text(body.get("email"), 254)
        if not PRODUCT_KEY_RE.fullmatch(key) or not EMAIL_RE.fullmatch(email):
            raise ApiError(400, "invalid_checkout_request", "Проверьте выбранный продукт и email.")
        if body.get("termsAccepted") is not True:
            raise ApiError(400, "terms_required", "Перед оплатой необходимо подтвердить условия.")
        product = next((p for p in self.products_config() if p["key"] == key and p["active"]), None)
        if product is None:
            raise ApiError(409, "product_unavailable", "Этот продукт пока недоступен.")
        # Server independently confirms price is active and matches the configured mode.
        price = self.stripe_request("GET", "prices/" + product["stripePriceId"])
        if (price.get("active") is not True or price.get("type") != "one_time"
                or bool(price.get("livemode")) != (self.payment_mode() == "live")
                or not isinstance(price.get("unit_amount"), int) or price["unit_amount"] < 1):
            raise ApiError(409, "price_unavailable", "Цена не активна или не соответствует режиму оплаты.")
        order_id = "ord_" + uuid.uuid4().hex
        now = utc_now()
        currency = str(price.get("currency", "")).upper()
        with self.connect() as db:
            db.execute(
                "INSERT INTO orders(order_id,product_key,fulfillment_mode,email,amount_total,currency,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
                (order_id, key, product["fulfillmentMode"], email, int(price["unit_amount"]), currency, "created", now, now),
            )
        origin = self.env.get("PUBLIC_BASE_URL", "https://osgard.world").strip().rstrip("/")
        if not origin.startswith("https://"):
            with self.connect() as db:
                db.execute("UPDATE orders SET status='checkout_error',updated_at=? WHERE order_id=?", (utc_now(), order_id))
            raise ApiError(503, "public_origin_not_secure", "Платёжный адрес сервера не настроен безопасно.")
        fields = {
            "mode": "payment",
            "line_items[0][price]": product["stripePriceId"],
            "line_items[0][quantity]": "1",
            "customer_email": email,
            "client_reference_id": order_id,
            "metadata[order_id]": order_id,
            "metadata[product_key]": key,
            "success_url": origin + "/games/premium/success/?session_id={CHECKOUT_SESSION_ID}",
            "cancel_url": origin + "/games/premium/?cancelled=1",
        }
        try:
            session = self.stripe_request("POST", "checkout/sessions", fields, idempotency_key=order_id)
            target = urlsplit(str(session.get("url", "")))
            session_id = str(session.get("id", ""))
            if target.scheme != "https" or target.hostname != "checkout.stripe.com" or not session_id.startswith(("cs_test_", "cs_live_")):
                raise ApiError(502, "unsafe_checkout_response", "Не удалось безопасно подтвердить платёжную ссылку.")
            if bool(session.get("livemode")) != (self.payment_mode() == "live"):
                raise ApiError(502, "checkout_mode_mismatch", "Провайдер вернул сессию другого режима.")
            with self.connect() as db:
                db.execute(
                    "UPDATE orders SET stripe_session_id=?,status='pending',updated_at=? WHERE order_id=?",
                    (session_id, utc_now(), order_id),
                )
            return {"url": session["url"], "orderId": order_id}
        except ApiError:
            with self.connect() as db:
                db.execute("UPDATE orders SET status='checkout_error',updated_at=? WHERE order_id=?", (utc_now(), order_id))
            raise

    def verify_checkout(self, session_id: str) -> dict[str, Any]:
        if not re.fullmatch(r"cs_(?:test|live)_[A-Za-z0-9]+", session_id):
            raise ApiError(400, "invalid_session_id", "Некорректный идентификатор платёжной сессии.")
        with self.connect() as db:
            order = db.execute("SELECT * FROM orders WHERE stripe_session_id=?", (session_id,)).fetchone()
        if order is None:
            raise ApiError(404, "order_not_found", "Заказ по этой платёжной сессии не найден.")
        if order["status"] == "refunded":
            return {"paid": False, "orderId": order["order_id"], "orderStatus": "refunded"}
        session = self.stripe_request("GET", "checkout/sessions/" + session_id)
        if session.get("id") != session_id or session.get("metadata", {}).get("order_id") != order["order_id"]:
            raise ApiError(403, "session_order_mismatch", "Платёжная сессия не соответствует заказу.")
        if int(session.get("amount_total") or -1) != int(order["amount_total"]) or str(session.get("currency", "")).upper() != order["currency"]:
            raise ApiError(409, "session_amount_mismatch", "Сумма или валюта заказа не совпадает с записью сервера.")
        if bool(session.get("livemode")) != (self.payment_mode() == "live"):
            raise ApiError(409, "session_mode_mismatch", "Платёжная сессия принадлежит другому режиму.")
        if session.get("status") == "complete" and session.get("payment_status") == "paid":
            self._mark_paid(order["order_id"], session, "checkout-status-verification")
            return {"paid": True, "orderId": order["order_id"], "orderStatus": "paid"}
        state = "expired" if session.get("status") == "expired" else "pending"
        if order["status"] not in {"paid", "refunded"}:
            with self.connect() as db:
                db.execute("UPDATE orders SET status=?,updated_at=? WHERE order_id=?", (state, utc_now(), order["order_id"]))
        return {"paid": False, "orderId": order["order_id"], "orderStatus": state}

    def _record_server_event(self, db: sqlite3.Connection, name: str, order_id: str, product_key: str, source: str) -> None:
        event_id = "server_" + order_id + "_" + name
        db.execute(
            "INSERT OR IGNORE INTO events(event_id,name,session_id,game_id,source,path,duration_seconds,created_at) VALUES(?,?,?,?,?,?,?,?)",
            (event_id, name, event_id, "unknown", source, "/games/premium/", 0, utc_now()),
        )

    def _mark_paid_in_db(self, db: sqlite3.Connection, order_id: str, session: dict[str, Any], source: str) -> None:
        order = db.execute("SELECT * FROM orders WHERE order_id=?", (order_id,)).fetchone()
        if order is None or order["status"] == "refunded":
            return
        if int(session.get("amount_total") or -1) != int(order["amount_total"]) or str(session.get("currency", "")).upper() != order["currency"]:
            raise ApiError(409, "paid_amount_mismatch", "Подтверждённая сумма не совпадает с заказом.")
        changed = order["status"] != "paid"
        db.execute(
            "UPDATE orders SET status='paid',stripe_payment_intent_id=?,paid_at=COALESCE(paid_at,?),updated_at=? WHERE order_id=?",
            (session.get("payment_intent"), utc_now(), utc_now(), order_id),
        )
        if changed:
            self._record_server_event(db, "checkout_paid", order_id, order["product_key"], source)

    def _mark_paid(self, order_id: str, session: dict[str, Any], source: str) -> None:
        with self.connect() as db:
            self._mark_paid_in_db(db, order_id, session, source)

    def verify_stripe_signature(self, raw: bytes, header: str) -> bool:
        secret = self.env.get("STRIPE_WEBHOOK_SECRET", "").strip()
        if not secret or len(raw) > 262144:
            return False
        values: dict[str, list[str]] = defaultdict(list)
        for part in header.split(","):
            k, sep, v = part.strip().partition("=")
            if sep:
                values[k].append(v)
        try:
            timestamp = int(values.get("t", [""])[0])
        except (TypeError, ValueError):
            return False
        if abs(time.time() - timestamp) > 300:
            return False
        signed = str(timestamp).encode("ascii") + b"." + raw
        expected = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
        return any(hmac.compare_digest(expected, sig) for sig in values.get("v1", []))

    def handle_stripe_webhook(self, raw: bytes, signature: str) -> dict[str, Any]:
        if not self.verify_stripe_signature(raw, signature):
            raise ApiError(400, "invalid_webhook_signature", "Подпись webhook не подтверждена.")
        event = safe_json(raw)
        if not event or not isinstance(event.get("id"), str) or not isinstance(event.get("type"), str):
            raise ApiError(400, "invalid_webhook_event", "Некорректное событие платёжного провайдера.")
        event_id, event_type = event["id"][:255], event["type"][:120]
        obj = event.get("data", {}).get("object", {}) if isinstance(event.get("data"), dict) else {}
        if not isinstance(obj, dict):
            obj = {}
        with self.connect() as db:
            if db.execute("SELECT 1 FROM stripe_events WHERE stripe_event_id=?", (event_id,)).fetchone():
                return {"received": True, "duplicate": True}
            order_id = clamp_text((obj.get("metadata") or {}).get("order_id") or obj.get("client_reference_id"), 100)
            session_id = clamp_text(obj.get("id"), 160) if str(obj.get("id", "")).startswith("cs_") else ""
            order = db.execute(
                "SELECT * FROM orders WHERE order_id=? OR stripe_session_id=?",
                (order_id, session_id),
            ).fetchone()
            if event_type in {"checkout.session.completed", "checkout.session.async_payment_succeeded"} and order:
                if bool(obj.get("livemode")) != (self.payment_mode() == "live"):
                    raise ApiError(409, "webhook_mode_mismatch", "Событие пришло из другого режима оплаты.")
                if obj.get("payment_status") == "paid" and obj.get("status") == "complete":
                    if int(obj.get("amount_total") or -1) != int(order["amount_total"]) or str(obj.get("currency", "")).upper() != order["currency"]:
                        raise ApiError(409, "webhook_amount_mismatch", "Сумма или валюта webhook не совпадает с заказом.")
                    self._mark_paid_in_db(db, order["order_id"], obj, "stripe-webhook")
                else:
                    db.execute("UPDATE orders SET status='pending',updated_at=? WHERE order_id=? AND status NOT IN ('paid','refunded')", (utc_now(), order["order_id"]))
            elif event_type == "checkout.session.expired" and order:
                db.execute("UPDATE orders SET status='expired',updated_at=? WHERE order_id=? AND status NOT IN ('paid','refunded')", (utc_now(), order["order_id"]))
            elif event_type == "checkout.session.async_payment_failed" and order:
                db.execute("UPDATE orders SET status='payment_failed',updated_at=? WHERE order_id=? AND status NOT IN ('paid','refunded')", (utc_now(), order["order_id"]))
            elif event_type == "charge.refunded":
                payment_intent = clamp_text(obj.get("payment_intent"), 160)
                if payment_intent:
                    rows = db.execute("SELECT * FROM orders WHERE stripe_payment_intent_id=?", (payment_intent,)).fetchall()
                    for row in rows:
                        amount_refunded = min(int(row["amount_total"]), max(0, int(obj.get("amount_refunded") or 0)))
                        new_status = "refunded" if amount_refunded >= int(row["amount_total"]) else ("partially_refunded" if amount_refunded > 0 else row["status"])
                        db.execute("UPDATE orders SET amount_refunded=?,status=?,updated_at=? WHERE order_id=?", (amount_refunded,new_status,utc_now(),row["order_id"]))
                        if amount_refunded > int(row["amount_refunded"]):
                            self._record_server_event(db, "checkout_refunded", row["order_id"] + "_" + event_id, row["product_key"], "stripe-webhook")
            db.execute("INSERT INTO stripe_events(stripe_event_id,event_type,processed_at) VALUES(?,?,?)", (event_id,event_type,utc_now()))
        return {"received": True, "duplicate": False}

    def accept_lead(self, body: dict[str, Any], path: str) -> dict[str, Any]:
        if body.get("consent") is not True:
            raise ApiError(400, "consent_required", "Необходимо согласие на обработку данных для ответа на заявку.")
        # Honeypot: silently accept without storing to avoid telling bots what was detected.
        if clamp_text(body.get("website"), 200):
            return {"accepted": True, "leadId": "accepted"}
        project_type = clamp_text(body.get("projectType"), 120)
        budget = clamp_text(body.get("budget"), 80)
        contact = clamp_text(body.get("contact"), 180)
        description = clamp_text(body.get("description"), 1800, multiline=True)
        if not project_type or not contact or not description:
            raise ApiError(400, "invalid_lead", "Укажите тип проекта, контакт и описание задачи.")
        if len(contact) < 3:
            raise ApiError(400, "invalid_lead_contact", "Проверьте контакт для ответа.")
        lead_id = "lead_" + uuid.uuid4().hex
        now = utc_now()
        with self.connect() as db:
            db.execute(
                "INSERT INTO leads(lead_id,project_type,budget,contact,description,source_path,status,consent_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
                (lead_id,project_type,budget,contact,description,clamp_text(path, 240), "new", now, now),
            )
        return {"accepted": True, "leadId": lead_id}

    def collect_events(self, body: dict[str, Any]) -> dict[str, Any]:
        if body.get("consent") is not True:
            raise ApiError(400, "consent_required", "События принимаются только после согласия.")
        items = body.get("events")
        if not isinstance(items, list) or not items or len(items) > 20:
            raise ApiError(400, "invalid_events", "Допустимо от 1 до 20 событий за запрос.")
        accepted = 0
        now = utc_now()
        with self.connect() as db:
            for item in items:
                if not isinstance(item, dict):
                    continue
                name = clamp_text(item.get("name"), 80)
                if name not in EVENT_NAMES:
                    continue
                session_id = clamp_text(item.get("sessionId"), 160)
                game_id = clamp_text(item.get("gameId"), 40)
                source = clamp_text(item.get("source"), 80)
                path = clamp_text(item.get("path"), 240)
                if not session_id or not source or game_id not in GAME_IDS | {"unknown"}:
                    continue
                event_id = clamp_text(item.get("eventId"), 160)
                if not ID_RE.fullmatch(event_id):
                    event_id = "evt_" + uuid.uuid4().hex
                try:
                    duration = int(item.get("durationSeconds", 0))
                except (TypeError, ValueError):
                    duration = 0
                duration = min(36000, max(0, duration))
                referral = clamp_text(item.get("referralCode"), 24)
                if not REFERRAL_RE.fullmatch(referral):
                    referral = None
                campaign = clamp_text(item.get("campaign"), 64) or None
                placement = clamp_text(item.get("placement"), 80) or None
                invite_method = clamp_text(item.get("inviteMethod"), 40) or None
                cursor = db.execute(
                    """INSERT OR IGNORE INTO events(event_id,name,session_id,game_id,source,path,duration_seconds,
                    referral_code,campaign,placement,invite_method,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)""",
                    (event_id,name,session_id,game_id,source,path,duration,referral,campaign,placement,invite_method,now),
                )
                if cursor.rowcount:
                    accepted += 1
        return {"accepted": accepted}

    def admin_authorized(self, header: str) -> bool:
        expected = self.env.get("ADMIN_API_TOKEN", "").strip()
        if len(expected) < 32:
            return False
        scheme, _, value = header.partition(" ")
        return scheme.lower() == "bearer" and hmac.compare_digest(value.strip(), expected)

    def admin_overview(self) -> dict[str, Any]:
        with self.connect() as db:
            leads_total = db.execute("SELECT COUNT(*) AS n FROM leads").fetchone()["n"]
            leads_new = db.execute("SELECT COUNT(*) AS n FROM leads WHERE status='new'").fetchone()["n"]
            total_events = db.execute("SELECT COUNT(*) AS n FROM events WHERE created_at>=?", (self._older_than(30),)).fetchone()["n"]
            event_rows = db.execute("SELECT name,COUNT(*) AS n FROM events WHERE created_at>=? GROUP BY name ORDER BY n DESC LIMIT 12", (self._older_than(30),)).fetchall()
            status_rows = db.execute("SELECT status,COUNT(*) AS n FROM orders GROUP BY status").fetchall()
            gross_rows = db.execute("SELECT currency,SUM(amount_total) AS total,SUM(amount_total-amount_refunded) AS net FROM orders WHERE status IN ('paid','partially_refunded','refunded') GROUP BY currency").fetchall()
            orders_total = db.execute("SELECT COUNT(*) AS n FROM orders").fetchone()["n"]
        return {
            "leads": {"total": leads_total, "new": leads_new},
            "ordersByStatus": [{"status": row["status"], "count": row["n"]} for row in status_rows],
            "grossPaidByCurrency": [{"currency": row["currency"], "amountMinor": row["total"] or 0} for row in gross_rows],
            "netAfterRefundsByCurrency": [{"currency": row["currency"], "amountMinor": row["net"] or 0} for row in gross_rows],
            "analyticsEventsLast30Days": total_events,
            "topEventsLast30Days": [{"name": row["name"], "count": row["n"]} for row in event_rows],
            "ordersTotal": orders_total,
            "note": "События каталога добровольные и клиентские; выручка учитывается только после server-verified подтверждения Stripe.",
        }


def make_handler(service: CommerceService):
    class Handler(BaseHTTPRequestHandler):
        server_version = "OSGARD-Commerce"
        sys_version = ""

        def log_message(self, fmt: str, *args: Any) -> None:
            # Never log request bodies, email addresses, tokens or unfiltered query strings.
            path = urlsplit(self.path).path
            print("%s %s %s" % (self.log_date_time_string(), self.command, path))

        def _client_ip(self) -> str:
            raw = self.headers.get("X-Real-IP", "")
            try:
                return str(ipaddress.ip_address(raw.strip()))
            except ValueError:
                return self.client_address[0]

        def _json(self, status: int, payload: dict[str, Any]) -> None:
            data = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "no-referrer")
            self.end_headers()
            self.wfile.write(data)

        def _body(self, max_bytes: int = 16384) -> tuple[bytes, dict[str, Any]]:
            try:
                size = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                raise ApiError(400, "invalid_content_length")
            if size < 0 or size > max_bytes:
                raise ApiError(413, "body_too_large")
            raw = self.rfile.read(size)
            value = safe_json(raw)
            if value is None:
                raise ApiError(400, "invalid_json", "Ожидался JSON-объект.")
            return raw, value

        def _admin(self) -> None:
            if not service.admin_authorized(self.headers.get("Authorization", "")):
                raise ApiError(401, "admin_auth_required", "Требуется серверный токен оператора.")

        def _limited(self, route: str, limit: int, seconds: int) -> None:
            service.rate_limit(self._client_ip(), route, limit, seconds)

        def do_GET(self) -> None:
            try:
                service.cleanup_old_data()
                parsed = urlsplit(self.path)
                path = parsed.path
                query = parse_qs(parsed.query, keep_blank_values=True)
                if path in {"/health", "/health/ready"}:
                    self._json(200, {
                        "status": "ok" if path == "/health" else "ready",
                        "service": "osgard-commerce-api",
                        "version": APP_VERSION,
                        "paymentMode": service.payment_mode(),
                        "paymentReady": service.stripe_ready(),
                        "adminConfigured": len(service.env.get("ADMIN_API_TOKEN", "").strip()) >= 32,
                    })
                    return
                if path == "/v1/products":
                    self._limited("products", 60, 60)
                    self._json(200, {"items": service.product_catalog()})
                    return
                if path == "/v1/checkout/status":
                    self._limited("checkout-status", 60, 60)
                    session_id = (query.get("session_id") or [""])[0]
                    self._json(200, service.verify_checkout(session_id))
                    return
                if path.startswith("/v1/admin/"):
                    self._admin()
                    self._limited("admin-read", 120, 60)
                    if path == "/v1/admin/overview":
                        self._json(200, service.admin_overview())
                        return
                    if path == "/v1/admin/leads":
                        try: limit = min(100, max(1, int((query.get("limit") or ["30"])[0])))
                        except ValueError: limit = 30
                        with service.connect() as db:
                            rows = db.execute("SELECT lead_id,project_type,budget,contact,description,source_path,status,created_at FROM leads ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
                        self._json(200, {"items": [dict(row) for row in rows]})
                        return
                    if path == "/v1/admin/orders":
                        try: limit = min(100, max(1, int((query.get("limit") or ["30"])[0])))
                        except ValueError: limit = 30
                        with service.connect() as db:
                            rows = db.execute("SELECT order_id,product_key,email,status,currency,amount_total,created_at,paid_at FROM orders ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
                        self._json(200, {"items": [dict(row) for row in rows]})
                        return
                raise ApiError(404, "not_found", "Маршрут не найден.")
            except ApiError as exc:
                self._json(exc.status, {"error": exc.code, "message": exc.message})
            except Exception:
                self._json(500, {"error": "internal_error", "message": "Внутренняя ошибка сервиса."})

        def do_POST(self) -> None:
            try:
                service.cleanup_old_data()
                path = urlsplit(self.path).path
                if path == "/v1/webhook/stripe":
                    raw, _ = self._body(262144)
                    self._json(200, service.handle_stripe_webhook(raw, self.headers.get("Stripe-Signature", "")))
                    return
                if path == "/v1/events":
                    self._limited("events", 180, 60)
                    _, body = self._body()
                    self._json(200, service.collect_events(body))
                    return
                if path == "/v1/leads":
                    self._limited("leads", 5, 900)
                    _, body = self._body()
                    self._json(201, service.accept_lead(body, urlsplit(self.path).path))
                    return
                if path == "/v1/checkout/session":
                    self._limited("checkout", 10, 300)
                    _, body = self._body()
                    self._json(201, service.create_checkout(body))
                    return
                raise ApiError(404, "not_found", "Маршрут не найден.")
            except ApiError as exc:
                self._json(exc.status, {"error": exc.code, "message": exc.message})
            except Exception:
                self._json(500, {"error": "internal_error", "message": "Внутренняя ошибка сервиса."})

        def do_OPTIONS(self) -> None:
            self.send_response(405)
            self.send_header("Allow", "GET, POST")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()

    return Handler


def make_server(host: str = "0.0.0.0", port: int = 8080, service: CommerceService | None = None):
    service = service or CommerceService(os.environ.get("DATABASE_PATH", "/data/commerce.sqlite3"))
    server = ThreadingHTTPServer((host, port), make_handler(service))
    server.daemon_threads = True
    return server


def main() -> None:
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8080"))
    server = make_server(host, port)
    print(json.dumps({"service": "osgard-commerce-api", "version": APP_VERSION, "port": port, "paymentMode": os.environ.get("STRIPE_MODE", "disabled")}, ensure_ascii=False))
    try:
        server.serve_forever(poll_interval=0.5)
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
