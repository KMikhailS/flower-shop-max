import aiosqlite
import logging
# import os
# import stat
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)


DB_PATH = "/app/data/flower_shop.db"

async def init_db():
    """Initialize database and create tables if they don't exist"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.execute("""
            CREATE TABLE IF NOT EXISTS user_info (
                id INTEGER PRIMARY KEY,
                status TEXT DEFAULT 'NEW',
                createstamp TIMESTAMP,
                changestamp TIMESTAMP,
                role TEXT DEFAULT 'USER',
                mode TEXT DEFAULT 'USER',
                username TEXT,
                phone TEXT
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                status TEXT DEFAULT 'NEW',
                createstamp TIMESTAMP,
                changestamp TIMESTAMP
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS goods (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                createstamp TIMESTAMP,
                changestamp TIMESTAMP,
                status TEXT DEFAULT 'NEW',
                name TEXT NOT NULL,
                category_id INTEGER,
                price INTEGER NOT NULL,
                non_discount_price INTEGER,
                description TEXT,
                sort_order INTEGER,
                FOREIGN KEY (category_id) REFERENCES categories(id)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS goods_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                good_id INTEGER NOT NULL,
                image_url TEXT NOT NULL,
                display_order INTEGER DEFAULT 0,
                FOREIGN KEY (good_id) REFERENCES goods(id) ON DELETE CASCADE
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS shop_addresses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                address TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS promo_banner (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                createstamp TIMESTAMP,
                changestamp TIMESTAMP,
                status TEXT DEFAULT 'NEW',
                display_order INTEGER DEFAULT 0,
                image_url TEXT NOT NULL,
                link INTEGER
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL UNIQUE,
                value TEXT,
                createstamp TIMESTAMP,
                changestamp TIMESTAMP,
                createuser INTEGER,
                changeuser INTEGER,
                status TEXT DEFAULT 'ACTIVE'
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                status TEXT DEFAULT 'NEW',
                user_id INTEGER,
                createstamp TIMESTAMP,
                changestamp TIMESTAMP,
                createuser INTEGER,
                changeuser INTEGER,
                delivery_type TEXT,
                delivery_address TEXT,
                FOREIGN KEY (user_id) REFERENCES user_info(id)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS cart (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                good_id INTEGER NOT NULL,
                count INTEGER NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                FOREIGN KEY (good_id) REFERENCES goods(id)
            )
        """)
        await db.commit()
        logger.info("Database initialized successfully")


async def add_or_update_user(user_id: int, username: Optional[str] = None, phone: Optional[str] = None) -> None:
    """Add new user or update existing user's changestamp, username, and phone.
    Only updates fields that are explicitly provided (not None)."""
    async with aiosqlite.connect(DB_PATH) as db:
        current_time = datetime.now().isoformat()

        cursor = await db.execute(
            "SELECT id FROM user_info WHERE id = ?",
            (user_id,)
        )
        user = await cursor.fetchone()

        if user:
            # Build dynamic UPDATE query - only update fields that are provided
            update_fields = ["changestamp = ?"]
            params = [current_time]

            if username is not None:
                update_fields.append("username = ?")
                params.append(username)

            if phone is not None:
                update_fields.append("phone = ?")
                params.append(phone)

            params.append(user_id)

            await db.execute(
                f"UPDATE user_info SET {', '.join(update_fields)} WHERE id = ?",
                params
            )
            logger.info(f"Updated user {user_id} with username={username}, phone={phone}")
        else:
            await db.execute(
                """INSERT INTO user_info (id, status, createstamp, changestamp, role, mode, username, phone)
                   VALUES (?, 'NEW', ?, ?, 'USER', 'USER', ?, ?)""",
                (user_id, current_time, current_time, username, phone)
            )
            logger.info(f"Created new user {user_id} with username={username}, phone={phone}")

        await db.commit()


async def get_user(user_id: int) -> Optional[dict]:
    """Get user information by user_id"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM user_info WHERE id = ?",
            (user_id,)
        )
        row = await cursor.fetchone()

        if row:
            return dict(row)
        return None


async def get_user_by_username(username: str) -> Optional[dict]:
    """Get user information by username"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM user_info WHERE username = ?",
            (username,)
        )
        row = await cursor.fetchone()

        if row:
            return dict(row)
        return None


async def update_user_mode(user_id: int, mode: str) -> None:
    """Update user mode (ADMIN or USER)"""
    async with aiosqlite.connect(DB_PATH) as db:
        current_time = datetime.now().isoformat()
        await db.execute(
            "UPDATE user_info SET mode = ?, changestamp = ? WHERE id = ?",
            (mode, current_time, user_id)
        )
        await db.commit()
        logger.info(f"Updated mode for user {user_id} to {mode}")


async def update_user_role_and_mode(user_id: int, role: str, mode: str) -> None:
    """Update user role and mode"""
    async with aiosqlite.connect(DB_PATH) as db:
        current_time = datetime.now().isoformat()
        await db.execute(
            "UPDATE user_info SET role = ?, mode = ?, changestamp = ? WHERE id = ?",
            (role, mode, current_time, user_id)
        )
        await db.commit()
        logger.info(f"Updated user {user_id}: role={role}, mode={mode}")


async def create_good_card(
    name: str,
    category_id: int,
    price: int,
    description: str,
    non_discount_price: Optional[int] = None
) -> dict:
    """Create a new good card"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        current_time = datetime.now().isoformat()

        cursor = await db.execute(
            """INSERT INTO goods (createstamp, changestamp, status, name, category_id, price, non_discount_price, description)
               VALUES (?, ?, 'NEW', ?, ?, ?, ?, ?)""",
            (current_time, current_time, name, category_id, price, non_discount_price, description)
        )
        good_id = cursor.lastrowid

        # Set sort_order = id for new goods
        await db.execute(
            "UPDATE goods SET sort_order = ? WHERE id = ?",
            (good_id, good_id)
        )
        await db.commit()

        # Get the created good card
        cursor = await db.execute(
            """SELECT g.*, c.title AS category
               FROM goods g
               LEFT JOIN categories c ON g.category_id = c.id
               WHERE g.id = ?""",
            (good_id,)
        )
        row = await cursor.fetchone()

        # Add empty images list to match new schema
        result = dict(row)
        result['images'] = []

        logger.info(f"Created new good card with id={good_id}")
        return result


async def update_good_card(
    good_id: int,
    name: str,
    category_id: int,
    price: int,
    description: str,
    non_discount_price: Optional[int] = None,
    sort_order: Optional[int] = None
) -> dict:
    """Update existing good card"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        current_time = datetime.now().isoformat()

        # Update the good
        if sort_order is not None:
            await db.execute(
                """UPDATE goods
                   SET name = ?, category_id = ?, price = ?, non_discount_price = ?, description = ?, sort_order = ?, changestamp = ?
                   WHERE id = ?""",
                (name, category_id, price, non_discount_price, description, sort_order, current_time, good_id)
            )
        else:
            await db.execute(
                """UPDATE goods
                   SET name = ?, category_id = ?, price = ?, non_discount_price = ?, description = ?, changestamp = ?
                   WHERE id = ?""",
                (name, category_id, price, non_discount_price, description, current_time, good_id)
            )
        await db.commit()

        # Get the updated good with images
        cursor = await db.execute(
            """SELECT g.*, c.title AS category, gi.image_url, gi.display_order
               FROM goods g
               LEFT JOIN categories c ON g.category_id = c.id
               LEFT JOIN goods_images gi ON g.id = gi.good_id
               WHERE g.id = ?
               ORDER BY gi.display_order ASC""",
            (good_id,)
        )
        rows = await cursor.fetchall()

        if not rows:
            logger.error(f"Good with id={good_id} not found")
            raise ValueError(f"Good with id={good_id} not found")

        # Build result with images
        first_row = rows[0]
        result = {
            'id': first_row['id'],
            'createstamp': first_row['createstamp'],
            'changestamp': first_row['changestamp'],
            'status': first_row['status'],
            'name': first_row['name'],
            'category': first_row['category'],
            'price': first_row['price'],
            'non_discount_price': first_row['non_discount_price'],
            'description': first_row['description'],
            'sort_order': first_row['sort_order'],
            'images': []
        }

        # Add all images with display_order
        for row in rows:
            if row['image_url']:
                result['images'].append({
                    'image_url': row['image_url'],
                    'display_order': row['display_order']
                })

        logger.info(f"Updated good card with id={good_id}")
        return result


async def save_good_images(good_id: int, image_urls: list[str]) -> None:
    """Save list of image URLs for a good"""
    async with aiosqlite.connect(DB_PATH) as db:
        for index, image_url in enumerate(image_urls):
            await db.execute(
                """INSERT INTO goods_images (good_id, image_url, display_order)
                   VALUES (?, ?, ?)""",
                (good_id, image_url, index)
            )
        await db.commit()
        logger.info(f"Saved {len(image_urls)} images for good_id={good_id}")


async def get_goods_by_status(status: str = 'NEW') -> list[dict]:
    """Get all goods with specified status along with their images"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        # Get goods with their images via LEFT JOIN
        cursor = await db.execute(
            """SELECT g.*, c.title AS category, gi.image_url, gi.display_order
               FROM goods g
               LEFT JOIN categories c ON g.category_id = c.id
               LEFT JOIN goods_images gi ON g.id = gi.good_id
               WHERE g.status = ?
               ORDER BY g.sort_order ASC, gi.display_order ASC""",
            (status,)
        )
        rows = await cursor.fetchall()

        # Group images by good_id
        goods_dict = {}
        for row in rows:
            good_id = row['id']
            if good_id not in goods_dict:
                goods_dict[good_id] = {
                    'id': row['id'],
                    'createstamp': row['createstamp'],
                    'changestamp': row['changestamp'],
                    'status': row['status'],
                    'name': row['name'],
                    'category': row['category'],
                    'price': row['price'],
                    'non_discount_price': row['non_discount_price'],
                    'description': row['description'],
                    'sort_order': row['sort_order'],
                    'images': []
                }

            # Add image with display_order if exists (LEFT JOIN may return NULL)
            if row['image_url']:
                goods_dict[good_id]['images'].append({
                    'image_url': row['image_url'],
                    'display_order': row['display_order']
                })

        result = list(goods_dict.values())
        logger.info(f"Retrieved {len(result)} goods with status={status}")
        return result


async def get_all_goods() -> list[dict]:
    """Get all goods regardless of status along with their images (for ADMIN)"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        # Get all goods with their images via LEFT JOIN
        cursor = await db.execute(
            """SELECT g.*, c.title AS category, gi.image_url, gi.display_order
               FROM goods g
               LEFT JOIN categories c ON g.category_id = c.id
               LEFT JOIN goods_images gi ON g.id = gi.good_id
               ORDER BY g.sort_order ASC, gi.display_order ASC"""
        )
        rows = await cursor.fetchall()

        # Group images by good_id
        goods_dict = {}
        for row in rows:
            good_id = row['id']
            if good_id not in goods_dict:
                goods_dict[good_id] = {
                    'id': row['id'],
                    'createstamp': row['createstamp'],
                    'changestamp': row['changestamp'],
                    'status': row['status'],
                    'name': row['name'],
                    'category': row['category'],
                    'price': row['price'],
                    'non_discount_price': row['non_discount_price'],
                    'description': row['description'],
                    'sort_order': row['sort_order'],
                    'images': []
                }

            # Add image with display_order if exists (LEFT JOIN may return NULL)
            if row['image_url']:
                goods_dict[good_id]['images'].append({
                    'image_url': row['image_url'],
                    'display_order': row['display_order']
                })

        result = list(goods_dict.values())
        logger.info(f"Retrieved {len(result)} goods (all statuses)")
        return result


async def delete_good(good_id: int) -> None:
    """Delete good and its images (CASCADE)"""
    async with aiosqlite.connect(DB_PATH) as db:
        # Check if good exists
        cursor = await db.execute(
            "SELECT id FROM goods WHERE id = ?",
            (good_id,)
        )
        row = await cursor.fetchone()

        if not row:
            logger.error(f"Good with id={good_id} not found")
            raise ValueError(f"Good with id={good_id} not found")

        # Delete good (images will be deleted automatically due to CASCADE)
        await db.execute(
            "DELETE FROM goods WHERE id = ?",
            (good_id,)
        )
        await db.commit()
        logger.info(f"Deleted good with id={good_id}")


async def update_good_status(good_id: int, new_status: str) -> dict:
    """Update good status (NEW or BLOCKED)"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        current_time = datetime.now().isoformat()

        # Update the status
        await db.execute(
            """UPDATE goods
               SET status = ?, changestamp = ?
               WHERE id = ?""",
            (new_status, current_time, good_id)
        )
        await db.commit()

        # Get the updated good with images
        cursor = await db.execute(
            """SELECT g.*, c.title AS category, gi.image_url, gi.display_order
               FROM goods g
               LEFT JOIN categories c ON g.category_id = c.id
               LEFT JOIN goods_images gi ON g.id = gi.good_id
               WHERE g.id = ?
               ORDER BY gi.display_order ASC""",
            (good_id,)
        )
        rows = await cursor.fetchall()

        if not rows:
            logger.error(f"Good with id={good_id} not found")
            raise ValueError(f"Good with id={good_id} not found")

        # Build result with images
        first_row = rows[0]
        result = {
            'id': first_row['id'],
            'createstamp': first_row['createstamp'],
            'changestamp': first_row['changestamp'],
            'status': first_row['status'],
            'name': first_row['name'],
            'category': first_row['category'],
            'price': first_row['price'],
            'non_discount_price': first_row['non_discount_price'],
            'description': first_row['description'],
            'sort_order': first_row['sort_order'],
            'images': []
        }

        # Add all images with display_order
        for row in rows:
            if row['image_url']:
                result['images'].append({
                    'image_url': row['image_url'],
                    'display_order': row['display_order']
                })

        logger.info(f"Updated status for good_id={good_id} to {new_status}")
        return result


async def get_shop_addresses() -> list[dict]:
    """Get all shop addresses"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id, address FROM shop_addresses ORDER BY id ASC"
        )
        rows = await cursor.fetchall()

        result = [dict(row) for row in rows]
        logger.info(f"Retrieved {len(result)} shop addresses")
        return result


async def create_shop_address(address: str) -> dict:
    """Create a new shop address"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        cursor = await db.execute(
            "INSERT INTO shop_addresses (address) VALUES (?)",
            (address,)
        )
        await db.commit()

        # Get the created address
        address_id = cursor.lastrowid
        cursor = await db.execute(
            "SELECT id, address FROM shop_addresses WHERE id = ?",
            (address_id,)
        )
        row = await cursor.fetchone()

        result = dict(row)
        logger.info(f"Created shop address with id={address_id}")
        return result


async def update_shop_address(address_id: int, address: str) -> dict:
    """Update existing shop address"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        # Update the address
        await db.execute(
            "UPDATE shop_addresses SET address = ? WHERE id = ?",
            (address, address_id)
        )
        await db.commit()

        # Get the updated address
        cursor = await db.execute(
            "SELECT id, address FROM shop_addresses WHERE id = ?",
            (address_id,)
        )
        row = await cursor.fetchone()

        if not row:
            logger.error(f"Shop address with id={address_id} not found")
            raise ValueError(f"Shop address with id={address_id} not found")

        result = dict(row)
        logger.info(f"Updated shop address with id={address_id}")
        return result


async def delete_shop_address(address_id: int) -> None:
    """Delete shop address"""
    async with aiosqlite.connect(DB_PATH) as db:
        # Check if address exists
        cursor = await db.execute(
            "SELECT id FROM shop_addresses WHERE id = ?",
            (address_id,)
        )
        row = await cursor.fetchone()

        if not row:
            logger.error(f"Shop address with id={address_id} not found")
            raise ValueError(f"Shop address with id={address_id} not found")

        # Delete address
        await db.execute(
            "DELETE FROM shop_addresses WHERE id = ?",
            (address_id,)
        )
        await db.commit()
        logger.info(f"Deleted shop address with id={address_id}")


async def update_images_order(good_id: int, image_urls: list[str]) -> dict:
    """Update display order of images for a good based on provided URL order"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        current_time = datetime.now().isoformat()

        # Update display_order for each image based on position in list
        for index, image_url in enumerate(image_urls):
            await db.execute(
                """UPDATE goods_images
                   SET display_order = ?
                   WHERE good_id = ? AND image_url = ?""",
                (index, good_id, image_url)
            )

        # Update changestamp for the good
        await db.execute(
            "UPDATE goods SET changestamp = ? WHERE id = ?",
            (current_time, good_id)
        )
        await db.commit()

        # Get the updated good with images
        cursor = await db.execute(
            """SELECT g.*, c.title AS category, gi.image_url, gi.display_order
               FROM goods g
               LEFT JOIN categories c ON g.category_id = c.id
               LEFT JOIN goods_images gi ON g.id = gi.good_id
               WHERE g.id = ?
               ORDER BY gi.display_order ASC""",
            (good_id,)
        )
        rows = await cursor.fetchall()

        if not rows:
            logger.error(f"Good with id={good_id} not found")
            raise ValueError(f"Good with id={good_id} not found")

        # Build result with images
        first_row = rows[0]
        result = {
            'id': first_row['id'],
            'createstamp': first_row['createstamp'],
            'changestamp': first_row['changestamp'],
            'status': first_row['status'],
            'name': first_row['name'],
            'category': first_row['category'],
            'price': first_row['price'],
            'non_discount_price': first_row['non_discount_price'],
            'description': first_row['description'],
            'sort_order': first_row['sort_order'],
            'images': []
        }

        # Add all images with display_order
        for row in rows:
            if row['image_url']:
                result['images'].append({
                    'image_url': row['image_url'],
                    'display_order': row['display_order']
                })

        logger.info(f"Updated image order for good_id={good_id}")
        return result


async def delete_good_image(good_id: int, image_url: str) -> None:
    """Delete a specific image from a good"""
    async with aiosqlite.connect(DB_PATH) as db:
        current_time = datetime.now().isoformat()

        # Check if image exists for this good
        cursor = await db.execute(
            "SELECT id FROM goods_images WHERE good_id = ? AND image_url = ?",
            (good_id, image_url)
        )
        row = await cursor.fetchone()

        if not row:
            logger.error(f"Image {image_url} not found for good_id={good_id}")
            raise ValueError(f"Image not found for this good")

        # Delete the image
        await db.execute(
            "DELETE FROM goods_images WHERE good_id = ? AND image_url = ?",
            (good_id, image_url)
        )

        # Update changestamp for the good
        await db.execute(
            "UPDATE goods SET changestamp = ? WHERE id = ?",
            (current_time, good_id)
        )

        await db.commit()
        logger.info(f"Deleted image {image_url} from good_id={good_id}")


async def get_promo_banners() -> list[dict]:
    """Get all promo banners with status NEW ordered by display_order"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT id, status, display_order, image_url, link
               FROM promo_banner
               WHERE status = 'NEW'
               ORDER BY display_order ASC"""
        )
        rows = await cursor.fetchall()

        result = [dict(row) for row in rows]
        logger.info(f"Retrieved {len(result)} promo banners with status=NEW")
        return result


