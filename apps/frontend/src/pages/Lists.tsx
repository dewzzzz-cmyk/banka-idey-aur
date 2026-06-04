import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { useUIStore } from '@/stores/ui'
import { IdeaCard } from '@/components/ui/IdeaCard'
import { Icon } from '@/components/ui/Icon'

const CATS = [
  { k: 'proc', label: 'Процессы' },
  { k: 'it', label: 'IT' },
  { k: 'prod', label: 'Продукт' },
  { k: 'save', label: 'Экономия' },
  { k: 'work', label: 'Условия труда' },
  { k: 'cx', label: 'Клиентский опыт' },
]

type TabKey = 'top' | 'work' | 'hall'

// Skeleton component for loading state
const SkeletonCards = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {[0, 1, 2, 3].map((i) => (
      <div key={i} className="card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="sk" style={{ height: 14, width: 80 }} />
          <div className="sk" style={{ height: 14, width: 60 }} />
        </div>
        <div className="sk" style={{ height: 16, width: '70%', marginBottom: 8 }} />
        <div className="sk" style={{ height: 12, width: '90%' }} />
      </div>
    ))}
  </div>
)

const PERIOD_MS = {
  week: 7 * 24 * 3600 * 1000,
  month: 30 * 24 * 3600 * 1000,
  quarter: 90 * 24 * 3600 * 1000,
}

export default function Lists() {
  const { setDetailIdea } = useUIStore()
  const [tab, setTab] = useState<TabKey>('top')
  const [cat, setCat] = useState('all')
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month')

  const utils = trpc.useUtils()

  const { data: topData, isLoading: topLoading } = trpc.idea.list.useQuery({
    limit: 50,
  })

  const { data: workData, isLoading: workLoading } = trpc.idea.list.useQuery({
    status: 'work',
    limit: 50,
  })

  const { data: hallData, isLoading: hallLoading } = trpc.idea.list.useQuery({
    status: 'done',
    limit: 50,
  })

  const { data: kpi } = trpc.analytics.getKpi.useQuery({ period: 'year' })

  const voteMut = trpc.idea.vote.useMutation({ onSuccess: () => utils.idea.list.invalidate() })
  const unvoteMut = trpc.idea.unvote.useMutation({ onSuccess: () => utils.idea.list.invalidate() })

  const onVote = (id: string, ideas: typeof topData) => {
    const idea = ideas?.items.find((i) => i.id === id)
    if (!idea) return
    if (idea.votedByMe) unvoteMut.mutate({ ideaId: id })
    else voteMut.mutate({ ideaId: id })
  }

  const filterByPeriod = (items: typeof topData) => {
    const ms = PERIOD_MS[period]
    return (items?.items ?? []).filter((i) => {
      const age = Date.now() - Date.parse(i.createdAt)
      return age < ms
    })
  }

  const topItems = filterByPeriod(topData)
    .filter((i) => ['list', 'work', 'expert'].includes(i.status))
    .sort((a, b) => b.votes - a.votes)
    .filter((i) => cat === 'all' || i.category === cat)

  const workItems = filterByPeriod(workData).filter(
    (i) => cat === 'all' || i.category === cat,
  )

  const hallItems = (hallData?.items ?? []).filter((i) => i.status === 'done')

  const tabs = [
    { k: 'top' as TabKey, label: 'Топ идей', icon: 'fire', n: topData?.total ?? 0 },
    { k: 'work' as TabKey, label: 'Взято в работу', icon: 'cog', n: workData?.total ?? 0 },
    { k: 'hall' as TabKey, label: 'Зал славы', icon: 'trophy', n: hallData?.total ?? 0 },
  ]

  const periodLabels: { k: 'week' | 'month' | 'quarter'; label: string }[] = [
    { k: 'week', label: 'Неделя' },
    { k: 'month', label: 'Месяц' },
    { k: 'quarter', label: 'Квартал' },
  ]

  return (
    <div className="wrap fade">
      <div className="lists-head">
        <div className="tabs">
          {tabs.map((t) => (
            <button
              key={t.k}
              className={`tab ${tab === t.k ? 'active' : ''}`}
              onClick={() => setTab(t.k)}
            >
              <Icon name={t.icon} size={17} />
              {t.label}
              <span className="tn">{t.n}</span>
            </button>
          ))}
        </div>
        {tab === 'top' && (
          <div className="period-pick">
            {periodLabels.map((p) => (
              <button
                key={p.k}
                className={`pchip ${period === p.k ? 'on' : ''}`}
                style={{ fontWeight: period === p.k ? 700 : 400 }}
                onClick={() => setPeriod(p.k)}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab !== 'hall' && (
        <div className="cat-filter-row">
          <button
            className={`fchip ${cat === 'all' ? 'on' : ''}`}
            onClick={() => setCat('all')}
          >
            Все категории
          </button>
          {CATS.map((c) => (
            <button
              key={c.k}
              className={`fchip ${cat === c.k ? 'on' : ''}`}
              onClick={() => setCat(c.k)}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'top' && (
        <div className="list-stack">
          {topLoading ? (
            <SkeletonCards />
          ) : topItems.length === 0 ? (
            <div className="card">
              <div className="empty">
                <div className="empty-ic" style={{ maxWidth: 64, opacity: 0.3 }}>
                  <Icon name="fire" size={30} />
                </div>
                <h3>Пока нет идей в рейтинге</h3>
                <p>Голосуйте за идеи — они появятся здесь</p>
              </div>
            </div>
          ) : (
            topItems.map((idea, i) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                variant="rank"
                rank={i + 1}
                onOpen={setDetailIdea}
                onVote={(id) => onVote(id, topData)}
              />
            ))
          )}
        </div>
      )}

      {tab === 'work' && (
        <div className="list-stack">
          {workLoading ? (
            <SkeletonCards />
          ) : workItems.length === 0 ? (
            <div className="card">
              <div className="empty">
                <div className="empty-ic" style={{ maxWidth: 64, opacity: 0.3 }}>
                  <Icon name="cog" size={30} />
                </div>
                <h3>Нет идей в работе</h3>
                <p>Идеи, взятые в работу, появятся здесь</p>
              </div>
            </div>
          ) : (
            workItems.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                variant="work"
                onOpen={setDetailIdea}
                onVote={(id) => onVote(id, workData)}
              />
            ))
          )}
        </div>
      )}

      {tab === 'hall' && (
        <div>
          <div className="hall-hero">
            <div className="hall-hero-ic">
              <Icon name="trophy" size={26} />
            </div>
            <div>
              <h2>Зал славы</h2>
              <p>
                Идеи, которые мы внедрили — и люди, благодаря которым это случилось. Спасибо вам!
              </p>
            </div>
            <div className="hall-hero-stat">
              <div className="sn">{kpi?.done ?? '—'}</div>
              <div className="sl">реализованных идей</div>
            </div>
          </div>
          <div className="hall-grid">
            {hallLoading ? (
              <div style={{ gridColumn: '1/-1' }}>
                <SkeletonCards />
              </div>
            ) : hallItems.length === 0 ? (
              <div className="card" style={{ gridColumn: '1/-1' }}>
                <div className="empty">
                  <div className="empty-ic" style={{ maxWidth: 64, opacity: 0.3 }}>
                    <Icon name="trophy" size={30} />
                  </div>
                  <h3>Зал славы пока пуст</h3>
                  <p>Здесь появятся реализованные идеи</p>
                </div>
              </div>
            ) : (
              hallItems.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} variant="hall" onOpen={setDetailIdea} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
