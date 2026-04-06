import uuid
from datetime import datetime
from typing import List

from sqlalchemy import (
    Boolean, DateTime, Enum, ForeignKey, Integer, String, JSON, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


# ─── Helpers ─────────────────────────────────────────────────────────────────

def new_uuid() -> str:
    return str(uuid.uuid4())


# ─── Models ──────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    google_sub: Mapped[str] = mapped_column(String, unique=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    is_super_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    memberships: Mapped[List["Membership"]] = relationship(back_populates="user")
    administered_hubs: Mapped[List["Hub"]] = relationship(back_populates="admin")


class Hub(Base):
    __tablename__ = "hubs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    admin_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    invite_code: Mapped[str] = mapped_column(String, unique=True, index=True)
    # List of allowed email domains e.g. ["students.iiests.ac.in"]
    allowed_domains: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    admin: Mapped["User"] = relationship(back_populates="administered_hubs")
    memberships: Mapped[List["Membership"]] = relationship(back_populates="hub", cascade="all, delete-orphan")
    polls: Mapped[List["Poll"]] = relationship(back_populates="hub", cascade="all, delete-orphan")


class Membership(Base):
    __tablename__ = "memberships"

    hub_id: Mapped[str] = mapped_column(ForeignKey("hubs.id"), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    status: Mapped[str] = mapped_column(
        Enum("pending", "approved", "rejected", name="membership_status"),
        default="pending",
    )
    verification_id: Mapped[str | None] = mapped_column(String, nullable=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    hub: Mapped["Hub"] = relationship(back_populates="memberships")
    user: Mapped["User"] = relationship(back_populates="memberships")


class Poll(Base):
    __tablename__ = "polls"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    hub_id: Mapped[str] = mapped_column(ForeignKey("hubs.id"))
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    question: Mapped[str] = mapped_column(String)
    options: Mapped[list] = mapped_column(JSON)  # List[str]
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    closed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    hub: Mapped["Hub"] = relationship(back_populates="polls")
    voter_logs: Mapped[List["VoterLog"]] = relationship(back_populates="poll", cascade="all, delete-orphan")
    anonymous_votes: Mapped[List["AnonymousVote"]] = relationship(back_populates="poll", cascade="all, delete-orphan")


class VoterLog(Base):
    """
    Records ONLY that a user voted in a poll.
    Never linked to AnonymousVote — this is the Double-Blind firewall.
    """
    __tablename__ = "voter_logs"

    poll_id: Mapped[str] = mapped_column(ForeignKey("polls.id"), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    voted_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    poll: Mapped["Poll"] = relationship(back_populates="voter_logs")


class AnonymousVote(Base):
    """
    Records the actual ballot. No user reference — ever.
    """
    __tablename__ = "anonymous_votes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    poll_id: Mapped[str] = mapped_column(ForeignKey("polls.id"))
    option_index: Mapped[int] = mapped_column(Integer)

    poll: Mapped["Poll"] = relationship(back_populates="anonymous_votes")
