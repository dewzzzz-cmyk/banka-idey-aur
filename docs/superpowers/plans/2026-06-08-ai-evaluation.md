# AI Evaluation Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add AI-powered potential scoring for ideas — automatically evaluated when submitted to moderation, visible to curators (queue badge + full panel) and to the idea author (card page).

**Architecture:** A new `evaluateIdea(ideaId)` function calls DeepSeek via `generateObject`, saves a structured `AiEvaluation` JSON blob into `Idea.aiEvaluation`. Two triggers (fire-and-forget) launch it: `idea.submit` and `moderation.setStatus → 'mod'`. A new `ai.requestEvaluation` tRPC procedure lets curators re-evaluate. Two new React components (`AiScoreBadge`, `AiEvalPanel`) render the score in the moderation queue and on the idea card.

**Tech Stack:** Prisma (PostgreSQL JSONB), tRPC, Vercel AI SDK (`generateObject`), DeepSeek `deepseek-chat`, React + TypeScript, plain CSS.

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Modify | `apps/api/prisma/schema.prisma` | Add `aiEvaluation Json?` to Idea model |
| Modify | `packages/types/src/index.ts` | Add `AiEvaluation` interface; add field to `IdeaListItem` |
| **Create** | `apps/api/src/ai/evaluate.ts` | `evaluateIdea()` — calls DeepSeek, saves result |
| Modify | `apps/api/src/router/ai.ts` | Add `requestEvaluation` curator procedure |
| Modify | `apps/api/src/router/idea.ts` | Fire-and-forget in `submit`; add `aiEvaluation` to list mapper |
| Modify | `apps/api/src/router/moderation.ts` | Fire-and-forget in `setStatus` when `→ mod` |
| **Create** | `apps/frontend/src/components/ui/AiScoreBadge.tsx` | Small score chip for queue list |
| **Create** | `apps/frontend/src/components/ui/AiEvalPanel.tsx` | Full breakdown panel |
| Modify | `apps/frontend/src/styles/screens.css` | CSS for new components |
| Modify | `apps/frontend/src/pages/Curator.tsx` | Badge in list + panel in detail |
| Modify | `apps/frontend/src/pages/Card.tsx` | Evaluation block for author |

---

## Task 1: Prisma migration — add `aiEvaluation` field

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Add field to Idea model**

Open `apps/api/prisma/schema.prisma`. After line `embedding Unsupported("vector(768)")?` add:

```prisma
  aiEvaluation   Json?
```

The Idea model block should now look like:
```prisma
model Idea {
  id             String    @id @default(cuid())
  // ... other fields ...
  embedding      Unsupported("vector(768)")?
  aiEvaluation   Json?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  // ... relations ...
}
```

- [ ] **Step 2: Generate and apply migration**

```bash
cd apps/api
npx prisma migrate dev --name add_ai_evaluation
```

Expected output: `✔  Generated Prisma Client` and migration applied.

- [ ] **Step 3: Verify Prisma client regenerated**

```bash
npx prisma generate
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/
git commit -m "feat(db): add aiEvaluation Json field to Idea"
```

---

## Task 2: Types — `AiEvaluation` interface + `IdeaListItem` update

**Files:**
- Modify: `packages/types/src/index.ts`

- [ ] **Step 1: Add `AiEvaluation` interface**

In `packages/types/src/index.ts`, after the `AiCollectedFields` interface, add:

```typescript
export interface AiEvaluation {
  impact:      number   // Потенциал влияния, 1–10
  feasibility: number   // Реализуемость, 1–10
  clarity:     number   // Проработанность описания, 1–10
  overall:     number   // Взвешенное среднее (impact×0.4 + feasibility×0.35 + clarity×0.25)
  summary:     string   // 2–3 предложения от ИИ на русском
  createdAt:   string   // ISO 8601
}
```

- [ ] **Step 2: Add `aiEvaluation` to `IdeaListItem`**

In the `IdeaListItem` interface, after `effectFact?: string` add:

```typescript
  aiEvaluation?: AiEvaluation
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd packages/types
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/types/src/index.ts
git commit -m "feat(types): add AiEvaluation interface and IdeaListItem field"
```

