"""Supabase JWT verification for FastAPI."""

import time
import jwt
import json
import base64
from functools import lru_cache

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings

# auto_error=False so we can return 401 (not 403) when token is missing
security = HTTPBearer(auto_error=False)


@lru_cache
def _get_jwks_client() -> jwt.PyJWKClient:
    """Build a cached JWKS client for Supabase ES256 token verification."""
    settings = get_settings()
    jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    client = jwt.PyJWKClient(jwks_url)
    return client


def warm_up_jwks(max_retries: int = 5, delay: float = 2.0) -> None:
    """Pre-fetch JWKS keys at startup with retries for DNS readiness."""
    for attempt in range(max_retries):
        try:
            client = _get_jwks_client()
            client.get_signing_keys()
            print("AUTH: JWKS keys loaded successfully", flush=True)
            return
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"AUTH: JWKS fetch attempt {attempt + 1} failed, retrying in {delay}s...", flush=True)
                time.sleep(delay)
            else:
                print(f"AUTH: JWKS pre-fetch failed after {max_retries} attempts: {e}", flush=True)
                print("AUTH: Will retry on first request", flush=True)


def _detect_algorithm(token: str) -> str:
    """Read the alg field from the JWT header without verifying."""
    header_b64 = token.split(".")[0]
    # Add padding
    header_b64 += "=" * (4 - len(header_b64) % 4)
    header = json.loads(base64.urlsafe_b64decode(header_b64))
    return header.get("alg", "HS256")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict:
    """
    Verify Supabase JWT and return the user payload.
    Supports both HS256 (legacy) and ES256 (new Supabase default).
    Raises 401 if token is missing, invalid, or expired.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    settings = get_settings()
    token = credentials.credentials

    try:
        alg = _detect_algorithm(token)

        if alg == "ES256":
            # Use JWKS public key for ES256
            jwks_client = _get_jwks_client()
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256"],
                audience="authenticated",
            )
        else:
            # HS256 fallback
            if not settings.supabase_jwt_secret:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Auth not configured (missing SUPABASE_JWT_SECRET)",
                )
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Ensure required claims exist
    if not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user ID (sub claim)",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload
