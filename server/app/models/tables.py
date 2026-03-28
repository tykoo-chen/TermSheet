"""
SQLAlchemy ORM models — single source of truth for every database table.

Entity relationships
--------------------
User  1──▶ N  TermSheet    (investor creates term sheets)
User  1──▶ N  Pitch        (founder submits pitches)
TermSheet 1──▶ N  Pitch    (each pitch targets one term sheet)
Pitch 1──▶ 0..1  Deal      (accepted pitch becomes a deal)
Pitch 1──▶ N  Attachment   (pitch deck, financials, etc.)
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import (
    AttachmentKind,
    DealStatus,
    DealType,
    PitchStatus,
    Stage,
    TermSheetStatus,
    UserRole,
)


# ── User ────────────────────────────────────────────────────────────────────
class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    A single user account — may act as investor, founder, or both.
    Wallet address is the primary identity (SIWE).
    """

    __tablename__ = "users"

    wallet_address: Mapped[str] = mapped_column(
        String(42), unique=True, nullable=False, index=True
    )
    email: Mapped[str | None] = mapped_column(String(255), unique=True)
    display_name: Mapped[str | None] = mapped_column(String(100))
    avatar: Mapped[str | None] = mapped_column(String(10))  # emoji
    title: Mapped[str | None] = mapped_column(String(200))
    bio: Mapped[str | None] = mapped_column(Text)
    role: Mapped[UserRole] = mapped_column(default=UserRole.FOUNDER)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    # Social links stored as JSON string: {"twitter": "...", "lens": "..."}
    socials: Mapped[str | None] = mapped_column(Text)

    # ── relationships ──
    term_sheets: Mapped[list["TermSheet"]] = relationship(
        back_populates="investor", lazy="selectin"
    )
    pitches: Mapped[list["Pitch"]] = relationship(
        back_populates="founder", lazy="selectin"
    )


# ── TermSheet ───────────────────────────────────────────────────────────────
class TermSheet(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    An investor's public term sheet with staked capital.
    """

    __tablename__ = "term_sheets"

    investor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    # Financial terms
    staked_amount: Mapped[float] = mapped_column(
        Numeric(18, 2), nullable=False
    )
    valuation_min: Mapped[float | None] = mapped_column(Numeric(18, 2))
    valuation_max: Mapped[float | None] = mapped_column(Numeric(18, 2))
    deal_type: Mapped[DealType] = mapped_column(default=DealType.TOKEN_WARRANT)
    stage: Mapped[Stage] = mapped_column(default=Stage.PRE_SEED)

    # Discovery metadata — comma-separated for portability (e.g. "DeFi,Infrastructure")
    sectors: Mapped[str | None] = mapped_column(Text)
    thesis: Mapped[str | None] = mapped_column(Text)

    # On-chain references
    escrow_address: Mapped[str | None] = mapped_column(String(42))
    tx_hash: Mapped[str | None] = mapped_column(String(66))

    # Lifecycle
    status: Mapped[TermSheetStatus] = mapped_column(
        default=TermSheetStatus.ACTIVE, index=True
    )

    # ── relationships ──
    investor: Mapped["User"] = relationship(back_populates="term_sheets")
    pitches: Mapped[list["Pitch"]] = relationship(
        back_populates="term_sheet", lazy="selectin"
    )


# ── Pitch ───────────────────────────────────────────────────────────────────
class Pitch(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    A founder's pitch application targeting one term sheet.
    """

    __tablename__ = "pitches"

    founder_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    term_sheet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("term_sheets.id"),
        nullable=False,
        index=True,
    )

    # Pitch content
    project_name: Mapped[str] = mapped_column(String(200), nullable=False)
    website: Mapped[str | None] = mapped_column(String(500))
    elevator_pitch: Mapped[str | None] = mapped_column(String(280))
    vertical: Mapped[str | None] = mapped_column(String(100))
    stage: Mapped[Stage | None] = mapped_column()

    # External links
    github_url: Mapped[str | None] = mapped_column(String(500))
    twitter_handle: Mapped[str | None] = mapped_column(String(100))

    # Lifecycle
    status: Mapped[PitchStatus] = mapped_column(
        default=PitchStatus.PENDING, index=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # ── relationships ──
    founder: Mapped["User"] = relationship(back_populates="pitches")
    term_sheet: Mapped["TermSheet"] = relationship(back_populates="pitches")
    deal: Mapped["Deal | None"] = relationship(
        back_populates="pitch", uselist=False
    )
    attachments: Mapped[list["Attachment"]] = relationship(
        back_populates="pitch", lazy="selectin"
    )


# ── Deal ────────────────────────────────────────────────────────────────────
class Deal(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    A completed deal — created when a pitch is accepted and funded.
    """

    __tablename__ = "deals"

    pitch_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pitches.id"),
        unique=True,
        nullable=False,
    )
    amount: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False)
    status: Mapped[DealStatus] = mapped_column(
        default=DealStatus.FUNDED, index=True
    )

    # On-chain proof
    tx_hash: Mapped[str | None] = mapped_column(String(66))
    terms_hash: Mapped[str | None] = mapped_column(String(66))

    funded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # ── relationships ──
    pitch: Mapped["Pitch"] = relationship(back_populates="deal")


# ── Attachment ──────────────────────────────────────────────────────────────
class Attachment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    File attached to a pitch (deck, financials, etc.).
    """

    __tablename__ = "attachments"

    pitch_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pitches.id"), nullable=False, index=True
    )
    kind: Mapped[AttachmentKind] = mapped_column(
        default=AttachmentKind.OTHER
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    size_bytes: Mapped[int | None] = mapped_column(Integer)

    # ── relationships ──
    pitch: Mapped["Pitch"] = relationship(back_populates="attachments")
