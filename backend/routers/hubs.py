import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import Hub, Membership, User
from schemas import HubCreate, HubOut, HubSummary, JoinHubRequest, MembershipOut

router = APIRouter(prefix="/hubs", tags=["Hubs"])


# ─── Create Hub ──────────────────────────────────────────────────────────────

@router.post("", response_model=HubOut, status_code=status.HTTP_201_CREATED)
def create_hub(
    body: HubCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Any authenticated user can create a Hub and become its Admin."""
    if not body.allowed_domains:
        raise HTTPException(400, "At least one allowed email domain is required")

    # Normalise domains — strip leading '@' if user typed it
    domains = [d.lstrip("@").lower().strip() for d in body.allowed_domains]

    hub = Hub(
        name=body.name,
        description=body.description,
        admin_id=current_user.id,
        invite_code=secrets.token_urlsafe(8),
        allowed_domains=domains,
    )
    db.add(hub)
    db.flush()

    # Creator is automatically an approved member
    membership = Membership(hub_id=hub.id, user_id=current_user.id, status="approved")
    db.add(membership)

    db.commit()
    db.refresh(hub)
    return hub


# ─── List My Hubs ────────────────────────────────────────────────────────────

@router.get("", response_model=list[HubSummary])
def list_my_hubs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns all hubs where the user has an approved membership."""
    memberships = (
        db.query(Membership)
        .filter(
            Membership.user_id == current_user.id,
            Membership.status == "approved",
        )
        .all()
    )
    return [m.hub for m in memberships]


# ─── Get Hub Detail ──────────────────────────────────────────────────────────

@router.get("/{hub_id}", response_model=HubOut)
def get_hub(
    hub_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns hub details. Accessible to approved members and the hub admin.
    Super admins bypass the membership check.
    """
    hub = db.get(Hub, hub_id)
    if hub is None:
        raise HTTPException(404, "Hub not found")

    if not current_user.is_super_admin:
        membership = db.get(Membership, (hub_id, current_user.id))
        if membership is None or membership.status != "approved":
            raise HTTPException(403, "You are not an approved member of this Hub")

    return hub


# ─── Join Hub ────────────────────────────────────────────────────────────────

@router.post("/{hub_id}/join", response_model=MembershipOut, status_code=status.HTTP_201_CREATED)
def join_hub(
    hub_id: str,
    body: JoinHubRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Gate 1: Domain check — user's email domain must be in hub.allowed_domains.
    Gate 2: Creates a Membership with status='pending' for admin approval.
    """
    hub = db.get(Hub, hub_id)
    if hub is None:
        # Also try by invite code
        hub = db.query(Hub).filter(Hub.invite_code == body.invite_code).first()
    if hub is None:
        raise HTTPException(404, "Hub not found")

    # ── Gate 1: Domain check ─────────────────────────────────────────────────
    user_domain = current_user.email.split("@")[-1].lower()
    if user_domain not in hub.allowed_domains:
        raise HTTPException(
            status_code=403,
            detail=(
                f"Your email domain '@{user_domain}' is not permitted in this Hub. "
                f"Allowed: {', '.join('@' + d for d in hub.allowed_domains)}"
            ),
        )

    # ── Check existing membership ─────────────────────────────────────────────
    existing = db.get(Membership, (hub.id, current_user.id))
    if existing:
        if existing.status == "approved":
            raise HTTPException(409, "You are already a member of this Hub")
        if existing.status == "pending":
            raise HTTPException(409, "Your join request is already pending approval")
        if existing.status == "rejected":
            raise HTTPException(403, "Your join request was rejected by the Hub Admin")

    membership = Membership(
        hub_id=hub.id,
        user_id=current_user.id,
        status="pending",
        verification_id=body.verification_id,
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership
