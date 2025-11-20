import uuid
from typing import Optional
from fastapi import Depends, Request
from fastapi_users import BaseUserManager, UUIDIDMixin
from .models import User
from .db import get_user_db
import os

SECRET = os.getenv("AUTH_SECRET", "CHANGE_ME_IN_PRODUCTION_AT_LEAST_32_CHARS")


class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    reset_password_token_secret = SECRET
    verification_token_secret = SECRET

    async def on_after_register(self, user: User, request: Optional[Request] = None):
        pass

    async def on_after_forgot_password(self, user: User, token: str, request: Optional[Request] = None):
        pass

    async def on_after_request_verify(self, user: User, token: str, request: Optional[Request] = None):
        pass


async def get_user_manager(user_db=Depends(get_user_db)):
    yield UserManager(user_db)

