// User information from backend
export interface UserInfo {
  id: number;
  role: string;
  mode: string;
  status: string;
  username?: string;
  phone?: string;
}

// Shop address from backend
export interface ShopAddress {
  id: number;
  address: string;
}

// Good card data for creating new products
export interface GoodCardData {
  name: string;
  category: string;
  price: number;
  non_discount_price?: number;
  description: string;
  sort_order?: number;
}

// Image DTO for product images
export interface ImageDTO {
  image_url: string;
  display_order: number;
}

// Good DTO for public goods listing
export interface GoodDTO {
  id: number;
  name: string;
  category: string;
  price: number;
  non_discount_price?: number;
  description: string;
  images: ImageDTO[];
  status: string;
  sort_order: number;
}

// Promo banner from backend
export interface PromoBannerDTO {
  id: number;
  status: string;
  display_order: number;
  image_url: string;
  link?: number | null;
}

// Category from backend
export interface CategoryDTO {
  id: number;
  title: string;
  status: string;
}

// Category request for creating/updating
export interface CategoryRequest {
  title: string;
}

// Setting from backend
export interface Setting {
  id: number;
  type: string;
  value: string | null;
  createstamp: string;
  changestamp: string;
  createuser: number | null;
  changeuser: number | null;
  status: string;
}

// Setting request for creating/updating
export interface SettingRequest {
  type: string;
  value: string;
}

// API base URL - uses relative path to work with nginx proxy
// In development with Vite proxy or production with nginx, both route /api to backend
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Fetch current user information from backend
 *
 * @param initData - Telegram WebApp initData string
 * @returns Promise<UserInfo> - User information
 * @throws Error if request fails
 */
export async function fetchUserInfo(initData: string): Promise<UserInfo> {
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    method: 'GET',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch user info: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as UserInfo;
}

/**
 * Create a new good card (ADMIN only)
 *
 * @param goodCardData - The good card data to create
 * @param initData - Telegram WebApp initData string
 * @returns Promise<GoodDTO> - Created good card data
 * @throws Error if request fails
 */
