"""Enums shared across the domain — single source of truth for status values."""

import enum


class SessionStatus(str, enum.Enum):
    IN_PROGRESS = "in_progress"
    PENDING = "pending"
    PASS = "pass"
    REJECT = "reject"


class ApprovalStatus(str, enum.Enum):
    PENDING_REVIEW = "pending_review"  # AI decided to invest, awaiting human review
    APPROVED = "approved"              # Human approved the investment
    REJECTED = "rejected"              # Human rejected the investment


class MessageRole(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"
