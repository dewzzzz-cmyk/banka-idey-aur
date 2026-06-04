import { getBoss } from './index.js'
import { prisma } from '../db.js'

export async function registerWorkers() {
  const boss = await getBoss()

  await boss.work('send-notification', async (jobs) => {
    for (const job of jobs) {
      const { userId, text, icon = 'bell', accent = false } = job.data as any
      await prisma.notification.create({ data: { userId, text, icon, accent } })
    }
  })

  await boss.schedule('check-sla-deadline', '*/5 * * * *', {})
  await boss.work('check-sla-deadline', async () => {
    const overdue = await prisma.slaTimer.findMany({
      where: { deadline: { lt: new Date() }, escalatedTo: null },
      include: { idea: { select: { authorId: true, cardData: true } } },
    })
    for (const timer of overdue) {
      const title = (timer.idea.cardData as any).title ?? 'Без названия'
      await prisma.notification.create({
        data: {
          userId: timer.idea.authorId,
          text: `Идея "${title}" ожидает рассмотрения дольше установленного срока`,
          icon: 'alert',
          accent: true,
        },
      })
      await prisma.slaTimer.update({
        where: { id: timer.id },
        data: { escalatedTo: 'owner' },
      })
    }
  })

  await boss.work('reindex-rag-document', async (jobs) => {
    for (const job of jobs) {
      const { ideaId } = job.data as any
      try {
        const idea = await prisma.idea.findUnique({ where: { id: ideaId } })
        if (!idea) continue
        const cd = idea.cardData as any
        const text = [cd.title, cd.problem, cd.proposal].filter(Boolean).join(' ')

        const resp = await fetch(
          `${process.env.OLLAMA_BASE_URL ?? 'http://ollama:11434'}/api/embeddings`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: process.env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text',
              prompt: text,
            }),
          }
        )
        if (!resp.ok) continue
        const { embedding } = (await resp.json()) as { embedding: number[] }
        await prisma.$executeRawUnsafe(
          `UPDATE ideas SET embedding = $1::vector WHERE id = $2`,
          JSON.stringify(embedding),
          ideaId
        )
      } catch (e) {
        console.error('RAG reindex failed for idea', ideaId, e)
      }
    }
  })

  console.log('[pg-boss] Workers registered')
}
