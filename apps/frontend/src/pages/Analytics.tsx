import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Stat } from '@/components/ui/Stat'
import { SectionH } from '@/components/ui/SectionH'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'

type Period = 'quarter' | 'half' | 'year'
type PeriodLabel = 'Квартал' | 'Полугодие' | 'Год'

const PERIOD_MAP: Record<PeriodLabel, Period> = {
  Квартал: 'quarter',
  Полугодие: 'half',
  Год: 'year',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновики',
  mod: 'На модерации',
  rework: 'На доработке',
  list: 'В общем списке',
  expert: 'На экспертизе',
  work: 'Взято в работу',
  done: 'Реализовано',
}

const CAT_CONFIG: Record<string, { label: string; cls: string; icon: string }> = {
  proc: { label: 'Процессы', cls: 'cat-proc', icon: 'flow' },
  it: { label: 'IT', cls: 'cat-it', icon: 'cpu' },
  prod: { label: 'Продукт', cls: 'cat-prod', icon: 'box' },
  save: { label: 'Экономия', cls: 'cat-save', icon: 'piggy' },
  work: { label: 'Условия труда', cls: 'cat-work', icon: 'smile' },
  cx: { label: 'Клиентский опыт', cls: 'cat-cx', icon: 'heart' },
}

export default function Analytics() {
  const [periodLabel, setPeriodLabel] = useState<PeriodLabel>('Год')
  const period = PERIOD_MAP[periodLabel]

  const { data: kpi } = trpc.analytics.getKpi.useQuery({ period })
  const { data: funnel } = trpc.analytics.getFunnel.useQuery({ period })
  const { data: ratings } = trpc.analytics.getRatings.useQuery({ period })

  const funnelMax = Math.max(...(funnel ?? []).map((s) => s.count), 1)

  // Aggregate by category from ratings
  const catCounts: Record<string, number> = {}
  // Use getRatings for top authors proxy
  const topAuthors = ratings?.slice(0, 5) ?? []

  const handleExport = () => {
    window.location.href = `/api/export/analytics?period=${period}`
  }

  return (
    <div className="wrap fade">
      <div className="lists-head">
        <div className="kicker" style={{ marginBottom: 0 }}>
          АУР · Программа идей · сводка для руководства
        </div>
        <div className="period-pick">
          {(['Квартал', 'Полугодие', 'Год'] as PeriodLabel[]).map((p) => (
            <button
              key={p}
              className={`pchip ${periodLabel === p ? 'on' : ''}`}
              onClick={() => setPeriodLabel(p)}
            >
              {p}
            </button>
          ))}
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: 8 }}
            onClick={handleExport}
          >
            <Icon name="download" size={16} />
            Экспорт отчёта
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="kpi-grid">
        <div className="kpi card">
          <div className="kpi-val">{kpi?.totalIdeas ?? '—'}</div>
          <div className="kpi-lbl">Идей подано</div>
          <div className="kpi-foot">
            <span className="kpi-pill ok">
              <Icon name="check" size={12} strokeWidth={2.6} />
              за {periodLabel.toLowerCase()}
            </span>
          </div>
        </div>
        <div className="kpi card">
          <div className="kpi-val">{kpi?.inWork ?? '—'}</div>
          <div className="kpi-lbl">В работе</div>
          <div className="kpi-foot">
            <span className="kpi-pill ok">
              <Icon name="cog" size={12} />
              активные
            </span>
          </div>
        </div>
        <div className="kpi card">
          <div className="kpi-val">{kpi?.done ?? '—'}</div>
          <div className="kpi-lbl">Реализовано</div>
          <div className="kpi-foot">
            <span className="kpi-pill ok">
              <Icon name="checkCircle" size={12} />
              за {periodLabel.toLowerCase()}
            </span>
          </div>
        </div>
        <div className="kpi card">
          <div className="kpi-val">{kpi?.uniqueAuthors ?? '—'}</div>
          <div className="kpi-lbl">Уникальных авторов</div>
          <div className="kpi-foot">
            <span className="kpi-pill ok">
              <Icon name="users" size={12} />
              за {periodLabel.toLowerCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Funnel + SLA row */}
      <div className="an-row an-row-2-1">
        {/* Funnel */}
        <div className="card chart-card">
          <SectionH title="Воронка идей" />
          <div className="funnel-h">
            {(funnel ?? []).map((s, i) => (
              <div key={i} className="funnel-h-row">
                <span className="funnel-h-lbl">{STATUS_LABELS[s.status] ?? s.status}</span>
                <div className="funnel-h-track">
                  <div
                    className="funnel-h-bar"
                    style={{
                      width: `${(s.count / funnelMax) * 100}%`,
                      opacity: 1 - i * 0.08,
                    }}
                  >
                    <span className="funnel-h-n">{s.count}</span>
                  </div>
                </div>
                <span className="funnel-h-pct">
                  {funnelMax > 0 ? Math.round((s.count / funnelMax) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* SLA donut (simplified without real SLA data) */}
        <div className="card chart-card">
          <SectionH title="Статистика" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 14,
              }}
            >
              <span style={{ color: 'var(--faint)' }}>Всего подано</span>
              <b style={{ fontSize: 20 }}>{kpi?.totalIdeas ?? '—'}</b>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 14,
              }}
            >
              <span style={{ color: 'var(--faint)' }}>Реализовано</span>
              <b style={{ fontSize: 20, color: 'var(--st-done-t)' }}>{kpi?.done ?? '—'}</b>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 14,
              }}
            >
              <span style={{ color: 'var(--faint)' }}>В работе</span>
              <b style={{ fontSize: 20, color: 'var(--st-work-t)' }}>{kpi?.inWork ?? '—'}</b>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 14,
              }}
            >
              <span style={{ color: 'var(--faint)' }}>Авторов</span>
              <b style={{ fontSize: 20 }}>{kpi?.uniqueAuthors ?? '—'}</b>
            </div>
            {kpi && kpi.totalIdeas > 0 && (
              <div style={{ marginTop: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 13,
                    color: 'var(--faint)',
                    marginBottom: 6,
                  }}
                >
                  <span>Конверсия в реализацию</span>
                  <span>{Math.round((kpi.done / kpi.totalIdeas) * 100)}%</span>
                </div>
                <div
                  style={{
                    height: 8,
                    background: 'var(--bg-2)',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.round((kpi.done / kpi.totalIdeas) * 100)}%`,
                      background: 'var(--st-done-d)',
                      borderRadius: 4,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top authors + ratings */}
      <div className="an-row an-row-1-1">
        {/* Ratings */}
        <div className="card chart-card">
          <SectionH title="Топ идей по голосам" />
          <div className="authlist">
            {ratings?.slice(0, 8).map((idea, i) => (
              <div key={idea.id} className="authrow">
                <span className={`authrank ${i < 3 ? 'top' : ''}`}>{i + 1}</span>
                <div className="authmain">
                  <b>{idea.title || 'Без названия'}</b>
                  <span className="faint">{idea.authorName}</span>
                </div>
                <div className="authstats">
                  <span>
                    <Icon name="arrowUp" size={13} />
                    <b>{idea.votes}</b>
                  </span>
                </div>
              </div>
            ))}
            {(!ratings || ratings.length === 0) && (
              <div className="empty" style={{ padding: '24px 0' }}>
                <p>Нет данных за период</p>
              </div>
            )}
          </div>
        </div>

        {/* Funnel summary */}
        <div className="card chart-card">
          <SectionH title="Воронка по статусам" />
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8 }}
          >
            {(funnel ?? []).map((s) => (
              <div
                key={s.status}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 14,
                }}
              >
                <span style={{ color: 'var(--faint)' }}>
                  {STATUS_LABELS[s.status] ?? s.status}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 80,
                      height: 6,
                      background: 'var(--bg-2)',
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${(s.count / funnelMax) * 100}%`,
                        background: 'var(--accent)',
                        borderRadius: 3,
                      }}
                    />
                  </div>
                  <b style={{ minWidth: 24, textAlign: 'right' }}>{s.count}</b>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