---

## Task 3: Backend — `evaluate.ts` core function

**Files:**
- Create: `apps/api/src/ai/evaluate.ts`

- [ ] **Step 1: Create the file**

Create `apps/api/src/ai/evaluate.ts` with the following content:

```typescript
import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'
import { prisma } from '../db.js'
import type { AiEvaluation } from '@portal/types'

function getAIClient() {
  if (process.env.DEEPSEEK_API_KEY) {
    return createOpenAI({
      baseURL: 'https://api.deepseek.com/v1',
      apiKey: process.env.DEEPSEEK_API_KEY,
    })
  }
  return createOpenAI({
    baseURL: `${process.env.OLLAMA_BASE_URL ?? 'http://ollama:11434'}/v1`,
    apiKey: 'ollama',
  })
}

function getModelName() {
  if (process.env.DEEPSEEK_API_KEY) {
    return process.env.DEEPSEEK_MODEL ?? 'deepseek-chat'
  }
  return process.env.OLLAMA_MODEL ?? 'qwen2.5:7b'
}

const IdeaEvalSchema = z.object({
  impact: z
    .number()
    .int()
    .min(1)
    .max(10)
    .describe(
      'Потенциал влияния: насколько широко затронута проблема и каков бизнес-эффект. 1=очень локально/незначительно, 10=затрагивает всю компанию/критично',
    ),
  feasibility: z
    .number()
    .int()
    .min(1)
    .max(10)
    .describe(
      'Реализуемость: насколько реалистично внедрить при типичных корпоративных ресурсах. 1=нереалистично, 10=легко внедряется',
    ),
  clarity: z
    .number()
    .int()
    .min(1)
    .max(10)
    .describe(
      'Проработанность: полнота и конкретность описания — заполнены ли ключевые поля, есть ли цифры и конкретика. 1=расплывчато/пусто, 10=детально с цифрами',
    ),
  summary: z
    .string()
    .describe(
      '2–3 предложения на русском: что сильно в идее и что можно улучшить. Конструктивно и по делу.',
    ),
})

const SYSTEM_PROMPT = `Ты — эксперт по оценке рационализаторских предложений в корпоративной среде.
Тебе дают описание идеи сотрудника. Оцени её по трём критериям:
- impact (потенциал влияния): масштаб проблемы и бизнес-ценность решения
- feasibility (реализуемость): насколько идею реально внедрить с типичными корпоративными ресурсами
- clarity (проработанность): насколько конкретно и полно описана идея

