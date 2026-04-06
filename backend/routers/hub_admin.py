from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import Hub, Membership, User
from schemas import MembershipOut, UpdateDomainsRequest

router = APIRouter(prefix="/hubs/{hub_id}/admin", tags=["Hub Admin"])


def _get_hub_and_assert_admin(hub_id: str, current_user: User, db: Session) -> Hub:
    """Shared helper: fetch hub and assert caller is hub admin or super admin."""
    hub = db.get(Hub, hub_id)
    if hub is None:
        raise HTTPException(404, "Hub not found")
    if hub.admin_id != current_user.id and not current_user.is_super_admin:
        raise HTTPException(403, "Hub admin access required")
    return hub


# ─── Pending Members ─────────────────────────────────────────────────────────

@router.get("/pending", response_model=list[MembershipOut])
def list_pending(
    hub_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Hub Admin: view all pending join requests."""
    _get_hub_and_assert_admin(hub_id, current_user, db)
    return (
        db.query(Membership)
        .filter(Membership.hub_id == hub_id, Membership.status == "pending")
        .all()
    )


# ─── Approve Member ──────────────────────────────────────────────────────────

@router.patch("/approve/{user_id}", response_model=MembershipOut)
def approve_member(
    hub_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Hub Admin: approve a pending member."""
    _get_hub_and_assert_admin(hub_id, current_user, db)
    membership = db.get(Membership, (hub_id, user_id))
    if membership is None:
        raise HTTPException(404, "Membership not found")
    if membership.status == "approved":
        raise HTTPException(409, "Member is already approved")
    membership.status = "approved"
    db.commit()
    db.refresh(membership)
    return membership


# ─── Reject Member ───────────────────────────────────────────────────────────

@router.delete("/reject/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def reject_member(
    hub_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Hub Admin: reject (and remove) a pending or approved member."""
    _get_hub_and_assert_admin(hub_id, current_user, db)
    membership = db.get(Membership, (hub_id, user_id))
    if membership is None:
        raise HTTPException(404, "Membership not found")
    membership.status = "rejected"
    db.commit()


# ─── Update Allowed Domains ──────────────────────────────────────────────────

@router.patch("/domains", response_model=dict)
def update_domains(
    hub_id: str,
    body: UpdateDomainsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Hub Admin: update the list of allowed email domains for this Hub."""
    hub = _get_hub_and_assert_admin(hub_id, current_user, db)
    if not body.allowed_domains:
        raise HTTPException(400, "At least one domain is required")
    hub.allowed_domains = [d.lstrip("@").lower().strip() for d in body.allowed_domains]
    db.commit()
    return {"allowed_domains": hub.allowed_domains}


# ─── All Members ─────────────────────────────────────────────────────────────

@router.get("/members", response_model=list[MembershipOut])
def list_all_members(
    hub_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Hub Admin: view all members (any status)."""
    _get_hub_and_assert_admin(hub_id, current_user, db)
    return db.query(Membership).filter(Membership.hub_id == hub_id).all()
