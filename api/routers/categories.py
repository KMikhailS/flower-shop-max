import logging
from fastapi import APIRouter, Depends, HTTPException, status

from dependencies import verify_admin_mode
from models import CategoryDTO, CategoryRequest
from database import (
    get_categories_by_status,
    get_all_categories,
    get_category_by_id,
    create_category,
    update_category,
    delete_category,
    update_category_status
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryDTO])
async def get_categories_endpoint():
    """
    Get all categories with status NEW (public endpoint)

    No authentication required
    """
    logger.info("Fetching all categories with status NEW")

    try:
        # Get categories from database
        categories = await get_categories_by_status('NEW')

        # Convert to DTOs
        return [
            CategoryDTO(
                id=category["id"],
                title=category["title"],
                status=category["status"]
            )
            for category in categories
        ]
    except Exception as e:
        logger.error(f"Failed to fetch categories: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch categories"
        )


@router.get("/all", response_model=list[CategoryDTO])
async def get_all_categories_endpoint(
    user_id: int = Depends(verify_admin_mode)
):
    """
    Get all categories regardless of status (ADMIN only)

    Requires valid Max WebApp initData in Authorization header
    User must be in ADMIN mode
    """
    logger.info(f"User {user_id} fetching all categories")

    try:
        # Get all categories from database
        categories = await get_all_categories()

        # Convert to DTOs
        return [
            CategoryDTO(
                id=category["id"],
                title=category["title"],
                status=category["status"]
            )
            for category in categories
        ]
    except Exception as e:
        logger.error(f"Failed to fetch all categories: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch all categories"
        )


@router.get("/{category_id}", response_model=CategoryDTO)
async def get_category_endpoint(
    category_id: int,
    user_id: int = Depends(verify_admin_mode)
):
    """
    Get category by id (ADMIN only)

    Requires valid Max WebApp initData in Authorization header
    User must be in ADMIN mode
    """
    logger.info(f"User {user_id} fetching category {category_id}")

    try:
        category = await get_category_by_id(category_id)

        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Category with id {category_id} not found"
            )

        return CategoryDTO(**category)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch category: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch category"
        )


@router.post("", response_model=CategoryDTO)
async def create_category_endpoint(
    category_request: CategoryRequest,
    user_id: int = Depends(verify_admin_mode)
):
    """
    Create a new category (ADMIN only)

    Requires valid Max WebApp initData in Authorization header
    User must be in ADMIN mode
    """
    logger.info(f"User {user_id} creating new category: {category_request.title}")

    try:
        # Create category in database
        created_category = await create_category(category_request.title)

        # Return response
        return CategoryDTO(**created_category)
    except Exception as e:
        logger.error(f"Failed to create category: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create category"
        )


@router.put("/{category_id}", response_model=CategoryDTO)
async def update_category_endpoint(
    category_id: int,
    category_request: CategoryRequest,
    user_id: int = Depends(verify_admin_mode)
):
    """
    Update existing category (ADMIN only)

    Requires valid Max WebApp initData in Authorization header
    User must be in ADMIN mode
    """
    logger.info(f"User {user_id} updating category {category_id}: {category_request.title}")

    try:
        # Update category in database
        updated_category = await update_category(category_id, category_request.title)

        # Return response
        return CategoryDTO(**updated_category)
    except ValueError as e:
        logger.error(f"Category not found: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with id {category_id} not found"
        )
    except Exception as e:
        logger.error(f"Failed to update category: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update category"
        )


@router.delete("/{category_id}")
async def delete_category_endpoint(
    category_id: int,
    user_id: int = Depends(verify_admin_mode)
):
    """
    Delete category (ADMIN only)

    Requires valid Max WebApp initData in Authorization header
    User must be in ADMIN mode
    """
    logger.info(f"User {user_id} deleting category {category_id}")

    try:
        await delete_category(category_id)
        return {"success": True, "message": f"Category {category_id} deleted"}
    except ValueError as e:
        logger.error(f"Category not found: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with id {category_id} not found"
        )
    except Exception as e:
        logger.error(f"Failed to delete category: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete category"
        )


@router.put("/{category_id}/status", response_model=CategoryDTO)
async def update_category_status_endpoint(
    category_id: int,
    new_status: str,
    user_id: int = Depends(verify_admin_mode)
):
    """
    Update category status (ADMIN only)

    Requires valid Max WebApp initData in Authorization header
    User must be in ADMIN mode
    """
    logger.info(f"User {user_id} updating status for category {category_id} to {new_status}")

    try:
        # Update category status in database
        updated_category = await update_category_status(category_id, new_status)

        # Return response
        return CategoryDTO(**updated_category)
    except ValueError as e:
        logger.error(f"Category not found: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with id {category_id} not found"
        )
    except Exception as e:
        logger.error(f"Failed to update category status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update category status"
        )
