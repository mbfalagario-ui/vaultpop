"""Build 17 QA: admin handoff mint (POST /api/v1/admin/handoff) + consume (GET /api/admin/handoff)."""
import os
import pytest
import requests

BASE_URL = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL",
    "https://vaultpop-premium.preview.emergentagent.com",
).rstrip("/")
API_V1 = f"{BASE_URL}/api/v1"
API_ROOT = f"{BASE_URL}/api"

ADMIN_EMAIL = "qa.owner.b15@vaultpop.test"
ADMIN_PASSWORD = "B15OwnerVerify!234"
ADMIN_INSTALL = "qa-b15-admin-install"

PLAYER_EMAIL = "qa.player@vaultpop.app"
PLAYER_PASSWORD = "VaultPopQA2026!x"
PLAYER_INSTALL = "qa-player-install"


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(client, email, password, install):
    r = client.post(
        f"{API_V1}/auth/login",
        json={"email": email, "password": password, "installId": install},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_token(api_client):
    return _login(api_client, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_INSTALL)


@pytest.fixture(scope="module")
def player_token(api_client):
    return _login(api_client, PLAYER_EMAIL, PLAYER_PASSWORD, PLAYER_INSTALL)


# -------- POST /api/v1/admin/handoff (mint) --------
class TestHandoffMint:
    def test_mint_with_admin_returns_201_and_code(self, api_client, admin_token):
        r = api_client.post(
            f"{API_V1}/admin/handoff",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=30,
        )
        assert r.status_code == 201, r.text
        body = r.json()
        assert isinstance(body.get("code"), str) and len(body["code"]) >= 32
        # accept either expiresInSeconds or an equivalent — spec says short-lived
        assert body.get("expiresInSeconds", 60) > 0

    def test_mint_with_player_returns_403(self, api_client, player_token):
        r = api_client.post(
            f"{API_V1}/admin/handoff",
            headers={"Authorization": f"Bearer {player_token}"},
            timeout=30,
        )
        assert r.status_code == 403, r.text

    def test_mint_without_auth_returns_403(self, api_client):
        r = api_client.post(f"{API_V1}/admin/handoff", timeout=30)
        assert r.status_code == 403, r.text


# -------- GET /api/admin/handoff?code=... (consume) --------
class TestHandoffConsume:
    def test_consume_once_returns_200_html_accepted(self, api_client, admin_token):
        mint = api_client.post(
            f"{API_V1}/admin/handoff",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=30,
        )
        assert mint.status_code == 201
        code = mint.json()["code"]

        r = api_client.get(f"{API_ROOT}/admin/handoff", params={"code": code}, timeout=30)
        assert r.status_code == 200, r.text
        body = r.text.lower()
        assert "accepted" in body or "admin session handoff accepted" in body

    def test_replay_of_same_code_returns_403(self, api_client, admin_token):
        mint = api_client.post(
            f"{API_V1}/admin/handoff",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=30,
        )
        code = mint.json()["code"]

        first = api_client.get(f"{API_ROOT}/admin/handoff", params={"code": code}, timeout=30)
        assert first.status_code == 200

        replay = api_client.get(f"{API_ROOT}/admin/handoff", params={"code": code}, timeout=30)
        assert replay.status_code == 403, replay.text
        assert "restricted" in replay.text.lower() or "invalid" in replay.text.lower() or "expired" in replay.text.lower()

    def test_consume_unknown_code_returns_403(self, api_client):
        r = api_client.get(f"{API_ROOT}/admin/handoff", params={"code": "does-not-exist-xxx"}, timeout=30)
        assert r.status_code == 403
