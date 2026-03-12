---
created: 2026-03-12
status: approved
branch: feature/max-migration
size: L
---

# Tech Spec: Migration from Telegram Mini App to MAX Mini App

## Solution

Full migration of FanFanTulpan from Telegram platform to MAX platform. The migration replaces all Telegram-specific APIs on both frontend and backend while preserving business logic, UI, and navigation unchanged.

**Frontend:** Replace Telegram WebApp SDK (`window.Telegram.WebApp`) with MAX Bridge API (`window.WebApp`). Rewrite type definitions, initialization hook, cart persistence (CloudStorage to server-side REST API), and dialog methods (`showAlert`/`showConfirm` to native `window.alert`/`window.confirm`). Remove `sendData()` and `expand()` calls (no MAX equivalents). Replace `openTelegramLink` with `openMaxLink`.

**Backend:** Replace aiogram dependency with direct HTTP calls via httpx to MAX Bot API (`platform-api.max.ru`). Rewrite initData validation (own HMAC-SHA256 instead of aiogram's utility), bot client with long polling, and notification sending. Add server-side cart storage (new `user_cart` table + REST API).

**Key constraint:** The HMAC-SHA256 validation algorithm is identical between Telegram and MAX (key = `"WebAppData"`, same data-check-string format). The `Authorization: tma <initData>` header format is preserved on both sides. The new validation must include `auth_date` expiry check (max 1 hour) to prevent initData replay attacks — aiogram's utility enforced this, and the custom implementation must preserve it.

## Architecture

### What we're building/modifying

**Frontend (app/):**
- **`types/max-webapp.d.ts`** (new) — Type definitions for MAX Bridge API replacing `telegram.d.ts`
- **`hooks/useMaxWebApp.ts`** (renamed from `useTelegramWebApp.ts`) — SDK initialization hook adapted for `window.WebApp`
- **`hooks/useCartPersistence.ts`** (rewrite) — Server-side cart via REST API instead of CloudStorage
- **`App.tsx`** (modify) — Replace dialog methods, links, imports
- **`components/Cart.tsx`** (modify) — Replace requestContact flow, remove sendData, replace dialogs
- **`components/AdminProductCard.tsx`** (modify) — Replace direct `window.Telegram` access with prop-based `initData`
- **`index.html`** (modify) — Replace SDK script tag
- **`components/DeliveryDateTimeModal.tsx`** (modify) — Replace direct `window.Telegram?.WebApp` access

**Backend (api/):**
- **`auth.py`** (rewrite) — Own HMAC-SHA256 validation replacing aiogram utility
- **`main.py`** (full rewrite) — MaxBotClient class with httpx, long polling, event handlers
- **`notifications.py`** (rewrite) — httpx POST to MAX Bot API, HTML to Markdown formatting
- **`routers/cart.py`** (new) — `GET/PUT/DELETE /api/cart` endpoints for server-side cart
- **`database.py`** (extend) — New `user_cart` table and cart CRUD functions
- **`fastapi_app.py`** (modify) — Register cart router
- **`requirements.txt`** (modify) — Remove aiogram

### How it works

**Auth flow (unchanged pattern):**
`window.WebApp.initData` → `Authorization: tma <initData>` header → `verify_init_data()` in `auth.py` → own HMAC-SHA256 validation → `user_id` extracted from JSON `user` field.

**Cart flow (new):**
1. On app open: `GET /api/cart` → load cart items from `user_cart` table → populate React state
2. On item add/remove/update: update React state → `PUT /api/cart` with full cart array
3. On order completion: `DELETE /api/cart` to clear server cart
4. Fallback: if API call fails, React state is preserved until next successful sync

**Bot flow (rewritten):**
1. `MaxBotClient` wraps httpx calls to `platform-api.max.ru` with `Authorization: <BOT_TOKEN>` header
2. Long polling via `GET /updates` with `marker` parameter for deduplication
3. `bot_started` event → save user + send welcome message with photo + inline keyboard button (`open_app` type)
4. `message_created` event → handle `/mode` command for admin mode switching
5. `message_callback` event → handle `mode_admin`/`mode_user` callback payloads (with admin role check — only users with `role == ADMIN` can switch modes)

**Contact flow (simplified):**
1. User presses "Заказать" with no phone → `window.confirm()` to request permission
2. Call `WebApp.requestContact()` → receive phone in callback
3. Call `PUT /users/me/phone` directly from frontend → phone saved
4. Continue order creation (no polling, no second button press)

## Decisions

### Decision 1: Server-side cart storage (not DeviceStorage)
**Decision:** Store cart on the server in `user_cart` table, accessed via REST API.
**Rationale:** User-spec requires cross-device cart sync. MAX's DeviceStorage is per-device and doesn't work on web platform. Server-side storage is the only option that meets requirements.
**Alternatives considered:** DeviceStorage + localStorage fallback — rejected because no cross-device sync and DeviceStorage doesn't work on web.

### Decision 2: Own HMAC-SHA256 validation (not a library)
**Decision:** Implement initData validation using Python's `hmac` and `hashlib` modules. Include `auth_date` expiry check (reject if older than 3600 seconds).
**Rationale:** The algorithm is simple (8 steps, ~30 lines). No MAX Python SDK exists. Using standard library avoids external dependencies. The algorithm is identical to Telegram's — well-documented and battle-tested. The `auth_date` check prevents replay attacks with captured initData.
**Alternatives considered:** None viable — no Python SDK for MAX exists.

### Decision 3: Rename auth function + update all imports (not alias)
**Decision:** Rename `verify_telegram_init_data` → `verify_init_data` across all files.
**Rationale:** Clean codebase without dead references. Only 5 files need updating. Alias approach leaves misleading `telegram` in function names.
**Alternatives considered:** Backward-compatible alias — rejected as unnecessary complexity for a full platform migration.

### Decision 4: Native dialogs instead of showAlert/showConfirm
**Decision:** Replace `webApp.showAlert()` with `window.alert()` and `webApp.showConfirm()` with `window.confirm()`.
**Rationale:** MAX Bridge API has no `showAlert`/`showConfirm` equivalents. Native browser dialogs work in all Mini App contexts. The existing code already has `window.alert()`/`window.confirm()` fallbacks in several places.
**Alternatives considered:** Custom modal UI components — rejected as overengineering; native dialogs are sufficient for error messages and confirmations.

### Decision 5: Remove sendData() without replacement
**Decision:** Remove `webApp.sendData()` call after order creation.
**Rationale:** MAX has no `sendData` equivalent. The order is already persisted via REST API before `sendData` is called. The bot does not process `sendData` payloads — manager notification goes through `notifications.py` called from the orders router. The `botData` payload is effectively dead code.
**Alternatives considered:** None — the call is redundant even in the Telegram version.

### Decision 6: Immediate cart sync (no debounce)
**Decision:** Send `PUT /api/cart` on every cart change immediately.
**Rationale:** Cart changes are infrequent (user adding/removing items). The PUT payload is small (array of `{good_id, count}`). Network overhead is negligible. Immediate sync ensures data consistency.
**Alternatives considered:** Debounced sync (batch changes over 500ms) — rejected as premature optimization adding complexity for no measurable benefit.

### Decision 7: Photo upload for welcome message
**Decision:** Upload welcome photo via MAX Bot API `POST /uploads`, then attach token to message.
**Rationale:** MAX requires separate upload step (unlike aiogram's `FSInputFile` which handles upload internally). If upload fails, send text-only message with button as fallback.
**Alternatives considered:** None — this is the only way to send photos via MAX Bot API.

## Data Models

### New table: `user_cart`

```sql
CREATE TABLE IF NOT EXISTS user_cart (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    good_id INTEGER NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (good_id) REFERENCES goods(id),
    UNIQUE(user_id, good_id)
)
```

- `user_id` — MAX user ID (same int64 format as Telegram)
- `good_id` — references `goods.id`
- `count` — quantity of items
- `UNIQUE(user_id, good_id)` — prevents duplicate entries, enables upsert pattern

### Cart API DTOs

```python
class CartItem(BaseModel):
    good_id: int
    count: int  # >= 1

class CartRequest(BaseModel):
    items: list[CartItem]

class CartResponseItem(BaseModel):
    good_id: int
    count: int
    name: str
    price: int  # kopecks
    image_url: str | None

class CartResponse(BaseModel):
    items: list[CartResponseItem]
```

### MAX WebApp types (TypeScript)

```typescript
interface MaxWebApp {
    initData: string;
    initDataUnsafe: {
        query_id?: string;
        user?: { id: number; first_name: string; last_name?: string; username?: string; language_code?: string; photo_url?: string };
        chat?: { id: number; type: string };
        auth_date: number;
        hash: string;
        start_param?: string;
    };
    platform: string;
    ready(): void;
    close(): void;
    openLink(url: string): void;
    openMaxLink(url: string): void;
    requestContact(callback?: (result: { status: string; data?: { phone_number?: string } }) => void): void;
    BackButton: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void };
    HapticFeedback: { impactOccurred(style: string): void; notificationOccurred(type: string): void; selectionChanged(): void };
}

interface Window {
    WebApp?: MaxWebApp;
}
```

## Dependencies

### New packages
None — all new functionality uses existing packages (`httpx` already in requirements.txt).

### Using existing (from project)
- `httpx` — HTTP client for MAX Bot API calls (bot, notifications)
- `hmac`, `hashlib` — Python stdlib for HMAC-SHA256 initData validation
- `aiosqlite` — async SQLite driver for `user_cart` table operations

### Removing
- `aiogram` — fully replaced by httpx + own HMAC validation

## Testing Strategy

**Feature size:** L

### Unit tests
No automated test infrastructure exists in the project. No unit tests will be added (consistent with project conventions).

### Integration tests
None — project has no test runner configured.

### E2E tests
None automated. Manual verification in MAX Mini App environment (see Agent Verification Plan and user-spec acceptance criteria).

### Build verification (automated by agent)
- `cd app && npm run build` — TypeScript compilation + Vite build without errors
- `cd app && npm run lint` — ESLint passes with 0 warnings
- `grep -r "window.Telegram" app/src/` — returns no results (all references removed)
- `docker-compose up --build` — full stack builds successfully
- `curl http://localhost:8000/api/health` — returns 200

## Agent Verification Plan

**Source:** user-spec "Как проверить — Агент" section.

### Verification approach
Agent verifies build integrity, code cleanliness (no Telegram references), Docker build, and API health. Manual verification in MAX Mini App is deferred to user (post-deploy).

### Per-task verification
| Task | Verify | What to check |
|------|--------|--------------|
| 1 (auth.py) | bash | `cd api && python -c "from auth import verify_init_data"` — import succeeds; no aiogram imports |
| 2 (main.py) | bash | `cd api && python -c "from main import MaxBotClient"` — import succeeds; no aiogram imports |
| 3 (notifications.py) | bash | `cd api && python -c "from notifications import send_order_notification_to_manager"` — succeeds; no aiogram |
| 4 (cart API) | curl | `GET /api/cart` → 200; `PUT /api/cart` → 200; `DELETE /api/cart` → 200 |
| 5 (requirements) | bash | `grep -q aiogram api/requirements.txt && exit 1 \|\| echo OK` |
| 6 (types + hook) | bash | `cd app && npx tsc --noEmit` — no TypeScript errors |
| 7 (cart persistence) | bash | `cd app && npm run build` — builds without errors |
| 8 (App.tsx) | bash | `cd app && npm run build && npm run lint` — passes |
| 9 (Cart.tsx) | bash | `cd app && npm run build && npm run lint` — passes |
| 10 (cleanup) | bash | `grep -r "window\.Telegram\|TelegramWebApp\|useTelegramWebApp" app/src/ && exit 1 \|\| echo OK` |
| 11 (integration) | bash | `docker-compose up --build -d && sleep 10 && curl -s http://localhost:8000/api/health` → 200 |

### Tools required
- `bash` — build commands, grep checks
- `curl` — API endpoint verification

## Risks

| Risk | Mitigation |
|------|-----------|
| `requestContact()` in MAX works differently than documented (callback format, Promise vs callback) | Implement per MAX documentation. If callback format differs, adjust at testing. Stub response handling allows quick iteration. |
| HMAC validation has subtle differences (encoding, URL-decode behavior, sort order) | Algorithm is documented as identical. Test with real MAX initData immediately at first deploy. If fails — compare step-by-step with `dev.max.ru/docs/webapps/validation`. |
| MAX Bot API update structure differs from documented examples | Long polling handler uses generic dict access with `.get()` defaults. Unknown update types are silently skipped. Log all raw updates in debug mode for troubleshooting. |
| Photo upload to MAX Bot API fails (format, size, endpoint) | Fallback: send text-only welcome message with button (no photo). Photo is non-critical. |
| `manager_chat_id` in MAX differs from Telegram user ID | Mandatory manual step before deploy: update `settings` table with MAX user ID of the manager. Documented in deploy checklist. |
| Long polling connection drops / duplicates events | `marker` parameter prevents duplicates. `try/except` with `asyncio.sleep(5)` on errors. `httpx.TimeoutException` is normal for long polling — continue silently. |

## Acceptance Criteria

Technical acceptance criteria (complement user-spec criteria):

- [ ] `npm run build` completes without TypeScript or Vite errors
- [ ] `npm run lint` passes with 0 errors and 0 warnings
- [ ] No references to `window.Telegram`, `TelegramWebApp`, `useTelegramWebApp`, or `telegram.d.ts` in `app/src/`
- [ ] File `app/src/types/telegram.d.ts` is deleted
- [ ] `aiogram` is not in `api/requirements.txt`
- [ ] No `import` statements referencing `aiogram` in any Python file
- [ ] `verify_init_data()` correctly validates HMAC-SHA256 signature (manual test with real MAX initData)
- [ ] `GET /api/cart` returns current user cart items with product details
- [ ] `PUT /api/cart` upserts cart items and returns updated cart
- [ ] `DELETE /api/cart` clears all cart items for user
- [ ] `user_cart` table created via `CREATE TABLE IF NOT EXISTS` in `init_db()`
- [ ] `verify_init_data()` rejects initData with `auth_date` older than 3600 seconds
- [ ] `verify_init_data()` returns generic 401 message (no internal error details)
- [ ] Mode callback handler checks admin role before processing (prevents privilege escalation)
- [ ] Notification failure does not affect order creation (fire-and-forget with logging)
- [ ] User-supplied fields in notifications are Markdown-escaped
- [ ] `PUT /api/cart` validates `good_id` exists and is active
- [ ] `docker-compose up --build` succeeds
- [ ] `GET /api/health` returns 200

## Implementation Tasks

<!-- Tasks are brief scope descriptions. AC, TDD, and detailed steps are created during task-decomposition. -->

### Wave 1 (backend — independent)

#### Task 1: Rewrite auth.py — own HMAC-SHA256 validation
- **Description:** Replace aiogram's `safe_parse_webapp_init_data` with own HMAC-SHA256 validation function including `auth_date` expiry check (max 3600s). Use generic 401 error message (no internal error details leaked). Rename `verify_telegram_init_data` → `verify_init_data` across all importing files (auth.py, dependencies.py, routers/users.py, routers/goods.py, routers/orders.py).
- **Skill:** code-writing
- **Reviewers:** code-reviewer, security-auditor
- **Verify:** bash — `python -c "from auth import verify_init_data"` succeeds; grep confirms no aiogram imports in auth.py
- **Files to modify:** `api/auth.py`, `api/dependencies.py`, `api/routers/users.py`, `api/routers/goods.py`, `api/routers/orders.py`
- **Files to read:** `api/auth.py` (current), `BACK_MAX_MIGRATION.md` (validation algorithm)

#### Task 2: Rewrite main.py — MaxBotClient + long polling
- **Description:** Replace aiogram Bot/Dispatcher with MaxBotClient class using httpx to `platform-api.max.ru`. Implement long polling via `GET /updates` with marker-based deduplication and error recovery (sleep on failure). Handlers: `bot_started` (welcome message with photo upload + fallback), `message_created` (/mode command with admin role check — non-admins get rejection message), `message_callback` (mode switching with admin role check to prevent privilege escalation). Cast `chat_id` to int before URL construction. Concurrent run with FastAPI via `asyncio.gather`.
- **Skill:** code-writing
- **Reviewers:** code-reviewer, security-auditor
- **Verify:** bash — `python -c "from main import MaxBotClient"` succeeds; grep confirms no aiogram imports
- **Files to modify:** `api/main.py`
- **Files to read:** `api/main.py` (current), `BACK_MAX_MIGRATION.md` (MaxBotClient, handlers, update structure)

#### Task 3: Rewrite notifications.py — httpx + Markdown
- **Description:** Replace aiogram.Bot with httpx POST to MAX Bot API for sending order notifications. Convert HTML formatting (`<b>` tags) to Markdown (`**bold**`). Escape Markdown special characters in user-supplied fields (postcard_text, delivery_address, item names). Wrap send in try/except — notification failure must not affect order creation (fire-and-forget with logging). Remove aiogram import entirely.
- **Skill:** code-writing
- **Reviewers:** code-reviewer, security-auditor
- **Verify:** bash — `python -c "from notifications import send_order_notification_to_manager"` succeeds; grep confirms no aiogram imports
- **Files to modify:** `api/notifications.py`
- **Files to read:** `api/notifications.py` (current), `BACK_MAX_MIGRATION.md` (notification implementation)

#### Task 4: Server-side cart — database + router + registration
- **Description:** Add `user_cart` table to `init_db()`. Create DB functions: `get_user_cart(user_id)`, `upsert_user_cart(user_id, items)`, `clear_user_cart(user_id)`. Create `routers/cart.py` with `GET /api/cart`, `PUT /api/cart`, `DELETE /api/cart` endpoints. Validate `good_id` exists in goods table with `status=NEW` and enforce reasonable `count` limit on PUT. Register router in `fastapi_app.py`. Add Pydantic DTOs to `models.py`.
- **Skill:** code-writing
- **Reviewers:** code-reviewer, security-auditor, test-reviewer
- **Verify:** curl — `GET /api/cart` → 200, `PUT /api/cart` → 200, `DELETE /api/cart` → 200
- **Files to modify:** `api/database.py`, `api/models.py`, `api/fastapi_app.py`
- **Files to create:** `api/routers/cart.py`
- **Files to read:** `api/database.py` (existing cart table pattern), `api/routers/orders.py` (router pattern), `api/auth.py` (dependency usage)

#### Task 5: Update requirements.txt
- **Description:** Remove `aiogram` from requirements.txt. Verify `httpx` is already listed. No new dependencies needed.
- **Skill:** code-writing
- **Reviewers:** code-reviewer
- **Verify:** bash — `grep -q aiogram api/requirements.txt && exit 1 || echo OK`
- **Files to modify:** `api/requirements.txt`
- **Files to read:** `api/requirements.txt` (current)

### Wave 2 (frontend — independent of each other, depend on Wave 1 for cart API)

#### Task 6: Create MAX WebApp types + initialization hook
- **Description:** Create `app/src/types/max-webapp.d.ts` with MaxWebApp interface and Window augmentation. Rename `useTelegramWebApp.ts` → `useMaxWebApp.ts` — change global object path from `window.Telegram?.WebApp` to `window.WebApp`, remove `expand()` call, remove CSS theme variable setting. Preserve null-check for graceful degradation when SDK is unavailable. Delete `app/src/types/telegram.d.ts`. Replace SDK script in `index.html`.
- **Skill:** code-writing
- **Reviewers:** code-reviewer
- **Verify:** bash — `cd app && npx tsc --noEmit` — no TypeScript errors
- **Files to modify:** `app/index.html`, `app/src/hooks/useTelegramWebApp.ts` (rename to `useMaxWebApp.ts`)
- **Files to create:** `app/src/types/max-webapp.d.ts`
- **Files to delete:** `app/src/types/telegram.d.ts`
- **Files to read:** `app/src/types/telegram.d.ts` (current types), `app/src/hooks/useTelegramWebApp.ts` (current hook), `FRONT_MAX_MIGRATION.md` (API mapping)

#### Task 7: Rewrite useCartPersistence.ts — server-side cart
- **Description:** Replace CloudStorage-based cart persistence with REST API calls to `GET/PUT/DELETE /api/cart`. Hook now accepts `initData: string` instead of `webApp` object. Add error handling: if API call fails, show user error message and preserve local React state. Update cart integration in `App.tsx` to pass `initData` instead of `webApp`.
- **Skill:** code-writing
- **Reviewers:** code-reviewer, test-reviewer
- **Verify:** bash — `cd app && npm run build` — builds without errors
- **Files to modify:** `app/src/hooks/useCartPersistence.ts`, `app/src/App.tsx`
- **Files to read:** `app/src/hooks/useCartPersistence.ts` (current), `app/src/App.tsx` (cart integration), `app/src/api/client.ts` (API call pattern)

#### Task 8: Update App.tsx — dialogs, links, imports
- **Description:** Replace `useTelegramWebApp` import with `useMaxWebApp`. Replace all `webApp.showAlert()` calls with `window.alert()`. Replace all `webApp.showConfirm()` calls with `window.confirm()`. Replace `openTelegramLink` with `openMaxLink`. Update support chat link building (`t.me` → `max.ru`, `tg://` → stub empty string for MAX deeplinks). Update all `TelegramWebApp` type references to `MaxWebApp`.
- **Skill:** code-writing
- **Reviewers:** code-reviewer
- **Verify:** bash — `cd app && npm run build && npm run lint` — passes
- **Files to modify:** `app/src/App.tsx`
- **Files to read:** `app/src/App.tsx` (current), `FRONT_MAX_MIGRATION.md` (dialog replacements, link changes)

#### Task 9: Update Cart.tsx — requestContact, remove sendData
- **Description:** Replace `webApp.showAlert()`/`showConfirm()` with native `window.alert()`/`window.confirm()`. Remove `webApp.sendData()` call and `botData` construction. Replace requestContact polling flow (15-attempt setInterval) with direct `WebApp.requestContact()` callback → `PUT /users/me/phone` → continue order. Update type references and hook import.
- **Skill:** code-writing
- **Reviewers:** code-reviewer, security-auditor
- **Verify:** bash — `cd app && npm run build && npm run lint` — passes
- **Files to modify:** `app/src/components/Cart.tsx`
- **Files to read:** `app/src/components/Cart.tsx` (current), `FRONT_MAX_MIGRATION.md` (Cart.tsx changes)

#### Task 10: Update AdminProductCard.tsx + remaining files
- **Description:** Replace `window.Telegram?.WebApp?.initData` with prop-based `initData` passed from parent component in `AdminProductCard.tsx` (handleDeleteImage, handleSave). Replace `window.Telegram?.WebApp` in `DeliveryDateTimeModal.tsx` with `window.WebApp`. Run global search to verify no remaining Telegram references exist in `app/src/`.
- **Skill:** code-writing
- **Reviewers:** code-reviewer
- **Verify:** bash — `grep -r "window\.Telegram\|TelegramWebApp\|useTelegramWebApp\|telegram\.d\.ts" app/src/ && exit 1 || echo OK`
- **Files to modify:** `app/src/components/AdminProductCard.tsx`, `app/src/components/DeliveryDateTimeModal.tsx`
- **Files to read:** `app/src/components/AdminProductCard.tsx`, `app/src/components/DeliveryDateTimeModal.tsx`

### Wave 3 (integration — depends on Wave 1 + Wave 2)

#### Task 11: Full integration build + Docker verification
- **Description:** Verify the complete stack builds and runs: `npm run build`, `npm run lint`, `docker-compose up --build`. Fix any remaining compilation errors, import mismatches, or runtime issues discovered during integration.
- **Skill:** code-writing
- **Reviewers:** code-reviewer
- **Verify:** bash — `docker-compose up --build -d && sleep 10 && curl -s http://localhost:8000/api/health | grep -q ok && echo OK`
- **Files to modify:** `docker-compose.yml`, `api/Dockerfile`, `app/Dockerfile` (if build issues arise)
- **Files to read:** `docker-compose.yml`, `api/Dockerfile`, `app/Dockerfile`

### Wave 3.5 (documentation — depends on Wave 3)

#### Task 11.5: Update project knowledge documentation
- **Description:** Update `.claude/skills/project-knowledge/references/` files (architecture.md, patterns.md, project.md) to reflect MAX platform: replace Telegram references with MAX equivalents (verify_init_data, useMaxWebApp, server-side cart, httpx bot client).
- **Skill:** documentation-writing
- **Reviewers:** code-reviewer
- **Verify:** bash — `grep -r "useTelegramWebApp\|verify_telegram_init_data\|CloudStorage\|aiogram" .claude/skills/project-knowledge/ && exit 1 || echo OK`
- **Files to modify:** `.claude/skills/project-knowledge/references/architecture.md`, `.claude/skills/project-knowledge/references/patterns.md`, `.claude/skills/project-knowledge/references/project.md`
- **Files to read:** Current versions of the above files

### Final Wave

#### Task 12: Pre-deploy QA
- **Description:** Acceptance testing: verify all build checks pass (`npm run build`, `npm run lint`, `docker-compose up --build`), confirm no Telegram references in codebase, verify API health and cart endpoints return correct responses. Check all acceptance criteria from user-spec and tech-spec.
- **Skill:** pre-deploy-qa
- **Reviewers:** none
- **Verify:** All acceptance criteria from tech-spec and user-spec confirmed as passing
- **Files to read:** `work/max-frontend-migration/tech-spec.md`, `work/max-frontend-migration/user-spec.md`

#### Task 13: Deploy
- **Description:** Deploy to production. Update `api/.env` with MAX bot token and app URL. Update `manager_chat_id` in settings table. Run `docker-compose up --build -d`. Verify `GET /api/health` returns 200.
- **Skill:** deploy-pipeline
- **Reviewers:** code-reviewer, security-auditor, deploy-reviewer

#### Task 14: Post-deploy verification
- **Description:** Manual verification in MAX Mini App environment. All user flows from user-spec: bot welcome message, Mini App opening, catalog loading, cart persistence, order placement (COURIER + PICKUP), requestContact, manager notification, /mode command, admin CRUD.
- **Skill:** post-deploy-qa
- **Reviewers:** none
