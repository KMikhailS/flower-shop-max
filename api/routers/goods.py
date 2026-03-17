import logging
from pathlib import Path
from datetime import datetime
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File

from dependencies import verify_admin_mode
from auth import verify_init_data
from models import GoodCardRequest, GoodDTO, ImageDTO, ImageReorderRequest
from database import (
    create_good_card,
    get_goods_by_status,
    save_good_images,
    update_good_card,
    delete_good,
    update_good_status,
    get_all_goods,
    update_images_order,
    delete_good_image,
    get_category_by_title,
    create_category
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/goods", tags=["goods"])

# Upload configuration
UPLOAD_DIR = Path("/app/data/uploads")
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


@router.get("", response_model=list[GoodDTO])
async def get_goods():
    """
    Get all goods with status NEW (public endpoint)

    No authentication required
    """
    logger.info("Fetching all goods with status NEW")

    try:
        # Get goods from database
        goods = await get_goods_by_status('NEW')

        # Convert to DTOs
        return [
            GoodDTO(
                id=good["id"],
                name=good["name"],
                category=good["category"],
                price=good["price"],
                non_discount_price=good.get("non_discount_price"),
                description=good["description"],
                images=[ImageDTO(**img) for img in good["images"]],
                status=good["status"],
                sort_order=good["sort_order"] or good["id"]
            )
            for good in goods
        ]
    except Exception as e:
        logger.error(f"Failed to fetch goods: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch goods"
        )


@router.get("/all", response_model=list[GoodDTO])
async def get_all_goods_endpoint(user_id: int = Depends(verify_init_data)):
    """
    Get all goods regardless of status

    Requires valid Telegram WebApp initData in Authorization header
    Any authenticated user can access this endpoint (needed for order history)
    """
    logger.info(f"User {user_id} fetching all goods (all statuses)")

    try:
        # Get all goods from database
        goods = await get_all_goods()

        # Convert to DTOs
        return [
            GoodDTO(
                id=good["id"],
                name=good["name"],
                category=good["category"],
                price=good["price"],
                non_discount_price=good.get("non_discount_price"),
                description=good["description"],
                images=[ImageDTO(**img) for img in good["images"]],
                status=good["status"],
                sort_order=good["sort_order"] or good["id"]
            )
            for good in goods
        ]
    except Exception as e:
        logger.error(f"Failed to fetch all goods: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch all goods"
        )


@router.post("/card", response_model=GoodDTO)
async def create_good_card_endpoint(
    good_card: GoodCardRequest,
    user_id: int = Depends(verify_admin_mode)
):
    """
    Create a new good card (ADMIN only)

    Requires valid Telegram WebApp initData in Authorization header
    User must be in ADMIN mode
    """
    logger.info(f"User {user_id} creating new good card: {good_card.name}")

    try:
        # Check if category exists, create if it doesn't
        existing_category = await get_category_by_title(good_card.category)
        if not existing_category:
            logger.info(f"Category '{good_card.category}' not found, creating new category")
            category = await create_category(good_card.category)
        else:
            category = existing_category
        category_id = category["id"]

        # Create good card in database
        created_good = await create_good_card(
            name=good_card.name,
            category_id=category_id,
            price=good_card.price,
            description=good_card.description,
            non_discount_price=good_card.non_discount_price
        )

        # Return response
        return GoodDTO(
            id=created_good["id"],
            name=created_good["name"],
            category=created_good["category"],
            price=created_good["price"],
            non_discount_price=created_good.get("non_discount_price"),
            description=created_good["description"],
            images=[ImageDTO(**img) for img in created_good["images"]],
            status=created_good["status"],
            sort_order=created_good["sort_order"] or created_good["id"]
        )
    except Exception as e:
        logger.error(f"Failed to create good card: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create good card"
        )


@router.put("/{good_id}", response_model=GoodDTO)
async def update_good_card_endpoint(
    good_id: int,
    good_card: GoodCardRequest,
    user_id: int = Depends(verify_admin_mode)
):
    """
    Update existing good card (ADMIN only)

    Requires valid Telegram WebApp initData in Authorization header
    User must be in ADMIN mode
    """
    logger.info(f"User {user_id} updating good card {good_id}: {good_card.name}")

    try:
        # Check if category exists, create if it doesn't
        existing_category = await get_category_by_title(good_card.category)
        if not existing_category:
            logger.info(f"Category '{good_card.category}' not found, creating new category")
            category = await create_category(good_card.category)
        else:
            category = existing_category
        category_id = category["id"]

        # Update good card in database
        updated_good = await update_good_card(
            good_id=good_id,
            name=good_card.name,
            category_id=category_id,
            price=good_card.price,
            description=good_card.description,
            non_discount_price=good_card.non_discount_price,
            sort_order=good_card.sort_order
        )

        # Return response
        return GoodDTO(
            id=updated_good["id"],
            name=updated_good["name"],
            category=updated_good["category"],
            price=updated_good["price"],
            non_discount_price=updated_good.get("non_discount_price"),
            description=updated_good["description"],
            images=[ImageDTO(**img) for img in updated_good["images"]],
            status=updated_good["status"],
            sort_order=updated_good["sort_order"] or updated_good["id"]
        )
    except ValueError as e:
        logger.error(f"Good not found: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Good with id {good_id} not found"
        )
    except Exception as e:
        logger.error(f"Failed to update good card: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update good card"
        )


@router.post("/{good_id}/images")
async def add_good_images(
    good_id: int,
    images: list[UploadFile] = File(...),
    user_id: int = Depends(verify_admin_mode)
):
    """
    Add images to existing good (ADMIN only)

    Uploads images and associates them with the specified good
    Returns list of uploaded image URLs
    """
    logger.info(f"User {user_id} adding {len(images)} images to good {good_id}")

    uploaded_urls = []

    # Upload all images first
    for image in images:
        # Validate file extension
        file_ext = Path(image.filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only images are allowed ({', '.join(ALLOWED_EXTENSIONS)})"
            )

        # Validate content type
        if not image.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only image files are allowed"
            )

        # Read file content
        contents = await image.read()

        # Validate file size
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File {image.filename} size exceeds 5MB limit"
            )

        # Generate unique filename
        timestamp = int(datetime.now().timestamp())
        unique_id = uuid.uuid4().hex[:8]
        filename = f"{timestamp}-{unique_id}{file_ext}"
        file_path = UPLOAD_DIR / filename

        # Save file
        try:
            with open(file_path, "wb") as f:
                f.write(contents)
            logger.info(f"Image saved: {filename}")
        except Exception as e:
            logger.error(f"Failed to save image: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save image {image.filename}"
            )

        # Add URL to list
        image_url = f"/api/static/{filename}"
        uploaded_urls.append(image_url)

    # Save image URLs to database
    try:
        await save_good_images(good_id, uploaded_urls)
    except Exception as e:
        logger.error(f"Failed to save image URLs to database: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to associate images with good"
        )

    return {
        "success": True,
        "goodId": good_id,
        "imageUrls": uploaded_urls
    }


