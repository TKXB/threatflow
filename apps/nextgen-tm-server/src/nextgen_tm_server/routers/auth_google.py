import os
import secrets
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi_users import exceptions as fastapi_users_exceptions
from ..users import get_user_manager, UserManager
from ..auth import auth_backend
from ..models import User, OAuthAccount
from ..db import get_async_session
from ..schemas import UserCreate

router = APIRouter()
logger = logging.getLogger(__name__)

# 默认使用与前端相同的 Google Client ID
GOOGLE_CLIENT_ID = os.getenv(
    "GOOGLE_CLIENT_ID", 
    "833855760970-n88dvfaq7ha229dh1c9pifrsjso14mt5.apps.googleusercontent.com"
)

logger.info(f"Google Auth Router initialized with Client ID: {GOOGLE_CLIENT_ID[:20]}...")


class GoogleLoginRequest(BaseModel):
    id_token: str


async def find_or_create_user_from_google(
    db: AsyncSession,
    user_manager: UserManager,
    google_sub: str,
    email: str,
    name: str | None,
    picture: str | None,
) -> User:
    """查找或创建 Google 用户"""
    logger.info(f"🔍 查找或创建用户: email={email}, google_sub={google_sub}, name={name}")
    
    # 1. 查找是否已有 OAuth 关联
    stmt = select(OAuthAccount).where(
        OAuthAccount.oauth_name == "google",
        OAuthAccount.account_id == google_sub
    )
    result = await db.execute(stmt)
    oauth_acc = result.scalar_one_or_none()
    
    if oauth_acc:
        logger.info(f"✅ 找到已有 OAuth 关联: user_id={oauth_acc.user_id}")
        # 已有关联，返回用户并更新信息
        user = await user_manager.get(oauth_acc.user_id)
        if user:
            logger.info(f"✅ 更新用户信息: {user.email}")
            user.full_name = name or user.full_name
            user.avatar_url = picture or user.avatar_url
            db.add(user)
            await db.commit()
            await db.refresh(user)
            return user
    
    # 2. 查找邮箱是否已存在（可能是其他方式注册的）
    logger.info(f"🔍 通过邮箱查找用户: {email}")
    user = None
    try:
        user = await user_manager.get_by_email(email)
        logger.info(f"✅ 找到已有用户（通过邮箱）: id={user.id}, email={user.email}")
    except fastapi_users_exceptions.UserNotExists:
        logger.info(f"ℹ️ 用户不存在，准备创建新用户")
    
    if not user:
        # 3. 创建新用户（生成随机密码，因为 OAuth 用户不需要密码登录）
        logger.info(f"📝 创建新用户: {email}")
        random_password = secrets.token_urlsafe(32)
        user_create = UserCreate(
            email=email,
            password=random_password,
            is_active=True,
            is_verified=True,
            full_name=name,
            avatar_url=picture,
        )
        try:
            user = await user_manager.create(user_create)
            logger.info(f"✅ 用户创建成功: id={user.id}, email={user.email}")
        except Exception as e:
            logger.error(f"❌ 用户创建失败: {e}", exc_info=True)
            raise
    
    # 4. 创建或更新 OAuth 关联
    if not oauth_acc:
        logger.info(f"📝 创建 OAuth 关联: user_id={user.id}, google_sub={google_sub}")
        oauth_acc = OAuthAccount(
            user_id=user.id,
            oauth_name="google",
            account_id=google_sub,
            account_email=email,
            access_token="",  # Google ID Token 方式不需要 access token
        )
        db.add(oauth_acc)
        try:
            await db.commit()
            logger.info(f"✅ OAuth 关联创建成功")
        except Exception as e:
            logger.error(f"❌ OAuth 关联创建失败: {e}", exc_info=True)
            raise
    
    logger.info(f"✅ 用户处理完成: id={user.id}, email={user.email}")
    return user


@router.post("/google/login")
async def google_login(
    request: GoogleLoginRequest,
    user_manager: UserManager = Depends(get_user_manager),
    strategy=Depends(auth_backend.get_strategy),
    db: AsyncSession = Depends(get_async_session),
):
    """接收前端 Google ID Token，验证后返回后端 JWT"""
    logger.info("=" * 70)
    logger.info("🚀 收到 Google 登录请求")
    
    if not GOOGLE_CLIENT_ID:
        logger.error("❌ Google Client ID 未配置")
        raise HTTPException(status_code=500, detail="Google Client ID not configured")
    
    logger.info(f"✅ Google Client ID 已配置: {GOOGLE_CLIENT_ID[:20]}...")
    
    try:
        # 验证 Google ID Token
        logger.info("🔐 开始验证 Google ID Token...")
        idinfo = id_token.verify_oauth2_token(
            request.id_token, 
            google_requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        logger.info(f"✅ Google ID Token 验证成功")
        
        # 提取用户信息
        email = idinfo.get("email")
        sub = idinfo.get("sub")
        name = idinfo.get("name")
        picture = idinfo.get("picture")
        
        logger.info(f"📋 提取用户信息: email={email}, sub={sub}, name={name}")
        
        if not email or not sub:
            logger.error(f"❌ Token payload 缺少必要字段: email={email}, sub={sub}")
            raise HTTPException(status_code=400, detail="Invalid token payload")
        
        # 查找或创建用户
        logger.info("👤 开始查找或创建用户...")
        user = await find_or_create_user_from_google(
            db=db,
            user_manager=user_manager,
            google_sub=sub,
            email=email,
            name=name,
            picture=picture,
        )
        
        # 生成后端 JWT
        logger.info(f"🔑 为用户 {user.email} 生成 JWT...")
        token = await strategy.write_token(user)
        logger.info(f"✅ JWT 生成成功")
        
        logger.info(f"🎉 登录成功: user_id={user.id}, email={user.email}")
        logger.info("=" * 70)
        
        return {"access_token": token, "token_type": "bearer"}
        
    except ValueError as e:
        logger.error(f"❌ Google Token 验证失败: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Invalid Google Token: {e}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 认证失败（未知错误）: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Authentication failed: {e}")

