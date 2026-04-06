import os
from datetime import datetime, timedelta, timezone

from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from jose import jwt
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import User
from schemas import UserOut

router = APIRouter(prefix="/auth", tags=["Auth"])

# ─── Config ──────────────────────────────────────────────────────────────────

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
JWT_SECRET = os.getenv("JWT_SECRET_KEY", "dev-secret-change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_DAYS = int(os.getenv("JWT_EXPIRE_DAYS", "7"))

SUPER_ADMIN_EMAILS = {
    e.strip().lower()
    for e in os.getenv("SUPER_ADMIN_EMAILS", "").split(",")
    if e.strip()
}

# ─── OAuth Client ────────────────────────────────────────────────────────────

oauth = OAuth()
oauth.register(
    name="google",
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


# ─── Helpers ─────────────────────────────────────────────────────────────────

def create_jwt(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS)
    return jwt.encode(
        {"sub": user_id, "exp": expire},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


def upsert_user(db: Session, google_info: dict) -> User:
    """Create or update the User row from Google's userinfo response."""
    google_sub = google_info["sub"]
    email = google_info["email"].lower()

    user = db.query(User).filter(User.google_sub == google_sub).first()
    if user is None:
        user = User(
            google_sub=google_sub,
            email=email,
            name=google_info.get("name", email.split("@")[0]),
            avatar_url=google_info.get("picture"),
            is_super_admin=email in SUPER_ADMIN_EMAILS,
        )
        db.add(user)
    else:
        # Refresh name/avatar in case Google updated them
        user.name = google_info.get("name", user.name)
        user.avatar_url = google_info.get("picture", user.avatar_url)
        # Re-check super admin status (allows adding new admin emails to .env)
        if email in SUPER_ADMIN_EMAILS:
            user.is_super_admin = True

    db.commit()
    db.refresh(user)
    return user


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.get("/login")
async def login(request: Request):
    """Redirect the user to Google's OAuth consent screen."""
    return await oauth.google.authorize_redirect(request, GOOGLE_REDIRECT_URI)


@router.get("/callback")
async def callback(request: Request, db: Session = Depends(get_db)):
    """
    Google redirects here after user consents.
    Exchange the code, upsert the user, issue a JWT, then send the user
    back to the frontend with the token as a query param.
    """
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"OAuth error: {exc}")

    user_info = token.get("userinfo") or await oauth.google.userinfo(token=token)
    user = upsert_user(db, user_info)
    access_token = create_jwt(user.id)

    # Redirect frontend to /auth/success?token=<jwt>
    return RedirectResponse(url=f"{FRONTEND_URL}/auth/success?token={access_token}")


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    """Returns the currently authenticated user's profile."""
    return current_user
