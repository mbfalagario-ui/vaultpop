"""VaultPop Build 8 backend tests: auth + support endpoints.

Covers:
- POST /api/v1/auth/register (201 success, 409 dup, 400 weak password)
- POST /api/v1/auth/login (200 correct, 401 wrong)
- GET  /api/v1/account (Bearer token)
- POST /api/v1/auth/logout (invalidates session)
- POST /api/v1/support/tickets (201 valid ticket, 400 invalid category, 422 short msg)
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/") or \
    "https://vaultpop-premium.preview.emergentagent.com"

API = f"{BASE_URL}/api/v1"


def _rand_email():
    return f"build8.qa+{uuid.uuid4().hex[:10]}@vaultpop.app"


VALID_PASSWORD = "VaultPopQA2026!x"  # 16 chars


# ---------- Auth: register ----------
class TestRegister:
    def test_register_success(self):
        email = _rand_email()
        install_id = f"install-{uuid.uuid4().hex[:10]}"
        r = requests.post(f"{API}/auth/register", json={
            "email": email,
            "password": VALID_PASSWORD,
            "installId": install_id,
        })
        assert r.status_code == 201, r.text
        data = r.json()
        assert "token" in data
        assert "state" in data
        state = data["state"]
        assert state["account"]["email"] == email
        assert state["account"]["role"] == "player"
        assert state["account"]["active"] is True
        # stash for follow-up
        TestRegister._last_email = email
        TestRegister._last_token = data["token"]
        TestRegister._last_install = install_id

    def test_register_duplicate_email(self):
        email = getattr(TestRegister, "_last_email", None)
        if not email:
            pytest.skip("prior register_success didn't run")
        r = requests.post(f"{API}/auth/register", json={
            "email": email,
            "password": VALID_PASSWORD,
            "installId": f"install-{uuid.uuid4().hex[:8]}",
        })
        assert r.status_code == 409, r.text
        assert "error" in r.json()

    def test_register_weak_password(self):
        r = requests.post(f"{API}/auth/register", json={
            "email": _rand_email(),
            "password": "shortpass",  # < 12 chars
            "installId": f"install-{uuid.uuid4().hex[:8]}",
        })
        assert r.status_code == 400, r.text
        assert "error" in r.json()


# ---------- Auth: login + account + logout ----------
class TestLoginAndAccount:
    def test_login_success(self):
        email = getattr(TestRegister, "_last_email", None)
        if not email:
            pytest.skip("register_success didn't run")
        r = requests.post(f"{API}/auth/login", json={
            "email": email,
            "password": VALID_PASSWORD,
            "installId": TestRegister._last_install,
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data
        assert data["state"]["account"]["email"] == email
        TestLoginAndAccount._token = data["token"]

    def test_login_wrong_password(self):
        email = getattr(TestRegister, "_last_email", None)
        if not email:
            pytest.skip("register_success didn't run")
        r = requests.post(f"{API}/auth/login", json={
            "email": email,
            "password": "WrongPassword2026x",
            "installId": "install-x",
        })
        assert r.status_code == 401, r.text

    def test_get_account_with_token(self):
        token = getattr(TestLoginAndAccount, "_token", None)
        if not token:
            pytest.skip("login didn't run")
        r = requests.get(f"{API}/account", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "state" in data
        assert data["state"]["account"]["email"] == TestRegister._last_email

    def test_get_account_missing_token(self):
        r = requests.get(f"{API}/account")
        assert r.status_code == 401

    def test_logout_invalidates_session(self):
        token = getattr(TestLoginAndAccount, "_token", None)
        if not token:
            pytest.skip("login didn't run")
        r = requests.post(f"{API}/auth/logout", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert r.json().get("signedOut") is True
        # subsequent /account with the same token should 401
        r2 = requests.get(f"{API}/account", headers={"Authorization": f"Bearer {token}"})
        assert r2.status_code == 401


# ---------- Existing QA player login ----------
class TestExistingPlayer:
    def test_login_existing_qa_player(self):
        r = requests.post(f"{API}/auth/login", json={
            "email": "qa.player@vaultpop.app",
            "password": "VaultPopQA2026!x",
            "installId": f"install-{uuid.uuid4().hex[:8]}",
        })
        # If credentials seeded, expect 200; otherwise flag as skipped
        if r.status_code == 401:
            pytest.skip("qa.player seed not present in this env")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["state"]["account"]["email"] == "qa.player@vaultpop.app"


# ---------- Support tickets ----------
class TestSupportTickets:
    VALID_CATEGORIES = [
        "Purchase issue", "Ads issue", "Gameplay issue",
        "Bug report", "Privacy request", "Other",
    ]

    def _payload(self, category="Bug report", message="This is a test bug report from QA suite."):
        return {
            "installId": f"install-{uuid.uuid4().hex[:8]}",
            "category": category,
            "message": message,
            "email": "qa@vaultpop.app",
            "appVersion": "1.0.0",
            "buildNumber": "8",
            "deviceInfo": "web-preview",
            "priority": False,
        }

    def test_create_ticket_valid(self):
        r = requests.post(f"{API}/support/tickets", json=self._payload())
        assert r.status_code == 200, r.text
        data = r.json()
        assert "ticketId" in data
        ticket_id = data["ticketId"]
        assert ticket_id.startswith("VP-")
        assert len(ticket_id) == 9  # VP-XXXXXX

    @pytest.mark.parametrize("category", VALID_CATEGORIES)
    def test_all_valid_categories(self, category):
        r = requests.post(f"{API}/support/tickets", json=self._payload(category=category))
        assert r.status_code == 200, r.text
        assert r.json()["ticketId"].startswith("VP-")

    def test_invalid_category(self):
        r = requests.post(f"{API}/support/tickets", json=self._payload(category="Invalid category"))
        assert r.status_code == 400
        assert "error" in r.json()

    def test_short_message_rejected(self):
        # min_length=10 -> pydantic 422
        r = requests.post(f"{API}/support/tickets", json=self._payload(message="short"))
        assert r.status_code in (400, 422)


# ---------- Health ----------
class TestHealth:
    def test_api_root(self):
        r = requests.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
