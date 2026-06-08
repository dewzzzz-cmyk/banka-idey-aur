# AI-оценка потенциала идей

**Дата:** 2026-06-08  
**Проект:** Банка Идей (portal-idea)  
**Статус:** Approved

---

## 1. Контекст и цель

Куратор вручную просматривает очередь идей и не имеет быстрого сигнала о том, какая идея наиболее перспективна. Цель — добавить ИИ-оценку потенциала каждой идеи, чтобы:

- Куратор мог приоритизировать очередь по баллу, а не только по SLA.
- Автор получал обратную связь от ИИ после подачи идеи.

---

## 2. Требования

| # | Требование |
|---|-----------|
| R1 | Оценка запускается автоматически при переводе идеи в статус `mod` |
| R2 | Куратор может запросить переоценку в любой момент |
| R3 | Оценка видна куратору в очереди (бейдж) и в детальной панели (полная разбивка) |
| R4 | Оценка видна автору на странице карточки идеи (статус ≥ `mod`) |
| R5 | Оценка не блокирует ответ API — запускается fire-and-forget |
| R6 | Структура оценки: три критерия + общий балл + текстовый комментарий |

---

## 3. Структура данных

### 3.1 Prisma — модель `Idea`

Добавить одно опциональное поле:

```prisma
model Idea {
  // ...existing fields...
  aiEvaluation  Json?   // AiEvaluation | null
}
```

### 3.2 Тип `AiEvaluation` (`packages/types/src/index.ts`)

```typescript
export interface AiEvaluation {
  impact:      number   // Потенциал влияния, 1–10
  feasibility: number   // Реализуемость, 1–10
  clarity:     number   // Проработанность описания, 1–10
  overall:     number   // Среднее взвешенное (округлено до 1 знака)
  summary:     string   // 2–3 предложения от ИИ на русском
  createdAt:   string   // ISO 8601 timestamp
}
```

`overall` вычисляется как `(impact * 0.4 + feasibility * 0.35 + clarity * 0.25)`.

### 3.3 `IdeaListItem` и детальный ответ идеи

Добавить поле `aiEvaluation?: AiEvaluation` в `IdeaListItem` в `packages/types`.

---

## 4. Бэкенд

### 4.1 Новый файл `apps/api/src/ai/evaluate.ts`

**Экспорт:** `evaluateIdea(ideaId: string): Promise<AiEvaluation>`

Логика:
1. Загрузить идею из БД (`prisma.idea.findUnique`)
2. Если не найдена — бросить ошибку
3. Сформировать промпт из полей `cardData` (title, problem, who, proposal, resources, effect)
4. Вызвать `generateObject` с `IdeaEvalSchema` (Zod)
5. Вычислить `overall`
6. Сохранить результат в `idea.aiEvaluation` через `prisma.idea.update`
7. Вернуть `AiEvaluation`

**Zod-схема** (без `overall` и `createdAt` — они вычисляются в коде):

```typescript
const IdeaEvalSchema = z.object({
  impact:      z.number().int().min(1).max(10),
  feasibility: z.number().int().min(1).max(10),
  clarity:     z.number().int().min(1).max(10),
  summary:     z.string().describe('2–3 предложения на русском: что сильно, что можно улучшить'),
})
```

После получения ответа от модели, `evaluateIdea` собирает полный объект явно:

```typescript
const evaluation: AiEvaluation = {
  ...result.object,
  overall: parseFloat(
    (result.object.impact * 0.4 + result.object.feasibility * 0.35 + result.object.clarity * 0.25).toFixed(1)
  ),
  createdAt: new Date().toISOString(),
}
await prisma.idea.update({ where: { id: ideaId }, data: { aiEvaluation: evaluation as any } })
return evaluation
```

Вызов `generateObject` должен включать таймаут: `abortSignal: AbortSignal.timeout(25_000)`.

**Системный промпт:** инструктирует модель оценивать по трём осям:
- *impact* — насколько широко затронута проблема, каков бизнес-эффект
- *feasibility* — реалистичность реализации при типичных корпоративных ресурсах
- *clarity* — полнота и конкретность описания (заполнены ли ключевые поля, есть ли цифры)

### 4.2 Триггеры запуска оценки

Оценка должна запускаться из **двух мест** — обе точки, где идея переходит в статус `mod`:

**`apps/api/src/router/idea.ts` — процедура `submit`** (основной триггер: автор подаёт идею):
```typescript
// После prisma.idea.update({ data: { status: 'mod' } })
evaluateIdea(input.id).catch((e) =>
  console.error('[AI eval] Failed for', input.id, e?.message)
)
```

**`apps/api/src/router/moderation.ts` — процедура `setStatus`** (триггер для ручного возврата в `mod`):
```typescript
// После успешного prisma.idea.update, если input.status === 'mod'
if (input.status === 'mod') {
  evaluateIdea(input.ideaId).catch((e) =>
    console.error('[AI eval] Failed for', input.ideaId, e?.message)
  )
}
```

Оба вызова — fire-and-forget, не блокируют ответ API.

