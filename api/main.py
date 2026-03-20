import asyncio
import logging
import os
import httpx
from dotenv import load_dotenv
import uvicorn

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
MAX_API_BASE = "https://platform-api.max.ru"

logger.info(f"APP_URL={APP_URL}")


class MaxBotClient:
    """HTTP client for MAX Bot API"""

    def __init__(self, token: str):
        self.token = token
        self.base_url = MAX_API_BASE
        self.headers = {"Authorization": token}

    async def send_message(self, chat_id: int, text: str,
                           attachments: list = None, format: str = None):
        """Send message to chat"""
        chat_id = int(chat_id)
        async with httpx.AsyncClient() as client:
            body = {"text": text}
            if attachments:
                body["attachments"] = attachments
            if format:
                body["format"] = format
            resp = await client.post(
                f"{self.base_url}/messages?chat_id={chat_id}",
                headers=self.headers,
                json=body
            )
            if resp.status_code >= 400:
                logger.error(f"MAX API error {resp.status_code}: {resp.text}")
            resp.raise_for_status()
            return resp.json()

    async def send_message_with_mini_app_button(self, chat_id: int, text: str,
                                                 button_text: str,
                                                 extra_attachments: list = None):
        """Send message with inline button that opens mini app"""
        keyboard_attachment = {
            "type": "inline_keyboard",
            "payload": {
                "buttons": [[
                    {
                        "type": "open_app",
                        "text": button_text
                    }
                ]]
            }
        }
        attachments = []
        if extra_attachments:
            attachments.extend(extra_attachments)
        attachments.append(keyboard_attachment)
        logger.info(f"Sending message with attachments: {attachments}")
        return await self.send_message(chat_id, text, attachments=attachments)

    async def send_callback_answer(self, callback_id: str, message: str = None):
        """Answer a callback query"""
        async with httpx.AsyncClient() as client:
            body = {"callback_id": callback_id}
            if message:
                body["message"] = {"text": message}
            resp = await client.post(
                f"{self.base_url}/answers",
                headers=self.headers,
                json=body
            )
            resp.raise_for_status()
            return resp.json()

    async def upload_photo(self, file_path: str) -> str:
        """Upload photo via POST /uploads and return the upload token"""
        async with httpx.AsyncClient() as client:
            with open(file_path, "rb") as f:
                resp = await client.post(
                    f"{self.base_url}/uploads",
                    headers=self.headers,
                    params={"type": "image"},
                    files={"file": (os.path.basename(file_path), f, "image/jpeg")}
                )
            if resp.status_code >= 400:
                logger.error(f"Upload error {resp.status_code}: {resp.text}")
            resp.raise_for_status()
            data = resp.json()
            logger.info(f"Upload response: {data}")
            return data.get("token") or data.get("url")

    async def get_updates(self, marker: int = None, types: list = None):
        """Get updates via long polling"""
        async with httpx.AsyncClient(timeout=35.0) as client:
            params = {}
            if marker is not None:
                params["marker"] = marker
            if types:
                params["types"] = ",".join(types)
            resp = await client.get(
                f"{self.base_url}/updates",
                headers=self.headers,
                params=params
            )
            resp.raise_for_status()
            return resp.json()


# --- Handlers ---

async def handle_bot_started(bot: MaxBotClient, update: dict):
    """Handle bot_started event — equivalent of /start in Telegram"""
    user = update.get("user", {})
    chat_id = update.get("chat_id")
    user_id = user.get("user_id")
    username = user.get("username")

    # Save user to database
    await add_or_update_user(user_id=user_id, username=username)

    caption = (
        "Цветы онлайн — это просто.\n"
        "Fan Fan Tulpan в MAX:\n"
        "выбрал букет, оформил доставку, подарил эмоции!!!\n\n"
        "Жми на кнопку и выбирай свежие цветы уже сейчас."
    )

    # Try to upload photo and send with image; fall back to text-only
    photo_attachment = None
    try:
        image_path = os.path.join(os.path.dirname(__file__), "images", "fanfan-main.jpg")
        photo_url = await bot.upload_photo(image_path)
        photo_attachment = [{"type": "image", "payload": {"url": photo_url}}]
    except (FileNotFoundError, httpx.HTTPError, KeyError) as e:
        logger.warning(f"Photo upload failed, sending text-only: {e}")

    await bot.send_message_with_mini_app_button(
        chat_id=chat_id,
        text=caption,
        button_text="\U0001f338 Открыть магазин",
        extra_attachments=photo_attachment
    )


