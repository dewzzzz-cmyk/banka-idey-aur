import type { FastifyRequest, FastifyReply } from 'fastify'
import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'
import { prisma } from '../db.js'
import { getActivePrompt } from './prompt.js'
import type { AiCollectedFields, AiMessage } from '@portal/types'

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

// Structured schema: AI returns BOTH the chat message AND extracted idea fields
const IdeaResponseSchema = z.object({
  message: z
    .string()
    .describe('Разговорный ответ ИИ пользователю на русском языке (1-4 предложения)'),
  title: z
    .string()
    .optional()
    .describe('Краткий заголовок идеи (3–7 слов) — заполни если ясно из разговора'),
  problem: z
    .string()
    .optional()
    .describe('Описание проблемы/боли — что сейчас не работает или неэффективно'),
  who: z
    .string()
    .optional()
    .describe('Кто затронут: подразделение, количество людей, контекст'),
  proposal: z
    .string()
    .optional()
    .describe('Суть предложения — что конкретно нужно сделать'),
  resources: z
    .string()
    .optional()
    .describe('Необходимые ресурсы: время, деньги, люди'),
  effect: z
    .string()
    .optional()
    .describe('Ожидаемый эффект от внедрения'),
  effectEstimate: z
    .string()
    .optional()
    .describe('Количественная оценка эффекта (%, рубли, часы и т.д.)'),
  done: z
    .boolean()
    .describe(
      'true ТОЛЬКО когда problem И proposal И effect — все три поля заполнены. Иначе false.',
    ),
  step: z
    .number()
    .int()
    .min(0)
    .max(4)
    .describe('Номер текущего шага (0=проблема, 1=контекст, 2=предложение, 3=ресурсы, 4=эффект)'),
})

export async function streamChatHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as any
  if (!user) return reply.status(401).send({ error: 'Unauthorized' })

  const body = req.body as {
    message?: string
    sessionId?: string
    collectedFields?: AiCollectedFields
  }

  const { message = '', sessionId, collectedFields: inputFields = {} } = body

  if (!message.trim()) return reply.status(400).send({ error: 'message required' })

  // Load or use provided session
  let session = sessionId
    ? await prisma.aiSession.findFirst({ where: { id: sessionId, userId: user.id } })
    : null

  const previousMessages: AiMessage[] = session
    ? (session.messages as unknown as AiMessage[])
    : []
  const previousFields: AiCollectedFields = session
    ? (session.collectedFields as unknown as AiCollectedFields)
    : inputFields

  const updatedMessages: AiMessage[] = [...previousMessages, { from: 'me', text: message }]

  const systemPrompt = await getActivePrompt()

  // Build conversation history for the prompt
  const convHistory = updatedMessages
    .map((m) => `${m.from === 'me' ? 'Пользователь' : 'ИИ'}: ${m.text}`)
    .join('\n')

  const alreadyCollected = Object.entries(previousFields)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  const systemFull = [
    systemPrompt,
    alreadyCollected ? `\n# УЖЕ СОБРАНО:\n${alreadyCollected}` : '',
    `\n# ИНСТРУКЦИЯ:
Ты собираешь идею через диалог. Задавай по ОДНОМУ уточняющему вопросу за раз.
Порядок: сначала проблема → кто затронут → предложение → ресурсы → эффект.
НЕ переходи к карточке пока не заполнены хотя бы problem, proposal и effect.

ОБЯЗАТЕЛЬНО: В JSON-ответе заполняй поля (problem, proposal, effect и т.д.) по мере того,
как получаешь информацию — даже черновым вариантом. Если пользователь упомянул проблему,
запиши её в поле "problem", даже если будешь уточнять детали. Если упомянул предложение —
запиши в "proposal". НЕ оставляй поля пустыми если информация уже есть в диалоге.
done=true ТОЛЬКО когда поля problem, proposal и effect реально заполнены в JSON (не пустые).`,
  ]
    .filter(Boolean)
    .join('')

  let fullResponse = 'ИИ-помощник временно недоступен. Вы можете заполнить карточку вручную.'
  let collectedFields: AiCollectedFields = previousFields
  let done = false
  let step = session ? (session.currentStep ?? 0) : 0

  try {
    const aiClient = getAIClient()
    const model = getModelName()
    const provider = process.env.DEEPSEEK_API_KEY ? 'deepseek' : 'ollama'
    console.log(`[AI] provider=${provider} model=${model}`)

    const result = await generateObject({
      model: aiClient(model),
      schema: IdeaResponseSchema,
      system: systemFull,
      prompt: convHistory,
      temperature: 0.7,
    })

    const obj = result.object
    fullResponse = obj.message

    // Merge newly extracted fields with previous ones (don't overwrite existing with empty)
    collectedFields = {
      title: obj.title || previousFields.title,
      problem: obj.problem || previousFields.problem,
      who: obj.who || previousFields.who,
      proposal: obj.proposal || previousFields.proposal,
      resources: obj.resources || previousFields.resources,
      effect: obj.effect || previousFields.effect,
      effectEstimate: obj.effectEstimate || previousFields.effectEstimate,
    }

    // Safeguard: done=true only when all 3 required fields are actually populated in collectedFields.
    // DeepSeek sometimes sets done=true before populating the structured fields — this prevents
    // an empty card from being shown to the user prematurely.
    const hasRequiredFields = !!(
      collectedFields.problem?.trim() &&
      collectedFields.proposal?.trim() &&
      collectedFields.effect?.trim()
    )
    done = (obj.done ?? false) && hasRequiredFields
    step = obj.step ?? step
  } catch (e: any) {
    console.error('[AI] Error:', e?.message)
    fullResponse = 'ИИ-помощник временно недоступен. Вы можете заполнить карточку вручную.'
  }

  // Save session
  const finalMessages: AiMessage[] = [...updatedMessages, { from: 'ai', text: fullResponse }]
  const savedMessages = finalMessages.slice(-20)

  let savedSessionId: string
  if (session) {
    await prisma.aiSession.update({
      where: { id: session.id },
      data: {
        messages: savedMessages as any,
        collectedFields: collectedFields as any,
        currentStep: step,
      },
    })
    savedSessionId = session.id
  } else {
    const newSession = await prisma.aiSession.create({
      data: {
        userId: user.id,
        messages: savedMessages as any,
        collectedFields: collectedFields as any,
        currentStep: step,
      },
    })
    savedSessionId = newSession.id
  }

  const isError = fullResponse.startsWith('ИИ-помощник временно недоступен')
  return reply.status(200).send({
    text: fullResponse,
    sessionId: savedSessionId,
    collectedFields,
    done,
    ...(isError ? { error: fullResponse } : {}),
  })
}
