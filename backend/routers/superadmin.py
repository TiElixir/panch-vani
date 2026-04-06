from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from dependencies import require_super_admin
from models import AnonymousVote, Hub, Membership, Poll, User
from schemas import HubAdminOut, PlatformStats, UserOut

router = APIRouter(prefix="/superadmin", tags=["Platform Super Admin"])


# ─── Platform Stats ──────────────────────────────────────────────────────────

@router.get("/stats", response_model=PlatformStats)
def platform_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    return PlatformStats(
        total_users=db.query(func.count(User.id)).scalar(),
        total_hubs=db.query(func.count(Hub.id)).scalar(),
        total_polls=db.query(func.count(Poll.id)).scalar(),
        total_votes=db.query(func.count(AnonymousVote.id)).scalar(),
    )


# ─── All Hubs ────────────────────────────────────────────────────────────────

@router.get("/hubs", response_model=list[HubAdminOut])
def list_all_hubs(
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    hubs = db.query(Hub).order_by(Hub.created_at.desc()).all()
    result = []
    for hub in hubs:
        admin = db.get(User, hub.admin_id)
        member_count = (
            db.query(func.count(Membership.user_id))
            .filter(Membership.hub_id == hub.id, Membership.status == "approved")
            .scalar()
        )
        poll_count = db.query(func.count(Poll.id)).filter(Poll.hub_id == hub.id).scalar()
        result.append(
            HubAdminOut(
                id=hub.id,
                name=hub.name,
                description=hub.description,
                admin_id=hub.admin_id,
                admin_email=admin.email if admin else "unknown",
                member_count=member_count,
                poll_count=poll_count,
                allowed_domains=hub.allowed_domains,
                created_at=hub.created_at,
            )
        )
    return result


# ─── Delete Hub ──────────────────────────────────────────────────────────────

@router.delete("/hubs/{hub_id}", status_code=204)
def delete_hub(
    hub_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    hub = db.get(Hub, hub_id)
    if hub is None:
        raise HTTPException(404, "Hub not found")
    db.delete(hub)
    db.commit()


# ─── All Users ───────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[UserOut])
def list_all_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    return db.query(User).order_by(User.created_at.desc()).all()


# ─── Promote to Hub Admin ────────────────────────────────────────────────────

@router.patch("/hubs/{hub_id}/promote/{user_id}", status_code=200)
def promote_hub_admin(
    hub_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    """Super Admin: transfer hub admin rights to a different approved member."""
    hub = db.get(Hub, hub_id)
    if hub is None:
        raise HTTPException(404, "Hub not found")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "User not found")
    membership = db.get(Membership, (hub_id, user_id))
    if membership is None or membership.status != "approved":
        raise HTTPException(400, "User must be an approved member to become Hub Admin")
    hub.admin_id = user_id
    db.commit()
    return {"detail": f"Hub admin updated to {user.email}"}
