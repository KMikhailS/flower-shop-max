import os
import hmac
import hashlib
import json
import time
import logging
from urllib.parse import parse_qs, unquote
from fastapi import Header, HTTPException, status, Depends
from database import get_user

logger = logging.getLogger(__name__)


def _verify_max_init_data(init_data_str: str, bot_token: str) -> dict:
    """
    Validate MAX mini app initData using HMAC-SHA256.

    Args:
        init_data_str: URL-encoded initData string from Authorization header
        bot_token: Bot token from MAX platform

    Returns:
        dict: Parsed user data {id, first_name, last_name, username, ...}

    Raises:
        ValueError: If signature validation fails
    """
    # Parse URL-encoded string into key-value pairs
    parsed = parse_qs(init_data_str, keep_blank_values=True)

    # Extract hash
    received_hash = parsed.pop("hash", [None])[0]
    if not received_hash:
        raise ValueError("Missing hash in initData")

    # Build data check string: sort pairs alphabetically, join with \n
    data_pairs = []
    for key in sorted(parsed.keys()):
        value = parsed[key][0]
        data_pairs.append(f"{key}={value}")
    data_check_string = "\n".join(data_pairs)

    # Create secret key: HMAC-SHA256("WebAppData", bot_token)
    secret_key = hmac.new(
        key=b"WebAppData",
        msg=bot_token.encode("utf-8"),
        digestmod=hashlib.sha256
    ).digest()

    # Compute hash: HMAC-SHA256(secret_key, data_check_string)
    computed_hash = hmac.new(
        key=secret_key,
        msg=data_check_string.encode("utf-8"),
        digestmod=hashlib.sha256
    ).hexdigest()

    # Timing-safe comparison
    if not hmac.compare_digest(computed_hash, received_hash):
        raise ValueError("Invalid initData signature")

    # Check auth_date expiry (reject if older than 3600 seconds)
    auth_date_raw = parsed.get("auth_date", [None])[0]
    if not auth_date_raw:
        raise ValueError("Missing auth_date in initData")

    try:
        auth_date = int(auth_date_raw)
    except (ValueError, TypeError):
        raise ValueError("Invalid auth_date format")

    if abs(int(time.time()) - auth_date) > 3600:
        raise ValueError("initData expired")

    # Parse user JSON from initData
    user_raw = parsed.get("user", [None])[0]
    if not user_raw:
        raise ValueError("No user data in initData")

    user = json.loads(unquote(user_raw))
    return user


def _extract_display_name(user: dict) -> str | None:
    """Extract display name from MAX user object.

    Tries first_name + last_name, falls back to username.
    """
    parts = []
    if user.get("first_name"):
        parts.append(user["first_name"])
    if user.get("last_name"):
        parts.append(user["last_name"])
    if parts:
        return " ".join(parts)
    return user.get("username") or None


async def verify_init_data(authorization: str = Header(...)) -> int:
    """
    Verify MAX WebApp initData and extract user_id.

    Args:
        authorization: Authorization header in format "tma <initData>"

    Returns:
        int: User ID

    Raises:
        HTTPException: If authorization is invalid
    """
    if not authorization or not authorization.startswith("tma "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized"
        )

    init_data_str = authorization.replace("tma ", "", 1)

    if not init_data_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized"
        )

    bot_token = os.getenv("BOT_TOKEN")
    if not bot_token:
        logger.error("BOT_TOKEN not found in environment")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server configuration error"
        )

    try:
        user = _verify_max_init_data(init_data_str, bot_token)
        user_id = user["id"]
        logger.info(f"Successfully authenticated user {user_id}")
        return user_id
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized"
        )


async def verify_init_data_with_name(authorization: str = Header(...)) -> dict:
    """
    Verify MAX WebApp initData and extract user_id + display name.

    Returns:
        dict: {"user_id": int, "display_name": str | None}
    """
    if not authorization or not authorization.startswith("tma "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized"
        )

    init_data_str = authorization.replace("tma ", "", 1)

    if not init_data_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized"
        )

    bot_token = os.getenv("BOT_TOKEN")
    if not bot_token:
        logger.error("BOT_TOKEN not found in environment")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server configuration error"
        )

    try:
        user = _verify_max_init_data(init_data_str, bot_token)
        user_id = user["id"]
        display_name = _extract_display_name(user)
        logger.info(f"Successfully authenticated user {user_id}, display_name={display_name}")
        return {"user_id": user_id, "display_name": display_name}
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized"
        )


async def verify_admin_mode(user_id: int = Depends(verify_init_data)) -> int:
    """
    Verify that user has ADMIN role

    Args:
        user_id: User ID from verify_init_data dependency

    Returns:
        int: User ID

    Raises:
        HTTPException: If user doesn't have ADMIN role
    """
    user = await get_user(user_id)

    if not user:
        logger.warning(f"User {user_id} not found in database")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user.get("role") != "ADMIN":
        logger.warning(f"User {user_id} attempted to access ADMIN endpoint with role={user.get('role')}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required"
        )

    logger.info(f"User {user_id} authenticated with ADMIN role")
    return user_id
