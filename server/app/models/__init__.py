"""
Models package — re-exports everything so consumers can do:

    from app.models import User, TermSheet, Pitch, Deal, Attachment
    from app.models import Base
"""

from app.models.base import Base
from app.models.enums import (
    AttachmentKind,
    DealStatus,
    DealType,
    PitchStatus,
    Sector,
    Stage,
    TermSheetStatus,
    UserRole,
)
from app.models.tables import Attachment, Deal, Pitch, TermSheet, User

__all__ = [
    "Base",
    "User",
    "TermSheet",
    "Pitch",
    "Deal",
    "Attachment",
    "UserRole",
    "Sector",
    "Stage",
    "DealType",
    "TermSheetStatus",
    "PitchStatus",
    "DealStatus",
    "AttachmentKind",
]
