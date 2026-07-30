"""Build 18 — Legal pages + regression against LIVE production TS backend on Fly.
Tests https://vaultpop-api.fly.dev only. First request may cold-start ~10s; retry once on timeout.
"""
import time
import pytest
import requests

BASE = "https://vaultpop-api.fly.dev"
TIMEOUT = 30

QA_EMAIL = "build8.verify.1783611957@vaultpop.test"
QA_PASSWORD = "Build8Verify!234"
QA_INSTALL_ID = "verify-build8-live"


def _get(path, **kw):
    """GET with one retry on timeout (fly cold start)."""
    url = BASE + path
    try:
        return requests.get(url, timeout=TIMEOUT, **kw)
    except requests.exceptions.Timeout:
        time.sleep(2)
        return requests.get(url, timeout=TIMEOUT, **kw)


# --- Privacy page ---
class TestPrivacyPage:
    def test_privacy_returns_200_html(self):
        r = _get("/privacy")
        assert r.status_code == 200
        ct = r.headers.get("content-type", "").lower()
        assert "text/html" in ct, f"Expected text/html, got {ct}"

    def test_privacy_no_auth_required(self):
        # No headers, no cookies -> must still work
        r = requests.get(BASE + "/privacy", timeout=TIMEOUT)
        assert r.status_code == 200

    def test_privacy_content(self):
        r = _get("/privacy")
        body = r.text
        assert "Privacy Policy" in body
        assert "Last updated: July 30, 2026" in body
        assert "AdMob" in body or "Google AdMob" in body
        assert "Apple" in body
        # fictional in-game items
        low = body.lower()
        assert "fictional" in low
        assert "support@vaultpop.app" in body
        # footer links to /terms and /support
        assert 'href="/terms"' in body
        assert 'href="/support"' in body


# --- Terms of Use page ---
class TestTermsPage:
    def test_terms_returns_200_html(self):
        r = _get("/terms")
        assert r.status_code == 200
        assert "text/html" in r.headers.get("content-type", "").lower()

    def test_terms_no_auth_required(self):
        r = requests.get(BASE + "/terms", timeout=TIMEOUT)
        assert r.status_code == 200

    def test_terms_content(self):
        r = _get("/terms")
        body = r.text
        assert "Terms of Use" in body
        assert "Last updated: July 30, 2026" in body
        low = body.lower()
        assert "fictional" in low
        # no real-world value language
        assert "no real-world value" in low or "no real world value" in low
        # VaultPass Plus subscription section
        assert "VaultPass Plus" in body
        # Apple-specific terms
        assert "Apple" in body
        # footer links to /privacy and /support
        assert 'href="/privacy"' in body
        assert 'href="/support"' in body


# --- Support page ---
class TestSupportPage:
    def test_support_returns_200(self):
        r = _get("/support")
        assert r.status_code == 200
        assert "text/html" in r.headers.get("content-type", "").lower()

    def test_support_footer_has_privacy_and_terms(self):
        r = _get("/support")
        body = r.text
        # Must have both links now (Build 18 addition)
        assert 'href="/privacy"' in body, "Support page missing /privacy link"
        assert 'href="/terms"' in body, "Support page missing /terms link"
        # And 'Privacy Policy' + 'Terms of Use' labels
        assert "Privacy Policy" in body
        assert "Terms of Use" in body


# --- Regression: health, admin, 404, admin API auth ---
class TestBackendRegression:
    def test_health(self):
        r = _get("/health")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"

    def test_admin_login_page(self):
        r = _get("/admin")
        assert r.status_code == 200
        # Should be login HTML
        assert "text/html" in r.headers.get("content-type", "").lower()

    def test_admin_api_requires_auth(self):
        r = _get("/v1/admin/analytics")
        # Must remain protected
        assert r.status_code == 403, f"Expected 403 on unauth admin API, got {r.status_code}"

    def test_random_path_404_json(self):
        r = _get("/v1/does-not-exist-xyz-123")
        assert r.status_code == 404
        # Should be JSON
        try:
            data = r.json()
            assert isinstance(data, dict)
        except ValueError:
            pytest.fail("404 body was not JSON")


# --- Regression: auth still works ---
class TestAuthLogin:
    def test_login_live_qa_player(self):
        payload = {
            "email": QA_EMAIL,
            "password": QA_PASSWORD,
            "installId": QA_INSTALL_ID,
        }
        # Retry once on timeout (fly cold-start on POST-with-body)
        url = BASE + "/v1/auth/login"
        try:
            r = requests.post(url, json=payload, timeout=60)
        except requests.exceptions.Timeout:
            time.sleep(3)
            r = requests.post(url, json=payload, timeout=60)
        assert r.status_code == 200, f"Login failed: {r.status_code} {r.text[:400]}"
        data = r.json()
        # Session token in some form
        assert any(k in data for k in ("token", "sessionToken", "session", "accessToken")), (
            f"No session token in response keys: {list(data.keys())}"
        )
