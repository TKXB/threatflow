import uuid
from fastapi_users import schemas
from typing import Optional


class UserRead(schemas.BaseUser[uuid.UUID]):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserCreate(schemas.BaseUserCreate):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserUpdate(schemas.BaseUserUpdate):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

