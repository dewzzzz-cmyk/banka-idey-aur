import { prisma } from '../db.js'
import type { AiCollectedFields } from '@portal/types'

export async function getActivePrompt(): Promise<string> {
  const prompt = await prisma.aiPrompt.findFirst({
    where: { isActive: true },
    orderBy: { version: 'desc' },
  })
  return prompt?.body ?? 'Ты — помощник по оформлению идей. Задавай уточняющие вопросы.'
}

export function buildMessages(
  systemPrompt: string,
  messages: Array<{ from: string; text: string }>,
  collectedFields: AiCollectedFields
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const fieldsContext = Object.entries(collectedFields)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  const systemFull = fieldsContext
    ? `${systemPrompt}\n\n# УЖЕ СОБРАНО ОТ АВТОРА:\n${fieldsContext}`
    : systemPrompt

  const last10 = messages.slice(-10)

  return [
    { role: 'system', content: systemFull },
    ...last10.map((m) => ({
      role: m.from === 'ai' ? ('assistant' as const) : ('user' as const),
      content: m.text,
    })),
  ]
}
