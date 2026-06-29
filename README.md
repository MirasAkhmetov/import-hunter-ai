# ImportHunter AI

AI-ассистент по поиску прибыльных товаров для импорта в Казахстан.

Пользователь вставляет ссылку товара с Kaspi.kz — система находит аналоги на маркетплейсах Турции и ОАЭ, сравнивает цены и считает потенциальную прибыль.

## Возможности MVP

- Парсинг товара Kaspi (mock-режим + skeleton Playwright)
- Поиск аналогов: Trendyol, Hepsiburada, Amazon.ae, Noon
- AI-сопоставление товаров (mock + OpenAI)
- Расчёт прибыли, маржи и ROI
- Дашборд с AI Opportunities
- Настройки курсов валют и расходов
- Сохранение избранных товаров

## Технологии

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS + Shadcn UI
- Prisma + PostgreSQL
- Playwright (парсинг)
- OpenAI API (AI-сопоставление)
- Zod, React Hook Form, TanStack Table

## Установка

### 1. Клонирование и зависимости

```bash
cd "AI Parser"
npm install
```

### 2. Переменные окружения

Скопируйте `.env.example` в `.env`:

```bash
copy .env.example .env
```

Настройте переменные:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/import_hunter?schema=public"
OPENAI_API_KEY="sk-..."        # опционально
MOCK_MODE="true"               # true = демо-данные без реального парсинга
```

### 3. База данных

```bash
npx prisma db push
npx prisma generate
```

> Без PostgreSQL приложение работает в mock-режиме: UI и API функционируют, но данные не сохраняются в БД.

### 4. Запуск

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000)

## OpenAI API Key

1. Получите ключ на [platform.openai.com](https://platform.openai.com)
2. Добавьте в `.env`:

```env
OPENAI_API_KEY="sk-your-key-here"
MOCK_MODE="false"
```

Без ключа система использует эвристическое сопоставление и mock-рекомендации.

## Настройка курсов валют

Два способа:

1. **UI**: Страница `/settings` — курсы TRY/AED/CNY/USD, доставка, комиссии
2. **Код**: Дефолты в `lib/types.ts` → `DEFAULT_SETTINGS`

## Mock-режим

По умолчанию `MOCK_MODE=true`. Система возвращает демо-данные (Apple AirPods Pro 2) с аналогами на всех маркетплейсах.

Для реального парсинга:

```env
MOCK_MODE="false"
```

И установите Playwright:

```bash
npx playwright install chromium
```

## Структура проекта

```
app/
  dashboard/     — дашборд и AI Opportunities
  analyze/       — анализ товара по ссылке Kaspi
  analysis-history/ — история анализов
  products/      — список проанализированных товаров
  saved/         — избранное
  settings/      — настройки
  api/           — REST API

components/      — UI-компоненты
lib/
  parsers/       — парсеры маркетплейсов
  marketplaces/  — провайдеры по странам
  mock/          — демо-данные
  aiMatcher.ts   — AI-сопоставление
  profitCalculator.ts
  brand-finder/  — поиск правообладателей и дистрибьюторов
  analysis-history/ — сохранение и сравнение анализов
prisma/          — схема БД
```

## Как добавить новый marketplace provider

### 1. Создайте парсер

`lib/parsers/wildberries.ts`:

```typescript
import type { MarketplaceProvider } from "../marketplaces/provider";
import type { MarketplaceResultData, ParsedProduct, ProductSearchQuery } from "../types";

async function search(query: ProductSearchQuery): Promise<MarketplaceResultData[]> {
  // реализация поиска
  return [];
}

async function parseProduct(url: string): Promise<ParsedProduct> {
  // парсинг карточки товара
  throw new Error("Not implemented");
}

export const wildberriesProvider: MarketplaceProvider = {
  name: "Wildberries",
  marketplace: "wildberries",
  country: "RU",
  enabled: true,
  search,
  parseProduct,
};
```

### 2. Зарегистрируйте в регионе

`lib/marketplaces/russia.ts` (новый файл) или существующий регион:

```typescript
import { wildberriesProvider } from "../parsers/wildberries";

export const russiaProviders = [wildberriesProvider];
```

### 3. Добавьте в index

`lib/marketplaces/index.ts`:

```typescript
import { russiaProviders } from "./russia";

