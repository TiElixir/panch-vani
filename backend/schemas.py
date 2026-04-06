from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr


# ─── Auth ────────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    avatar_url: Optional[str] = None
    is_super_admin: bool

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ─── Hubs ────────────────────────────────────────────────────────────────────

class HubCreate(BaseModel):
    name: str
    description: Optional[str] = None
    allowed_domains: List[str]  # e.g. ["students.iiests.ac.in"]


class HubOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    admin_id: str
    invite_code: str
    allowed_domains: List[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class HubSummary(BaseModel):
    """Lightweight hub info for dashboard lists."""
    id: str
    name: str
    description: Optional[str] = None
    allowed_domains: List[str]
    invite_code: str

    model_config = {"from_attributes": True}


class JoinHubRequest(BaseModel):
    invite_code: str
    verification_id: Optional[str] = None


class UpdateDomainsRequest(BaseModel):
    allowed_domains: List[str]


# ─── Membership ──────────────────────────────────────────────────────────────

class MembershipOut(BaseModel):
    hub_id: str
    user_id: str
    status: str
    verification_id: Optional[str] = None
    joined_at: datetime
    user: Optional[UserOut] = None

    model_config = {"from_attributes": True}


# ─── Polls ───────────────────────────────────────────────────────────────────

class PollCreate(BaseModel):
    question: str
    options: List[str]  # min 2 options expected
    duration_hours: Optional[int] = None


class PollOut(BaseModel):
    id: str
    hub_id: str
    question: str
    options: List[str]
    is_active: bool
    created_at: datetime
    closed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    has_voted: bool = False  # populated dynamically per-request

    model_config = {"from_attributes": True}


class VoteRequest(BaseModel):
    option_index: int


class PollResults(BaseModel):
    poll_id: str
    question: str
    options: List[str]
    tallies: List[int]      # count per option_index
    total_votes: int
    is_active: bool


# ─── Super Admin ─────────────────────────────────────────────────────────────

class PlatformStats(BaseModel):
    total_users: int
    total_hubs: int
    total_polls: int
    total_votes: int


class HubAdminOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    admin_id: str
    admin_email: str
    member_count: int
    poll_count: int
    allowed_domains: List[str]
    created_at: datetime