async def handle_message_created(bot: MaxBotClient, update: dict):
    """Handle text messages — /mode command"""
    message = update.get("message", {})
    text = (message.get("body", {}).get("text") or "").strip()
    sender = message.get("sender", {})
    user_id = sender.get("user_id")
    chat_id = message.get("recipient", {}).get("chat_id")

    if text == "/start":
        username = sender.get("username")
        await add_or_update_user(user_id=user_id, username=username)
        await handle_bot_started(bot, {"user": sender, "chat_id": chat_id})
        return

    if text == "/mode":
        db_user = await get_user(user_id)
        if not db_user or db_user.get("role") != "ADMIN":
            await bot.send_message(int(chat_id), "Эта команда доступна только администраторам.")
            return

        current_mode = db_user.get("mode", "USER")
        mode_text = "администратора" if current_mode == "ADMIN" else "клиента"

        attachments = [{
            "type": "inline_keyboard",
            "payload": {
                "buttons": [
                    [{"type": "callback", "text": "\U0001f527 Режим администратора", "payload": "mode_admin"}],
                    [{"type": "callback", "text": "\U0001f464 Режим клиента", "payload": "mode_user"}]
                ]
            }
        }]
        await bot.send_message(
            int(chat_id),
            f"Текущий режим: {mode_text}\n\nВыберите режим работы:",
            attachments=attachments
        )


async def handle_message_callback(bot: MaxBotClient, update: dict):
    """Handle inline button callbacks — mode switching"""
    callback = update.get("callback", {})
    payload = callback.get("payload", "")
    callback_id = callback.get("callback_id")
    user = update.get("user", {})
    user_id = user.get("user_id")

    if payload.startswith("mode_"):
        # Check admin role before processing to prevent privilege escalation
        db_user = await get_user(user_id)
        if not db_user or db_user.get("role") != "ADMIN":
            await bot.send_callback_answer(
                callback_id, "Эта функция доступна только администраторам."
            )
            return

        new_mode = "ADMIN" if payload == "mode_admin" else "USER"
        await update_user_mode(user_id, new_mode)
        mode_text = "администратора" if new_mode == "ADMIN" else "клиента"
        await bot.send_callback_answer(
            callback_id, f"Режим изменен на: {mode_text}"
        )


# --- Polling loop ---

UPDATE_HANDLERS = {
    "bot_started": handle_bot_started,
    "message_callback": handle_message_callback,
    "message_created": handle_message_created,
}


async def run_bot():
    """Run MAX bot with long polling"""
    logger.info("Starting MAX bot...")
    await init_db()

    bot = MaxBotClient(token=BOT_TOKEN)
    marker = None

    while True:
        try:
            data = await bot.get_updates(
                marker=marker,
                types=["bot_started", "message_created", "message_callback"]
            )
            updates = data.get("updates", [])
            marker = data.get("marker", marker)

            for update in updates:
                update_type = update.get("update_type")
                handler = UPDATE_HANDLERS.get(update_type)
                if handler:
                    try:
                        await handler(bot, update)
                    except Exception as e:
                        logger.error(f"Error handling {update_type}: {e}", exc_info=True)

        except httpx.TimeoutException:
            continue  # normal for long polling
        except Exception as e:
            logger.error(f"Polling error: {e}", exc_info=True)
            await asyncio.sleep(5)


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
    """Start both MAX bot and FastAPI server"""
    logger.info("Starting services...")
    await asyncio.gather(
        run_bot(),
        run_fastapi()
    )


if __name__ == "__main__":
    asyncio.run(main())
