from fastapi import FastAPI, APIRouter
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List
import uuid
from datetime import datetime


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
