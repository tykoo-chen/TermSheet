"""Enums shared across the domain — single source of truth for status values."""

import enum


class SessionStatus(str, enum.Enum):
    IN_PROGRESS = "in_progress"
    PENDING = "pending"
    PASS = "pass"
    REJECT = "reject"


class MessageRole(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"
