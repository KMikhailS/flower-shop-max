from fastapi import Depends, HTTPException, status

from auth import verify_init_data
from database import get_user


async def verify_admin_mode(user_id: int = Depends(verify_init_data)) -> int:
    """
    Verify that the user has ADMIN role

    Requires valid Telegram WebApp initData in Authorization header
    Returns user_id if user has ADMIN role, raises 403 otherwise
    """
    user = await get_user(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user.get("role") != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required"
        )

    return user_id
