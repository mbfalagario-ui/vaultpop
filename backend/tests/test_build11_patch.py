"""VaultPop Build 11 patch tests: password-reset + ad-events + regression.

Covers:
- POST /api/v1/auth/password-reset (200 known email, 200 unknown email w/ identical body, 400 invalid email)
- POST /api/v1/ads/events (202 granted+vault_coins, 400 bogus event)
- Regression: /api/v1/auth/login (qa.player) + GET /api/v1/account with bearer
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/") or \
    "https://vaultpop-premium.preview.emergentagent.com"
API = f"{BASE_URL}/api/v1"

QA_EMAIL = "qa.player@vaultpop.app"
QA_PASSWORD = "VaultPopQA2026!x"

EXPECTED_RESET_MSG_PREFIX = "If an account exists"


# ---------- password reset ----------
class TestPasswordReset:
    def test_reset_known_email(self):
        r = requests.post(f"{API}/auth/password-reset", json={"email": QA_EMAIL})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("accepted") is True
        assert isinstance(body.get("message"), str)
        assert body["message"].startswith(EXPECTED_RESET_MSG_PREFIX), body

    def test_reset_unknown_email_identical_body(self):
        known = requests.post(f"{API}/auth/password-reset", json={"email": QA_EMAIL}).json()
        unknown_email = f"nonexistent+{uuid.uuid4().hex[:8]}@vaultpop.app"
        r = requests.post(f"{API}/auth/password-reset", json={"email": unknown_email})
        assert r.status_code == 200, r.text
        body = r.json()
        # Must NOT leak existence — identical body shape+values
        assert body == known, f"Body leaks existence. known={known} unknown={body}"

    def test_reset_invalid_email(self):
        r = requests.post(f"{API}/auth/password-reset", json={"email": "not-an-email"})
        assert r.status_code == 400, r.text
        assert "error" in r.json()

    def test_reset_missing_email_field(self):
        r = requests.post(f"{API}/auth/password-reset", json={})
        assert r.status_code == 400, r.text
        assert "error" in r.json()


# ---------- ads events ----------
class TestAdEvents:
    def test_ad_event_granted_vault_coins(self):
        r = requests.post(f"{API}/ads/events", json={
            "installId": "test-agent-install",
            "event": "granted",
            "rewardType": "vault_coins",
        })
        assert r.status_code == 202, r.text
        assert r.json() == {"recorded": True}

    def test_ad_event_granted_bonus_life(self):
        r = requests.post(f"{API}/ads/events", json={
            "installId": "test-agent-install",
            "event": "granted",
            "rewardType": "bonus_life",
        })
        assert r.status_code == 202, r.text
        assert r.json().get("recorded") is True

    def test_ad_event_failed(self):
        r = requests.post(f"{API}/ads/events", json={
            "installId": "test-agent-install",
            "event": "failed",
            "rewardType": "vault_coins",
        })
        assert r.status_code == 202, r.text
        assert r.json().get("recorded") is True

    def test_ad_event_bogus_event(self):
        r = requests.post(f"{API}/ads/events", json={
            "installId": "test-agent-install",
            "event": "bogus",
            "rewardType": "vault_coins",
        })
        assert r.status_code == 400, r.text
        assert r.json() == {"error": "Invalid ad event."}

    def test_ad_event_bogus_reward_type(self):
        r = requests.post(f"{API}/ads/events", json={
            "installId": "test-agent-install",
            "event": "granted",
            "rewardType": "diamonds",
        })
        assert r.status_code == 400, r.text
        assert "error" in r.json()

    def test_ad_event_short_install_id(self):
        r = requests.post(f"{API}/ads/events", json={
            "installId": "x",
            "event": "granted",
            "rewardType": "vault_coins",
        })
        assert r.status_code == 400, r.text


# ---------- regression: login + account ----------
class TestExistingQARegression:
    def test_login_qa_player(self):
        r = requests.post(f"{API}/auth/login", json={
            "email": QA_EMAIL,
            "password": QA_PASSWORD,
            "installId": "qa-install-1",
        })
        if r.status_code == 401:
            pytest.skip("qa.player seed not present in this env")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data
        assert data["state"]["account"]["email"] == QA_EMAIL
        TestExistingQARegression._token = data["token"]

    def test_get_account_with_bearer(self):
        token = getattr(TestExistingQARegression, "_token", None)
        if not token:
            pytest.skip("login didn't run")
        r = requests.get(
            f"{API}/account",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "state" in data
        assert data["state"]["account"]["email"] == QA_EMAIL
        assert "balance" in data["state"]
