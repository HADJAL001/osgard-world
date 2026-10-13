from __future__ import annotations

import hmac
import json
import os
import re
import sqlite3
import threading
import time
import uuid
from contextlib import contextmanager
from collections import deque
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

PORT = int(os.environ.get("PORT", "8080"))
DB_PATH = os.environ.get("OSGARD_COMMERCE_DB", "/var/lib/osgard-commerce/commerce.sqlite3")
ADMIN_TOKEN = os.environ.get("OSGARD_COMMERCE_ADMIN_TOKEN", "")
ALLOWED_ORIGINS = {
    item.strip().rstrip("/")
    for item in os.environ.get(
        "OSGARD_ALLOWED_ORIGINS",
        "https://osgard.world,https://www.osgard.world",
    ).split(",")
    if item.strip()
}
try:
    RETENTION_DAYS = max(30, min(730, int(os.environ.get("OSGARD_COMMERCE_RETENTION_DAYS", "180"))))
except ValueError:
    RETENTION_DAYS = 180

GAME_IDS = {
    "null-shift", "time", "swarm", "inherit", "remix",
    "civic-cascade", "patina", "signal-run", "cascade-lab", "unknown",
}
EVENT_NAMES = {
    "invite_link_created", "invite_landing", "invite_game_started", "invite_game_completed",
    "game_session_started", "game_session_completed", "lead_submitted", "cross_promo_clicked",
}
LEAD_STATUSES = {"new", "contacted", "qualified", "won", "lost"}
SESSION_RE = re.compile(r"^[A-Za-z0-9_-]{8,80}$")
SOURCE_RE = re.compile(r"^[A-Za-z0-9:._/-]{1,80}$")
INVITE_SOURCE_RE = re.compile(r"^player-invite(?:-link)?:([A-Za-z0-9_-]{8,48})$")
LEAD_ID_RE = re.compile(r"^[a-f0-9-]{36}$")

_rate_lock = threading.Lock()
_rate_buckets: dict[tuple[str, str], deque[float]] = {}
_last_prune = 0.0
_prune_lock = threading.Lock()


