import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc'
import { CatChip } from '@/components/ui/CatChip'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Icon } from '@/components/ui/Icon'
import type { IdeaListItem } from '@portal/types'

interface StepState {
  label: string
  done: boolean
}

export default function Impl() {
  const utils = trpc.useUtils()
  const { data: workData, isLoading } = trpc.idea.list.useQuery({ status: 'work', limit: 50 })

  const updateSteps = trpc.implementation.updateSteps.useMutation({
    onSuccess: () => utils.idea.list.invalidate(),
  })
  const setEffectFact = trpc.implementation.setEffectFact.useMutation({
    onSuccess: () => utils.idea.list.invalidate(),
  })
  const setStatus = trpc.moderation.setStatus.useMutation({
    onSuccess: () => utils.idea.list.invalidate(),
  })

  const ideas: IdeaListItem[] = workData?.items ?? []

  const [selId, setSelId] = useState<string | undefined>()
  const [stepsMap, setStepsMap] = useState<Record<string, StepState[]>>({})
  const [factInputs, setFactInputs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const sel = selId ? ideas.find((i) => i.id === selId) : ideas[0]
  const selIdReal = sel?.id

  // Initialize steps from ideas
  useEffect(() => {
    if (ideas.length > 0) {
      const initial: Record<string, StepState[]> = {}
      for (const idea of ideas) {
        if (!stepsMap[idea.id]) {
          // Default steps if none exist
          initial[idea.id] = [
            { label: 'Анализ требований', done: false },
            { label: 'Планирование', done: false },
            { label: 'Разработка', done: false },
            { label: 'Тестирование', done: false },
            { label: 'Внедрение', done: false },
          ]
        }
      }
      if (Object.keys(initial).length > 0) {
        setStepsMap((prev) => ({ ...initial, ...prev }))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ideas.length])

  const toggle = (ideaId: string, i: number) => {
    setStepsMap((prev) => {
      const arr = [...(prev[ideaId] ?? [])]
      arr[i] = { ...arr[i], done: !arr[i].done }
      return { ...prev, [ideaId]: arr }
    })
  }

  const handleSaveProgress = async () => {
    if (!selIdReal) return
    setSaving(true)
    try {
      await updateSteps.mutateAsync({
        ideaId: selIdReal,
        steps: stepsMap[selIdReal] ?? [],
      })
    } finally {
      setSaving(false)
    }
  }

  const handleMarkDone = async () => {
    if (!selIdReal) return
    await handleSaveProgress()
    await setStatus.mutateAsync({ ideaId: selIdReal, status: 'done' })
  }

  const handleSetFact = async (ideaId: string) => {
    const fact = factInputs[ideaId]
    if (!fact?.trim()) return
    await setEffectFact.mutateAsync({ ideaId, effectFact: fact })
  }

  if (isLoading) {
    return (
      <div className="wrap fade">
        <div className="sk" style={{ width: '40%', height: 28, marginBottom: 20 }} />
        <div className="sk" style={{ width: '100%', height: 400 }} />
      </div>
    )
  }

  const mySteps = selIdReal ? (stepsMap[selIdReal] ?? []) : []
  const doneCount = mySteps.filter((s) => s.done).length
  const pct = mySteps.length > 0 ? Math.round((doneCount / mySteps.length) * 100) : 0

  return (
    <div className="wrap fade">
      <div className="cur-head">
        <div>
          <div className="kicker" style={{ marginBottom: 5 }}>
            Реализация · вы назначены реализатором
          </div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Идеи в работе</h2>
        </div>
        <div className="cur-head-stats">
          <span className="cur-stat">
            <b>{ideas.length}</b>{' '}
            {ideas.length === 1 ? 'идея' : ideas.length < 5 ? 'идеи' : 'идей'} в работе
          </span>
        </div>
      </div>

      <div className="cur-layout">
        {/* Queue */}
        <div className="cur-queue">
          {ideas.length === 0 ? (
            <div className="card" style={{ padding: 24, textAlign: 'center' }}>
              <Icon name="checkCircle" size={32} />
              <p style={{ marginTop: 8, color: 'var(--faint)' }}>
                Нет идей в работе
              </p>
            </div>
          ) : (
            ideas.map((idea) => {
              const steps = stepsMap[idea.id] ?? []
              const c = steps.filter((s) => s.done).length
              const n = steps.length
              const done = n > 0 && c === n
              return (
                <button
                  key={idea.id}
                  className={`queue-item ${(selIdReal ?? ideas[0]?.id) === idea.id ? 'sel' : ''}`}
                  onClick={() => setSelId(idea.id)}
                >
                  <div className="queue-top">
                    <CatChip cat={idea.category} />
                    {done && (
                      <span className="badge b-done" style={{ padding: '3px 8px' }}>
                        <span className="bdot" />
                        Готово
                      </span>
                    )}
                  </div>
                  <div className="queue-title">{idea.cardData.title || 'Без названия'}</div>
                  <div className="impl-mini-prog">
                    <div
                      className="impl-mini-bar"
                      style={{ width: n > 0 ? `${(c / n) * 100}%` : '0%' }}
                    />
                  </div>
                  <div className="queue-foot">
                    <span className="faint" style={{ fontSize: 12 }}>
                      {c}/{n} этапов
                    </span>
                    {idea.dueDate && (
                      <span className="queue-sla">
                        <Icon name="calendar" size={13} />
                        {new Date(idea.dueDate).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Detail */}
        {sel && (
          <div className="cur-detail">
            <div className="card cur-card">
              <div className="cur-inline-meta">
                <CatChip cat={sel.category} />
                <StatusBadge status="work" />
              </div>
              <h3 className="cur-card-title">{sel.cardData.title || 'Без названия'}</h3>
              <div className="impl-meta">
                <span className="metaitem">
                  <Icon name="user" size={15} />
                  Автор: <b>{sel.authorName}</b>
                </span>
                <span className="metaitem">
                  <Icon name="calendar" size={15} />
                  Срок:{' '}
                  <b>
                    {sel.dueDate
                      ? new Date(sel.dueDate).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'не указан'}
                  </b>
                </span>
              </div>

              {/* Steps */}
              <div className="impl-prog-head">
                <span className="cur-field-l">
                  <Icon name="rocket" size={14} />
                  Этапы внедрения
                </span>
                <span className="impl-prog-pct">{pct}%</span>
              </div>
              <div className="impl-prog-bar">
                <div style={{ width: `${pct}%` }} />
              </div>
              <div className="impl-stages">
                {mySteps.map((s, i) => (
                  <label key={i} className={`impl-stage ${s.done ? 'done' : ''}`}>
                    <button
                      className={`impl-check ${s.done ? 'on' : ''}`}
                      onClick={() => toggle(selIdReal!, i)}
                    >
                      {s.done && <Icon name="check" size={13} strokeWidth={2.8} />}
                    </button>
                    <span>{s.label}</span>
                  </label>
                ))}
              </div>

              <div className="impl-attach">
                <Icon name="paperclip" size={15} />
                Прикрепить подтверждающие документы
                <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>
                  Загрузить
                </button>
              </div>
            </div>

            {/* Effect */}
            <div className="card cur-card">
              <span className="cur-field-l">
                <Icon name="trend" size={14} />
                Эффект
              </span>
              <div className="effect-grid">
                <div className="effect-cell plan">
                  <span className="effect-k">План (из карточки)</span>
                  <span className="effect-v">{sel.cardData.effect || '—'}</span>
                </div>
                <div className="effect-cell fact">
                  <span className="effect-k">Фактический эффект</span>
                  {sel.effectFact ? (
                    <span className="effect-v done">{sel.effectFact}</span>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        className="effect-input"
                        style={{ flex: 1 }}
                        placeholder="Внесите факт после замера…"
                        value={factInputs[sel.id] ?? ''}
                        onChange={(e) =>
                          setFactInputs((p) => ({ ...p, [sel.id]: e.target.value }))
                        }
                      />
                      <button
                        className="btn btn-soft btn-sm"
                        onClick={() => handleSetFact(sel.id)}
                        disabled={!factInputs[sel.id]?.trim() || setEffectFact.isPending}
                      >
                        Сохранить
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="cur-actions card">
              <button
                className="btn btn-ghost"
                onClick={handleSaveProgress}
                disabled={saving || updateSteps.isPending}
              >
                <Icon name="rotate" size={17} />
                Сохранить прогресс
              </button>
              <button
                className="btn btn-primary"
                disabled={pct < 100 || setStatus.isPending}
                onClick={handleMarkDone}
              >
                <Icon name="checkCircle" size={18} />
                Отметить «Реализовано»
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
