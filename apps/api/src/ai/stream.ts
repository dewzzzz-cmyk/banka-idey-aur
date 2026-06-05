import type { FastifyRequest, FastifyReply } from 'fastify'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { prisma } from '../db.js'
import { getActivePrompt, buildMessages } from './prompt.js'
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

export async function streamChatHandler(
  req: FastifyRequest,
  reply: FastifyReply
) {
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
  const fields: AiCollectedFields = session
    ? (session.collectedFields as unknown as AiCollectedFields)
    : inputFields

  const updatedMessages: AiMessage[] = [
    ...previousMessages,
    { from: 'me', text: message },
  ]

  const systemPrompt = await getActivePrompt()
  const chatMessages = buildMessages(systemPrompt, updatedMessages, fields)

  let fullResponse = ''

  try {
    const provider = process.env.DEEPSEEK_API_KEY ? 'deepseek' : 'ollama'
    console.log(`[AI stream] provider=${provider}`)
    const aiClient = getAIClient()
    const result = await generateText({
      model: aiClient(getModelName()),
      messages: chatMessages,
      temperature: 0.7,
      maxTokens: 1024,
    })
    fullResponse = result.text
  } catch (e: any) {
    console.error('[AI stream] Error:', e?.message)
    fullResponse = 'ИИ-помощник временно недоступен. Вы можете заполнить карточку вручную.'
  }

  // Save session
  const finalMessages: AiMessage[] = [
    ...updatedMessages,
    { from: 'ai', text: fullResponse },
  ]
  const savedMessages = finalMessages.slice(-20)

  let savedSessionId: string
  if (session) {
    await prisma.aiSession.update({
      where: { id: session.id },
      data: {
        messages: savedMessages as any,
        collectedFields: fields as any,
        currentStep: (session.currentStep ?? 0) + 1,
      },
    })
    savedSessionId = session.id
  } else {
    const newSession = await prisma.aiSession.create({
      data: {
        userId: user.id,
        messages: savedMessages as any,
        collectedFields: fields as any,
        currentStep: 1,
      },
    })
    savedSessionId = newSession.id
  }

  const isError = fullResponse.startsWith('ИИ-помощник временно недоступен')
  return reply.status(200).send({
    text: fullResponse,
    sessionId: savedSessionId,
    done: true,
    ...(isError ? { error: fullResponse } : {}),
  })
}
