import type { FastifyRequest, FastifyReply } from 'fastify'
import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { prisma } from '../db.js'
import { getActivePrompt, buildMessages } from './prompt.js'
import type { AiCollectedFields, AiMessage } from '@portal/types'

function getOllamaClient() {
  return createOpenAI({
    baseURL: `${process.env.OLLAMA_BASE_URL ?? 'http://ollama:11434'}/v1`,
    apiKey: 'ollama',
  })
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
    ? (session.messages as AiMessage[])
    : []
  const fields: AiCollectedFields = session
    ? (session.collectedFields as AiCollectedFields)
    : inputFields

  const updatedMessages: AiMessage[] = [
    ...previousMessages,
    { from: 'me', text: message },
  ]

  const systemPrompt = await getActivePrompt()
  const chatMessages = buildMessages(systemPrompt, updatedMessages, fields)

  reply.raw.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  reply.raw.setHeader('Cache-Control', 'no-cache, no-transform')
  reply.raw.setHeader('Connection', 'keep-alive')
  reply.raw.setHeader('X-Accel-Buffering', 'no')
  reply.raw.flushHeaders()

  let fullResponse = ''

  try {
    const ollama = getOllamaClient()
    const result = await streamText({
      model: ollama(process.env.OLLAMA_MODEL ?? 'qwen2.5:7b'),
      messages: chatMessages,
      temperature: 0.7,
      maxTokens: 1024,
    })

    for await (const chunk of result.textStream) {
      fullResponse += chunk
      reply.raw.write(`data: ${JSON.stringify({ text: chunk })}\n\n`)
    }
  } catch (e: any) {
    console.error('[AI stream] Error:', e?.message)
    const errMsg =
      'ИИ-помощник временно недоступен. Вы можете заполнить карточку вручную.'
    reply.raw.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`)
    fullResponse = errMsg
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
        messages: savedMessages,
        collectedFields: fields,
        currentStep: (session.currentStep ?? 0) + 1,
      },
    })
    savedSessionId = session.id
  } else {
    const newSession = await prisma.aiSession.create({
      data: {
        userId: user.id,
        messages: savedMessages,
        collectedFields: fields,
        currentStep: 1,
      },
    })
    savedSessionId = newSession.id
  }

  reply.raw.write(
    `data: ${JSON.stringify({ sessionId: savedSessionId, done: true })}\n\n`
  )
  reply.raw.end()
}
