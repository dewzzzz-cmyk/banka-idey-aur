import PgBoss from 'pg-boss'

let boss: PgBoss | null = null

export async function getBoss(): Promise<PgBoss> {
  if (!boss) {
    boss = new PgBoss({ connectionString: process.env.DATABASE_URL! })
    await boss.start()
  }
  return boss
}

export async function enqueueNotification(data: {
  userId: string
  text: string
  icon?: string
  accent?: boolean
  refIdeaId?: string
}) {
  const b = await getBoss()
  await b.send('send-notification', data)
}

export async function enqueueReindex(ideaId: string) {
  const b = await getBoss()
  await b.send('reindex-rag-document', { ideaId }, { startAfter: 5 })
}
