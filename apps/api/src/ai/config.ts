import { prisma } from '../db.js'

const DEEPSEEK_KEY_SETTING = 'deepseek_api_key'
const CACHE_TTL_MS = 30_000

let cached: { value: string | null; fetchedAt: number } | null = null

export async function getDeepseekApiKey(): Promise<string | null> {
  const now = Date.now()
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) return cached.value

  const row = await prisma.appSetting.findUnique({ where: { key: DEEPSEEK_KEY_SETTING } })
  const value = row?.value?.trim() || process.env.DEEPSEEK_API_KEY || null
  cached = { value, fetchedAt: now }
  return value
}

export async function setDeepseekApiKey(apiKey: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: DEEPSEEK_KEY_SETTING },
    update: { value: apiKey },
    create: { key: DEEPSEEK_KEY_SETTING, value: apiKey },
  })
  cached = { value: apiKey, fetchedAt: Date.now() }
}

export async function getDeepseekKeyStatus(): Promise<{ isSet: boolean; masked: string | null }> {
  const key = await getDeepseekApiKey()
  if (!key) return { isSet: false, masked: null }
  const tail = key.slice(-4)
  return { isSet: true, masked: `••••••••${tail}` }
}
