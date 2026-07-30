"""Build 18 — Preview FastAPI mirror: POST /api/v1/account/delete parity.

Verifies the mirror endpoint contract matches the production TS backend:
  - 401 without Bearer auth
  - 400 when confirm != "DELETE"
  - 403 wrong password
  - 200 {deleted: true} on success
  - Old token invalid afterwards (401 on GET /v1/account, 401 on login)
"""
import os
import time
import uuid
import pytest
import requests


BASE_URL = os.environ["EXPO_PUBLIC_VAULTPOP_API_URL"].rstrip("/") \
    if os.environ.get("EXPO_PUBLIC_VAULTPOP_API_URL") \
    else os.environ["EXPO_BACKEND_URL"].rstrip("/") + "/api"

# Fall back — the preview mirror is served under /api on EXPO_PUBLIC_BACKEND_URL.
if "/api" not in BASE_URL:
    BASE_URL = BASE_URL + "/api"

TIMEOUT = 20


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _fresh_ip():
    # Vary x-forwarded-for so we don't hit the 5-registrations/hour rate limit.
    return f"10.55.{int(time.time()) % 250}.{uuid.uuid4().int % 250}"


def _register(api):
    ts = int(time.time() * 1000)
    payload = {
        "email": f"b18.ui.{ts}.{uuid.uuid4().hex[:6]}@vaultpop.test",
        "password": "UiDeleteTest!234",
        "installId": f"ui-b18-{uuid.uuid4().hex[:10]}",
    }
    resp = api.post(
        f"{BASE_URL}/v1/auth/register",
        json=payload,
        headers={"x-forwarded-for": _fresh_ip()},
        timeout=TIMEOUT,
    )
    assert resp.status_code == 201, f"register failed: {resp.status_code} {resp.text}"
    data = resp.json()
    assert isinstance(data.get("token"), str) and len(data["token"]) > 10
    return payload, data


# ---- Deletion endpoint contract ----

class TestDeleteAccountMirror:
    def test_no_auth_returns_401(self, api):
        r = api.post(
            f"{BASE_URL}/v1/account/delete",
            json={"password": "whatever12345", "confirm": "DELETE"},
            timeout=TIMEOUT,
        )
        assert r.status_code == 401
        assert "error" in r.json()

    def test_missing_confirm_returns_400(self, api):
        creds, login = _register(api)
        token = login["token"]
        r = api.post(
            f"{BASE_URL}/v1/account/delete",
            json={"password": creds["password"]},
            headers={"Authorization": f"Bearer {token}"},
            timeout=TIMEOUT,
        )
        assert r.status_code == 400
        assert "DELETE" in r.json().get("error", "")

    def test_wrong_confirm_returns_400(self, api):
        creds, login = _register(api)
        r = api.post(
            f"{BASE_URL}/v1/account/delete",
            json={"password": creds["password"], "confirm": "delete"},
            headers={"Authorization": f"Bearer {login['token']}"},
            timeout=TIMEOUT,
        )
        assert r.status_code == 400

    def test_wrong_password_returns_403(self, api):
        creds, login = _register(api)
        r = api.post(
            f"{BASE_URL}/v1/account/delete",
            json={"password": "TotallyWrong!987", "confirm": "DELETE"},
            headers={"Authorization": f"Bearer {login['token']}"},
            timeout=TIMEOUT,
        )
        assert r.status_code == 403
        assert "incorrect" in r.json().get("error", "").lower()

    def test_correct_delete_flow(self, api):
        creds, login = _register(api)
        token = login["token"]

        # sanity: GET /v1/account works with token
        pre = api.get(
            f"{BASE_URL}/v1/account",
            headers={"Authorization": f"Bearer {token}"},
            timeout=TIMEOUT,
        )
        assert pre.status_code == 200, pre.text
        assert pre.json()["state"]["account"]["email"] == creds["email"]

        # delete
        r = api.post(
            f"{BASE_URL}/v1/account/delete",
            json={"password": creds["password"], "confirm": "DELETE"},
            headers={"Authorization": f"Bearer {token}"},
            timeout=TIMEOUT,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("deleted") is True

        # old token is revoked
        after = api.get(
            f"{BASE_URL}/v1/account",
            headers={"Authorization": f"Bearer {token}"},
            timeout=TIMEOUT,
        )
        assert after.status_code == 401

        # login with deleted credentials must fail 401 (not auto-recreated)
        relog = api.post(
            f"{BASE_URL}/v1/auth/login",
            json={
                "email": creds["email"],
                "password": creds["password"],
                "installId": "post-delete-check",
            },
            timeout=TIMEOUT,
        )
        assert relog.status_code == 401

    def test_second_delete_with_revoked_token_returns_401(self, api):
        creds, login = _register(api)
        token = login["token"]
        first = api.post(
            f"{BASE_URL}/v1/account/delete",
            json={"password": creds["password"], "confirm": "DELETE"},
            headers={"Authorization": f"Bearer {token}"},
            timeout=TIMEOUT,
        )
        assert first.status_code == 200
        second = api.post(
            f"{BASE_URL}/v1/account/delete",
            json={"password": creds["password"], "confirm": "DELETE"},
            headers={"Authorization": f"Bearer {token}"},
            timeout=TIMEOUT,
        )
        assert second.status_code == 401


class TestSupportTicketRegression:
    def test_support_ticket_submission(self, api):
        payload = {
            "installId": f"b18-support-{uuid.uuid4().hex[:8]}",
            "category": "Bug report",
            "message": "TEST_b18 preview mirror regression smoke ticket submission.",
            "email": "b18.support@vaultpop.test",
            "appVersion": "1.0.0",
            "buildNumber": "18",
            "deviceInfo": "pytest",
            "priority": False,
        }
        r = api.post(f"{BASE_URL}/v1/support/tickets", json=payload, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        body = r.json()
        assert isinstance(body.get("ticketId"), str)
        assert body["ticketId"].startswith("VP-")