export async function createGoodCard(
  goodCardData: GoodCardData,
  initData: string
): Promise<GoodDTO> {
  const response = await fetch(`${API_BASE_URL}/goods/card`, {
    method: 'POST',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(goodCardData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create good card: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as GoodDTO;
}

/**
 * Update an existing good card (ADMIN only)
 *
 * @param goodId - ID of the good to update
 * @param goodCardData - The updated good card data
 * @param initData - Telegram WebApp initData string
 * @returns Promise<GoodDTO> - Updated good card data
 * @throws Error if request fails
 */
export async function updateGoodCard(
  goodId: number,
  goodCardData: GoodCardData,
  initData: string
): Promise<GoodDTO> {
  const response = await fetch(`${API_BASE_URL}/goods/${goodId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(goodCardData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update good card: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as GoodDTO;
}

/**
 * Upload product images
 *
 * @param files - Array of image files to upload (jpg, jpeg, png, webp, max 5MB each)
 * @returns Promise<string[]> - Array of image URLs (/api/static/xxx.jpg)
 * @throws Error if upload fails
 */
export async function uploadImages(files: File[]): Promise<string[]> {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('images', file);
  });

  const response = await fetch(`${API_BASE_URL}/shop/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload images: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.imageUrls;
}

/**
 * Add images to an existing good (ADMIN only)
 *
 * @param goodId - ID of the good to add images to
 * @param files - Array of image files to upload
 * @param initData - Telegram WebApp initData string
 * @returns Promise<string[]> - Array of uploaded image URLs
 * @throws Error if upload fails
 */
export async function addGoodImages(
  goodId: number,
  files: File[],
  initData: string
): Promise<string[]> {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('images', file);
  });

  const response = await fetch(`${API_BASE_URL}/goods/${goodId}/images`, {
    method: 'POST',
    headers: {
      'Authorization': `tma ${initData}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to add images to good: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.imageUrls;
}

/**
 * Fetch all goods with status NEW (public endpoint)
 *
 * @returns Promise<GoodDTO[]> - List of goods
 * @throws Error if request fails
 */
export async function fetchGoods(): Promise<GoodDTO[]> {
  const response = await fetch(`${API_BASE_URL}/goods`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch goods: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as GoodDTO[];
}

/**
 * Fetch all goods regardless of status (ADMIN only)
 *
 * @param initData - Telegram WebApp initData string
 * @returns Promise<GoodDTO[]> - List of all goods
 * @throws Error if request fails
 */
export async function fetchAllGoods(initData: string): Promise<GoodDTO[]> {
  const response = await fetch(`${API_BASE_URL}/goods/all`, {
    method: 'GET',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch all goods: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as GoodDTO[];
}

/**
 * Delete good (ADMIN only)
 *
 * @param goodId - ID of the good to delete
 * @param initData - Telegram WebApp initData string
 * @returns Promise<void>
 * @throws Error if request fails
 */
export async function deleteGood(
  goodId: number,
  initData: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/goods/${goodId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete good: ${response.status} ${errorText}`);
  }
}

/**
 * Block good - set status to BLOCKED (ADMIN only)
 *
 * @param goodId - ID of the good to block
 * @param initData - Telegram WebApp initData string
 * @returns Promise<GoodDTO> - Updated good card data
 * @throws Error if request fails
 */
export async function blockGood(
  goodId: number,
  initData: string
): Promise<GoodDTO> {
  const response = await fetch(`${API_BASE_URL}/goods/${goodId}/block`, {
    method: 'PUT',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to block good: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as GoodDTO;
}

/**
 * Activate good - set status to NEW (ADMIN only)
 *
 * @param goodId - ID of the good to activate
 * @param initData - Telegram WebApp initData string
 * @returns Promise<GoodDTO> - Updated good card data
 * @throws Error if request fails
 */
export async function activateGood(
  goodId: number,
  initData: string
): Promise<GoodDTO> {
  const response = await fetch(`${API_BASE_URL}/goods/${goodId}/activate`, {
    method: 'PUT',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to activate good: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as GoodDTO;
}

/**
 * Fetch all promo banners with status NEW (public endpoint)
 *
 * @returns Promise<PromoBannerDTO[]> - List of promo banners
 * @throws Error if request fails
 */
export async function fetchPromoBanners(): Promise<PromoBannerDTO[]> {
  const response = await fetch(`${API_BASE_URL}/promo`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch promo banners: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as PromoBannerDTO[];
}

/**
 * Fetch ALL promo banners including BLOCKED (ADMIN only)
 *
 * @param initData - Telegram WebApp initData string
 * @returns Promise<PromoBannerDTO[]> - All promo banners
 * @throws Error if request fails
 */
export async function fetchAllPromoBanners(initData: string): Promise<PromoBannerDTO[]> {
  const response = await fetch(`${API_BASE_URL}/promo/all`, {
    method: 'GET',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch all promo banners: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as PromoBannerDTO[];
}

/**
 * Create a new promo banner by uploading an image (ADMIN only)
 *
 * @param file - Image file to upload
 * @param initData - Telegram WebApp initData string
 * @returns Promise<PromoBannerDTO> - Created promo banner data
 * @throws Error if upload fails
 */
export async function createPromoBanner(
  file: File,
  initData: string
): Promise<PromoBannerDTO> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE_URL}/promo`, {
    method: 'POST',
    headers: {
      'Authorization': `tma ${initData}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create promo banner: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as PromoBannerDTO;
}

/**
 * Delete promo banner (ADMIN only)
 *
 * @param bannerId - ID of the banner to delete
 * @param initData - Telegram WebApp initData string
 * @returns Promise<void>
 * @throws Error if request fails
 */
export async function deletePromoBanner(
  bannerId: number,
  initData: string
): Promise<void> {
  const url = `${API_BASE_URL}/promo/${bannerId}`;

  console.log(`[DELETE BANNER] Sending DELETE request to: ${url}, Banner ID: ${bannerId}`);

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });

  console.log(`[DELETE BANNER] Response received: Status ${response.status}, OK: ${response.ok}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[DELETE BANNER] Error response: ${errorText}`);
    throw new Error(`Failed to delete promo banner: ${response.status} ${errorText}`);
  }

  console.log(`[DELETE BANNER] Banner ${bannerId} deleted successfully`);
}

/**
 * Block promo banner - set status to BLOCKED (ADMIN only)
 *
 * @param bannerId - ID of the banner to block
 * @param initData - Telegram WebApp initData string
 * @returns Promise<PromoBannerDTO> - Updated promo banner data
 * @throws Error if request fails
 */
export async function blockPromoBanner(
  bannerId: number,
  initData: string
): Promise<PromoBannerDTO> {
  const response = await fetch(`${API_BASE_URL}/promo/${bannerId}/block`, {
    method: 'PUT',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to block promo banner: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as PromoBannerDTO;
}

/**
 * Activate promo banner - set status to NEW (ADMIN only)
 *
 * @param bannerId - ID of the banner to activate
 * @param initData - Telegram WebApp initData string
 * @returns Promise<PromoBannerDTO> - Updated promo banner data
 * @throws Error if request fails
 */
export async function activatePromoBanner(
  bannerId: number,
  initData: string
): Promise<PromoBannerDTO> {
  const response = await fetch(`${API_BASE_URL}/promo/${bannerId}/activate`, {
    method: 'PUT',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to activate promo banner: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as PromoBannerDTO;
}

/**
 * Update promo banner link (product ID) (ADMIN only)
 *
 * @param bannerId - ID of the banner to update
 * @param link - Product ID to link to (or null to remove link)
 * @param initData - Telegram WebApp initData string
 * @returns Promise<PromoBannerDTO> - Updated promo banner data
 * @throws Error if request fails
 */
export async function updatePromoBannerLink(
  bannerId: number,
  link: number | null,
  initData: string
): Promise<PromoBannerDTO> {
  const url = link !== null
    ? `${API_BASE_URL}/promo/${bannerId}/link?link=${link}`
    : `${API_BASE_URL}/promo/${bannerId}/link`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update promo banner link: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as PromoBannerDTO;
}

/**
 * Fetch all shop addresses (public endpoint)
 *
 * @returns Promise<ShopAddress[]> - List of shop addresses
 * @throws Error if request fails
 */
export async function fetchShopAddresses(): Promise<ShopAddress[]> {
  const response = await fetch(`${API_BASE_URL}/shop/addresses`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch shop addresses: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as ShopAddress[];
}

/**
 * Create a new shop address (ADMIN only)
 *
 * @param address - The address string
 * @param initData - Telegram WebApp initData string
 * @returns Promise<ShopAddress> - Created shop address
 * @throws Error if request fails
 */
export async function createShopAddress(
  address: string,
  initData: string
): Promise<ShopAddress> {
  const response = await fetch(`${API_BASE_URL}/shop/addresses`, {
    method: 'POST',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ address }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create shop address: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as ShopAddress;
}

/**
 * Update existing shop address (ADMIN only)
 *
 * @param addressId - ID of the address to update
 * @param address - The updated address string
 * @param initData - Telegram WebApp initData string
 * @returns Promise<ShopAddress> - Updated shop address
 * @throws Error if request fails
 */
export async function updateShopAddress(
  addressId: number,
  address: string,
  initData: string
): Promise<ShopAddress> {
  const response = await fetch(`${API_BASE_URL}/shop/addresses/${addressId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ address }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update shop address: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as ShopAddress;
}

/**
 * Delete shop address (ADMIN only)
 *
 * @param addressId - ID of the address to delete
 * @param initData - Telegram WebApp initData string
 * @returns Promise<void>
 * @throws Error if request fails
 */
export async function deleteShopAddress(
  addressId: number,
  initData: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/shop/addresses/${addressId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete shop address: ${response.status} ${errorText}`);
  }
}

/**
 * Reorder images for a good (ADMIN only)
 *
 * @param goodId - ID of the good to reorder images for
 * @param imageUrls - Array of image URLs in new order
 * @param initData - Telegram WebApp initData string
 * @returns Promise<GoodDTO> - Updated good card data
 * @throws Error if request fails
 */
export async function reorderGoodImages(
  goodId: number,
  imageUrls: string[],
  initData: string
): Promise<GoodDTO> {
  const response = await fetch(`${API_BASE_URL}/goods/${goodId}/images/reorder`, {
    method: 'PUT',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageUrls }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to reorder images: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as GoodDTO;
}

/**
 * Delete a specific image from a good (ADMIN only)
 *
 * @param goodId - ID of the good
 * @param imageUrl - URL of the image to delete
 * @param initData - Telegram WebApp initData string
 * @returns Promise<void>
 * @throws Error if request fails
 */
export async function deleteGoodImage(
  goodId: number,
  imageUrl: string,
  initData: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/goods/${goodId}/images?image_url=${encodeURIComponent(imageUrl)}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete image: ${response.status} ${errorText}`);
  }
}

/**
 * Fetch all categories with status NEW (public endpoint)
 *
 * @returns Promise<CategoryDTO[]> - List of categories
 * @throws Error if request fails
 */
export async function fetchCategories(): Promise<CategoryDTO[]> {
  const response = await fetch(`${API_BASE_URL}/categories`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch categories: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as CategoryDTO[];
}

/**
 * Fetch all categories regardless of status (ADMIN only)
 *
 * @param initData - Telegram WebApp initData string
 * @returns Promise<CategoryDTO[]> - List of all categories
 * @throws Error if request fails
 */
export async function fetchAllCategories(initData: string): Promise<CategoryDTO[]> {
  const response = await fetch(`${API_BASE_URL}/categories/all`, {
    method: 'GET',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch all categories: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as CategoryDTO[];
}

/**
 * Create a new category (ADMIN only)
 *
 * @param title - The category title
 * @param initData - Telegram WebApp initData string
 * @returns Promise<CategoryDTO> - Created category
 * @throws Error if request fails
 */
export async function createCategory(
  title: string,
  initData: string
): Promise<CategoryDTO> {
  const response = await fetch(`${API_BASE_URL}/categories`, {
    method: 'POST',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create category: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as CategoryDTO;
}

/**
 * Update existing category (ADMIN only)
 *
 * @param categoryId - ID of the category to update
 * @param title - The updated category title
 * @param initData - Telegram WebApp initData string
 * @returns Promise<CategoryDTO> - Updated category
 * @throws Error if request fails
 */
export async function updateCategory(
  categoryId: number,
  title: string,
  initData: string
): Promise<CategoryDTO> {
  const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update category: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as CategoryDTO;
}

/**
 * Delete category (ADMIN only)
 *
 * @param categoryId - ID of the category to delete
 * @param initData - Telegram WebApp initData string
 * @returns Promise<void>
 * @throws Error if request fails
 */
export async function deleteCategory(
  categoryId: number,
  initData: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete category: ${response.status} ${errorText}`);
  }
}

/**
 * Update user mode (ADMIN only)
 *
 * @param mode - New mode value ('ADMIN' or 'USER')
 * @param initData - Telegram WebApp initData string
 * @returns Promise<UserInfo> - Updated user information
 * @throws Error if request fails
 */
export async function updateUserMode(
  mode: string,
  initData: string
): Promise<UserInfo> {
  const response = await fetch(`${API_BASE_URL}/users/me/mode`, {
    method: 'PUT',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mode }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update user mode: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as UserInfo;
}

/**
 * Update current user phone number
 *
 * @param phone - Phone number to set
 * @param initData - Telegram WebApp initData string
 * @returns Promise<UserInfo> - Updated user information
 * @throws Error if request fails
 */
export async function updateUserPhone(
  phone: string,
  initData: string
): Promise<UserInfo> {
  const response = await fetch(`${API_BASE_URL}/users/me/phone`, {
    method: 'PUT',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ phone }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update user phone: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as UserInfo;
}

/**
 * Fetch user by username (ADMIN only)
 *
 * @param username - Username to search for
 * @param initData - Telegram WebApp initData string
 * @returns Promise<UserInfo> - User information
 * @throws Error if request fails
 */
export async function fetchUserByUsername(
  username: string,
  initData: string
): Promise<UserInfo> {
  const response = await fetch(`${API_BASE_URL}/users/by-username/${encodeURIComponent(username)}`, {
    method: 'GET',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch user by username: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as UserInfo;
}

/**
 * Update user role and mode (ADMIN only)
 *
 * @param userId - User ID to update
 * @param role - New role value ('ADMIN' or 'USER')
 * @param mode - New mode value ('ADMIN' or 'USER')
 * @param initData - Telegram WebApp initData string
 * @returns Promise<UserInfo> - Updated user information
 * @throws Error if request fails
 */
export async function updateUser(
  userId: number,
  role: string,
  mode: string,
  initData: string
): Promise<UserInfo> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role, mode }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update user: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as UserInfo;
}

/**
 * Fetch all active settings (ADMIN only)
 *
 * @param initData - Telegram WebApp initData string
 * @returns Promise<Setting[]> - List of active settings
 * @throws Error if request fails
 */
export async function fetchSettings(initData: string): Promise<Setting[]> {
  const response = await fetch(`${API_BASE_URL}/users/settings`, {
    method: 'GET',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch settings: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as Setting[];
}

/**
 * Fetch support chat id for feedback
 *
 * @param initData - Telegram WebApp initData string
 * @returns Promise<string> - Support chat id
 * @throws Error if request fails
 */
export async function fetchSupportChatId(initData: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/users/support-chat-id`, {
    method: 'GET',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch support chat id: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return (data?.value || '') as string;
}

/**
 * Fetch payment info text for PaymentInfo screen
 *
 * @param initData - Telegram WebApp initData string
 * @returns Promise<string> - Payment info text
 * @throws Error if request fails
 */
export async function fetchPaymentInfoText(initData: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/users/payment-info-text`, {
    method: 'GET',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch payment info text: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return (data?.value || '') as string;
}

/**
 * Fetch delivery info text for DeliveryInfo screen
 *
 * @param initData - Telegram WebApp initData string
 * @returns Promise<string> - Delivery info text
 * @throws Error if request fails
 */
export async function fetchDeliveryInfoText(initData: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/users/delivery-info-text`, {
    method: 'GET',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch delivery info text: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return (data?.value || '') as string;
}

/**
 * Fetch delivery amount for cart calculations
 *
 * @param initData - Telegram WebApp initData string
 * @returns Promise<string> - Delivery amount (string number)
 * @throws Error if request fails
 */
export async function fetchDeliveryAmount(initData: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/users/delivery-amount`, {
    method: 'GET',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch delivery amount: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return (data?.value || '0') as string;
}

/**
 * Create or update a setting (ADMIN only)
 *
 * @param type - Setting type (e.g., 'SUPPORT_CHAT_ID', 'MANAGER_CHAT_ID')
 * @param value - Setting value
 * @param initData - Telegram WebApp initData string
 * @returns Promise<Setting> - Created or updated setting
 * @throws Error if request fails
 */
export async function upsertSetting(
  type: string,
  value: string,
  initData: string
): Promise<Setting> {
  const response = await fetch(`${API_BASE_URL}/users/settings`, {
    method: 'POST',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type, value }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upsert setting: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as Setting;
}

/**
 * Delete a setting by type (ADMIN only)
 *
 * @param type - Setting type to delete
 * @param initData - Telegram WebApp initData string
 * @returns Promise<void>
 * @throws Error if request fails
 */
export async function deleteSetting(
  type: string,
  initData: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/users/settings/${type}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete setting: ${response.status} ${errorText}`);
  }
}

// Address suggestion from DaData
export interface AddressSuggestion {
  value: string;      // Full formatted address
  geo_lat: string | null;  // Latitude
  geo_lon: string | null;  // Longitude
}

/**
 * Get address suggestions from DaData API (proxied through backend)
 *
 * @param query - Address query string (min 3 characters)
 * @returns Promise<AddressSuggestion[]> - List of address suggestions
 * @throws Error if request fails
 */
export async function suggestAddress(query: string): Promise<AddressSuggestion[]> {
  if (query.length < 3) {
    return [];
  }

  const response = await fetch(
    `${API_BASE_URL}/dadata/suggest?query=${encodeURIComponent(query)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch address suggestions: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as AddressSuggestion[];
}

// Order-related interfaces and functions

/**
 * Cart item for order request
 */
export interface CartItemRequest {
  good_id: number;
  count: number;
}

/**
 * Cart item with good details in order response
 */
export interface CartItemDTO {
  id: number;
  good_id: number;
  good_name: string;
  count: number;
  price: number;
}

/**
 * Order request for creating new order
 */
export interface OrderRequest {
  status: string;
  user_id: number;
  delivery_type: string;
  delivery_address: string;
  // For courier delivery: separate date and time chosen in UI (combined on backend)
  delivery_date?: string;
  delivery_time?: string;
  cart_items: CartItemRequest[];
}

/**
 * Order data from backend
 */
export interface OrderDTO {
  id: number;
  status: string;
  user_id: number;
  user_phone?: string;
  createstamp: string;
  changestamp: string;
  createuser: number | null;
  changeuser: number | null;
  delivery_type: string;
  delivery_address: string;
  delivery_date_time?: string | null;
  cart_items: CartItemDTO[];
}

/**
 * Paginated orders response
 */
export interface OrdersPageDTO {
  items: OrderDTO[];
  total: number;
}

/**
 * Filter parameters for fetching orders
 */
export interface OrdersFilterParams {
  statuses?: string[];
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

/**
 * Create a new order
 *
 * @param orderData - Order data to create
 * @param initData - Telegram WebApp initData string
 * @returns Promise<OrderDTO> - Created order data
 * @throws Error if request fails
 */
export async function createOrder(
  orderData: OrderRequest,
  initData: string
): Promise<OrderDTO> {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create order: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as OrderDTO;
}

/**
 * Fetch current user's orders
 *
 * @param initData - Telegram WebApp initData string
 * @returns Promise<OrderDTO[]> - List of user's orders
 * @throws Error if request fails
 */
export async function fetchMyOrders(initData: string): Promise<OrderDTO[]> {
  const response = await fetch(`${API_BASE_URL}/orders/my`, {
    method: 'GET',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch my orders: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as OrderDTO[];
}

/**
 * Fetch all orders from all users with optional filters (ADMIN only)
 *
 * @param initData - Telegram WebApp initData string
 * @param filters - Optional filter parameters (statuses, dateFrom, dateTo, limit, offset)
 * @returns Promise<OrdersPageDTO> - Paginated orders response with items and total count
 * @throws Error if request fails
 */
export async function fetchAllOrders(
  initData: string,
  filters?: OrdersFilterParams
): Promise<OrdersPageDTO> {
  const params = new URLSearchParams();

  if (filters) {
    if (filters.statuses && filters.statuses.length > 0) {
      params.append('statuses', filters.statuses.join(','));
    }
    if (filters.dateFrom) {
      params.append('date_from', filters.dateFrom);
    }
    if (filters.dateTo) {
      params.append('date_to', filters.dateTo);
    }
    if (filters.limit !== undefined) {
      params.append('limit', filters.limit.toString());
    }
    if (filters.offset !== undefined) {
      params.append('offset', filters.offset.toString());
    }
  }

  const queryString = params.toString();
  const url = queryString ? `${API_BASE_URL}/orders?${queryString}` : `${API_BASE_URL}/orders`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch all orders: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as OrdersPageDTO;
}

/**
 * Update order status (ADMIN only)
 *
 * @param orderId - ID of the order to update
 * @param status - New status value
 * @param initData - Telegram WebApp initData string
 * @returns Promise<OrderDTO> - Updated order data
 * @throws Error if request fails
 */
export async function updateOrderStatus(
  orderId: number,
  status: string,
  initData: string
): Promise<OrderDTO> {
  // We need to fetch the order first to preserve other fields
  const currentOrderResponse = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
    method: 'GET',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
  });

  if (!currentOrderResponse.ok) {
    throw new Error('Failed to fetch current order');
  }

  const orderData = await currentOrderResponse.json();

  // Update the order with new status
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `tma ${initData}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: status,
      user_id: orderData.user_id,
      delivery_type: orderData.delivery_type,
      delivery_address: orderData.delivery_address,
      cart_items: orderData.cart_items.map((item: CartItemDTO) => ({
        good_id: item.good_id,
        count: item.count
      }))
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update order status: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as OrderDTO;
}