### 4.3 Новая tRPC процедура `ai.requestEvaluation`

- **Путь:** `ai.requestEvaluation`
- **Input:** `z.object({ ideaId: z.string() })`
- **Auth:** использовать существующий `curatorProcedure` — он уже покрывает роли `curator`, `committee`, `admin`, `owner`
- **Действие:** вызывает `await evaluateIdea(ideaId)` (синхронно, с таймаутом), возвращает `AiEvaluation`
- **Таймаут:** см. секцию 4.1 — `generateObject` должен иметь `abortSignal: AbortSignal.timeout(25_000)`
- **Используется:** кнопка «Переоценить» в панели куратора

### 4.4 Включение `aiEvaluation` в ответы

**`idea.list` маппер:** добавить `aiEvaluation: idea.aiEvaluation as AiEvaluation | null` в объект `IdeaListItem`.

**`idea.getById`:** поле появится автоматически через `{ ...idea, ... }`, но нужно явно добавить в TypeScript-аннотацию возвращаемого типа, чтобы `Card.tsx` увидел поле без ошибки компилятора.

---

## 5. Фронтенд

### 5.1 Новый компонент `AiScoreBadge`

**Файл:** `apps/frontend/src/components/ui/AiScoreBadge.tsx`

Отображает: иконку ✦ + число `overall`. Цвет фона:
- `overall < 5` → красный
- `5 ≤ overall < 7.5` → жёлтый
- `overall ≥ 7.5` → зелёный

### 5.2 Новый компонент `AiEvalPanel`

**Файл:** `apps/frontend/src/components/ui/AiEvalPanel.tsx`

Props: `evaluation: AiEvaluation | null | undefined`, `onRefresh?: () => void`, `isLoading?: boolean`

Содержимое:
- Заголовок «Оценка потенциала ИИ» + кнопка «↻ Переоценить» (если `onRefresh` передан)
- Три строки с прогресс-баром: «Потенциал влияния», «Реализуемость», «Проработанность»
- Текст `summary`
- Если `isLoading` — скелетон вместо содержимого
- Если `evaluation == null` (loose equality — покрывает и `null`, и `undefined`) — текст «Оценка ещё не готова»

### 5.3 Изменения в `Curator.tsx`

**Список очереди:** в каждый `queue-item` добавить `<AiScoreBadge score={idea.aiEvaluation?.overall} />` рядом с `CatChip`.

**Детальная панель:** между секцией полей (`cur-fields`) и внутренним комментарием (`cur-internal`) вставить:

```tsx
<AiEvalPanel
  evaluation={sel.aiEvaluation}
  isLoading={requestEval.isPending}
  onRefresh={() => requestEval.mutate({ ideaId: sel.id })}
/>
```

Мутация:
```typescript
trpc.ai.requestEvaluation.useMutation({
  onSuccess: () => {
    utils.idea.list.invalidate()
    utils.idea.getById.invalidate({ id: sel.id }) // обновить детальную панель
  }
})
```

### 5.4 Изменения в `Card.tsx`

После блока полей карточки. Условие показа — идея прошла через оценку: `idea.status !== 'draft'` (любой статус кроме черновика). **Не использовать `MODERATED_STATUSES`** — он не включает `'mod'`, и автор не увидит оценку сразу после подачи.

```tsx
{idea.status !== 'draft' && (
  <AiEvalPanel evaluation={idea.aiEvaluation} />
)}
```

Без кнопки переоценки — только просмотр.

---

## 6. Миграция БД

```sql
ALTER TABLE "ideas" ADD COLUMN "aiEvaluation" JSONB;
```

Генерируется через `prisma migrate dev --name add_ai_evaluation`.

---

## 7. Порядок реализации

1. **Prisma** — добавить поле, сгенерировать миграцию
2. **Types** — добавить `AiEvaluation`, обновить `IdeaListItem`
3. **`evaluate.ts`** — реализовать функцию оценки
4. **`moderation.ts`** — добавить триггер
5. **`router/ai.ts`** — добавить процедуру `requestEvaluation`
6. **`router/idea.ts`** — включить `aiEvaluation` в маппер
7. **`AiScoreBadge`** — новый компонент
8. **`AiEvalPanel`** — новый компонент
9. **`Curator.tsx`** — интегрировать компоненты
10. **`Card.tsx`** — добавить блок оценки

---

## 8. Граничные случаи

| Случай | Поведение |
|--------|-----------|
| DeepSeek недоступен | `evaluateIdea` бросает, ошибка логируется, `aiEvaluation` остаётся `null` |
| Идея с пустыми полями | Промпт всё равно отправляется, ИИ даст низкий `clarity` |
| Переоценка во время активной оценки | Новая перезапись перетирает старую — race condition допустим (редкий) |
| Анонимная идея | Оценка не раскрывает автора — только содержание `cardData` |

---

## 9. Что не входит в scope

- Сортировка очереди по AI-баллу (отдельный тикет)
- Публичный показ оценки всем сотрудникам
- Настройка весов критериев в UI
