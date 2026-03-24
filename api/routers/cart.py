import logging
from fastapi import APIRouter, Depends, HTTPException, status

from auth import verify_init_data
from models import CartRequest, CartResponse, CartResponseItem
from database import get_user_cart, upsert_user_cart, clear_user_cart, get_good_by_id, get_user_cart_state, upsert_user_cart_state

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/cart", tags=["cart"])


@router.get("", response_model=CartResponse)
async def get_cart(user_id: int = Depends(verify_init_data)):
    """Get current user's cart with product details and state"""
    items = await get_user_cart(user_id)
    state = await get_user_cart_state(user_id)
    return CartResponse(
        items=[CartResponseItem(**item) for item in items],
        delivery_method=state["delivery_method"] if state else None,
        selected_address=state["selected_address"] if state else None,
    )


@router.put("", response_model=CartResponse)
async def update_cart(cart: CartRequest, user_id: int = Depends(verify_init_data)):
    """Replace entire cart contents"""
    for item in cart.items:
        if item.count < 1 or item.count > 99:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Count must be between 1 and 99, got {item.count} for good_id={item.good_id}"
            )
        good = await get_good_by_id(item.good_id)
        if not good or good.get("status") != "NEW":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Good with id={item.good_id} not found or not available"
            )

    items_dict = [{"good_id": item.good_id, "count": item.count} for item in cart.items]
    await upsert_user_cart(user_id, items_dict)

    if cart.delivery_method is not None or cart.selected_address is not None:
        await upsert_user_cart_state(user_id, cart.delivery_method, cart.selected_address)

    updated = await get_user_cart(user_id)
    state = await get_user_cart_state(user_id)
    return CartResponse(
        items=[CartResponseItem(**item) for item in updated],
        delivery_method=state["delivery_method"] if state else None,
        selected_address=state["selected_address"] if state else None,
    )


@router.delete("")
async def delete_cart(user_id: int = Depends(verify_init_data)):
    """Clear all items from user's cart"""
    await clear_user_cart(user_id)
    return {"ok": True}
