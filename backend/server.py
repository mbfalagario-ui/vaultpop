from fastapi import FastAPI, APIRouter, Header, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import base64
import hashlib
import os
import logging
import secrets
import time
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# ---- VaultPop Global Leaderboard ----
VALID_MODES = {"classic", "dailyVault", "streak", "blitz"}

class LeaderboardSubmit(BaseModel):
    installId: str = Field(min_length=4, max_length=80)
    handle: str = Field(min_length=2, max_length=24)
    mode: str
    score: int = Field(ge=0, le=10_000_000)

class LeaderboardEntry(BaseModel):
    handle: str
    score: int
    mode: str
    updatedAt: str

@api_router.post("/v1/leaderboard/submit")
async def submit_leaderboard_score(payload: LeaderboardSubmit):
    if payload.mode not in VALID_MODES:
        return {"accepted": False, "error": "Unknown mode."}
    key = {"installId": payload.installId, "mode": payload.mode}
    existing = await db.leaderboard_scores.find_one(key)
    best = payload.score
    if existing and existing.get("score", 0) > best:
        best = existing["score"]
    await db.leaderboard_scores.update_one(
        key,
        {
            "$set": {
                "handle": payload.handle[:24],
                "score": best,
                "updatedAt": datetime.utcnow().isoformat(),
            },
            "$setOnInsert": {"id": str(uuid.uuid4())},
        },
        upsert=True,
    )
    rank = await db.leaderboard_scores.count_documents(
        {"mode": payload.mode, "score": {"$gt": best}}
    ) + 1
    return {"accepted": True, "bestScore": best, "rank": rank}

@api_router.get("/v1/leaderboard")
async def get_leaderboard(mode: str = "classic", limit: int = 50, installId: str = ""):
    if mode not in VALID_MODES:
        return {"entries": [], "players": 0, "yourRank": None}
    limit = max(1, min(100, limit))
    cursor = (
        db.leaderboard_scores.find({"mode": mode}, {"_id": 0})
        .sort("score", -1)
        .limit(limit)
    )
    docs = await cursor.to_list(limit)
    entries = [
        {
            "handle": d.get("handle", "Player"),
            "score": int(d.get("score", 0)),
            "mode": mode,
            "updatedAt": d.get("updatedAt", ""),
            "you": bool(installId) and d.get("installId") == installId,
        }
        for d in docs
    ]
    players = await db.leaderboard_scores.count_documents({"mode": mode})
    your_rank = None
    if installId:
        own = await db.leaderboard_scores.find_one({"mode": mode, "installId": installId})
        if own:
            your_rank = await db.leaderboard_scores.count_documents(
                {"mode": mode, "score": {"$gt": own.get("score", 0)}}
            ) + 1
    return {"entries": entries, "players": players, "yourRank": your_rank}

# ---- VaultPop Preview Auth (mirrors the production TS backend shapes) ----
# scrypt password hashing + opaque session tokens stored SHA-256 hashed.
EMPTY_BALANCE = {
    "vaultCoins": 0,
    "bonusLives": 0,
    "chainBoosts": 0,
    "vaultBursts": 0,
    "removeAds": False,
    "vaultPassExpiresAt": None,
}
SUPPORT_CATEGORIES = {
    "Purchase issue", "Ads issue", "Gameplay issue",
    "Bug report", "Privacy request", "Other",
}
_registration_attempts: dict = {}


def _hash_password(password: str, salt_hex: Optional[str] = None):
    if len(password) < 12 or len(password) > 200:
        raise ValueError("Password must be between 12 and 200 characters.")
    salt = salt_hex or secrets.token_bytes(16).hex()
    derived = hashlib.scrypt(
        password.encode("utf-8"), salt=salt.encode("utf-8"),
        n=16384, r=8, p=1, dklen=64,
    )
    return derived.hex(), salt


def _verify_password(password: str, password_hash: str, salt: str) -> bool:
    try:
        derived = hashlib.scrypt(
            password.encode("utf-8"), salt=salt.encode("utf-8"),
            n=16384, r=8, p=1, dklen=64,
        )
        return secrets.compare_digest(derived.hex(), password_hash)
    except Exception:
        return False


def _create_session_token():
    token = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip("=")
    return token, hashlib.sha256(token.encode("utf-8")).hexdigest()


def _public_account(doc) -> dict:
    return {
        "id": doc["id"],
        "email": doc["email"],
        "role": doc.get("role", "player"),
        "active": bool(doc.get("active", True)),
        "createdAt": doc.get("createdAt", ""),
    }


async def _account_state(doc) -> dict:
    return {
        "account": _public_account(doc),
        "linkedInstallId": doc.get("linkedInstallId"),
        "balance": doc.get("balance", dict(EMPTY_BALANCE)),
        "supportTickets": [],
    }