export const activeProviders = [
  ...turkeyProviders,
  ...uaeProviders,
  ...chinaProviders,
  ...russiaProviders,
];
```

### 4. Добавьте label

`lib/types.ts` → `MARKETPLACE_LABELS`:

```typescript
wildberries: "Wildberries",
```

### 5. Добавьте курс валюты и доставку (при необходимости)

В `lib/types.ts`, `prisma/schema.prisma`, `app/settings/page.tsx`.

## Формула прибыли

```
netProfit = kaspiPrice - purchasePrice - delivery - customs - kaspiCommission - tax - ads
margin% = netProfit / kaspiPrice × 100
roi% = netProfit / (purchasePrice + delivery + customs) × 100
```

## Новые модули (v0.3)

### Brand Owner & Distributor Finder

Модуль ищет правообладателей и дистрибьюторов бренда после анализа товара Kaspi.

**Где смотреть:** `/analyze` — блок «Правообладатель и дистрибьюторы» (после карточки Kaspi и результатов маркетплейсов).

**Как работает:**
1. После парсинга Kaspi система ищет бренд во **встроенной базе дистрибьюторов** (KZ → RU)
2. Дополнительно проверяются legal-terms на `.kz` / `.ru` и контакты на официальных сайтах
3. Confidence score 0–100 оценивает достоверность (BEEV, NAOS и др. — высокий балл)
4. Пользователь может проверить контакт вручную или добавить свой (с указанием sourceUrl)

**Production-правила:**
- SerpAPI / Google Search **не используются** — только база + официальные сайты
- Если бренда нет в базе: «Контакты не найдены» — добавьте вручную
- Mock-контакты **только** при `MOCK_MODE=true` **и** `MOCK_BRAND_CONTACTS_ENABLED=true` (по умолчанию `false`)
- При mock показывается баннер: **MOCK DATA — НЕ ИСПОЛЬЗОВАТЬ ДЛЯ РЕАЛЬНОЙ РАБОТЫ**

> Модуль не принимает юридических решений — только собирает данные. Решение об использовании контакта принимает пользователь.

**API:**
- `GET/POST /api/brand-contacts`
- `PATCH /api/brand-contacts/[id]`
- `POST /api/brand-contacts/find`
- `GET/PUT /api/company-profile`
- `POST /api/outreach-email/generate`
- `POST /api/outreach-email/mark-copied`
- `PATCH /api/outreach-email/[id]`

### Price Verification & Manual Cost Override

После сопоставления товаров система проверяет ссылки и источники цен.

**Правила:**
- `finalPrice = correctedPrice ?? originalPrice`
- Match score &lt; 85 → прибыль помечается как требующая проверки
- Mock-цены помечаются: **MOCK PRICE — не использовать для закупки**
- Ручная коррекция цены сохраняется в `PriceCorrectionHistory`

**UI:** вкладка «Прибыль» — переключатель ручного режима себестоимости, кнопка «Исправить цену», история коррекций.

**API:**
- `POST /api/price-correction/update`
- `GET /api/price-correction/history/[marketplaceResultId]`
- `POST /api/marketplace-result/verify-link`
- `POST /api/marketplace-result/confirm-product`
- `POST /api/marketplace-result/reject-product`
- `POST /api/profit/recalculate`

### История анализов

Каждый запуск анализа сохраняется как `AnalysisRun` со snapshot-данными.

**Страница:** `/analysis-history` — таблица всех анализов с фильтрами.

**Детали:** `/analysis-history/[id]` — сохранённые данные на момент анализа (цены, аналоги, прибыль, контакты брендов).

**Сравнение:** «Сравнить с предыдущим анализом» — изменения цены Kaspi, закупки, прибыли, ROI, маркетплейса.

**API:**
- `GET /api/analysis-history`
- `GET /api/analysis-history/[id]`
- `POST /api/analysis-history/re-run`
- `DELETE /api/analysis-history/[id]`

## Новые модули (v0.2)

| Страница | Описание |
|----------|----------|
| `/country-breakdown` | Разбивка по Турции, Китаю, ОАЭ |
| `/purchase-basket` | Закупочная корзина с расчётом по странам |
| `/watchlist` | Отслеживание цен и Buy Alert |
| `/alerts` | Уведомления «Срочно купить» |

### API

- `GET/POST /api/basket`, `/api/basket/add`, `/update`, `/remove`
- `GET/POST /api/watchlist`, `/add`, `/update`, `/remove`
- `GET/POST /api/alerts` (включая `action: check_prices`)
- `GET /api/country-breakdown`
- `GET /api/export/csv`, `/api/export/xlsx`
- `POST /api/manual-status/update`, `/api/notes/update`, `/api/favorite`

### Buy Alert

1. В таблице анализа включите «Отслеживать цену»
2. Укажите целевую цену, мин. прибыль и ROI
3. На `/alerts` нажмите «Проверить цены вручную» (mock)

## API Endpoints (базовые)

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/analyze` | Полный анализ товара |
| POST | `/api/kaspi` | Парсинг Kaspi |
| GET | `/api/marketplaces` | Список маркетплейсов |
| POST | `/api/profit` | Расчёт прибыли |
| GET | `/api/dashboard` | Статистика дашборда |
| GET | `/api/products/list` | Список товаров |
| GET/PUT | `/api/settings` | Настройки |

## Лицензия

MIT
