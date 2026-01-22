import logging
from fastapi import APIRouter, Depends, HTTPException, status

from auth import verify_telegram_init_data, verify_admin_mode
from models import UserInfoDTO, UserModeUpdateRequest, PhoneUpdateRequest, UserUpdateRequest, SettingDTO, SettingRequest, SupportChatDTO, PaymentInfoTextDTO, DeliveryInfoTextDTO, DeliveryAmountDTO
from database import get_user, get_user_by_username, update_user_mode, update_user_role_and_mode, add_or_update_user, get_all_settings, upsert_setting, delete_setting, get_setting_by_type

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserInfoDTO)
async def get_current_user(user_id: int = Depends(verify_telegram_init_data)):
    """
    Get current user information

    Requires valid Telegram WebApp initData in Authorization header
    """
    logger.info(f"Fetching user info for user_id={user_id}")

    # Get user from database
    user = await get_user(user_id)

    if not user:
        logger.warning(f"User {user_id} not found in database")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Return user info as DTO
    return UserInfoDTO(
        id=user["id"],
        role=user["role"],
        mode=user["mode"],
        status=user["status"],
        username=user.get("username"),
        phone=user.get("phone")
    )


@router.get("/support-chat-id", response_model=SupportChatDTO)
async def get_support_chat_id(user_id: int = Depends(verify_telegram_init_data)):
    """
    Get support chat id for feedback

    Requires valid Telegram WebApp initData in Authorization header
    """
    logger.info(f"Fetching support chat id for user_id={user_id}")

    setting = await get_setting_by_type("SUPPORT_CHAT_ID")
    if not setting or not setting.get("value"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Support chat ID not configured"
        )

    return SupportChatDTO(value=setting["value"])


@router.get("/payment-info-text", response_model=PaymentInfoTextDTO)
async def get_payment_info_text(user_id: int = Depends(verify_telegram_init_data)):
    """
    Get payment info text for PaymentInfo screen

    Requires valid Telegram WebApp initData in Authorization header
    """
    logger.info(f"Fetching payment info text for user_id={user_id}")

    setting = await get_setting_by_type("PAYMENT_INFO_TEXT")
    value = ""
    if setting and setting.get("value"):
        value = setting["value"]

    return PaymentInfoTextDTO(value=value)


@router.get("/delivery-info-text", response_model=DeliveryInfoTextDTO)
async def get_delivery_info_text(user_id: int = Depends(verify_telegram_init_data)):
    """
    Get delivery info text for DeliveryInfo screen

    Requires valid Telegram WebApp initData in Authorization header
    """
    logger.info(f"Fetching delivery info text for user_id={user_id}")

    setting = await get_setting_by_type("DELIVERY_INFO_TEXT")
    value = ""
    if setting and setting.get("value"):
        value = setting["value"]

    return DeliveryInfoTextDTO(value=value)


@router.get("/delivery-amount", response_model=DeliveryAmountDTO)
async def get_delivery_amount(user_id: int = Depends(verify_telegram_init_data)):
    """
    Get delivery amount for cart calculations

    Requires valid Telegram WebApp initData in Authorization header
    """
    logger.info(f"Fetching delivery amount for user_id={user_id}")

    setting = await get_setting_by_type("DELIVERY_AMOUNT")
    value = "0"
    if setting and setting.get("value"):
        value = setting["value"]

    return DeliveryAmountDTO(value=value)


@router.get("/by-username/{username}", response_model=UserInfoDTO)
async def get_user_by_name(
    username: str,
    user_id: int = Depends(verify_admin_mode)
):
    """
    Get user information by username (ADMIN only)

    Requires valid Telegram WebApp initData in Authorization header and ADMIN mode
    """
    logger.info(f"Fetching user info for username={username} by admin user_id={user_id}")

    # Get user from database by username
    user = await get_user_by_username(username)

    if not user:
        logger.warning(f"User with username={username} not found in database")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Return user info as DTO
    return UserInfoDTO(
        id=user["id"],
        role=user["role"],
        mode=user["mode"],
        status=user["status"],
        username=user.get("username"),
        phone=user.get("phone")
    )


