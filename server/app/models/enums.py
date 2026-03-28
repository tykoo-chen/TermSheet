"""Enums shared across the domain — single source of truth for status values."""

import enum


class UserRole(str, enum.Enum):
    INVESTOR = "investor"
    FOUNDER = "founder"


class Sector(str, enum.Enum):
    DEFI = "DeFi"
    AI_WEB3 = "AI + Web3"
    INFRASTRUCTURE = "Infrastructure"
    CONSUMER = "Consumer"
    GAMING = "Gaming"
    SOCIAL = "Social"
    RWA = "RWA"
    PAYMENTS = "Payments"
    DEV_TOOLS = "Dev Tools"
    ZK = "ZK"
    NFT = "NFT"
    CREATOR_ECONOMY = "Creator Economy"
    DATA = "Data"


class Stage(str, enum.Enum):
    PRE_SEED = "Pre-seed"
    SEED = "Seed"
    SERIES_A = "Series A"
    GROWTH = "Growth"


class DealType(str, enum.Enum):
    SAFE = "SAFE"
    TOKEN_WARRANT = "Token Warrant"
    SAFE_TOKEN_WARRANT = "SAFE + Token Warrant"
    EQUITY = "Equity"


class TermSheetStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    WITHDRAWN = "withdrawn"
    FILLED = "filled"


class PitchStatus(str, enum.Enum):
    PENDING = "pending"
    REVIEWING = "reviewing"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class DealStatus(str, enum.Enum):
    FUNDED = "funded"
    ESCROW_RELEASED = "escrow_released"
    COMPLETED = "completed"
    DISPUTED = "disputed"


class AttachmentKind(str, enum.Enum):
    PITCH_DECK = "pitch_deck"
    FINANCIALS = "financials"
    OTHER = "other"
