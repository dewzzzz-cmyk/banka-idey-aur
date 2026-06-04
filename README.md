# Банка Идей — Корпоративный портал рацпредложений

«Банка Идей» — корпоративный портал рационализаторских предложений АУР. Слоган: «Открой идею».

Полнофункциональный портал для сбора и управления рационализаторскими предложениями сотрудников. Запускается в Docker.

## Требования

- Docker Desktop 4.x+ с Docker Compose V2
- 8+ ГБ RAM (для Ollama LLM)
- 15+ ГБ свободного места (модели Ollama ~5-10 ГБ)
- Интернет при первом запуске (скачивание моделей)

## Быстрый старт (dev)

```bash
# 1. Скопировать конфигурацию
cp .env.example .env.dev

# 2. Заполнить секреты в .env.dev
#    POSTGRES_PASSWORD=your_password
#    SESSION_SECRET=your_random_32_char_string

# 3. Запустить (первый раз долго — скачиваются модели)
docker compose up --build

# 4. Открыть в браузере
open http://localhost
```

Первый запуск: Ollama скачивает модели (~5-10 ГБ). Прогресс виден в логах:
`docker compose logs -f ollama`

Все сервисы готовы когда `docker compose ps` показывает `healthy` для всех.

## Тестовые аккаунты

| Email | Пароль | Роль |
|-------|--------|------|
| anna@company.ru | test123 | Сотрудник |
| curator@company.ru | test123 | Куратор |
| impl@company.ru | test123 | Реализатор |
| admin@company.ru | test123 | Администратор |
| owner@company.ru | test123 | Владелец программы |

## Production деплой

```bash
# Скопировать и заполнить production конфигурацию
cp .env.example .env
# Заполнить POSTGRES_PASSWORD, SESSION_SECRET с надёжными значениями

# Запустить в production режиме
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

## Архитектура

```
portal-idea/
├── apps/
│   ├── frontend/     # Vite + React 18 + TypeScript
│   └── api/          # Fastify + tRPC + Prisma
├── packages/
│   └── types/        # Общие типы
├── infra/
│   ├── nginx/        # nginx.conf (prod), nginx.dev.conf (dev)
│   └── ollama/       # entrypoint.sh (скачивание моделей)
└── docker-compose.yml
```

**Docker сервисы:**
- `nginx` — reverse proxy (dev: Vite proxy, prod: статика)
- `api` — Fastify API, порт 3000
- `postgres` — PostgreSQL 16 + pgvector + pg_trgm
- `ollama` — локальный LLM (Qwen2.5-7B + nomic-embed-text)

## Управление

```bash
# Логи
docker compose logs -f api
docker compose logs -f ollama

# Остановить
docker compose down

# Сбросить все данные
docker compose down -v

# Prisma Studio (GUI для БД)
docker compose exec api pnpm db:studio

# Пересеять БД
docker compose exec api pnpm db:seed
```

## Переменные окружения

| Переменная | Описание |
|-----------|----------|
| `POSTGRES_PASSWORD` | Пароль PostgreSQL |
| `SESSION_SECRET` | Секрет сессий (мин. 32 символа) |
| `OLLAMA_MODEL` | LLM модель (default: qwen2.5:7b-instruct-q5_K_M) |
| `OLLAMA_EMBED_MODEL` | Embedding модель (default: nomic-embed-text) |
| `LDAP_URL` | URL LDAP/AD сервера (опционально) |
| `SMTP_HOST` | SMTP для email уведомлений (опционально) |

## Экраны

1. **Главная** — лента идей, топ недели, счётчики
2. **Подать идею** — чат с ИИ-помощником
3. **Карточка идеи** — редактирование и отправка на модерацию
4. **Рейтинги** — топ, в работе, зал славы
5. **Личный кабинет** — мои идеи, баллы, вознаграждения
6. **Модерация** — очередь идей для кураторов
7. **Реализация** — трекинг внедрения идей
8. **Аналитика** — KPI, воронка, эффект
9. **Администрирование** — промт ИИ, пользователи, настройки
