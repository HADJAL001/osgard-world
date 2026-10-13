import json
import os
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TEMP = tempfile.TemporaryDirectory(prefix="osgard-commerce-test-")
os.environ["OSGARD_COMMERCE_DB"] = str(Path(TEMP.name) / "test.sqlite3")
os.environ["OSGARD_COMMERCE_ADMIN_TOKEN"] = "test-admin-token-" + ("x" * 48)
os.environ["OSGARD_COMMERCE_RETENTION_DAYS"] = "180"
sys.path.insert(0, str(ROOT))

import server  # noqa: E402

server.DB_PATH = os.environ["OSGARD_COMMERCE_DB"]
server.ADMIN_TOKEN = os.environ["OSGARD_COMMERCE_ADMIN_TOKEN"]
server.RETENTION_DAYS = 180


class CommerceApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        server.initialize_db()
        cls.httpd = ThreadingHTTPServer(("127.0.0.1", 0), server.CommerceHandler)
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = "http://127.0.0.1:%s" % cls.httpd.server_address[1]

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()
        TEMP.cleanup()

    def setUp(self):
        server._rate_buckets.clear()
        server._last_prune = 0

    def request(self, method, path, payload=None, token=None, headers=None):
        all_headers = {"Accept": "application/json"}
        if payload is not None:
            all_headers["Content-Type"] = "application/json"
        if token is not None:
            all_headers["X-Admin-Token"] = token
        if headers:
            all_headers.update(headers)
        data = None if payload is None else json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(self.base + path, data=data, headers=all_headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=3) as response:
                return response.status, json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8")
            try:
                return exc.code, json.loads(body)
            except json.JSONDecodeError:
                return exc.code, {"body": body}

    def event(self, name, session, source, game="null-shift"):
        return {
            "name": name,
            "sessionId": session,
            "gameId": game,
            "source": source,
            "path": "/games/",
            "durationSeconds": 0,
        }

    def test_health_and_privacy_headers(self):
        status, body = self.request("GET", "/health")
        self.assertEqual(status, 200)
        self.assertEqual(body["service"], "osgard-commerce")
        self.assertNotIn("X-Admin-Token", json.dumps(body))
        req = urllib.request.Request(self.base + "/health")
        with urllib.request.urlopen(req, timeout=3) as response:
            self.assertEqual(response.headers.get("Cache-Control"), "no-store")
            self.assertEqual(response.headers.get("X-Frame-Options"), "DENY")

    def test_event_consent_validation_and_event_whitelist(self):
        event = self.event("invite_landing", "invitevisit_abcdefgh12345678", "player-invite:abcdef1234567890")
        status, _ = self.request("POST", "/v1/events", {"consent": False, "events": [event]})
        self.assertEqual(status, 403)
        status, _ = self.request("POST", "/v1/events", {"consent": True, "events": [dict(event, name="fake_ad_click")]})
        self.assertEqual(status, 400)
        status, _ = self.request("POST", "/v1/events", {"consent": True, "events": [dict(event, gameId=["not-a-game"])]})
        self.assertEqual(status, 400)
        status, _ = self.request("POST", "/v1/events", {"consent": True, "events": [dict(event, sessionId="bad id")]})
        self.assertEqual(status, 400)

    def test_referral_funnel_is_stored_and_aggregated(self):
        invite = "ab12cd34ef56ab78cd90ef12"
        created = self.event("invite_link_created", "invite_" + invite, "player-invite-link:" + invite)
        landing = self.event("invite_landing", "invitevisit_abcdefgh12345678", "player-invite:" + invite)
        started = self.event("invite_game_started", "invitevisit_abcdefgh12345678", "player-invite:" + invite)
        completed = self.event("invite_game_completed", "invitevisit_abcdefgh12345678", "player-invite:" + invite)
        for event in (created, landing, started, completed):
            status, body = self.request("POST", "/v1/events", {"consent": True, "events": [event]})
            self.assertEqual(status, 202)
            self.assertTrue(body["accepted"])
            self.assertEqual(body["acceptedEvents"], 1)
        # Idempotent retry must not inflate the referral funnel.
        status, body = self.request("POST", "/v1/events", {"consent": True, "events": [landing]})
        self.assertEqual(status, 202)
        self.assertEqual(body["acceptedEvents"], 0)
        self.assertEqual(body["duplicateEvents"], 1)
        status, _ = self.request("GET", "/v1/admin/summary")
        self.assertEqual(status, 401)
        status, summary = self.request("GET", "/v1/admin/summary?days=30", token=server.ADMIN_TOKEN)
        self.assertEqual(status, 200)
        self.assertEqual(summary["invites"]["created"], 1)
        self.assertEqual(summary["invites"]["landings"], 1)
        self.assertEqual(summary["invites"]["gameStarts"], 1)
        self.assertEqual(summary["invites"]["gameCompletions"], 1)
        status, body = self.request("GET", "/v1/admin/referrals?days=30", token=server.ADMIN_TOKEN)
        self.assertEqual(status, 200)
        self.assertEqual(body["referrals"][0]["inviteId"], invite)
        self.assertEqual(body["referrals"][0]["starts"], 1)

    def test_origin_guard(self):
        status, _ = self.request("POST", "/v1/events", {"consent": True, "events": [self.event("invite_landing", "invitevisit_abcdefgh12345678", "player-invite:abcdef1234567890")]}, headers={"Origin": "https://attacker.invalid"})
        self.assertEqual(status, 403)

    def test_leads_require_consent_and_are_admin_protected(self):
        no_consent = {"consent": False, "projectType": "Game", "contact": "owner@example.test", "description": "A game project"}
        status, _ = self.request("POST", "/v1/leads", no_consent)
        self.assertEqual(status, 403)
        lead = {
            "consent": True, "projectType": "Game", "budget": "optional",
            "contact": "owner@example.test", "description": "Create an original puzzle game",
            "website": "", "sourcePath": "/games/", "campaign": "player_invite_loop",
            "campaignMedium": "player_share", "campaignContent": "cascade-lab",
        }
        status, body = self.request("POST", "/v1/leads", lead)
        self.assertEqual(status, 201)
        self.assertTrue(body["accepted"])
        lead_id = body["leadId"]
        status, _ = self.request("GET", "/v1/admin/leads?status=new")
        self.assertEqual(status, 401)
        status, result = self.request("GET", "/v1/admin/leads?status=new", token=server.ADMIN_TOKEN)
        self.assertEqual(status, 200)
        self.assertEqual(len(result["leads"]), 1)
        self.assertEqual(result["leads"][0]["leadId"], lead_id)
        self.assertEqual(result["leads"][0]["campaign"], "player_invite_loop")
        status, result = self.request("PATCH", "/v1/admin/leads/" + lead_id + "/status", {"status": "qualified"}, token=server.ADMIN_TOKEN)
        self.assertEqual(status, 200)
        self.assertEqual(result["status"], "qualified")
        status, _ = self.request("GET", "/v1/admin/leads?status=qualified", token=server.ADMIN_TOKEN)
        self.assertEqual(status, 200)

    def test_honeypot_does_not_store_lead(self):
        payload = {"consent": True, "projectType": "Game", "contact": "bot@example.test", "description": "Bot", "website": "spam"}
        status, response = self.request("POST", "/v1/leads", payload)
        self.assertEqual(status, 202)
        self.assertTrue(response["accepted"])
        status, result = self.request("GET", "/v1/admin/leads?status=all", token=server.ADMIN_TOKEN)
        self.assertEqual(status, 200)
        self.assertEqual(len(result["leads"]), 1)  # Only the real lead from the prior test may be present.
        self.assertFalse(any(row["contact"] == "bot@example.test" for row in result["leads"]))

    def test_event_retention_deletes_expired_rows(self):
        with server.db_connection() as db:
            db.execute(
                "INSERT OR IGNORE INTO events (event_name, session_id, game_id, source, path, duration_seconds, invite_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                ("invite_landing", "invitevisit_old123456", "null-shift", "player-invite:oldcode12345678", "/games/", 0, "oldcode12345678", 1),
            )
            db.commit()
        server._last_prune = 0
        server.prune_old_data()
        with server.db_connection() as db:
            row = db.execute("SELECT COUNT(*) AS count FROM events WHERE session_id='invitevisit_old123456'").fetchone()
            self.assertEqual(row["count"], 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