Будь объективен и строг. Если данных мало — снижай clarity. Если идея узкая — снижай impact.
Давай честные оценки, а не завышенные.`

export async function evaluateIdea(ideaId: string): Promise<AiEvaluation> {
  const idea = await prisma.idea.findUnique({ where: { id: ideaId } })
  if (!idea) throw new Error(`Idea not found: ${ideaId}`)

  const cd = idea.cardData as Record<string, string>
  const prompt = [
    cd.title       ? `Название: ${cd.title}` : '',
    cd.problem     ? `Проблема: ${cd.problem}` : '',
    cd.who         ? `Кого касается: ${cd.who}` : '',
    cd.proposal    ? `Предложение: ${cd.proposal}` : '',
    cd.resources   ? `Ресурсы: ${cd.resources}` : '',
    cd.effect      ? `Ожидаемый эффект: ${cd.effect}` : '',
    cd.effectEstimate ? `Оценка эффекта: ${cd.effectEstimate}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const aiClient = getAIClient()
  const model = getModelName()

  const result = await generateObject({
    model: aiClient(model),
    schema: IdeaEvalSchema,
    system: SYSTEM_PROMPT,
    prompt,
    temperature: 0.3,
    abortSignal: AbortSignal.timeout(25_000),
  })

  const evaluation: AiEvaluation = {
    ...result.object,
    overall: parseFloat(
      (
        result.object.impact * 0.4 +
        result.object.feasibility * 0.35 +
        result.object.clarity * 0.25
      ).toFixed(1),
    ),
    createdAt: new Date().toISOString(),
  }

  await prisma.idea.update({
    where: { id: ideaId },
    data: { aiEvaluation: evaluation as any },
  })

  return evaluation
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/api
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/ai/evaluate.ts
git commit -m "feat(api): add evaluateIdea() AI scoring function"
```

---

## Task 4: API triggers + `requestEvaluation` procedure

**Files:**
- Modify: `apps/api/src/router/idea.ts` (lines 140–167, `submit` mutation)
- Modify: `apps/api/src/router/moderation.ts` (lines 6–56, `setStatus` mutation)
- Modify: `apps/api/src/router/ai.ts`

- [ ] **Step 1: Add import to `idea.ts`**

At the top of `apps/api/src/router/idea.ts`, after existing imports, add:

```typescript
import { evaluateIdea } from '../ai/evaluate.js'
```

- [ ] **Step 2: Add fire-and-forget in `idea.ts` submit**

In the `submit` mutation, after `return updated` (line 166), add the trigger **before** the return:

```typescript
  submit: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const idea = await ctx.prisma.idea.findUniqueOrThrow({
        where: { id: input.id, authorId: ctx.user.id },
      })
      const updated = await ctx.prisma.idea.update({
        where: { id: input.id },
        data: { status: 'mod' },
      })
      await ctx.prisma.ideaStatusLog.create({
        data: {
          ideaId: input.id,
          fromStatus: idea.status,
          toStatus: 'mod',
          actorId: ctx.user.id,
        },
      })
      await ctx.prisma.pointLedger.create({
        data: {
          userId: ctx.user.id,
          delta: 10,
          reason: 'idea_submitted',
          refIdeaId: input.id,
        },
      })
      // fire-and-forget — does not block the response
      evaluateIdea(input.id).catch((e) =>
        console.error('[AI eval] Failed for', input.id, e?.message),
      )
      return updated
    }),
```

- [ ] **Step 3: Add import + trigger to `moderation.ts`**

At the top of `apps/api/src/router/moderation.ts`, after existing imports, add:

```typescript
import { evaluateIdea } from '../ai/evaluate.js'
```

In the `setStatus` mutation, after `return updated` (currently the last line before the closing brace), add the trigger **before** `return updated`:

```typescript
      if (MODERATED_STATUSES.includes(input.status as any)) {
        await enqueueReindex(input.ideaId)
      }
      // Re-evaluate when idea returns to moderation queue
      if (input.status === 'mod') {
        evaluateIdea(input.ideaId).catch((e) =>
          console.error('[AI eval] Failed for', input.ideaId, e?.message),
        )
      }
      return updated
```

- [ ] **Step 4: Add `requestEvaluation` to `ai.ts`**

Replace the content of `apps/api/src/router/ai.ts` with:

```typescript
import { z } from 'zod'
import { router, protectedProcedure, curatorProcedure } from '../trpc.js'
import { evaluateIdea } from '../ai/evaluate.js'

export const aiRouter = router({
  // Streaming happens via POST /api/ai/stream (SSE, not tRPC)
  sendMessage: protectedProcedure
    .input(z.object({ sessionId: z.string().optional(), message: z.string() }))
    .mutation(async () => {
      return { streaming: true, endpoint: '/api/ai/stream' }
    }),

  getSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.aiSession.findFirst({
        where: { id: input.sessionId, userId: ctx.user.id },
      })
    }),

  checkDuplicate: protectedProcedure
    .input(z.object({ text: z.string() }))
    .query(async ({ ctx }) => {
      const ideas = await ctx.prisma.idea.findMany({
        where: { status: { in: ['list', 'expert', 'work', 'done'] } },
        select: { id: true, cardData: true },
        take: 5,
      })
      return {
        similarIdeas: ideas.map((i) => ({
          id: i.id,
          title: (i.cardData as any).title ?? '',
        })),
      }
    }),

  requestEvaluation: curatorProcedure
    .input(z.object({ ideaId: z.string() }))
    .mutation(async ({ input }) => {
      return evaluateIdea(input.ideaId)
    }),
})
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd apps/api
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/router/ai.ts apps/api/src/router/idea.ts apps/api/src/router/moderation.ts
git commit -m "feat(api): add evaluation triggers and requestEvaluation procedure"
```

---

## Task 5: Include `aiEvaluation` in API responses

**Files:**
- Modify: `apps/api/src/router/idea.ts`

- [ ] **Step 1: Add `aiEvaluation` to `idea.list` mapper**

In `apps/api/src/router/idea.ts`, in the `list` query, add the import at the top:

```typescript
import type { IdeaCardData, AiEvaluation } from '@portal/types'
```

In the mapper object (lines 64–83), after `effectFact: ...` add:

```typescript
          aiEvaluation: (i.aiEvaluation as AiEvaluation | null) ?? undefined,