async def get_all_promo_banners() -> list[dict]:
    """Get ALL promo banners (including BLOCKED) ordered by display_order (ADMIN only)"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT id, status, display_order, image_url, link
               FROM promo_banner
               ORDER BY display_order ASC"""
        )
        rows = await cursor.fetchall()

        result = [dict(row) for row in rows]
        logger.info(f"Retrieved {len(result)} promo banners (all statuses)")
        return result


async def create_promo_banner(image_url: str) -> dict:
    """Create a new promo banner"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        current_time = datetime.now().isoformat()

        # Get max display_order to calculate next order
        cursor = await db.execute(
            "SELECT MAX(display_order) as max_order FROM promo_banner"
        )
        row = await cursor.fetchone()
        next_order = (row['max_order'] or -1) + 1

        # Insert new promo banner
        cursor = await db.execute(
            """INSERT INTO promo_banner (createstamp, changestamp, status, display_order, image_url)
               VALUES (?, ?, 'NEW', ?, ?)""",
            (current_time, current_time, next_order, image_url)
        )
        await db.commit()

        # Get the created promo banner
        banner_id = cursor.lastrowid
        cursor = await db.execute(
            "SELECT id, status, display_order, image_url, link FROM promo_banner WHERE id = ?",
            (banner_id,)
        )
        row = await cursor.fetchone()

        result = dict(row)
        logger.info(f"Created new promo banner with id={banner_id}, display_order={next_order}")
        return result


async def delete_promo_banner(banner_id: int) -> None:
    """Delete promo banner"""
    async with aiosqlite.connect(DB_PATH) as db:
        # Check if banner exists
        cursor = await db.execute(
            "SELECT id FROM promo_banner WHERE id = ?",
            (banner_id,)
        )
        row = await cursor.fetchone()

        if not row:
            logger.error(f"Promo banner with id={banner_id} not found")
            raise ValueError(f"Promo banner with id={banner_id} not found")

        # Delete banner
        await db.execute(
            "DELETE FROM promo_banner WHERE id = ?",
            (banner_id,)
        )
        await db.commit()
        logger.info(f"Deleted promo banner with id={banner_id}")


async def update_promo_banner_status(banner_id: int, new_status: str) -> dict:
    """Update promo banner status (NEW or BLOCKED)"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        current_time = datetime.now().isoformat()

        # Update the status
        await db.execute(
            """UPDATE promo_banner
               SET status = ?, changestamp = ?
               WHERE id = ?""",
            (new_status, current_time, banner_id)
        )
        await db.commit()

        # Get the updated banner
        cursor = await db.execute(
            "SELECT id, status, display_order, image_url, link FROM promo_banner WHERE id = ?",
            (banner_id,)
        )
        row = await cursor.fetchone()

        if not row:
            logger.error(f"Promo banner with id={banner_id} not found")
            raise ValueError(f"Promo banner with id={banner_id} not found")

        result = dict(row)
        logger.info(f"Updated status for promo banner id={banner_id} to {new_status}")
        return result