async def _create_session(doc, install_id: str) -> dict:
    token, token_hash = _create_session_token()
    now = datetime.utcnow()
    expires_at = datetime.utcfromtimestamp(now.timestamp() + 24 * 3600).isoformat() + "Z"
    await db.vaultpop_sessions.insert_one({
        "tokenHash": token_hash,
        "accountId": doc["id"],
        "expiresAt": expires_at,
        "createdAt": now.isoformat() + "Z",
    })
    await db.vaultpop_accounts.update_one(
        {"id": doc["id"]}, {"$set": {"linkedInstallId": install_id}}
    )
    doc["linkedInstallId"] = install_id
    return {"token": token, "expiresAt": expires_at, "state": await _account_state(doc)}


async def _account_from_token(authorization: Optional[str]):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token_hash = hashlib.sha256(authorization[7:].strip().encode("utf-8")).hexdigest()
    session = await db.vaultpop_sessions.find_one({"tokenHash": token_hash})
    if not session or session.get("expiresAt", "") <= datetime.utcnow().isoformat() + "Z":
        return None
    return await db.vaultpop_accounts.find_one({"id": session["accountId"], "active": True})


class AuthPayload(BaseModel):
    email: str = Field(min_length=5, max_length=200)
    password: str = Field(min_length=1, max_length=200)
    installId: str = Field(min_length=1, max_length=200)


@api_router.post("/v1/auth/register", status_code=201)
async def register_account(payload: AuthPayload, request: Request):
    email = payload.email.strip().lower()
    if "@" not in email or "." not in email.split("@")[-1]:
        return JSONResponse(status_code=400, content={"error": "Enter a valid email and password."})
    ip = request.headers.get("x-forwarded-for", "unknown").split(",")[0].strip()
    window = _registration_attempts.get(ip)
    now_ts = time.time()
    if window and window["resetAt"] > now_ts and window["count"] >= 5:
        return JSONResponse(status_code=429, content={"error": "Too many account creations. Please try again later."})
    _registration_attempts[ip] = {
        "count": (window["count"] + 1) if window and window["resetAt"] > now_ts else 1,
        "resetAt": window["resetAt"] if window and window["resetAt"] > now_ts else now_ts + 3600,
    }
    if await db.vaultpop_accounts.find_one({"email": email}):
        return JSONResponse(status_code=409, content={"error": "An account with this email already exists."})
    try:
        password_hash, salt = _hash_password(payload.password)
    except ValueError as exc:
        return JSONResponse(status_code=400, content={"error": str(exc)})
    doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "passwordHash": password_hash,
        "passwordSalt": salt,
        "role": "player",  # public sign-ups can never self-assign roles
        "active": True,
        "createdAt": datetime.utcnow().isoformat() + "Z",
        "linkedInstallId": None,
        "balance": dict(EMPTY_BALANCE),
    }
    await db.vaultpop_accounts.insert_one(doc)
    return await _create_session(doc, payload.installId)


@api_router.post("/v1/auth/login")
async def login_account(payload: AuthPayload):
    email = payload.email.strip().lower()
    doc = await db.vaultpop_accounts.find_one({"email": email, "active": True})
    if not doc or not _verify_password(payload.password, doc["passwordHash"], doc["passwordSalt"]):
        return JSONResponse(status_code=401, content={"error": "Invalid email or password."})
    return await _create_session(doc, payload.installId)


@api_router.post("/v1/auth/password-reset")
async def request_password_reset(payload: dict):
    email = str(payload.get("email", "")).strip().lower()
    if "@" not in email or "." not in email or len(email) > 254:
        return JSONResponse(status_code=400, content={"error": "Enter a valid email address."})
    # Never reveal whether an account exists (mirrors production TS backend).
    if await db.vaultpop_accounts.find_one({"email": email}):
        existing = await db.vaultpop_password_resets.find_one({"email": email, "status": "pending"})
        if not existing:
            await db.vaultpop_password_resets.insert_one({
                "email": email,
                "status": "pending",
                "createdAt": datetime.now(timezone.utc).isoformat(),
            })
    return {
        "accepted": True,
        "message": "If an account exists for this email, a reset request has been received. Support will follow up.",
    }


@api_router.post("/v1/ads/events", status_code=202)
async def record_ad_event(payload: dict):
    install_id = str(payload.get("installId", ""))
    event = payload.get("event")
    reward_type = payload.get("rewardType")
    if (
        len(install_id) < 4
        or len(install_id) > 200
        or event not in {"granted", "failed"}
        or reward_type not in {"bonus_life", "vault_coins"}
    ):
        return JSONResponse(status_code=400, content={"error": "Invalid ad event."})
    await db.vaultpop_ad_events.insert_one({
        "installId": install_id,
        "event": event,
        "rewardType": reward_type,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    })
    return {"recorded": True}