```

The full mapper should end like:
```typescript
          assigneeName: (i.implementation as any)?.assignee?.name ?? undefined,
          dueDate: (i.implementation as any)?.dueDate?.toISOString() ?? undefined,
          effectFact: (i.implementation as any)?.effectFact ?? undefined,
          aiEvaluation: (i.aiEvaluation as AiEvaluation | null) ?? undefined,
        })),
```

- [ ] **Step 2: Verify `idea.getById` includes the field**

In `idea.getById`, the line `return { ...idea, votedByMe: idea.votes.length > 0 }` spreads all Prisma fields including `aiEvaluation`. TypeScript needs to know the type. Add a return type annotation to the query:

Find the line:
```typescript
      return { ...idea, votedByMe: idea.votes.length > 0 }
```

Change to:
```typescript
      return { ...idea, votedByMe: idea.votes.length > 0, aiEvaluation: idea.aiEvaluation as AiEvaluation | null | undefined }
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/api
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/router/idea.ts
git commit -m "feat(api): expose aiEvaluation in idea.list and getById responses"
```

---

## Task 6: Frontend components — `AiScoreBadge` + `AiEvalPanel`

**Files:**
- Create: `apps/frontend/src/components/ui/AiScoreBadge.tsx`
- Create: `apps/frontend/src/components/ui/AiEvalPanel.tsx`
- Modify: `apps/frontend/src/styles/screens.css`

- [ ] **Step 1: Create `AiScoreBadge.tsx`**

```typescript
// apps/frontend/src/components/ui/AiScoreBadge.tsx
interface Props {
  score?: number
}

export function AiScoreBadge({ score }: Props) {
  if (score == null) return null
  const cls =
    score >= 7.5 ? 'ai-score-badge green' :
    score >= 5   ? 'ai-score-badge yellow' :
                   'ai-score-badge red'
  return (
    <span className={cls}>
      ✦ {score.toFixed(1)}
    </span>
  )
}
```

- [ ] **Step 2: Create `AiEvalPanel.tsx`**

```typescript
// apps/frontend/src/components/ui/AiEvalPanel.tsx
import type { AiEvaluation } from '@portal/types'

interface Props {
  evaluation?: AiEvaluation | null
  onRefresh?: () => void
  isLoading?: boolean
}

const CRITERIA: [keyof AiEvaluation, string][] = [
  ['impact',      'Потенциал влияния'],
  ['feasibility', 'Реализуемость'],
  ['clarity',     'Проработанность'],
]