async def update_promo_banner_link(banner_id: int, link: Optional[int]) -> dict:
    """Update promo banner link (product ID)"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        current_time = datetime.now().isoformat()

        # Update the link
        await db.execute(
            """UPDATE promo_banner
               SET link = ?, changestamp = ?
               WHERE id = ?""",
            (link, current_time, banner_id)
        )
        await db.commit()

        # Get the updated banner
        cursor = await db.execute(
            "SELECT id, status, display_order, image_url, link FROM promo_banner WHERE id = ?",
            (banner_id,)
        )
        row = await cursor.fetchone()

        if not row:
            logger.error(f"Promo banner with id={banner_id} not found")
            raise ValueError(f"Promo banner with id={banner_id} not found")

        result = dict(row)
        logger.info(f"Updated link for promo banner id={banner_id} to {link}")
        return result


async def get_categories_by_status(status: str = 'NEW') -> list[dict]:
    """Get all categories with specified status"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT id, title, status
               FROM categories
               WHERE status = ?
               ORDER BY id ASC""",
            (status,)
        )
        rows = await cursor.fetchall()

        result = [dict(row) for row in rows]
        logger.info(f"Retrieved {len(result)} categories with status={status}")
        return result


async def get_all_categories() -> list[dict]:
    """Get all categories regardless of status (for ADMIN)"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT id, title, status
               FROM categories
               ORDER BY id ASC"""
        )
        rows = await cursor.fetchall()

        result = [dict(row) for row in rows]
        logger.info(f"Retrieved {len(result)} categories (all statuses)")
        return result


async def get_category_by_id(category_id: int) -> Optional[dict]:
    """Get category by id"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id, title, status FROM categories WHERE id = ?",
            (category_id,)
        )
        row = await cursor.fetchone()

        if row:
            result = dict(row)
            logger.info(f"Retrieved category with id={category_id}")
            return result

        logger.warning(f"Category with id={category_id} not found")
        return None


