"""
SQLAlchemy ORM models — single source of truth for every database table.

Users come from Supabase auth.users (not managed here).
All user_id columns reference auth.users(id) via UUID.

Entity relationships
--------------------
auth.users  1──▶ N  Session        (user creates sessions)
Session     1──▶ N  Message        (each session has messages)
Session     1──▶ 0..1 InvestRecord (accepted session becomes investment)
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import MessageRole, SessionStatus


# ── Session ─────────────────────────────────────────────────────────────────
class Session(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    A conversation session between a founder and an investor (via AI agent).
    Tracks the pitch lifecycle from start to final decision.
    """

    __tablename__ = "sessions"

    # References Supabase auth.users — no FK constraint (cross-schema)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )

    # Which investor (shark) this session targets — references mock-data id
    investor_id: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True
    )

    status: Mapped[SessionStatus] = mapped_column(
        default=SessionStatus.IN_PROGRESS, index=True
    )

    # ── relationships ──
    messages: Mapped[list["Message"]] = relationship(
        back_populates="session",
        lazy="selectin",
        order_by="Message.created_at",
    )
    invest_record: Mapped["InvestRecord | None"] = relationship(
        back_populates="session", uselist=False
    )


# ── Message ─────────────────────────────────────────────────────────────────
class Message(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    A single message within a session.
    Roles: user (founder), assistant (AI agent), tool (function call result).
    """

    __tablename__ = "messages"

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    role: Mapped[MessageRole] = mapped_column(nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Optional: tool call metadata (name, args, result) stored as JSON string
    tool_metadata: Mapped[str | None] = mapped_column(Text)

    # ── relationships ──
    session: Mapped["Session"] = relationship(back_populates="messages")


# ── InvestRecord ────────────────────────────────────────────────────────────
class InvestRecord(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    Investment record — created when a session results in a successful deal.
    """

    __tablename__ = "invest_records"

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sessions.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    # Who invested (shark id from mock data)
    investor_id: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True
    )

    # Financial details
    amount: Mapped[float] = mapped_column(
        Numeric(18, 2), nullable=False
    )
    wallet_address: Mapped[str] = mapped_column(
        String(42), nullable=False, comment="USDC receiving wallet"
    )

    # On-chain reference
    tx_hash: Mapped[str | None] = mapped_column(String(66))

    funded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── relationships ──
    session: Mapped["Session"] = relationship(back_populates="invest_record")
