import asyncio
import logging
import os
from dotenv import load_dotenv
import uvicorn

from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton, CallbackQuery, FSInputFile

from database import init_db, add_or_update_user, get_user, update_user_mode
from fastapi_app import app as fastapi_app

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Bot token from environment
BOT_TOKEN = os.getenv("BOT_TOKEN")
APP_URL = os.getenv("APP_URL")

# Create bot and dispatcher
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()


@dp.message(Command("start"))
async def start_handler(message: types.Message):
    """Handle /start command - show Mini App button"""

    # Save or update user in database with username
    await add_or_update_user(
        user_id=message.from_user.id,
        username=message.from_user.username
    )

    # Create inline keyboard with Mini App button
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🌸 Открыть магазин",
                    web_app=WebAppInfo(url=APP_URL)
                )
            ]
        ]
    )

    # Get path to welcome image
    image_path = os.path.join(os.path.dirname(__file__), "images", "fanfan-main.jpg")
    photo = FSInputFile(image_path)

    caption = """Цветы онлайн  это просто.
Fan Fan Tulpan в Telegram:
выбрал букет, оформил доставку, подарил эмоции!!!

Жми на кнопку и выбирай свежие цветы уже сейчас."""

    await message.answer_photo(
        photo=photo,
        caption=caption,
        reply_markup=keyboard
    )


@dp.message(Command("mode"))
async def mode_handler(message: types.Message):
    """Handle /mode command - allow ADMIN to switch modes"""

    # Get user from database
    user = await get_user(message.from_user.id)

    # Check if user exists and has ADMIN role
    if not user or user.get("role") != "ADMIN":
        await message.answer("❌ Эта команда доступна только администраторам.")
        return

    # Create inline keyboard with mode selection buttons
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🔧 Режим администратора",
                    callback_data="mode_admin"
                )
            ],
            [
                InlineKeyboardButton(
                    text="👤 Режим клиента",
                    callback_data="mode_user"
                )
            ]
        ]
    )

    current_mode = user.get("mode", "USER")
    mode_text = "администратора" if current_mode == "ADMIN" else "клиента"

    await message.answer(
        text=f"Текущий режим: {mode_text}\n\nВыберите режим работы:",
        reply_markup=keyboard
    )


@dp.callback_query(lambda c: c.data and c.data.startswith("mode_"))
async def mode_callback_handler(callback_query: CallbackQuery):
    """Handle mode selection callback"""

    # Extract mode from callback_data (mode_admin or mode_user)
    new_mode = "ADMIN" if callback_query.data == "mode_admin" else "USER"

    # Update user mode in database
    await update_user_mode(callback_query.from_user.id, new_mode)

    # Prepare confirmation message
    mode_text = "администратора" if new_mode == "ADMIN" else "клиента"

    # Answer callback query and update message
    await callback_query.answer(f"✅ Режим изменен на: {mode_text}")
    await callback_query.message.edit_text(
        text=f"✅ Режим успешно изменен на: {mode_text}"
    )


@dp.message(lambda message: message.contact is not None)
async def contact_handler(message: types.Message):
    """Handle contact sharing from Web App"""
    
    # Get contact from message
    contact = message.contact
    
    # Check if contact is from the same user (not someone else's contact)
    if contact.user_id != message.from_user.id:
        await message.answer("❌ Пожалуйста, поделитесь своим контактом, а не чужим.")
        return
    
    # Save phone number to database
    phone_number = contact.phone_number
    await add_or_update_user(
        user_id=message.from_user.id,
        username=message.from_user.username,
        phone=phone_number
    )
    
    logger.info(f"Contact received from user {message.from_user.id}: {phone_number}")
    
    # Send confirmation message
    await message.answer(
        "✅ Спасибо! Ваш номер телефона сохранен.\n\nТеперь вы можете продолжить оформление заказа в магазине."
    )


async def run_bot():
    """Run Telegram bot with polling"""
    logger.info("Starting Telegram bot...")

    # Initialize database
    await init_db()

    # Delete webhook to use polling
    await bot.delete_webhook(drop_pending_updates=True)

    # Start polling
    await dp.start_polling(bot)


async def run_fastapi():
    """Run FastAPI server"""
    logger.info("Starting FastAPI server on port 8000...")
    config = uvicorn.Config(
        app=fastapi_app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
    server = uvicorn.Server(config)
    await server.serve()


async def main():
    """Start both Telegram bot and FastAPI server"""
    logger.info("Starting services...")

    # Run both services concurrently
    await asyncio.gather(
        run_bot(),
        run_fastapi()
    )


if __name__ == "__main__":
    asyncio.run(main())