async def get_category_by_title(title: str) -> Optional[dict]:
    """Get category by title (case-sensitive)"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id, title, status FROM categories WHERE title = ?",
            (title,)
        )
        row = await cursor.fetchone()

        if row:
            result = dict(row)
            logger.info(f"Retrieved category with title='{title}'")
            return result

        logger.debug(f"Category with title='{title}' not found")
        return None


async def create_category(title: str) -> dict:
    """Create a new category"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        current_time = datetime.now().isoformat()

        cursor = await db.execute(
            """INSERT INTO categories (title, status, createstamp, changestamp)
               VALUES (?, 'NEW', ?, ?)""",
            (title, current_time, current_time)
        )
        await db.commit()

        # Get the created category
        category_id = cursor.lastrowid
        cursor = await db.execute(
            "SELECT id, title, status FROM categories WHERE id = ?",
            (category_id,)
        )
        row = await cursor.fetchone()

        result = dict(row)
        logger.info(f"Created category with id={category_id}, title={title}")
        return result


async def update_category(category_id: int, title: str) -> dict:
    """Update existing category title"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        current_time = datetime.now().isoformat()

        # Update the category
        await db.execute(
            """UPDATE categories
               SET title = ?, changestamp = ?
               WHERE id = ?""",
            (title, current_time, category_id)
        )
        await db.commit()

        # Get the updated category
        cursor = await db.execute(
            "SELECT id, title, status FROM categories WHERE id = ?",
            (category_id,)
        )
        row = await cursor.fetchone()

        if not row:
            logger.error(f"Category with id={category_id} not found")
            raise ValueError(f"Category with id={category_id} not found")

        result = dict(row)
        logger.info(f"Updated category with id={category_id}")
        return result


async def delete_category(category_id: int) -> None:
    """Delete category"""
    async with aiosqlite.connect(DB_PATH) as db:
        # Check if category exists
        cursor = await db.execute(
            "SELECT id FROM categories WHERE id = ?",
            (category_id,)
        )
        row = await cursor.fetchone()

        if not row:
            logger.error(f"Category with id={category_id} not found")
            raise ValueError(f"Category with id={category_id} not found")

        # Delete category
        await db.execute(
            "DELETE FROM categories WHERE id = ?",
            (category_id,)
        )
        await db.commit()
        logger.info(f"Deleted category with id={category_id}")


async def update_category_status(category_id: int, new_status: str) -> dict:
    """Update category status (NEW or BLOCKED)"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        current_time = datetime.now().isoformat()

        # Update the status
        await db.execute(
            """UPDATE categories
               SET status = ?, changestamp = ?
               WHERE id = ?""",
            (new_status, current_time, category_id)
        )
        await db.commit()

        # Get the updated category
        cursor = await db.execute(
            "SELECT id, title, status FROM categories WHERE id = ?",
            (category_id,)
        )
        row = await cursor.fetchone()

        if not row:
            logger.error(f"Category with id={category_id} not found")
            raise ValueError(f"Category with id={category_id} not found")

        result = dict(row)
        logger.info(f"Updated status for category id={category_id} to {new_status}")
        return result