@router.delete("/{good_id}")
async def delete_good_endpoint(
    good_id: int,
    user_id: int = Depends(verify_admin_mode)
):
    """
    Delete good (ADMIN only)

    Requires valid Telegram WebApp initData in Authorization header
    User must be in ADMIN mode
    """
    logger.info(f"User {user_id} deleting good {good_id}")

    try:
        await delete_good(good_id)
        return {"success": True, "message": f"Good {good_id} deleted"}
    except ValueError as e:
        logger.error(f"Good not found: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Good with id {good_id} not found"
        )
    except Exception as e:
        logger.error(f"Failed to delete good: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete good"
        )


@router.put("/{good_id}/block", response_model=GoodDTO)
async def block_good_endpoint(
    good_id: int,
    user_id: int = Depends(verify_admin_mode)
):
    """
    Block good - set status to BLOCKED (ADMIN only)

    Requires valid Telegram WebApp initData in Authorization header
    User must be in ADMIN mode
    """
    logger.info(f"User {user_id} blocking good {good_id}")

    try:
        updated_good = await update_good_status(good_id, 'BLOCKED')
        return GoodDTO(
            id=updated_good["id"],
            name=updated_good["name"],
            category=updated_good["category"],
            price=updated_good["price"],
            non_discount_price=updated_good.get("non_discount_price"),
            description=updated_good["description"],
            images=[ImageDTO(**img) for img in updated_good["images"]],
            status=updated_good["status"],
            sort_order=updated_good["sort_order"] or updated_good["id"]
        )
    except ValueError as e:
        logger.error(f"Good not found: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Good with id {good_id} not found"
        )
    except Exception as e:
        logger.error(f"Failed to block good: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to block good"
        )


