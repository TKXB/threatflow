import os
import uuid
from fastapi_users.authentication import AuthenticationBackend, BearerTransport, JWTStrategy
from .users import get_user_manager
from .models import User

SECRET = os.getenv("AUTH_SECRET", "CHANGE_ME_IN_PRODUCTION_AT_LEAST_32_CHARS")

bearer_transport = BearerTransport(tokenUrl="auth/jwt/login")


def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(secret=SECRET, lifetime_seconds=3600 * 24 * 7)  # 7 days


auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