async def get_setting_by_type(setting_type: str) -> Optional[dict]:
    """Get setting by type"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM settings WHERE type = ? AND status = 'ACTIVE'",
            (setting_type,)
        )
        row = await cursor.fetchone()

        if row:
            result = dict(row)
            logger.info(f"Retrieved setting with type={setting_type}")
            return result

        logger.debug(f"Setting with type={setting_type} not found")
        return None


async def get_all_settings() -> list[dict]:
    """Get all active settings"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM settings WHERE status = 'ACTIVE' ORDER BY id ASC"
        )
        rows = await cursor.fetchall()

        result = [dict(row) for row in rows]
        logger.info(f"Retrieved {len(result)} active settings")
        return result


async def create_setting(setting_type: str, value: str, user_id: int) -> dict:
    """Create a new setting"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        current_time = datetime.now().isoformat()

        cursor = await db.execute(
            """INSERT INTO settings (type, value, createstamp, changestamp, createuser, changeuser, status)
               VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')""",
            (setting_type, value, current_time, current_time, user_id, user_id)
        )
        await db.commit()

        # Get the created setting
        setting_id = cursor.lastrowid
        cursor = await db.execute(
            "SELECT * FROM settings WHERE id = ?",
            (setting_id,)
        )
        row = await cursor.fetchone()

        result = dict(row)
        logger.info(f"Created setting with id={setting_id}, type={setting_type}")
        return result


