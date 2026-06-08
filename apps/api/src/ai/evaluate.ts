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
