# Кино — рейтинги фильмов из Telegram-канала

Небольшое веб-приложение для пары: отслеживание фильмов по ссылкам КиноПоиск из приватного Telegram-канала и раздельные оценки (1–10 звёзд) для «Я» и «Она».

## Стек

- **Next.js 14** (App Router), TypeScript, Tailwind CSS
- **Vercel Postgres** + Prisma ORM
- **Telegram Bot API** (вебхук)
- **kinopoisk.dev API** (данные о фильмах)

---

## A) Настройка Telegram

1. **Создайте бота** в [@BotFather](https://t.me/BotFather):
   - Отправьте `/newbot`, следуйте инструкциям.
   - Сохраните выданный **TELEGRAM_BOT_TOKEN**.

2. **Добавьте бота администратором** в ваш приватный канал:
   - Управление каналом → Администраторы → Добавить администратора → выберите бота.
   - Нужны права на чтение сообщений (достаточно прав по умолчанию).

3. **Установите вебхук** после деплоя на Vercel:
   - URL вебхука должен быть **ровно один**: `https://kino-ratings.vercel.app/api/telegram/webhook` (или ваш продакшен-домен).
   - В запросе setWebhook обязательно укажите `secret_token` — строка должна **совпадать** с переменной окружения **TELEGRAM_WEBHOOK_SECRET** в Vercel. Если секрет не совпадает или не задан, запросы будут отклоняться с 401.

   Пример (подставьте свои значения):

   ```bash
   curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url":"https://kino-ratings.vercel.app/api/telegram/webhook","secret_token":"<TELEGRAM_WEBHOOK_SECRET>"}'
   ```

   В настройках проекта Vercel добавьте переменную окружения:
   - **TELEGRAM_WEBHOOK_SECRET** — та же строка, что и `secret_token` при вызове setWebhook. Без неё вебхук возвращает 401.
   - Заголовок запроса от Telegram: `X-Telegram-Bot-Api-Secret-Token` — сравнивается с этой переменной.

4. **История канала**: полный автоматический импорт истории канала через Bot API недоступен. Для старых постов используйте страницу **Импорт** (`/import`): вставьте ссылки на КиноПоиск (по одной на строку) или загрузите .txt файл.

---

## B) API КиноПоиск (kinopoisk.dev)

1. Зарегистрируйтесь на [kinopoisk.dev](https://kinopoisk.dev) и получите **API-ключ**.
2. В Vercel (и в локальном `.env`) добавьте переменную:
   - **KINOPOISK_API_KEY** — ваш ключ.

Данные о фильмах кэшируются в БД. У каждого фильма есть статус загрузки данных (**detailsStatus**): `pending` (загружаем), `ready` (данные есть), `failed` (не удалось загрузить). При поступлении ссылки из Telegram или при импорте данные с КиноПоиск подгружаются синхронно; при сбое можно нажать «Обновить данные» на странице фильма. Обновление кэша — раз в 7 дней или вручную.

---

## C) База данных и Vercel

1. В [Vercel](https://vercel.com) создайте проект и подключите **Vercel Postgres** (Storage → Create Database → Postgres).
2. Переменная **DATABASE_URL** подставится автоматически (или скопируйте её в Environment Variables).
3. Локально создайте файл `.env` и добавьте туда `DATABASE_URL` (и при необходимости остальные переменные).
4. Выполните миграции и генерацию Prisma:

   ```bash
   pnpm install
   pnpm db:migrate
   ```

   При первом запуске создайте миграцию:

   ```bash
   pnpm exec prisma migrate dev --name init
   ```

   На Vercel миграции можно запустить вручную (например, через скрипт в package.json и одну деплой-команду) или использовать `prisma migrate deploy` в build/деплое.

   Рекомендуется один раз выполнить `prisma migrate deploy` в среде Vercel (например, добавив в `package.json` скрипт `"vercel-build": "prisma generate && prisma migrate deploy && next build"` и в настройках Build Command указать `pnpm run vercel-build`).

---

## D) Локальная разработка

1. Установка зависимостей:

   ```bash
   pnpm install
   ```

2. Создайте `.env` с переменными:
   - `DATABASE_URL`
   - `TELEGRAM_BOT_TOKEN` (по желанию, для отладки)
   - `TELEGRAM_WEBHOOK_SECRET`
   - `KINOPOISK_API_KEY`

3. Запуск:

   ```bash
   pnpm dev
   ```

   Приложение будет доступно по адресу http://localhost:3000.

4. **Проверка вебхука локально**: Telegram не может слать запросы на localhost. Можно использовать туннель (ngrok, cloudflared и т.п.):
   - Поднимите туннель на порт 3000.
   - Установите вебхук на URL вида `https://ваш-туннель.ngrok.io/api/telegram/webhook` с тем же `secret_token`.
   - В `.env` укажите тот же `TELEGRAM_WEBHOOK_SECRET`.

   **Тест вебхука вручную (curl):**

   ```bash
   curl -X POST http://localhost:3000/api/telegram/webhook \
     -H "Content-Type: application/json" \
     -H "X-Telegram-Bot-Api-Secret-Token: <TELEGRAM_WEBHOOK_SECRET>" \
     -d '{"update_id":1,"channel_post":{"message_id":1,"chat":{"id":-1001234567890},"date":1234567890,"text":"https://www.kinopoisk.ru/film/123456/"}}'
   ```

   Ответ `{"ok":true}` и появление фильма в списке означают, что вебхук работает. Без правильного заголовка секрета — 401.

---

## Переменные окружения (сводка)

| Переменная | Описание |
|------------|----------|
| `DATABASE_URL` | Строка подключения PostgreSQL (Vercel Postgres подставляет сама) |
| `TELEGRAM_BOT_TOKEN` | Токен бота от @BotFather (для setWebhook; в коде вебхука не используется) |
| `TELEGRAM_WEBHOOK_SECRET` | Секрет для проверки запросов вебхука (заголовок `X-Telegram-Bot-Api-Secret-Token`) |
| `KINOPOISK_API_KEY` | Ключ API kinopoisk.dev |

---

## Страницы и функции

- **/** — список фильмов: фильтр по статусу (в очереди / просмотрено / отложено), по отсутствию оценок («Я» / «Она» / оба), поиск по названию. Две колонки оценок (звёзды 1–10) и комментарии.
- **/movie/[id]** — карточка фильма: постер, описание, актёры, статус, дата просмотра, оценки и комментарии «Я» и «Она», кнопка обновления данных с КиноПоиск.
- **/import** — ручной импорт: вставка ссылок КиноПоиск (по одной на строку) или загрузка .txt файла; дубликаты не создаются.

Формат постов в канале: одна ссылка на фильм или сериал КиноПоиск в сообщении (поддерживаются `kinopoisk.ru/film/<id>` и `kinopoisk.ru/series/<id>`).
