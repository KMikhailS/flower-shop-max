from pydantic import BaseModel
from typing import Optional


class UserInfoDTO(BaseModel):
    """User information data transfer object"""
    id: int
    role: str
    mode: str
    status: str
    username: Optional[str] = None
    phone: Optional[str] = None


class GoodCardRequest(BaseModel):
    """Request model for creating a new good card"""
    name: str
    category: str
    price: int
    non_discount_price: Optional[int] = None
    description: str
    sort_order: Optional[int] = None


class ImageDTO(BaseModel):
    """Data transfer object for product images"""
    image_url: str
    display_order: int


class GoodDTO(BaseModel):
    """Data transfer object for public goods listing"""
    id: int
    name: str
    category: str
    price: int
    non_discount_price: Optional[int] = None
    description: str
    images: list[ImageDTO] = []
    status: str
    sort_order: int


class ShopAddressDTO(BaseModel):
    """Data transfer object for shop addresses"""
    id: int
    address: str


class ShopAddressRequest(BaseModel):
    """Request model for creating or updating a shop address"""
    address: str


class ImageReorderRequest(BaseModel):
    """Request model for reordering product images"""
    imageUrls: list[str]


class PromoBannerDTO(BaseModel):
    """Data transfer object for promo banners"""
    id: int
    status: str
    display_order: int
    image_url: str
    link: Optional[int] = None


class CategoryDTO(BaseModel):
    """Data transfer object for categories"""
    id: int
    title: str
    status: str


class CategoryRequest(BaseModel):
    """Request model for creating or updating a category"""
    title: str


class UserModeUpdateRequest(BaseModel):
    """Request model for updating user mode"""
    mode: str


class PhoneUpdateRequest(BaseModel):
    """Request model for updating user phone"""
    phone: str


class UserUpdateRequest(BaseModel):
    """Request model for updating user role and mode"""
    role: str
    mode: str


class SettingDTO(BaseModel):
    """Data transfer object for a single setting"""
    id: int
    type: str
    value: Optional[str] = None
    createstamp: str
    changestamp: str
    createuser: Optional[int] = None
    changeuser: Optional[int] = None
    status: str


class SettingRequest(BaseModel):
    """Request model for creating/updating a setting"""
    type: str
    value: str


class SupportChatDTO(BaseModel):
    """Data transfer object for support chat id"""
    value: str


class CartItemRequest(BaseModel):
    """Request model for cart items in order creation/update"""
    good_id: int
    count: int


class CartItemDTO(BaseModel):
    """Data transfer object for cart items with good details"""
    id: int
    good_id: int
    good_name: str
    count: int
    price: int


class OrderRequest(BaseModel):
    """Request model for creating or updating an order"""
    status: str
    user_id: int
    delivery_type: str
    delivery_address: str
    cart_items: list[CartItemRequest]


class OrderDTO(BaseModel):
    """Data transfer object for orders"""
    id: int
    status: str
    user_id: int
    user_phone: Optional[str] = None
    createstamp: str
    changestamp: str
    createuser: Optional[int] = None
    changeuser: Optional[int] = None
    delivery_type: str
    delivery_address: str
    cart_items: list[CartItemDTO]


class OrdersPageDTO(BaseModel):
    """Paginated response for orders list"""
    items: list[OrderDTO]
    total: int


class AddressSuggestionDTO(BaseModel):
    """Data transfer object for address suggestion from DaData"""
    value: str  # Full formatted address
    geo_lat: Optional[str] = None  # Latitude
    geo_lon: Optional[str] = None  # Longitude
