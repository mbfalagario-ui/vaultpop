"""Build 20 preview mirror backend tests — /v1/ads/quota and regression smoke.

Scope: PREVIEW FastAPI mirror only (production Fly is out-of-scope; already verified).
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_VAULTPOP_API_URL") or (
    (os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "").rstrip("/") + "/api"
)
assert BASE_URL, "EXPO_PUBLIC_VAULTPOP_API_URL not configured"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


# ----- /v1/ads/quota (Build 20 primary target) -----
class TestAdsQuota:
    def test_quota_valid_user_returns_shape(self, s):
        r = s.get(f"{BASE_URL}/v1/ads/quota", params={"userId": "install-qa-1"}, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["userId"] == "install-qa-1"
        assert data["cap"] == 30
        assert "ssvConfirmedToday" in data
        assert "remaining" in data
        assert isinstance(data["remaining"], int) and data["remaining"] <= data["cap"]
        # utcDay looks like YYYY-MM-DD
        assert len(data["utcDay"]) == 10 and data["utcDay"][4] == "-"

    def test_quota_short_userId_returns_400(self, s):
        r = s.get(f"{BASE_URL}/v1/ads/quota", params={"userId": "ab"}, timeout=15)
        assert r.status_code == 400, r.text
        assert "error" in r.json()

    def test_quota_missing_userId_returns_400(self, s):
        r = s.get(f"{BASE_URL}/v1/ads/quota", timeout=15)
        assert r.status_code == 400


# ----- Regression smoke -----
class TestRegressionSmoke:
    def test_api_reachable(self, s):
        # Simple check to prove backend routing works
        r = s.get(f"{BASE_URL}/", timeout=15)
        # Any response from the /api root proves the ingress is routing
        assert r.status_code in (200, 404, 405), r.text

    def test_player_login_still_works(self, s):
        r = s.post(
            f"{BASE_URL}/v1/auth/login",
            json={
                "email": "qa.player@vaultpop.app",
                "password": "VaultPopQA2026!x",
                "installId": "install-qa-1",
            },
            timeout=20,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("token") or body.get("session") or body.get("state")
