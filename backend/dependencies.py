import os
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from database import get_db
from models import Hub, Membership, User

JWT_SECRET = os.getenv("JWT_SECRET_KEY", "dev-secret-change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

bearer_scheme = HTTPBearer()


# ─── Core Auth Dependency ────────────────────────────────────────────────────

def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    db: Session = Depends(get_db),
) -> User:
    """Validates JWT and returns the authenticated User row."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.get(User, user_id)
    if user is None:
        raise credentials_exception
    return user


# ─── Role Guards ─────────────────────────────────────────────────────────────

def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    """Allows access only to Platform Super Admins."""
    if not current_user.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform super admin access required",
        )
    return current_user


def get_hub_admin_dep(hub_id: str):
    """
    Returns a dependency factory that checks if the current user
    is the admin of the specified hub (or a super admin).
    Usage: Depends(get_hub_admin_dep("{hub_id}"))
    """
    def _require_hub_admin(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        hub = db.get(Hub, hub_id)
        if hub is None:
            raise HTTPException(status_code=404, detail="Hub not found")
        if hub.admin_id != current_user.id and not current_user.is_super_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Hub admin access required",
            )
        return current_user

    return _require_hub_admin


def get_approved_member_dep(hub_id: str):
    """Dependency factory: asserts the user is an approved member of hub_id."""
    def _require_approved(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        membership = db.get(Membership, (hub_id, current_user.id))
        if membership is None or membership.status != "approved":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be an approved member of this Hub to access it",
            )
        return current_user

    return _require_approved
