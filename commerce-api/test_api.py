import hashlib
import hmac
import json
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from app import CommerceService, make_handler, make_server


ADMIN_TOKEN = "test-admin-token-" + ("x" * 48)


class CommerceApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="osgard-commerce-test-")
        cls.env = {
            "ADMIN_API_TOKEN": ADMIN_TOKEN,
            "STRIPE_MODE": "disabled",
            "DATABASE_PATH": str(Path(cls.temp.name) / "commerce.sqlite3"),
            "COMMERCE_PRODUCTS_JSON": "[]",
            "EVENT_RETENTION_DAYS": "90",
            "LEAD_RETENTION_DAYS": "180",
            "ORDER_RETENTION_DAYS": "365",
            "PUBLIC_BASE_URL": "https://osgard.world",
        }
        cls.service = CommerceService(cls.env["DATABASE_PATH"], cls.env)
        cls.server = make_server("127.0.0.1", 0, cls.service)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = "http://127.0.0.1:%s" % cls.server.server_address[1]

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.temp.cleanup()

    def setUp(self):
        with self.service.connect() as db:
            db.execute("DELETE FROM events")
            db.execute("DELETE FROM leads")
            db.execute("DELETE FROM orders")
            db.execute("DELETE FROM stripe_events")
        self.service._rate.clear()
        self.service._last_cleanup = time.monotonic()
        self.service.env.update({
            "ADMIN_API_TOKEN": ADMIN_TOKEN,
            "STRIPE_MODE": "disabled",
            "STRIPE_SECRET_KEY": "",
            "STRIPE_WEBHOOK_SECRET": "",
            "COMMERCE_PRODUCTS_JSON": "[]",
        })
        self._stripe_sessions = {}
        self._stripe_event_calls = []

    def request(self, method, path, payload=None, headers=None, raw=None):
        request_headers = {"Accept": "application/json"}
        data = raw
        if payload is not None:
            data = json.dumps(payload, separators=(",", ":")).encode("utf-8")
            request_headers["Content-Type"] = "application/json"
        if headers:
            request_headers.update(headers)
        request = urllib.request.Request(self.base + path, data=data, headers=request_headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=4) as response:
                return response.status, json.loads(response.read().decode("utf-8")), response.headers
        except urllib.error.HTTPError as exc:
            raw_body = exc.read().decode("utf-8")
            try:
                parsed = json.loads(raw_body)
            except json.JSONDecodeError:
                parsed = {"body": raw_body}
            return exc.code, parsed, exc.headers

    def admin_headers(self):
        return {"Authorization": "Bearer " + ADMIN_TOKEN}

    def _configure_fake_stripe(self):
        product = {
            "key": "support-starter",
            "label": "Поддержать OSGARD",
            "description": "Разовый вклад в поддержку авторских игр и инфраструктуры.",
            "stripePriceId": "price_test_osgard_499",
            "fulfillmentMode": "support",
            "mode": "payment",
            "active": True,
        }
        self.service.env.update({
            "STRIPE_MODE": "test",
            "STRIPE_SECRET_KEY": "sk_test_unit_fixture_only",
            "STRIPE_WEBHOOK_SECRET": "whsec_unit_fixture_only",
            "COMMERCE_PRODUCTS_JSON": json.dumps([product]),
        })
        self.service.stripe_request = self._fake_stripe_request

    def _fake_stripe_request(self, method, path, fields=None, idempotency_key=""):
        self._stripe_event_calls.append((method, path, dict(fields or {}), idempotency_key))
        if method == "GET" and path == "prices/price_test_osgard_499":
            return {
                "id": "price_test_osgard_499",
                "active": True,
                "type": "one_time",
                "livemode": False,
                "unit_amount": 499,
                "currency": "eur",
            }
        if method == "POST" and path == "checkout/sessions":
            session_id = "cs_test_Osgard123456"
            order_id = fields["metadata[order_id]"]
            session = {
                "id": session_id,
                "url": "https://checkout.stripe.com/c/pay/" + session_id,
                "livemode": False,
                "status": "open",
                "payment_status": "unpaid",
                "amount_total": 499,
                "currency": "eur",
                "payment_intent": None,
                "client_reference_id": order_id,
                "metadata": {
                    "order_id": order_id,
                    "product_key": fields["metadata[product_key]"],
                },
            }
            self._stripe_sessions[session_id] = session
            return session
        if method == "GET" and path.startswith("checkout/sessions/"):
            session_id = path.rsplit("/", 1)[1]
            if session_id not in self._stripe_sessions:
                raise AssertionError("Unexpected checkout session lookup")
            return dict(self._stripe_sessions[session_id])
        raise AssertionError("Unexpected Stripe call %s %s" % (method, path))

    def stripe_signature(self, raw, timestamp=None):
        timestamp = int(time.time()) if timestamp is None else timestamp
        signed = str(timestamp).encode("ascii") + b"." + raw
        secret = self.service.env["STRIPE_WEBHOOK_SECRET"].encode()
        signature = hmac.new(secret, signed, hashlib.sha256).hexdigest()
        return "t=%s,v1=%s" % (timestamp, signature)

    def test_health_and_security_headers(self):
        status, body, headers = self.request("GET", "/health")
        self.assertEqual(status, 200)
        self.assertEqual(body["service"], "osgard-commerce-api")
        self.assertEqual(body["paymentMode"], "disabled")
        self.assertNotIn("STRIPE_SECRET_KEY", json.dumps(body))
        self.assertEqual(headers.get("Cache-Control"), "no-store")
        self.assertEqual(headers.get("X-Content-Type-Options"), "nosniff")
        self.assertEqual(headers.get("X-Frame-Options"), "DENY")

    def test_consent_and_event_allowlist_are_required(self):
        event = {
            "eventId": "evt_test_valid_0001",
            "name": "share_created",
            "sessionId": "session_test_001",
            "gameId": "null-shift",
            "source": "games-catalog-player",
            "path": "/games/",
            "durationSeconds": 0,
            "referralCode": "rabcdef123456",
            "campaign": "player_invite",
        }
        status, body, _ = self.request("POST", "/v1/events", {"consent": False, "events": [event]})
        self.assertEqual(status, 400)
        status, body, _ = self.request("POST", "/v1/events", {"consent": True, "events": [dict(event, name="fake_ad_click")]})
        self.assertEqual(status, 200)
        self.assertEqual(body["accepted"], 0)
        status, body, _ = self.request("POST", "/v1/events", {"consent": True, "events": [dict(event, gameId=["not-a-game"])]})
        self.assertEqual(status, 200)
        self.assertEqual(body["accepted"], 0)
        status, body, _ = self.request("POST", "/v1/events", {"consent": True, "events": [event]})
        self.assertEqual(status, 200)
        self.assertEqual(body["accepted"], 1)
        status, body, _ = self.request("POST", "/v1/events", {"consent": True, "events": [event]})
        self.assertEqual(body["accepted"], 0, "Repeated event IDs must be idempotent")

    def test_referral_funnel_is_stored_and_aggregated(self):
        landing = {
            "eventId": "evt_referral_session_0001",
            "name": "referral_session_started",
            "sessionId": "session_invite_123",
            "gameId": "swarm",
            "source": "games-catalog-player:friend-invite",
            "path": "/games/",
            "durationSeconds": 0,
            "referralCode": "rabcdef123456",
            "campaign": "player_invite",
            "placement": "post-run",
            "inviteMethod": "clipboard",
        }
        status, body, _ = self.request("POST", "/v1/events", {"consent": True, "events": [landing]})
        self.assertEqual(status, 200)
        self.assertEqual(body["accepted"], 1)
        status, overview, _ = self.request("GET", "/v1/admin/overview", headers=self.admin_headers())
        self.assertEqual(status, 200)
        counts = {item["name"]: item["count"] for item in overview["topEventsLast30Days"]}
        self.assertEqual(counts.get("referral_session_started"), 1)
        self.assertEqual(overview["analyticsEventsLast30Days"], 1)
        self.assertIn("client", overview["note"].lower())
        self.assertNotIn("rabcdef123456", json.dumps(overview), "Aggregate report must not leak referral codes")

    def test_leads_require_consent_and_are_operator_protected(self):
        lead = {
            "projectType": "Игру",
            "budget": "Пока не определён",
            "contact": "studio@example.test",
            "description": "Хочу обсудить небольшую игру.",
            "consent": True,
            "website": "",
        }
        status, body, _ = self.request("POST", "/v1/leads", dict(lead, consent=False))
        self.assertEqual(status, 400)
        status, body, _ = self.request("POST", "/v1/leads", lead)
        self.assertEqual(status, 201)
        self.assertTrue(body["accepted"])
        self.assertTrue(body["leadId"].startswith("lead_"))
        status, body, _ = self.request("GET", "/v1/admin/leads?limit=10")
        self.assertEqual(status, 401)
        status, body, _ = self.request("GET", "/v1/admin/leads?limit=10", headers=self.admin_headers())
        self.assertEqual(status, 200)
        self.assertEqual(len(body["items"]), 1)
        self.assertEqual(body["items"][0]["contact"], "studio@example.test")

    def test_honeypot_is_not_saved(self):
        lead = {
            "projectType": "Игру", "budget": "", "contact": "bot@example.test",
            "description": "Automated spam", "consent": True, "website": "https://bot.invalid",
        }
        status, body, _ = self.request("POST", "/v1/leads", lead)
        self.assertEqual(status, 201)
        self.assertTrue(body["accepted"])
        self.assertEqual(body["leadId"], "accepted")
        status, listing, _ = self.request("GET", "/v1/admin/leads", headers=self.admin_headers())
        self.assertEqual(listing["items"], [])

    def test_products_and_checkout_fail_closed_by_default(self):
        status, body, _ = self.request("GET", "/v1/products")
        self.assertEqual(status, 200)
        self.assertEqual(body["items"], [])
        status, body, _ = self.request("POST", "/v1/checkout/session", {
            "productKey": "support-starter", "email": "buyer@example.test", "termsAccepted": True,
        })
        self.assertEqual(status, 503)
        self.assertEqual(body["error"], "checkout_disabled")
        status, body, _ = self.request("GET", "/v1/checkout/status?session_id=cs_test_notknown123")
        self.assertEqual(status, 404, "A made-up payment session must not be treated as a live or paid order")

    def test_checkout_uses_server_price_and_stripe_webhook_is_idempotent(self):
        self._configure_fake_stripe()
        status, catalog, _ = self.request("GET", "/v1/products")
        self.assertEqual(status, 200)
        self.assertTrue(catalog["items"][0]["enabled"])
        self.assertEqual(catalog["items"][0]["price"], {"amountMinor": 499, "currency": "EUR"})

        status, checkout, _ = self.request("POST", "/v1/checkout/session", {
            "productKey": "support-starter",
            "email": "buyer@example.test",
            "termsAccepted": True,
            "amount": 1,
            "currency": "USD",
        })
        self.assertEqual(status, 201)
        self.assertTrue(checkout["url"].startswith("https://checkout.stripe.com/"))
        self.assertTrue(checkout["orderId"].startswith("ord_"))
        self.assertTrue(any(call[0] == "GET" and call[1] == "prices/price_test_osgard_499" for call in self._stripe_event_calls))
        self.assertTrue(any(call[0] == "POST" and call[1] == "checkout/sessions" for call in self._stripe_event_calls))
        with self.service.connect() as db:
            order = db.execute("SELECT * FROM orders WHERE order_id=?", (checkout["orderId"],)).fetchone()
        self.assertEqual(order["amount_total"], 499, "The browser-supplied amount must be ignored")
        self.assertEqual(order["currency"], "EUR")
        self.assertEqual(order["status"], "pending")

        session_id = order["stripe_session_id"]
        session = self._stripe_sessions[session_id]
        session.update({"status": "complete", "payment_status": "paid", "payment_intent": "pi_test_osgard123"})
        webhook = {
            "id": "evt_test_checkout_paid_0001",
            "type": "checkout.session.completed",
            "data": {"object": dict(session)},
        }
        raw = json.dumps(webhook, separators=(",", ":")).encode()
        sig = self.stripe_signature(raw)
        status, received, _ = self.request("POST", "/v1/webhook/stripe", headers={"Stripe-Signature": sig}, raw=raw)
        self.assertEqual(status, 200)
        self.assertTrue(received["received"])
        self.assertFalse(received["duplicate"])
        status, repeated, _ = self.request("POST", "/v1/webhook/stripe", headers={"Stripe-Signature": sig}, raw=raw)
        self.assertEqual(status, 200)
        self.assertTrue(repeated["duplicate"])

        status, verified, _ = self.request("GET", "/v1/checkout/status?session_id=" + session_id)
        self.assertEqual(status, 200)
        self.assertTrue(verified["paid"])
        self.assertEqual(verified["orderId"], checkout["orderId"])
        status, overview, _ = self.request("GET", "/v1/admin/overview", headers=self.admin_headers())
        self.assertEqual(status, 200)
        self.assertEqual(overview["grossPaidByCurrency"], [{"currency": "EUR", "amountMinor": 499}])
        paid_events = [row for row in overview["topEventsLast30Days"] if row["name"] == "checkout_paid"]
        self.assertEqual(len(paid_events), 1)
        self.assertEqual(paid_events[0]["count"], 1)

    def test_webhook_requires_valid_fresh_signature(self):
        self.service.env["STRIPE_WEBHOOK_SECRET"] = "whsec_fixture"
        event = {"id": "evt_test_reject_0001", "type": "unknown.event", "data": {"object": {}}}
        raw = json.dumps(event, separators=(",", ":")).encode()
        status, body, _ = self.request("POST", "/v1/webhook/stripe", headers={"Stripe-Signature": "t=1,v1=not-valid"}, raw=raw)
        self.assertEqual(status, 400)
        status, body, _ = self.request("POST", "/v1/webhook/stripe", headers={"Stripe-Signature": self.stripe_signature(raw)}, raw=raw)
        self.assertEqual(status, 200)
        self.assertTrue(body["received"])
        old_signature = self.stripe_signature(raw, timestamp=int(time.time()) - 600)
        status, body, _ = self.request("POST", "/v1/webhook/stripe", headers={"Stripe-Signature": old_signature}, raw=raw)
        self.assertEqual(status, 400)

    def test_body_size_limit_and_unknown_routes(self):
        status, body, _ = self.request("GET", "/no-such-endpoint")
        self.assertEqual(status, 404)
        request = urllib.request.Request(self.base + "/v1/events", data=b"{" + (b" " * 20000), headers={"Content-Type": "application/json"}, method="POST")
        try:
            urllib.request.urlopen(request, timeout=3)
            self.fail("Oversized payload should be rejected")
        except urllib.error.HTTPError as exc:
            self.assertEqual(exc.code, 413)


if __name__ == "__main__":
    unittest.main(verbosity=2)