export function AiEvalPanel({ evaluation, onRefresh, isLoading }: Props) {
  return (
    <div className="ai-eval-panel">
      <div className="ai-eval-head">
        <span className="cur-field-l">✦ Оценка потенциала ИИ</span>
        {onRefresh && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            {isLoading ? '…' : '↻ Переоценить'}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="ai-eval-skeleton">
          <div className="sk" style={{ height: 14, width: '60%', marginBottom: 10 }} />
          <div className="sk" style={{ height: 14, width: '75%', marginBottom: 10 }} />
          <div className="sk" style={{ height: 14, width: '50%', marginBottom: 14 }} />
          <div className="sk" style={{ height: 40 }} />
        </div>
      ) : evaluation == null ? (
        <p className="ai-eval-empty">Оценка ещё не готова</p>
      ) : (
        <>
          <div className="ai-eval-bars">
            {CRITERIA.map(([key, label]) => {
              const val = evaluation[key] as number
              return (
                <div key={key} className="ai-eval-row">
                  <span className="ai-eval-label">{label}</span>
                  <div className="ai-eval-bar-wrap">
                    <div
                      className="ai-eval-bar-fill"
                      style={{ width: `${val * 10}%` }}
                    />
                  </div>
                  <span className="ai-eval-score">{val}/10</span>
                </div>
              )
            })}
          </div>
          <p className="ai-eval-summary">{evaluation.summary}</p>
          <span className="ai-eval-overall">
            Общий балл: <b>{evaluation.overall.toFixed(1)}</b>
          </span>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add CSS to `screens.css`**

Append to the end of `apps/frontend/src/styles/screens.css`:

```css
/* ─── AI Evaluation ──────────────────────────────────── */
.ai-score-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 20px; line-height: 1.5; }
.ai-score-badge.green  { background: var(--st-done-b);   color: var(--st-done-t); }
.ai-score-badge.yellow { background: var(--st-rework-b); color: var(--st-rework-t); }
.ai-score-badge.red    { background: var(--st-reject-b); color: var(--st-reject-t); }

.ai-eval-panel { margin-top: 20px; padding-top: 18px; border-top: 1px solid var(--line); }
.ai-eval-head  { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.ai-eval-bars  { display: flex; flex-direction: column; gap: 9px; margin-bottom: 14px; }
.ai-eval-row   { display: grid; grid-template-columns: 140px 1fr 44px; align-items: center; gap: 10px; }
.ai-eval-label { font-size: 13px; color: var(--ink-2); }
.ai-eval-bar-wrap { background: var(--line); border-radius: 4px; height: 7px; overflow: hidden; }
.ai-eval-bar-fill { background: var(--accent); height: 100%; border-radius: 4px; transition: width .4s ease; }
.ai-eval-score { font-size: 12px; font-weight: 700; color: var(--ink); text-align: right; }
.ai-eval-summary { font-size: 13.5px; line-height: 1.6; color: var(--ink-2); margin: 0 0 10px; font-style: italic; }
.ai-eval-overall { font-size: 12.5px; color: var(--faint); }
.ai-eval-overall b { color: var(--ink); }
.ai-eval-empty { font-size: 13px; color: var(--faint); margin: 0; }
.ai-eval-skeleton { display: flex; flex-direction: column; }

/* Score badge in queue list */
.queue-top .ai-score-badge { margin-left: auto; }
```

- [ ] **Step 4: Verify frontend builds**

```bash
cd apps/frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/components/ui/AiScoreBadge.tsx \
        apps/frontend/src/components/ui/AiEvalPanel.tsx \
        apps/frontend/src/styles/screens.css
git commit -m "feat(ui): add AiScoreBadge and AiEvalPanel components"
```

---

## Task 7: Integrate into `Curator.tsx`

**Files:**
- Modify: `apps/frontend/src/pages/Curator.tsx`

- [ ] **Step 1: Add imports**

At the top of `Curator.tsx`, add these two imports after existing UI component imports:

```typescript
import { AiScoreBadge } from '@/components/ui/AiScoreBadge'
import { AiEvalPanel } from '@/components/ui/AiEvalPanel'
```

- [ ] **Step 2: Add `requestEvaluation` mutation**

In `Curator.tsx`, after the existing `addNote` mutation (around line 27), add:

```typescript
  const requestEval = trpc.ai.requestEvaluation.useMutation({
    onSuccess: () => {
      utils.idea.list.invalidate()
      if (sel) utils.idea.getById.invalidate({ id: sel.id })
    },
  })
```

- [ ] **Step 3: Add badge to queue list item**

In the queue list item JSX, find the `.queue-top` div:
```tsx
<div className="queue-top">
  <CatChip cat={idea.category} />
  {idea.status === 'expert' && (
```

Add `<AiScoreBadge score={idea.aiEvaluation?.overall} />` as the last child inside `.queue-top`:

```tsx
<div className="queue-top">
  <CatChip cat={idea.category} />
  {idea.status === 'expert' && (
    <span className="badge b-expert" style={{ padding: '3px 8px' }}>
      <span className="bdot" />
      Экспертиза
    </span>
  )}
  {resolved[idea.id] && (
    <span className="qresolved">
      <Icon name="check" size={13} />
      {resolved[idea.id]}
    </span>
  )}
  <AiScoreBadge score={idea.aiEvaluation?.overall} />
</div>
```

- [ ] **Step 4: Add `AiEvalPanel` to detail panel**

In the detail panel JSX, find the `.cur-internal` div (the internal note section). Insert `AiEvalPanel` **before** `.cur-internal`:

```tsx
              </div>  {/* closes cur-fields */}

              <AiEvalPanel
                evaluation={sel.aiEvaluation}
                isLoading={requestEval.isPending}
                onRefresh={() => requestEval.mutate({ ideaId: sel.id })}
              />

              <div className="cur-internal">
```

- [ ] **Step 5: Verify frontend builds**

```bash
cd apps/frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/pages/Curator.tsx
git commit -m "feat(curator): add AI score badge in queue + eval panel in detail"
```

---

## Task 8: Add evaluation block to `Card.tsx`

**Files:**
- Modify: `apps/frontend/src/pages/Card.tsx`

- [ ] **Step 1: Add import**

At the top of `Card.tsx`, after existing UI component imports, add:

```typescript
import { AiEvalPanel } from '@/components/ui/AiEvalPanel'
```

- [ ] **Step 2: Find where to insert the panel**

In `Card.tsx`, find the section just before the closing of the main card content area (the `.card-fields-stack` block or equivalent). Look for where the field blocks end. The evaluation panel should appear after all fields but before the sidebar actions.

Find the closing of the last `<Field ...>` component block in the main column. After the last field, add:

```tsx
{idea.status !== 'draft' && (
  <div className="card-fields" style={{ paddingTop: 0 }}>
    <AiEvalPanel evaluation={(idea as any).aiEvaluation} />
  </div>
)}
```

> Note: `idea` here is the result of `trpc.idea.getById` — it has `aiEvaluation` at runtime because we spread the Prisma object. The `as any` cast is needed since tRPC infers the return type from Prisma directly. If the project uses explicit tRPC output types, you may need to type it more carefully.

- [ ] **Step 3: Verify frontend builds**

```bash
cd apps/frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/pages/Card.tsx
git commit -m "feat(card): show AI evaluation panel for non-draft ideas"
```

---

## Task 9: Build, deploy, verify

- [ ] **Step 1: Full build check**

```bash
cd D:/portal_IDEA/portal-idea
pnpm build 2>&1 | tail -20
```

Expected: both `apps/api` and `apps/frontend` build without errors.

- [ ] **Step 2: Push to Railway**

```bash
git push origin main
```

Wait for Railway deployment (~3–5 min).

- [ ] **Step 3: Manual smoke test — auto-evaluation**

1. Log in as `anna@can.ru` / `test123`
2. Go to `/chat`, complete a new idea dialogue
3. Click «Открыть карточку» → save the card → submit to moderation
4. Wait ~5–10 seconds (AI eval runs in background)
5. Hard-refresh the card page
6. **Expected:** AI evaluation panel visible below the fields with scores and summary

- [ ] **Step 4: Manual smoke test — curator view**

1. Log in as `curator@can.ru` / `test123`
2. Go to «Модерация» → find the idea just submitted
3. **Expected:** `AiScoreBadge` (e.g. «✦ 7.2») visible in the queue list item
4. Click the idea → **Expected:** full `AiEvalPanel` with 3 bars + summary visible in detail panel
5. Click «↻ Переоценить» → **Expected:** loading state, then refreshed scores

- [ ] **Step 5: Manual smoke test — author view (Card page)**

1. Log in as `anna@can.ru`
2. Go to «Мои идеи» → open the submitted idea
3. **Expected:** AI evaluation panel visible below idea fields
4. **Expected:** no «Переоценить» button (only curators can re-evaluate)

- [ ] **Step 6: Final commit (if any cleanup)**

```bash
git add -A
git commit -m "fix: post-deploy cleanup" # only if needed
git push origin main
```
