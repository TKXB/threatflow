import os
import time
import httpx
from jose import jwt, JWTError
from fastapi import Request, HTTPException

CLERK_JWKS_URL = os.getenv(
    "CLERK_JWKS_URL",
    "https://musical-warthog-9.clerk.accounts.dev/.well-known/jwks.json",
)

_jwks_cache: dict | None = None
_jwks_cached_at: float = 0
JWKS_TTL = 3600  # 1 hour


async def _fetch_jwks() -> dict:
    global _jwks_cache, _jwks_cached_at
    if _jwks_cache and (time.time() - _jwks_cached_at) < JWKS_TTL:
        return _jwks_cache
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(CLERK_JWKS_URL)
        r.raise_for_status()
        _jwks_cache = r.json()
        _jwks_cached_at = time.time()
        return _jwks_cache


async def get_current_user_id(request: Request) -> str:
    """Extract and verify Clerk user ID from Authorization header.
    Returns the Clerk user_id (sub claim).
    Raises HTTPException 401 if missing/invalid.
    """
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = auth[7:]

    try:
        jwks = await _fetch_jwks()
        header = jwt.get_unverified_header(token)
        key = next(
            (k for k in jwks["keys"] if k["kid"] == header.get("kid")),
            None,
        )
        if not key:
            raise HTTPException(status_code=401, detail="Unknown signing key")

        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="No sub in token")
        return user_id
    except JWTError as e:
        raise HTTPException(status_code=401, detail=str(e))