@router.put("/{user_id}", response_model=UserInfoDTO)
async def update_user(
    user_id: int,
    request: UserUpdateRequest,
    admin_user_id: int = Depends(verify_admin_mode)
):
    """
    Update user role and mode (ADMIN only)

    Requires valid Telegram WebApp initData in Authorization header and ADMIN mode
    """
    logger.info(f"Updating user {user_id} by admin user_id={admin_user_id}: role={request.role}, mode={request.mode}")

    # Validate role and mode values
    if request.role not in ['ADMIN', 'USER']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be either 'ADMIN' or 'USER'"
        )

    if request.mode not in ['ADMIN', 'USER']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mode must be either 'ADMIN' or 'USER'"
        )

    # Check if user exists
    user = await get_user(user_id)
    if not user:
        logger.warning(f"User {user_id} not found in database")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Update user role and mode
    await update_user_role_and_mode(user_id, request.role, request.mode)

    # Get updated user info
    user = await get_user(user_id)

    # Return updated user info
    return UserInfoDTO(
        id=user["id"],
        role=user["role"],
        mode=user["mode"],
        status=user["status"],
        username=user.get("username"),
        phone=user.get("phone")
    )


@router.put("/me/mode", response_model=UserInfoDTO)
async def update_current_user_mode(
    request: UserModeUpdateRequest,
    user_id: int = Depends(verify_admin_mode)
):
    """
    Update current user mode (ADMIN only)

    Requires valid Telegram WebApp initData in Authorization header and ADMIN mode
    """
    logger.info(f"Updating mode for user_id={user_id} to {request.mode}")

    # Validate mode value
    if request.mode not in ['ADMIN', 'USER']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mode must be either 'ADMIN' or 'USER'"
        )

    # Update user mode
    await update_user_mode(user_id, request.mode)

    # Get updated user info
    user = await get_user(user_id)

    if not user:
        logger.error(f"User {user_id} not found after mode update")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Return updated user info
    return UserInfoDTO(
        id=user["id"],
        role=user["role"],
        mode=user["mode"],
        status=user["status"],
        username=user.get("username"),
        phone=user.get("phone")
    )


@router.put("/me/phone", response_model=UserInfoDTO)
async def update_current_user_phone(
    request: PhoneUpdateRequest,
    user_id: int = Depends(verify_telegram_init_data)
):
    """
    Update current user phone number

    Requires valid Telegram WebApp initData in Authorization header
    Any authenticated user can update their own phone
    """
    logger.info(f"Updating phone for user_id={user_id}")

    # Update user phone
    await add_or_update_user(user_id, phone=request.phone)

    # Get updated user info
    user = await get_user(user_id)

    if not user:
        logger.error(f"User {user_id} not found after phone update")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Return updated user info
    return UserInfoDTO(
        id=user["id"],
        role=user["role"],
        mode=user["mode"],
        status=user["status"],
        username=user.get("username"),
        phone=user.get("phone")
    )


@router.get("/settings", response_model=list[SettingDTO])
async def get_settings(user_id: int = Depends(verify_admin_mode)):
    """
    Get all active settings (ADMIN only)

    Requires valid Telegram WebApp initData in Authorization header and ADMIN mode
    """
    logger.info(f"Fetching all settings for user_id={user_id}")

    # Get all active settings
    settings = await get_all_settings()

    # Convert to DTOs
    return [
        SettingDTO(
            id=setting["id"],
            type=setting["type"],
            value=setting["value"],
            createstamp=setting["createstamp"],
            changestamp=setting["changestamp"],
            createuser=setting["createuser"],
            changeuser=setting["changeuser"],
            status=setting["status"]
        )
        for setting in settings
    ]


@router.post("/settings", response_model=SettingDTO)
async def create_or_update_setting(
    request: SettingRequest,
    user_id: int = Depends(verify_admin_mode)
):
    """
    Create or update a setting (upsert) (ADMIN only)

    Requires valid Telegram WebApp initData in Authorization header and ADMIN mode
    """
    logger.info(f"Upserting setting type={request.type} for user_id={user_id}")

    # Upsert setting
    setting = await upsert_setting(request.type, request.value, user_id)

    # Return setting as DTO
    return SettingDTO(
        id=setting["id"],
        type=setting["type"],
        value=setting["value"],
        createstamp=setting["createstamp"],
        changestamp=setting["changestamp"],
        createuser=setting["createuser"],
        changeuser=setting["changeuser"],
        status=setting["status"]
    )


@router.delete("/settings/{setting_type}")
async def delete_setting_by_type(
    setting_type: str,
    user_id: int = Depends(verify_admin_mode)
):
    """
    Delete a setting by type (ADMIN only)

    Requires valid Telegram WebApp initData in Authorization header and ADMIN mode
    """
    logger.info(f"Deleting setting type={setting_type} by user_id={user_id}")

    try:
        await delete_setting(setting_type)
        return {"message": f"Setting {setting_type} deleted successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