@router.put("/{good_id}/activate", response_model=GoodDTO)
async def activate_good_endpoint(
    good_id: int,
    user_id: int = Depends(verify_admin_mode)
):
    """
    Activate good - set status to NEW (ADMIN only)

    Requires valid Telegram WebApp initData in Authorization header
    User must be in ADMIN mode
    """
    logger.info(f"User {user_id} activating good {good_id}")

    try:
        updated_good = await update_good_status(good_id, 'NEW')
        return GoodDTO(
            id=updated_good["id"],
            name=updated_good["name"],
            category=updated_good["category"],
            price=updated_good["price"],
            non_discount_price=updated_good.get("non_discount_price"),
            description=updated_good["description"],
            images=[ImageDTO(**img) for img in updated_good["images"]],
            status=updated_good["status"],
            sort_order=updated_good["sort_order"] or updated_good["id"]
        )
    except ValueError as e:
        logger.error(f"Good not found: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Good with id {good_id} not found"
        )
    except Exception as e:
        logger.error(f"Failed to activate good: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to activate good"
        )


@router.put("/{good_id}/images/reorder", response_model=GoodDTO)
async def reorder_good_images_endpoint(
    good_id: int,
    request: ImageReorderRequest,
    user_id: int = Depends(verify_admin_mode)
):
    """
    Reorder images for a good (ADMIN only)

    Requires valid Telegram WebApp initData in Authorization header
    User must be in ADMIN mode
    """
    logger.info(f"User {user_id} reordering images for good {good_id}")

    try:
        updated_good = await update_images_order(good_id, request.imageUrls)
        return GoodDTO(
            id=updated_good["id"],
            name=updated_good["name"],
            category=updated_good["category"],
            price=updated_good["price"],
            non_discount_price=updated_good.get("non_discount_price"),
            description=updated_good["description"],
            images=[ImageDTO(**img) for img in updated_good["images"]],
            status=updated_good["status"],
            sort_order=updated_good["sort_order"] or updated_good["id"]
        )
    except ValueError as e:
        logger.error(f"Good not found: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Good with id {good_id} not found"
        )
    except Exception as e:
        logger.error(f"Failed to reorder images: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reorder images"
        )


@router.delete("/{good_id}/images")
async def delete_good_image_endpoint(
    good_id: int,
    image_url: str,
    user_id: int = Depends(verify_admin_mode)
):
    """
    Delete a specific image from a good (ADMIN only)

    Requires valid Telegram WebApp initData in Authorization header
    User must be in ADMIN mode
    """
    logger.info(f"User {user_id} deleting image {image_url} from good {good_id}")

    try:
        await delete_good_image(good_id, image_url)
        return {"success": True, "message": f"Image deleted from good {good_id}"}
    except ValueError as e:
        logger.error(f"Image not found: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to delete image: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete image"
        )