@api_router.post("/v1/auth/logout")
async def logout_account(authorization: Optional[str] = Header(default=None)):
    if authorization and authorization.startswith("Bearer "):
        token_hash = hashlib.sha256(authorization[7:].strip().encode("utf-8")).hexdigest()
        await db.vaultpop_sessions.delete_many({"tokenHash": token_hash})
    return {"signedOut": True}


@api_router.get("/v1/account")
async def get_account(authorization: Optional[str] = Header(default=None)):
    doc = await _account_from_token(authorization)
    if not doc:
        return JSONResponse(status_code=401, content={"error": "Authentication required."})
    return {"state": await _account_state(doc)}


@api_router.post("/v1/account/delete")
async def delete_account(payload: dict, authorization: Optional[str] = Header(default=None)):
    """Preview mirror of the production self-service account deletion.

    Mirrors backend/app.ts POST /v1/account/delete: valid session + typed
    DELETE confirmation + password reauthentication; deletes the account,
    all sessions, and install-linked data. No target parameter exists, so
    horizontal deletion is impossible by construction.
    """
    doc = await _account_from_token(authorization)
    if not doc:
        return JSONResponse(status_code=401, content={"error": "Authentication required."})
    if payload.get("confirm") != "DELETE":
        return JSONResponse(status_code=400, content={"error": "Type DELETE to confirm account deletion."})
    password = str(payload.get("password", ""))
    if not password or len(password) > 200:
        return JSONResponse(status_code=400, content={"error": "Enter your password to confirm deletion."})
    if not _verify_password(password, doc["passwordHash"], doc["passwordSalt"]):
        return JSONResponse(status_code=403, content={"error": "Password is incorrect."})
    install_id = doc.get("linkedInstallId")
    await db.vaultpop_sessions.delete_many({"accountId": doc["id"]})
    await db.vaultpop_password_resets.delete_many({"email": doc["email"]})
    if install_id:
        await db.vaultpop_support_tickets.delete_many({"installId": install_id})
        await db.vaultpop_ad_events.delete_many({"installId": install_id})
        await db.leaderboard_scores.delete_many({"installId": install_id})
    await db.vaultpop_accounts.delete_one({"id": doc["id"]})
    return {"deleted": True}


# Preview mirror of the production admin handoff flow: mints a short-lived
# single-use code for admin accounts. The production TS backend additionally
# sets a secure cookie session for /admin; the mirror just proves the app-side
# flow end to end without exposing session tokens in URLs.
_admin_handoff_codes: dict = {}


@api_router.post("/v1/admin/handoff", status_code=201)
async def admin_handoff(authorization: Optional[str] = Header(default=None)):
    doc = await _account_from_token(authorization)
    if not doc or doc.get("role") != "admin":
        return JSONResponse(status_code=403, content={"error": "Admin authorization required."})
    now_ts = time.time()
    for key in [k for k, v in _admin_handoff_codes.items() if v["expiresAt"] <= now_ts]:
        _admin_handoff_codes.pop(key, None)
    code = uuid.uuid4().hex + uuid.uuid4().hex
    _admin_handoff_codes[code] = {"accountId": doc["id"], "expiresAt": now_ts + 60}
    return {"code": code, "expiresInSeconds": 60}


@api_router.get("/admin/handoff")
async def admin_handoff_consume(code: str = ""):
    entry = _admin_handoff_codes.pop(code, None)
    valid = bool(entry and entry["expiresAt"] > time.time())
    return HTMLResponse(
        status_code=200 if valid else 403,
        content=(
            "<html><body style='background:#060512;color:#F7F5FF;font-family:system-ui;padding:24px'>"
            + (
                "<h2>VaultPop Admin Console (preview mirror)</h2><p>Admin session handoff accepted. "
                "The full operator console runs on the production backend.</p>"
                if valid
                else "<h2>Restricted</h2><p>This admin handoff link is invalid or has expired.</p>"
            )
            + "</body></html>"
        ),
    )


class SupportTicket(BaseModel):
    installId: str = Field(min_length=1, max_length=200)
    category: str
    message: str = Field(min_length=10, max_length=2000)
    email: Optional[str] = None
    appVersion: str = Field(max_length=50)
    buildNumber: str = Field(max_length=50)
    deviceInfo: str = Field(max_length=200)
    priority: bool = False


@api_router.post("/v1/support/tickets")
async def create_support_ticket(payload: SupportTicket):
    if payload.category not in SUPPORT_CATEGORIES:
        return JSONResponse(status_code=400, content={"error": "Invalid support request."})
    count = await db.vaultpop_support_tickets.count_documents({})
    ticket_id = f"VP-{count + 1:06d}"
    await db.vaultpop_support_tickets.insert_one({
        "ticketId": ticket_id,
        **payload.dict(),
        "createdAt": datetime.utcnow().isoformat() + "Z",
    })
    return {"ticketId": ticket_id}


# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Include the router in the main app
# Serve the latest visual-proof zip for download.
PROOF_ZIP = Path("/app/vaultpop-iteration4-polish-proof.zip")
SOURCE_ZIP = Path("/app/vaultpop-iteration4-final-source-for-build6.zip")
BUILD8_PROOF_ZIP = Path("/app/vaultpop-build8-readiness-proof.zip")
BUILD8_SOURCE_ZIP = Path("/app/vaultpop-build8-final-source.zip")
BUILD8_CORRECTION_PROOF_ZIP = Path("/app/vaultpop-build8-polish-correction-proof.zip")
BUILD8_HANDOFF_MD = Path("/app/vaultpop/BUILD8_HANDOFF.md")
BUILD8_DIAGNOSTIC_MD = Path("/app/vaultpop/docs/release/diagnostic-report-build8.md")
BUILD8_APPLE_COMPLIANCE_MD = Path("/app/vaultpop/docs/release/apple-compliance-review-build8.md")
BUILD8_SECURITY_AUDIT_MD = Path("/app/vaultpop/docs/release/security-code-audit-build8.md")
BUILD8_COMPLETE_PACKAGE_ZIP = Path("/app/vaultpop-build8-complete-handoff-package.zip")
BUILD11_COMPLETE_PACKAGE_ZIP = Path("/app/vaultpop-build11-complete-handoff-package.zip")
BUILD11_ADMIN_PACKAGE_ZIP = Path("/app/vaultpop-build11-admin-completion-package.zip")


@api_router.get("/export/build11-admin-completion-package")
async def download_build11_admin_completion_package():
    return FileResponse(
        BUILD11_ADMIN_PACKAGE_ZIP,
        media_type="application/zip",
        filename="vaultpop-build11-admin-completion-package.zip",
    )


@api_router.get("/export/build11-complete-package")
async def download_build11_complete_package():
    return FileResponse(
        BUILD11_COMPLETE_PACKAGE_ZIP,
        media_type="application/zip",
        filename="vaultpop-build11-complete-handoff-package.zip",
    )


@api_router.get("/export/build8-handoff")
async def download_build8_handoff():
    return FileResponse(
        BUILD8_HANDOFF_MD,
        media_type="text/markdown",
        filename="BUILD8_HANDOFF.md",
    )


@api_router.get("/export/build8-diagnostic-report")
async def download_build8_diagnostic_report():
    return FileResponse(
        BUILD8_DIAGNOSTIC_MD,
        media_type="text/markdown",
        filename="diagnostic-report-build8.md",
    )


@api_router.get("/export/build8-apple-compliance-report")
async def download_build8_apple_compliance_report():
    return FileResponse(
        BUILD8_APPLE_COMPLIANCE_MD,
        media_type="text/markdown",
        filename="apple-compliance-review-build8.md",
    )


@api_router.get("/export/build8-security-code-audit-report")
async def download_build8_security_code_audit_report():
    return FileResponse(
        BUILD8_SECURITY_AUDIT_MD,
        media_type="text/markdown",
        filename="security-code-audit-build8.md",
    )


@api_router.get("/export/build8-complete-package")
async def download_build8_complete_package():
    return FileResponse(
        BUILD8_COMPLETE_PACKAGE_ZIP,
        media_type="application/zip",
        filename="vaultpop-build8-complete-handoff-package.zip",
    )


@api_router.get("/proof/build8-correction")
async def download_build8_correction_proof():
    return FileResponse(
        BUILD8_CORRECTION_PROOF_ZIP,
        media_type="application/zip",
        filename="vaultpop-build8-polish-correction-proof.zip",
    )


@api_router.get("/proof/build8")
async def download_build8_proof():
    return FileResponse(
        BUILD8_PROOF_ZIP,
        media_type="application/zip",
        filename="vaultpop-build8-readiness-proof.zip",
    )


@api_router.get("/export/build8-final-source")
async def download_build8_final_source():
    return FileResponse(
        BUILD8_SOURCE_ZIP,
        media_type="application/zip",
        filename="vaultpop-build8-final-source.zip",
    )


@api_router.get("/export/build6-source")
async def download_build6_source():
    return FileResponse(
        SOURCE_ZIP,
        media_type="application/zip",
        filename="vaultpop-iteration4-final-source-for-build6.zip",
    )


@api_router.get("/proof/iteration4")
async def download_iteration4_proof():
    return FileResponse(
        PROOF_ZIP,
        media_type="application/zip",
        filename="vaultpop-iteration4-polish-proof.zip",
    )


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
