import logging
from fastapi import APIRouter, Depends, HTTPException, status

from dependencies import verify_admin_mode
from models import ShopAddressDTO, ShopAddressRequest
from database import (
    get_shop_addresses,
    create_shop_address,
    update_shop_address,
    delete_shop_address
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/shop/addresses", tags=["shop-addresses"])


@router.get("", response_model=list[ShopAddressDTO])
async def get_shop_addresses_endpoint():
    """
    Get all shop addresses (public endpoint)

    No authentication required
    """
    logger.info("Fetching all shop addresses")

    try:
        # Get addresses from database
        addresses = await get_shop_addresses()

        # Convert to DTOs
        return [
            ShopAddressDTO(
                id=address["id"],
                address=address["address"]
            )
            for address in addresses
        ]
    except Exception as e:
        logger.error(f"Failed to fetch shop addresses: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch shop addresses"
        )


@router.post("", response_model=ShopAddressDTO)
async def create_shop_address_endpoint(
    address_request: ShopAddressRequest,
    user_id: int = Depends(verify_admin_mode)
):
    """
    Create a new shop address (ADMIN only)

    Requires valid Max WebApp initData in Authorization header
    User must be in ADMIN mode
    """
    logger.info(f"User {user_id} creating new shop address: {address_request.address}")

    try:
        # Create address in database
        created_address = await create_shop_address(address_request.address)

        # Return response
        return ShopAddressDTO(**created_address)
    except Exception as e:
        logger.error(f"Failed to create shop address: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create shop address"
        )


@router.put("/{address_id}", response_model=ShopAddressDTO)
async def update_shop_address_endpoint(
    address_id: int,
    address_request: ShopAddressRequest,
    user_id: int = Depends(verify_admin_mode)
):
    """
    Update existing shop address (ADMIN only)

    Requires valid Max WebApp initData in Authorization header
    User must be in ADMIN mode
    """
    logger.info(f"User {user_id} updating shop address {address_id}: {address_request.address}")

    try:
        # Update address in database
        updated_address = await update_shop_address(address_id, address_request.address)

        # Return response
        return ShopAddressDTO(**updated_address)
    except ValueError as e:
        logger.error(f"Shop address not found: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shop address with id {address_id} not found"
        )
    except Exception as e:
        logger.error(f"Failed to update shop address: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update shop address"
        )


@router.delete("/{address_id}")
async def delete_shop_address_endpoint(
    address_id: int,
    user_id: int = Depends(verify_admin_mode)
):
    """
    Delete shop address (ADMIN only)

    Requires valid Max WebApp initData in Authorization header
    User must be in ADMIN mode
    """
    logger.info(f"User {user_id} deleting shop address {address_id}")

    try:
        await delete_shop_address(address_id)
        return {"success": True, "message": f"Shop address {address_id} deleted"}
    except ValueError as e:
        logger.error(f"Shop address not found: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shop address with id {address_id} not found"
        )
    except Exception as e:
        logger.error(f"Failed to delete shop address: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete shop address"
        )
