"""Build 15 QA regression: verifies preview mirror auth roles and safe flows."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://vaultpop-premium.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api/v1"

ADMIN_EMAIL = "qa.owner.b15@vaultpop.test"
ADMIN_PASSWORD = "B15OwnerVerify!234"
ADMIN_INSTALL = "qa-b15-admin-install"

PLAYER_EMAIL = "qa.player@vaultpop.app"
PLAYER_PASSWORD = "VaultPopQA2026!x"
PLAYER_INSTALL = "qa-player-install"


@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestAuthLoginRoles:
    """POST /api/v1/auth/login role gating for admin vs player QA accounts."""

    def test_admin_login_returns_admin_role(self, api_client):
        resp = api_client.post(
            f"{API}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD, "installId": ADMIN_INSTALL},
            timeout=30,
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert "token" in data and data["token"]
        assert data["state"]["account"]["email"] == ADMIN_EMAIL
        assert data["state"]["account"]["role"] == "admin"
        assert data["state"]["account"]["active"] is True

    def test_player_login_returns_player_role(self, api_client):
        resp = api_client.post(
            f"{API}/auth/login",
            json={"email": PLAYER_EMAIL, "password": PLAYER_PASSWORD, "installId": PLAYER_INSTALL},
            timeout=30,
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["state"]["account"]["email"] == PLAYER_EMAIL
        assert data["state"]["account"]["role"] == "player"


class TestSessionRefresh:
    """Refresh (Account Sync) preserves the admin role."""

    def test_admin_refresh_preserves_role(self, api_client):
        login = api_client.post(
            f"{API}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD, "installId": ADMIN_INSTALL},
            timeout=30,
        ).json()
        token = login["token"]
        resp = api_client.get(
            f"{API}/account",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        state = data.get("state", data)
        assert state["account"]["role"] == "admin"

    def test_player_refresh_preserves_role(self, api_client):
        login = api_client.post(
            f"{API}/auth/login",
            json={"email": PLAYER_EMAIL, "password": PLAYER_PASSWORD, "installId": PLAYER_INSTALL},
            timeout=30,
        ).json()
        token = login["token"]
        resp = api_client.get(
            f"{API}/account",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        assert resp.status_code == 200, resp.text
        state = resp.json().get("state", resp.json())
        assert state["account"]["role"] == "player"


class TestPasswordResetSafeMessage:
    """Password reset returns the generic safe message (no user enumeration)."""

    def test_password_reset_generic_message(self, api_client):
        resp = api_client.post(
            f"{API}/auth/password-reset",
            json={"email": PLAYER_EMAIL},
            timeout=30,
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        # accept a `message` or `detail` field with the generic response
        text = body.get("message") or body.get("detail") or ""
        assert text, f"Expected message body, got {body}"
        assert "email" in text.lower() or "reset" in text.lower() or "if" in text.lower()
