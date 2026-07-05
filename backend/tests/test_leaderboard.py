"""VaultPop Leaderboard API tests.

Covers:
- POST /api/v1/leaderboard/submit valid, unknown mode, max-score dedup, rank return
- GET /api/v1/leaderboard sort, players count, yourRank via installId
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to preview URL used in .env
    BASE_URL = "https://vaultpop-premium.preview.emergentagent.com"

API = f"{BASE_URL}/api/v1/leaderboard"


@pytest.fixture(scope="module")
def install_id():
    return f"TEST-{uuid.uuid4().hex[:10]}"


@pytest.fixture(scope="module")
def handle():
    return "TEST_Bot"


class TestLeaderboardSubmit:
    def test_submit_valid_returns_rank(self, install_id, handle):
        r = requests.post(f"{API}/submit", json={
            "installId": install_id,
            "handle": handle,
            "mode": "classic",
            "score": 500,
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("accepted") is True
        assert data.get("bestScore") == 500
        assert isinstance(data.get("rank"), int) and data["rank"] >= 1

    def test_submit_unknown_mode_rejected(self, install_id, handle):
        r = requests.post(f"{API}/submit", json={
            "installId": install_id,
            "handle": handle,
            "mode": "not-a-mode",
            "score": 100,
        })
        # returns 200 with accepted False per implementation
        assert r.status_code == 200
        data = r.json()
        assert data.get("accepted") is False
        assert "error" in data

    def test_submit_keeps_max_score(self, install_id, handle):
        # Submit lower score after initial 500 — best should stay 500
        r = requests.post(f"{API}/submit", json={
            "installId": install_id,
            "handle": handle,
            "mode": "classic",
            "score": 10,
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("accepted") is True
        assert data.get("bestScore") == 500

        # Submit higher — best should bump
        r = requests.post(f"{API}/submit", json={
            "installId": install_id,
            "handle": handle,
            "mode": "classic",
            "score": 900,
        })
        assert r.status_code == 200
        assert r.json().get("bestScore") == 900

    def test_submit_validation_negative_score(self, install_id, handle):
        r = requests.post(f"{API}/submit", json={
            "installId": install_id,
            "handle": handle,
            "mode": "classic",
            "score": -1,
        })
        # pydantic ge=0 → 422
        assert r.status_code in (400, 422)

    def test_submit_validation_short_handle(self, install_id):
        r = requests.post(f"{API}/submit", json={
            "installId": install_id,
            "handle": "X",  # min 2
            "mode": "classic",
            "score": 100,
        })
        assert r.status_code in (400, 422)


class TestLeaderboardGet:
    def test_get_classic_sorted(self):
        r = requests.get(f"{API}", params={"mode": "classic", "limit": 50})
        assert r.status_code == 200
        data = r.json()
        assert "entries" in data and "players" in data
        entries = data["entries"]
        # Verify descending sort
        scores = [e["score"] for e in entries]
        assert scores == sorted(scores, reverse=True), "entries not sorted desc"
        # Verify no _id leaks
        for e in entries:
            assert "_id" not in e
            assert "handle" in e and "score" in e and "mode" in e

    def test_get_your_rank_matches_install(self, install_id, handle):
        # Ensure our TEST install exists with best 900
        r = requests.get(f"{API}", params={
            "mode": "classic", "installId": install_id, "limit": 100
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("yourRank") is not None
        assert data["yourRank"] >= 1
        # players count should be at least 1
        assert data["players"] >= 1
        # Our handle should appear in entries with you=True somewhere (may be off list if > limit 100)
        me = [e for e in data["entries"] if e.get("you")]
        # yourRank set means own doc exists; entries include you only if in top limit
        if data["yourRank"] <= 100:
            assert len(me) == 1
            assert me[0]["handle"] == handle
            assert me[0]["score"] == 900

    def test_get_unknown_mode_returns_empty(self):
        r = requests.get(f"{API}", params={"mode": "bogus"})
        assert r.status_code == 200
        data = r.json()
        assert data["entries"] == []
        assert data["players"] == 0
        assert data["yourRank"] is None

    def test_get_daily_and_streak_modes_valid(self):
        for m in ("dailyVault", "streak"):
            r = requests.get(f"{API}", params={"mode": m})
            assert r.status_code == 200, m
            data = r.json()
            assert isinstance(data.get("entries"), list)
            assert isinstance(data.get("players"), int)


class TestLeaderboardHealth:
    def test_api_root(self):
        r = requests.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