async def update_setting(setting_type: str, value: str, user_id: int) -> dict:
    """Update existing setting by type"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        current_time = datetime.now().isoformat()

        # Update the setting
        await db.execute(
            """UPDATE settings
               SET value = ?, changestamp = ?, changeuser = ?
               WHERE type = ? AND status = 'ACTIVE'""",
            (value, current_time, user_id, setting_type)
        )
        await db.commit()

        # Get the updated setting
        cursor = await db.execute(
            "SELECT * FROM settings WHERE type = ? AND status = 'ACTIVE'",
            (setting_type,)
        )
        row = await cursor.fetchone()

        if not row:
            logger.error(f"Setting with type={setting_type} not found")
            raise ValueError(f"Setting with type={setting_type} not found")

        result = dict(row)
        logger.info(f"Updated setting with type={setting_type}")
        return result


async def upsert_setting(setting_type: str, value: str, user_id: int) -> dict:
    """Create or update setting (upsert operation)"""
    existing = await get_setting_by_type(setting_type)

    if existing:
        return await update_setting(setting_type, value, user_id)
    else:
        return await create_setting(setting_type, value, user_id)


async def delete_setting(setting_type: str) -> None:
    """Delete setting by type (soft delete - set status to DELETED)"""
    async with aiosqlite.connect(DB_PATH) as db:
        current_time = datetime.now().isoformat()

        # Check if setting exists
        cursor = await db.execute(
            "SELECT id FROM settings WHERE type = ? AND status = 'ACTIVE'",
            (setting_type,)
        )
        row = await cursor.fetchone()

        if not row:
            logger.error(f"Setting with type={setting_type} not found")
            raise ValueError(f"Setting with type={setting_type} not found")

        # Soft delete
        await db.execute(
            "UPDATE settings SET status = 'DELETED', changestamp = ? WHERE type = ?",
            (current_time, setting_type)
        )
        await db.commit()
        logger.info(f"Deleted setting with type={setting_type}")


async def create_order(
    status: str,
    user_id: int,
    delivery_type: str,
    delivery_address: str,
    cart_items: list[dict],
    createuser: int
) -> dict:
    """Create a new order with cart items"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        current_time = datetime.now().isoformat()

        # Create order
        cursor = await db.execute(
            """INSERT INTO orders (status, user_id, createstamp, changestamp, createuser, changeuser, delivery_type, delivery_address)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (status, user_id, current_time, current_time, createuser, createuser, delivery_type, delivery_address)
        )
        order_id = cursor.lastrowid

        # Create cart items
        for item in cart_items:
            await db.execute(
                """INSERT INTO cart (order_id, good_id, count)
                   VALUES (?, ?, ?)""",
                (order_id, item['good_id'], item['count'])
            )

        await db.commit()
        logger.info(f"Created order with id={order_id}")

        # Return the created order
        return await get_order_by_id(order_id)


async def update_order(
    order_id: int,
    status: str,
    delivery_type: str,
    delivery_address: str,
    cart_items: list[dict],
    changeuser: int
) -> dict:
    """Update existing order and its cart items"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        current_time = datetime.now().isoformat()

        # Check if order exists
        cursor = await db.execute(
            "SELECT id FROM orders WHERE id = ?",
            (order_id,)
        )
        row = await cursor.fetchone()

        if not row:
            logger.error(f"Order with id={order_id} not found")
            raise ValueError(f"Order with id={order_id} not found")

        # Update order
        await db.execute(
            """UPDATE orders
               SET status = ?, delivery_type = ?, delivery_address = ?, changestamp = ?, changeuser = ?
               WHERE id = ?""",
            (status, delivery_type, delivery_address, current_time, changeuser, order_id)
        )

        # Delete existing cart items
        await db.execute(
            "DELETE FROM cart WHERE order_id = ?",
            (order_id,)
        )

        # Create new cart items
        for item in cart_items:
            await db.execute(
                """INSERT INTO cart (order_id, good_id, count)
                   VALUES (?, ?, ?)""",
                (order_id, item['good_id'], item['count'])
            )

        await db.commit()
        logger.info(f"Updated order with id={order_id}")

        # Return the updated order
        return await get_order_by_id(order_id)


async def get_order_by_id(order_id: int) -> dict:
    """Get order by id with cart items and good details"""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        # Get order details
        cursor = await db.execute(
            "SELECT * FROM orders WHERE id = ?",
            (order_id,)
        )
        order_row = await cursor.fetchone()

        if not order_row:
            logger.error(f"Order with id={order_id} not found")
            raise ValueError(f"Order with id={order_id} not found")

        # Get cart items with good details
        cursor = await db.execute(
            """SELECT c.id, c.good_id, c.count, g.name as good_name, g.price
               FROM cart c
               JOIN goods g ON c.good_id = g.id
               WHERE c.order_id = ?""",
            (order_id,)
        )
        cart_rows = await cursor.fetchall()

        # Build result
        result = {
            'id': order_row['id'],
            'status': order_row['status'],
            'user_id': order_row['user_id'],
            'createstamp': order_row['createstamp'],
            'changestamp': order_row['changestamp'],
            'createuser': order_row['createuser'],
            'changeuser': order_row['changeuser'],
            'delivery_type': order_row['delivery_type'],
            'delivery_address': order_row['delivery_address'],
            'cart_items': [
                {
                    'id': row['id'],
                    'good_id': row['good_id'],
                    'good_name': row['good_name'],
                    'count': row['count'],
                    'price': row['price']
                }
                for row in cart_rows
            ]
        }

        logger.info(f"Retrieved order with id={order_id}")
        return result


async def get_orders(
    order_id_filter: Optional[int] = None,
    status_filter: Optional[str] = None,
    statuses_filter: Optional[list[str]] = None,
    user_id_filter: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: Optional[int] = None,
    offset: Optional[int] = None
) -> dict:
    """Get orders with optional filters and pagination.

    Returns dict with 'items' (list of orders) and 'total' (total count for pagination).
    """
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        # Build query with filters
        query = "SELECT * FROM orders WHERE 1=1"
        count_query = "SELECT COUNT(*) as total FROM orders WHERE 1=1"
        params = []
        count_params = []

        if order_id_filter is not None:
            query += " AND id = ?"
            count_query += " AND id = ?"
            params.append(order_id_filter)
            count_params.append(order_id_filter)

        # Support both single status and multiple statuses
        if statuses_filter is not None and len(statuses_filter) > 0:
            placeholders = ",".join("?" * len(statuses_filter))
            query += f" AND status IN ({placeholders})"
            count_query += f" AND status IN ({placeholders})"
            params.extend(statuses_filter)
            count_params.extend(statuses_filter)
        elif status_filter is not None:
            query += " AND status = ?"
            count_query += " AND status = ?"
            params.append(status_filter)
            count_params.append(status_filter)

        if user_id_filter is not None:
            query += " AND user_id = ?"
            count_query += " AND user_id = ?"
            params.append(user_id_filter)
            count_params.append(user_id_filter)

        if date_from is not None:
            query += " AND createstamp >= ?"
            count_query += " AND createstamp >= ?"
            params.append(date_from)
            count_params.append(date_from)

        if date_to is not None:
            query += " AND createstamp <= ?"
            count_query += " AND createstamp <= ?"
            params.append(date_to)
            count_params.append(date_to)

        # Get total count
        cursor = await db.execute(count_query, count_params)
        count_row = await cursor.fetchone()
        total = count_row['total']

        query += " ORDER BY id DESC"

        # Add pagination
        if limit is not None:
            query += " LIMIT ?"
            params.append(limit)
        if offset is not None:
            query += " OFFSET ?"
            params.append(offset)

        # Get orders
        cursor = await db.execute(query, params)
        order_rows = await cursor.fetchall()

        # Build results with cart items
        results = []
        for order_row in order_rows:
            order_id = order_row['id']

            # Get cart items for this order
            cursor = await db.execute(
                """SELECT c.id, c.good_id, c.count, g.name as good_name, g.price
                   FROM cart c
                   JOIN goods g ON c.good_id = g.id
                   WHERE c.order_id = ?""",
                (order_id,)
            )
            cart_rows = await cursor.fetchall()

            results.append({
                'id': order_row['id'],
                'status': order_row['status'],
                'user_id': order_row['user_id'],
                'createstamp': order_row['createstamp'],
                'changestamp': order_row['changestamp'],
                'createuser': order_row['createuser'],
                'changeuser': order_row['changeuser'],
                'delivery_type': order_row['delivery_type'],
                'delivery_address': order_row['delivery_address'],
                'cart_items': [
                    {
                        'id': row['id'],
                        'good_id': row['good_id'],
                        'good_name': row['good_name'],
                        'count': row['count'],
                        'price': row['price']
                    }
                    for row in cart_rows
                ]
            })

        logger.info(f"Retrieved {len(results)} orders (total: {total})")
        return {'items': results, 'total': total}


async def delete_order(order_id: int) -> None:
    """Delete order and its cart items (CASCADE)"""
    async with aiosqlite.connect(DB_PATH) as db:
        # Check if order exists
        cursor = await db.execute(
            "SELECT id FROM orders WHERE id = ?",
            (order_id,)
        )
        row = await cursor.fetchone()

        if not row:
            logger.error(f"Order with id={order_id} not found")
            raise ValueError(f"Order with id={order_id} not found")

        # Delete order (cart items will be deleted automatically due to CASCADE)
        await db.execute(
            "DELETE FROM orders WHERE id = ?",
            (order_id,)
        )
        await db.commit()
        logger.info(f"Deleted order with id={order_id}")