def utc_iso(epoch: float | None = None) -> str:
    return datetime.fromtimestamp(epoch or time.time(), timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def open_db() -> sqlite3.Connection:
    db = sqlite3.connect(DB_PATH, timeout=5.0)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA busy_timeout = 5000")
    return db


@contextmanager
def db_connection():
    db = open_db()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def initialize_db() -> None:
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    with db_connection() as db:
        db.execute("PRAGMA journal_mode = WAL")
        db.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_name TEXT NOT NULL,
                session_id TEXT NOT NULL,
                game_id TEXT NOT NULL,
                source TEXT NOT NULL,
                path TEXT NOT NULL,
                duration_seconds INTEGER NOT NULL DEFAULT 0,
                invite_id TEXT,
                created_at INTEGER NOT NULL,
                UNIQUE(event_name, session_id, source)
            )
        """)
        db.execute("CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_events_name_created ON events(event_name, created_at)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_events_invite ON events(invite_id, created_at)")
        db.execute("""
            CREATE TABLE IF NOT EXISTS leads (
                id TEXT PRIMARY KEY,
                project_type TEXT NOT NULL,
                budget TEXT NOT NULL DEFAULT '',
                contact TEXT NOT NULL,
                description TEXT NOT NULL,
                source_path TEXT NOT NULL DEFAULT '/',
                campaign TEXT NOT NULL DEFAULT '',
                campaign_medium TEXT NOT NULL DEFAULT '',
                campaign_content TEXT NOT NULL DEFAULT '',
                consent INTEGER NOT NULL CHECK (consent = 1),
                status TEXT NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new','contacted','qualified','won','lost')),
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )
        """)
        db.execute("CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status, created_at)")
        db.commit()


def prune_old_data() -> None:
    global _last_prune
    now = time.time()
    if now - _last_prune < 3600:
        return
    with _prune_lock:
        if now - _last_prune < 3600:
            return
        cutoff = int(now - RETENTION_DAYS * 86400)
        try:
            with db_connection() as db:
                db.execute("DELETE FROM events WHERE created_at < ?", (cutoff,))
                db.execute("DELETE FROM leads WHERE created_at < ?", (cutoff,))
                db.commit()
            _last_prune = now
        except sqlite3.Error:
            # A transient database lock must not break the public game page.
            return


def clean_text(value: object, maximum: int) -> str:
    if not isinstance(value, str):
        return ""
    return "".join(ch if ch in "\n\t" or ord(ch) >= 32 and ord(ch) != 127 else " " for ch in value).strip()[:maximum]


def valid_admin_token(value: str) -> bool:
    if len(ADMIN_TOKEN) < 32 or len(value) > 512:
        return False
    try:
        return hmac.compare_digest(ADMIN_TOKEN.encode("utf-8"), value.encode("utf-8"))
    except Exception:
        return False


def parse_invite_id(source: str) -> str | None:
    match = INVITE_SOURCE_RE.fullmatch(source)
    return match.group(1) if match else None


def limit_requests(bucket: str, ip: str, maximum: int, window_seconds: int) -> bool:
    now = time.monotonic()
    key = (bucket, ip)
    with _rate_lock:
        if len(_rate_buckets) > 10000:
            stale = [k for k, values in _rate_buckets.items() if not values or now - values[-1] > 3600]
            for stale_key in stale:
                _rate_buckets.pop(stale_key, None)
        values = _rate_buckets.setdefault(key, deque())
        while values and now - values[0] > window_seconds:
            values.popleft()
        if len(values) >= maximum:
            return False
        values.append(now)
        return True


class CommerceHandler(BaseHTTPRequestHandler):
    server_version = "OSGARD-Commerce"
    sys_version = ""

    def log_message(self, _format: str, *args: object) -> None:
        # Do not log request paths, query strings, contacts, form bodies, or operator headers.
        return

    def _security_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")

    def _send_json(self, code: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._security_headers()
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def _origin_allowed(self) -> bool:
        origin = self.headers.get("Origin")
        return not origin or origin.rstrip("/") in ALLOWED_ORIGINS

    def _client_ip(self) -> str:
        # X-Real-IP is assigned by the internal Nginx proxy. Container port 8080 is not published.
        return clean_text(self.headers.get("X-Real-IP") or self.client_address[0], 64)

    def _read_json(self) -> dict | None:
        length = self.headers.get("Content-Length", "")
        try:
            size = int(length)
        except ValueError:
            self._send_json(411, {"accepted": False, "error": "content_length_required"})
            return None
        if size < 2 or size > 65536:
            self._send_json(413, {"accepted": False, "error": "body_size_invalid"})
            return None
        if "application/json" not in self.headers.get("Content-Type", "").lower():
            self._send_json(415, {"accepted": False, "error": "json_required"})
            return None
        try:
            body = self.rfile.read(size)
            value = json.loads(body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._send_json(400, {"accepted": False, "error": "invalid_json"})
            return None
        if not isinstance(value, dict):
            self._send_json(400, {"accepted": False, "error": "object_required"})
            return None
        return value

    def _admin(self) -> bool:
        if len(ADMIN_TOKEN) < 32:
            self._send_json(503, {"error": "operator_access_not_configured"})
            return False
        supplied = self.headers.get("X-Admin-Token", "")
        if not valid_admin_token(supplied):
            self._send_json(401, {"error": "operator_authorization_required"})
            return False
        return True

    def _day_cutoff(self) -> tuple[int, int]:
        parsed = parse_qs(urlsplit(self.path).query).get("days", ["30"])[0]
        try:
            days = max(1, min(180, int(parsed)))
        except (TypeError, ValueError):
            days = 30
        return days, int(time.time() - days * 86400)

    def do_GET(self) -> None:
        prune_old_data()
        route = urlsplit(self.path)
        if route.path == "/health":
            self._send_json(200, {"status": "ok", "service": "osgard-commerce", "schemaVersion": 1})
            return
        if not route.path.startswith("/v1/admin/"):
            self._send_json(404, {"error": "not_found"})
            return
        if not self._admin():
            return

        days, cutoff = self._day_cutoff()
        if route.path == "/v1/admin/summary":
            self._admin_summary(days, cutoff)
        elif route.path == "/v1/admin/referrals":
            query = parse_qs(route.query)
            try:
                limit = max(1, min(100, int(query.get("limit", ["50"])[0])))
            except (ValueError, TypeError):
                limit = 50
            self._admin_referrals(cutoff, limit)
        elif route.path == "/v1/admin/leads":
            query = parse_qs(route.query)
            status_filter = query.get("status", ["new"])[0]
            if status_filter not in LEAD_STATUSES | {"all"}:
                self._send_json(400, {"error": "lead_status_invalid"})
                return
            try:
                limit = max(1, min(100, int(query.get("limit", ["50"])[0])))
            except (ValueError, TypeError):
                limit = 50
            self._admin_leads(cutoff, status_filter, limit)
        else:
            self._send_json(404, {"error": "not_found"})

    def _admin_summary(self, days: int, cutoff: int) -> None:
        with db_connection() as db:
            counts = {
                row["event_name"]: int(row["count"])
                for row in db.execute(
                    "SELECT event_name, COUNT(*) AS count FROM events WHERE created_at >= ? GROUP BY event_name",
                    (cutoff,),
                ).fetchall()
            }
            leads = db.execute(
                "SELECT status, COUNT(*) AS count FROM leads WHERE created_at >= ? GROUP BY status",
                (cutoff,),
            ).fetchall()
            event_total = db.execute("SELECT COUNT(*) FROM events WHERE created_at >= ?", (cutoff,)).fetchone()[0]
            invite_totals = db.execute(
                """SELECT
                    COUNT(DISTINCT CASE WHEN event_name='invite_link_created' THEN invite_id END) AS created,
                    COUNT(DISTINCT CASE WHEN event_name='invite_landing' THEN session_id END) AS landings,
                    COUNT(DISTINCT CASE WHEN event_name='invite_game_started' THEN session_id END) AS starts,
                    COUNT(DISTINCT CASE WHEN event_name='invite_game_completed' THEN session_id END) AS completions
                   FROM events WHERE created_at >= ?""",
                (cutoff,),
            ).fetchone()
        lead_counts = {row["status"]: int(row["count"]) for row in leads}
        created = int(invite_totals["created"] or 0)
        landings = int(invite_totals["landings"] or 0)
        starts = int(invite_totals["starts"] or 0)
        completions = int(invite_totals["completions"] or 0)
        self._send_json(200, {
            "periodDays": days,
            "retentionDays": RETENTION_DAYS,
            "eventsTotal": int(event_total),
            "eventsByName": counts,
            "leads": {
                "new": lead_counts.get("new", 0),
                "contacted": lead_counts.get("contacted", 0),
                "qualified": lead_counts.get("qualified", 0),
                "won": lead_counts.get("won", 0),
                "lost": lead_counts.get("lost", 0),
                "total": sum(lead_counts.values()),
            },
            "invites": {
                "created": created,
                "landings": landings,
                "gameStarts": starts,
                "gameCompletions": completions,
                "landingPerLink": round(landings / created, 3) if created else 0,
                "startPerLanding": round(starts / landings, 3) if landings else 0,
                "completionPerStart": round(completions / starts, 3) if starts else 0,
            },
            "generatedAt": utc_iso(),
        })

    def _admin_referrals(self, cutoff: int, limit: int) -> None:
        with db_connection() as db:
            rows = db.execute(
                """SELECT invite_id,
                    MAX(CASE WHEN event_name='invite_link_created' THEN game_id END) AS game_id,
                    MAX(CASE WHEN event_name='invite_link_created' THEN 1 ELSE 0 END) AS link_created,
                    COUNT(DISTINCT CASE WHEN event_name='invite_landing' THEN session_id END) AS landings,
                    COUNT(DISTINCT CASE WHEN event_name='invite_game_started' THEN session_id END) AS starts,
                    COUNT(DISTINCT CASE WHEN event_name='invite_game_completed' THEN session_id END) AS completions,
                    MAX(created_at) AS last_at
                   FROM events WHERE invite_id IS NOT NULL AND created_at >= ?
                   GROUP BY invite_id ORDER BY last_at DESC LIMIT ?""",
                (cutoff, limit),
            ).fetchall()
        self._send_json(200, {"referrals": [
            {
                "inviteId": row["invite_id"],
                "gameId": row["game_id"] or "unknown",
                "linkCreated": bool(row["link_created"]),
                "landings": int(row["landings"]),
                "starts": int(row["starts"]),
                "completions": int(row["completions"]),
                "lastActivityAt": utc_iso(float(row["last_at"])),
            }
            for row in rows
        ]})

    def _admin_leads(self, cutoff: int, status_filter: str, limit: int) -> None:
        where = "created_at >= ?"
        params: list[object] = [cutoff]
        if status_filter != "all":
            where += " AND status = ?"
            params.append(status_filter)
        params.append(limit)
        with db_connection() as db:
            rows = db.execute(
                f"""SELECT id, project_type, budget, contact, description, source_path,
                           campaign, campaign_medium, campaign_content, status, created_at, updated_at
                    FROM leads WHERE {where} ORDER BY created_at DESC LIMIT ?""",
                params,
            ).fetchall()
        self._send_json(200, {"leads": [
            {
                "leadId": row["id"],
                "projectType": row["project_type"],
                "budget": row["budget"],
                "contact": row["contact"],
                "description": row["description"],
                "sourcePath": row["source_path"],
                "campaign": row["campaign"],
                "campaignMedium": row["campaign_medium"],
                "campaignContent": row["campaign_content"],
                "status": row["status"],
                "createdAt": utc_iso(float(row["created_at"])),
                "updatedAt": utc_iso(float(row["updated_at"])),
            }
            for row in rows
        ]})

    def do_POST(self) -> None:
        prune_old_data()
        if not self._origin_allowed():
            self._send_json(403, {"accepted": False, "error": "origin_not_allowed"})
            return
        route = urlsplit(self.path).path
        is_lead = route == "/v1/leads"
        if route not in {"/v1/events", "/v1/leads"}:
            self._send_json(404, {"accepted": False, "error": "not_found"})
            return
        if not limit_requests("lead" if is_lead else "events", self._client_ip(), 5 if is_lead else 60, 3600 if is_lead else 60):
            self._send_json(429, {"accepted": False, "error": "rate_limited"})
            return
        payload = self._read_json()
        if payload is None:
            return
        if payload.get("consent") is not True:
            self._send_json(403, {"accepted": False, "error": "consent_required"})
            return
        if is_lead:
            self._submit_lead(payload)
        else:
            self._ingest_events(payload)

    def _ingest_events(self, payload: dict) -> None:
        events = payload.get("events")
        if not isinstance(events, list) or not 1 <= len(events) <= 20:
            self._send_json(400, {"accepted": False, "error": "events_array_required"})
            return
        clean_events: list[dict] = []
        for event in events:
            if not isinstance(event, dict):
                self._send_json(400, {"accepted": False, "error": "event_object_required"})
                return
            name = event.get("name")
            if not isinstance(name, str) or name not in EVENT_NAMES:
                self._send_json(400, {"accepted": False, "error": "event_name_not_allowed"})
                return
            session_id = event.get("sessionId")
            game_id = event.get("gameId")
            source = event.get("source")
            page_path = event.get("path")
            duration = event.get("durationSeconds", 0)
            if not isinstance(session_id, str) or not SESSION_RE.fullmatch(session_id):
                self._send_json(400, {"accepted": False, "error": "session_id_invalid"})
                return
            if not isinstance(game_id, str) or game_id not in GAME_IDS:
                self._send_json(400, {"accepted": False, "error": "game_id_invalid"})
                return
            if not isinstance(source, str) or not SOURCE_RE.fullmatch(source):
                self._send_json(400, {"accepted": False, "error": "source_invalid"})
                return
            if not isinstance(page_path, str) or not page_path.startswith("/") or "?" in page_path or len(page_path) > 180:
                self._send_json(400, {"accepted": False, "error": "path_invalid"})
                return
            if isinstance(duration, bool) or not isinstance(duration, int) or not 0 <= duration <= 604800:
                self._send_json(400, {"accepted": False, "error": "duration_invalid"})
                return
            clean_events.append({
                "event_name": name,
                "session_id": session_id,
                "game_id": game_id,
                "source": source,
                "path": page_path,
                "duration_seconds": duration,
                "invite_id": parse_invite_id(source),
            })
        now = int(time.time())
        accepted = 0
        with db_connection() as db:
            for event in clean_events:
                cursor = db.execute(
                    """INSERT OR IGNORE INTO events
                       (event_name, session_id, game_id, source, path, duration_seconds, invite_id, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        event["event_name"], event["session_id"], event["game_id"], event["source"],
                        event["path"], event["duration_seconds"], event["invite_id"], now,
                    ),
                )
                accepted += max(0, cursor.rowcount)
            db.commit()
        self._send_json(202, {
            "accepted": True,
            "acceptedEvents": accepted,
            "duplicateEvents": len(clean_events) - accepted,
        })

    def _submit_lead(self, payload: dict) -> None:
        if len(ADMIN_TOKEN) < 32:
            self._send_json(503, {"accepted": False, "error": "secure_lead_storage_not_configured"})
            return
        # A filled honeypot is handled without a database write and without revealing detection to bots.
        if clean_text(payload.get("website", ""), 200):
            self._send_json(202, {"accepted": True, "leadId": "received"})
            return
        project_type = clean_text(payload.get("projectType"), 120)
        contact = clean_text(payload.get("contact"), 180)
        budget = clean_text(payload.get("budget", ""), 80)
        description = clean_text(payload.get("description"), 1800)
        source_path = clean_text(payload.get("sourcePath", "/"), 180)
        campaign = clean_text(payload.get("campaign", ""), 80)
        campaign_medium = clean_text(payload.get("campaignMedium", ""), 80)
        campaign_content = clean_text(payload.get("campaignContent", ""), 80)
        if not project_type or not contact or len(contact) < 3 or not description:
            self._send_json(400, {"accepted": False, "error": "required_fields_missing"})
            return
        if not source_path.startswith("/") or "?" in source_path:
            source_path = "/"
        for value in (campaign, campaign_medium, campaign_content):
            if not re.fullmatch(r"^[A-Za-z0-9._/-]{0,80}$", value):
                self._send_json(400, {"accepted": False, "error": "campaign_metadata_invalid"})
                return
        lead_id = str(uuid.uuid4())
        now = int(time.time())
        with db_connection() as db:
            db.execute(
                """INSERT INTO leads
                   (id, project_type, budget, contact, description, source_path, campaign,
                    campaign_medium, campaign_content, consent, status, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'new', ?, ?)""",
                (
                    lead_id, project_type, budget, contact, description, source_path,
                    campaign, campaign_medium, campaign_content, now, now,
                ),
            )
            db.commit()
        self._send_json(201, {"accepted": True, "leadId": lead_id})

    def do_PATCH(self) -> None:
        route = urlsplit(self.path).path
        match = re.fullmatch(r"/v1/admin/leads/([a-f0-9-]{36})/status", route)
        if not match:
            self._send_json(404, {"error": "not_found"})
            return
        if not self._origin_allowed():
            self._send_json(403, {"error": "origin_not_allowed"})
            return
        if not self._admin():
            return
        payload = self._read_json()
        if payload is None:
            return
        status = payload.get("status")
        if status not in LEAD_STATUSES:
            self._send_json(400, {"error": "lead_status_invalid"})
            return
        with db_connection() as db:
            cursor = db.execute(
                "UPDATE leads SET status=?, updated_at=? WHERE id=?",
                (status, int(time.time()), match.group(1)),
            )
            db.commit()
        if cursor.rowcount != 1:
            self._send_json(404, {"error": "lead_not_found"})
            return
        self._send_json(200, {"updated": True, "leadId": match.group(1), "status": status})


def main() -> None:
    initialize_db()
    prune_old_data()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), CommerceHandler)
    server.daemon_threads = True
    print(json.dumps({"service": "osgard-commerce", "status": "ready", "port": PORT, "retentionDays": RETENTION_DAYS}))
    try:
        server.serve_forever(poll_interval=0.25)
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
