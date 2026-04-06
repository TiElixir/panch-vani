import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from dotenv import load_dotenv

from database import Base, engine
from routers import auth, hub_admin, hubs, polls, superadmin

load_dotenv()

# ─── Create all tables ────────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ─── App instance ─────────────────────────────────────────────────────────────
app = FastAPI(
    title="Panch-Vani API",
    description=(
        "Privacy-first anonymous voting platform. "
        "Verified via Google OAuth + email domain allowlists. "
        "Double-Blind ballots using separated VoterLog and AnonymousVote tables."
    ),
    version="1.0.0",
)

# ─── Middleware ───────────────────────────────────────────────────────────────

# SessionMiddleware is required by authlib for storing the OAuth state param
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("JWT_SECRET_KEY", "dev-session-secret"),
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(hubs.router)
app.include_router(hub_admin.router)
app.include_router(polls.router)
app.include_router(superadmin.router)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": "Panch-Vani API"}
