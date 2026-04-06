import random
import time
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import AnonymousVote, Hub, Membership, Poll, VoterLog, User
from schemas import PollCreate, PollOut, PollResults, VoteRequest, UserOut

router = APIRouter(tags=["Polls"])


def _assert_approved_member(hub_id: str, user: User, db: Session):
    """Raises 403 if user is not an approved member (hub admin exempt)."""
    hub = db.get(Hub, hub_id)
    if hub is None:
        raise HTTPException(404, "Hub not found")
    if hub.admin_id == user.id or user.is_super_admin:
        return hub
    membership = db.get(Membership, (hub_id, user.id))
    if membership is None or membership.status != "approved":
        raise HTTPException(403, "You must be an approved member of this Hub")
    return hub


# ─── Create Poll ─────────────────────────────────────────────────────────────

@router.post("/hubs/{hub_id}/polls", response_model=PollOut, status_code=201)
def create_poll(
    hub_id: str,
    body: PollCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Hub Admin: create a new poll."""
    hub = db.get(Hub, hub_id)
    if hub is None:
        raise HTTPException(404, "Hub not found")
    if hub.admin_id != current_user.id and not current_user.is_super_admin:
        raise HTTPException(403, "Only the Hub Admin can create polls")
    if len(body.options) < 2:
        raise HTTPException(400, "A poll must have at least 2 options")

    expires_at = None
    if body.duration_hours:
        expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=body.duration_hours)

    poll = Poll(hub_id=hub_id, created_by=current_user.id, question=body.question, options=body.options, expires_at=expires_at)
    db.add(poll)
    db.commit()
    db.refresh(poll)
    out = PollOut.model_validate(poll)
    out.has_voted = False
    return out


# ─── List Hub Polls ──────────────────────────────────────────────────────────

@router.get("/hubs/{hub_id}/polls", response_model=list[PollOut])
def list_polls(
    hub_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Approved members: list all polls in a hub."""
    _assert_approved_member(hub_id, current_user, db)
    polls = db.query(Poll).filter(Poll.hub_id == hub_id).order_by(Poll.created_at.desc()).all()
    result = []
    for poll in polls:
        out = PollOut.model_validate(poll)
        out.has_voted = db.get(VoterLog, (poll.id, current_user.id)) is not None
        result.append(out)
    return result


# ─── Get Single Poll ─────────────────────────────────────────────────────────

@router.get("/polls/{poll_id}", response_model=PollOut)
def get_poll(
    poll_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    poll = db.get(Poll, poll_id)
    if poll is None:
        raise HTTPException(404, "Poll not found")
    _assert_approved_member(poll.hub_id, current_user, db)
    out = PollOut.model_validate(poll)
    out.has_voted = db.get(VoterLog, (poll.id, current_user.id)) is not None
    return out


# ─── Cast Vote (Double-Blind) ─────────────────────────────────────────────────

@router.post("/polls/{poll_id}/vote", status_code=status.HTTP_201_CREATED)
def cast_vote(
    poll_id: str,
    body: VoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    The Double-Blind voting engine:
    1. Assert approved membership.
    2. Check VoterLog (409 if already voted).
    3. Insert VoterLog, then RandomJitter, then insert AnonymousVote.
       The two rows are never correlated — user identity is permanently severed.
    """
    poll = db.get(Poll, poll_id)
    if poll is None:
        raise HTTPException(404, "Poll not found")
        
    is_expired = poll.expires_at and datetime.now(timezone.utc).replace(tzinfo=None) > poll.expires_at

    if not poll.is_active or is_expired:
        raise HTTPException(400, "This poll is closed or has expired")

    _assert_approved_member(poll.hub_id, current_user, db)

    if body.option_index < 0 or body.option_index >= len(poll.options):
        raise HTTPException(400, f"option_index must be between 0 and {len(poll.options) - 1}")

    # ── Gate: already voted? ─────────────────────────────────────────────────
    if db.get(VoterLog, (poll_id, current_user.id)):
        raise HTTPException(409, "You have already voted in this poll")

    # ── Double-Blind write ────────────────────────────────────────────────────
    voter_log = VoterLog(poll_id=poll_id, user_id=current_user.id)
    db.add(voter_log)
    db.flush()  # Persist VoterLog row

    # Randomised jitter breaks timestamp correlation between the two tables
    time.sleep(random.uniform(0.001, 0.008))

    anonymous_vote = AnonymousVote(poll_id=poll_id, option_index=body.option_index)
    db.add(anonymous_vote)
    db.commit()

    return {"detail": "Vote cast successfully"}


# ─── Poll Results ─────────────────────────────────────────────────────────────

@router.get("/polls/{poll_id}/results", response_model=PollResults)
def get_results(
    poll_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns aggregated tallies.
    Results are only visible if:
    - The user has already voted, OR
    - The poll is closed, OR
    - The user is the Hub Admin / Super Admin.
    """
    poll = db.get(Poll, poll_id)
    if poll is None:
        raise HTTPException(404, "Poll not found")

    hub = _assert_approved_member(poll.hub_id, current_user, db)
    has_voted = db.get(VoterLog, (poll_id, current_user.id)) is not None
    is_admin = (hub.admin_id == current_user.id or current_user.is_super_admin)

    if not has_voted and poll.is_active and not is_admin:
        raise HTTPException(
            403, "You can only view results after casting your vote or once the poll is closed"
        )

    votes = db.query(AnonymousVote).filter(AnonymousVote.poll_id == poll_id).all()
    tallies = [0] * len(poll.options)
    for v in votes:
        if 0 <= v.option_index < len(tallies):
            tallies[v.option_index] += 1

    return PollResults(
        poll_id=poll_id,
        question=poll.question,
        options=poll.options,
        tallies=tallies,
        total_votes=len(votes),
        is_active=poll.is_active,
    )


# ─── Close Poll ───────────────────────────────────────────────────────────────

@router.patch("/polls/{poll_id}/close", response_model=PollOut)
def close_poll(
    poll_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Hub Admin: close a poll so results become public."""
    poll = db.get(Poll, poll_id)
    if poll is None:
        raise HTTPException(404, "Poll not found")
    hub = db.get(Hub, poll.hub_id)
    if hub.admin_id != current_user.id and not current_user.is_super_admin:
        raise HTTPException(403, "Only the Hub Admin can close polls")
    poll.is_active = False
    poll.closed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(poll)
    out = PollOut.model_validate(poll)
    out.has_voted = db.get(VoterLog, (poll.id, current_user.id)) is not None
    return out


# ─── Get Voter Logs (Admin) ──────────────────────────────────────────────────

@router.get("/polls/{poll_id}/voters", response_model=list[UserOut])
def get_voters(
    poll_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns the list of members who have participated (cast a ballot).
    Does NOT return what they voted for (that's impossible to know by design).
    Only visible to the Hub Admin / Super Admin.
    """
    poll = db.get(Poll, poll_id)
    if poll is None:
        raise HTTPException(404, "Poll not found")

    hub = db.get(Hub, poll.hub_id)
    if hub.admin_id != current_user.id and not current_user.is_super_admin:
        raise HTTPException(403, "Only the Hub Admin can view the voter ledger")

    vlogs = db.query(VoterLog).filter(VoterLog.poll_id == poll_id).all()
    users = [db.get(User, vlog.user_id) for vlog in vlogs]
    return users
