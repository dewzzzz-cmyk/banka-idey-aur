import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Avatar } from '@/components/ui/Avatar'
import { CatChip } from '@/components/ui/CatChip'
import { SectionH } from '@/components/ui/SectionH'
import { Icon } from '@/components/ui/Icon'
import type { IdeaCategory } from '@portal/types'

type TabKey = 'dict' | 'prompt' | 'users' | 'registry' | 'hr'

// --- Directories tab ---
function Directories() {
  const { data: cats } = trpc.admin.getCategories.useQuery()
  const { data: directions } = trpc.admin.getDirections.useQuery()

  return (
    <div className="admin-pane fade">
      <div className="admin-2col">
        <div className="card cur-card">
          <SectionH title="Категории идей" more="Добавить" />
          <div className="dict-list">
            {(cats ?? []).map((c) => (
              <div key={c.key} className="dict-row">
                <CatChip cat={c.key as IdeaCategory} />
                <span className="faint" style={{ marginLeft: 'auto', fontSize: 13 }}>
                  активна
                </span>
                <button className="dict-edit">
                  <Icon name="edit" size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card cur-card">
          <SectionH title="Направления и кураторы" more="Добавить" />
          <div className="dict-list">
            {(directions ?? []).map((d: any) => (
              <div key={d.id} className="dir-row">
                <div className="dir-main">
                  <b>{d.name}</b>
                  <div className="dir-cats">
                    {(d.categories ?? []).map((c: string) => (
                      <CatChip key={c} cat={c as IdeaCategory} />
                    ))}
                  </div>
                </div>
                <span className="dir-open">{d.id}</span>
              </div>
            ))}
            {(!directions || directions.length === 0) && (
              <div className="empty" style={{ padding: 16 }}>
                <p>Направления не настроены</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card cur-card">
        <SectionH title="База знаний для ИИ (RAG)" more="Загрузить документ" />
        <div className="kb-list">
          {[
            ['Регламент рацпредложений 2026', 'PDF · обновлён 12 мая', 'book'],
            ['Правила вознаграждения и грейды', 'DOCX · обновлён 28 мая', 'gift'],
            ['FAQ по подаче идей', 'MD · обновлён 3 июня', 'chat'],
            ['Архив поданных идей (для проверки дублей)', 'Индекс · записей', 'grid'],
          ].map((f, i) => (
            <div key={i} className="kb-row">
              <div className="kb-ic">
                <Icon name={f[2]} size={17} />
              </div>
              <div className="kb-main">
                <b>{f[0]}</b>
                <span className="faint">{f[1]}</span>
              </div>
              <span className="badge b-done">
                <span className="bdot" />
                проиндексирован
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- DeepSeek API key card ---
function AiKeyCard() {
  const utils = trpc.useUtils()
  const { data: status } = trpc.admin.getAiKeyStatus.useQuery()
  const setAiKey = trpc.admin.setAiKey.useMutation({
    onSuccess: () => {
      utils.admin.getAiKeyStatus.invalidate()
      setApiKey('')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)

  return (
    <div className="card cur-card">
      <SectionH title="ИИ-провайдер · ключ DeepSeek" />
      <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 14px' }}>
        Ключ хранится в базе и действует сразу для всех — вставьте его один раз здесь,
        доступ к Railway не нужен. Без ключа портал использует локальную модель Ollama.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>Статус:</span>
        {status?.isSet ? (
          <span className="badge b-done">
            <span className="bdot" />
            установлен ({status.masked})
          </span>
        ) : (
          <span className="badge b-draft">
            <span className="bdot" />
            не установлен
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <input
          type="password"
          className="prompt-area"
          style={{ minHeight: 'unset', height: 40, padding: '0 14px', flex: 1 }}
          placeholder="sk-..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          autoComplete="off"
        />
        <button
          className="btn btn-primary"
          disabled={apiKey.trim().length < 10 || setAiKey.isPending}
          onClick={() => setAiKey.mutate({ apiKey: apiKey.trim() })}
        >
          <Icon name="check" size={17} />
          {saved ? 'Сохранено!' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}

// --- Prompt admin tab ---
function PromptAdmin() {
  const { data: prompt } = trpc.admin.getPrompt.useQuery()
  const { data: auditLog } = trpc.admin.getAuditLog.useQuery()
  const updatePrompt = trpc.admin.updatePrompt.useMutation()

  const [text, setText] = useState('')
  const [temp, setTemp] = useState(0.4)
  const [saved, setSaved] = useState(false)

  const currentBody = prompt?.body ?? ''
  const displayText = text || currentBody
  const dirty = text !== '' && text !== currentBody

  const handleSave = async () => {
    if (!dirty) return
    await updatePrompt.mutateAsync({ body: text })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="admin-pane fade">
      <div className="admin-prompt">
        <div className="card cur-card">
          <div className="section-h">
            <div>
              <h2>Системный промт ИИ-ассистента</h2>
            </div>
            <span className="badge b-list" style={{ marginLeft: 'auto' }}>
              <span className="bdot" />
              v{prompt?.version ?? '?'} (текущая)
            </span>
          </div>
          <textarea
            className="prompt-area"
            value={displayText}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="Загрузка системного промта…"
          />
          <div className="prompt-controls">
            <div className="temp-ctl">
              <span
                className="cur-field-l"
                style={{ textTransform: 'none', color: 'var(--ink-2)' }}
              >
                <Icon name="sliders" size={14} />
                Температура генерации
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temp}
                onChange={(e) => setTemp(+e.target.value)}
                className="prompt-slider"
              />
              <span className="temp-val">{temp.toFixed(1)}</span>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
              <button
                className="btn btn-ghost"
                disabled={!dirty}
                onClick={() => setText('')}
              >
                Сбросить
              </button>
              <button
                className="btn btn-primary"
                disabled={!dirty || updatePrompt.isPending}
                onClick={handleSave}
              >
                <Icon name="check" size={17} />
                {saved ? 'Сохранено!' : 'Сохранить как новую версию'}
              </button>
            </div>
          </div>
          <div className="prompt-note">
            <Icon name="shield" size={15} />
            Перед публикацией промт автоматически прогоняется на эталонном наборе сценариев
            (golden set). Изменение утверждает владелец программы.
          </div>
        </div>

        <div className="card cur-card">
          <SectionH title="История изменений статусов (аудит)" />
          <div className="ver-list">
            {(auditLog ?? []).slice(0, 20).map((log: any, i: number) => (
              <div key={i} className="ver-row">
                <span className="ver-tag">{log.toStatus}</span>
                <div className="ver-main">
                  <b>{(log.idea?.cardData as any)?.title ?? 'Без названия'}</b>
                  <span className="faint">
                    {log.actor?.name ?? '—'} ·{' '}
                    {new Date(log.createdAt).toLocaleString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
            {(!auditLog || auditLog.length === 0) && (
              <div className="empty" style={{ padding: 16 }}>
                <p>Нет записей аудита</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AiKeyCard />
    </div>
  )
}

// --- Users tab ---
function UsersAdmin() {
  const { data: users } = trpc.admin.manageUsers.useQuery()
  const setUserActive = trpc.admin.setUserActive.useMutation()

  return (
    <div className="admin-pane fade">
      <div className="card cur-card">
        <SectionH title="Пользователи системы" />
        <div className="reg-table">
          <div className="reg-head">
            <span>Имя</span>
            <span>Email</span>
            <span>Отдел</span>
            <span>Роли</span>
            <span>Статус</span>
          </div>
          {(users ?? []).map((u: any) => (
            <div key={u.id} className="reg-row">
              <span className="reg-author">
                <Avatar name={u.name} size="sm" />
                {u.name}
              </span>
              <span className="faint" style={{ fontSize: 13 }}>
                {u.email}
              </span>
              <span className="faint" style={{ fontSize: 13 }}>
                {u.dept}
              </span>
              <span style={{ fontSize: 13 }}>{(u.roles ?? []).join(', ')}</span>
              <span>
                <button
                  className={`btn btn-sm ${u.isActive ? 'btn-ghost' : 'btn-soft'}`}
                  onClick={() =>
                    setUserActive.mutate({ userId: u.id, isActive: !u.isActive })
                  }
                >
                  {u.isActive ? 'Активен' : 'Отключён'}
                </button>
              </span>
            </div>
          ))}
          {(!users || users.length === 0) && (
            <div className="reg-row" style={{ justifyContent: 'center', color: 'var(--faint)' }}>
              <span>Нет пользователей</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const STATUS_RU: Record<string, string> = {
  pending: 'Ожидает',
  approved: 'Одобрено',
  paid: 'Выплачено',
}

// --- Registry tab ---
function Registry() {
  const utils = trpc.useUtils()
  const { data: registry } = trpc.admin.getRewardRegistry.useQuery()
  const updateStatus = trpc.reward.updateStatus.useMutation({
    onSuccess: () => utils.admin.getRewardRegistry.invalidate(),
  })

  const handleExport = () => {
    window.location.href = '/api/export/rewards'
  }

  const total = (registry ?? []).reduce((s: number, r: any) => s + (r.amount ?? 0), 0)

  return (
    <div className="admin-pane fade">
      <div className="card cur-card">
        <div className="section-h">
          <div>
            <h2>Реестр вознаграждений</h2>
            <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>
              Выгрузка для передачи в расчётную / HR-систему
            </div>
          </div>
          <button
            className="btn btn-primary"
            style={{ marginLeft: 'auto' }}
            onClick={handleExport}
          >
            <Icon name="download" size={17} />
            Выгрузить реестр (.xlsx)
          </button>
        </div>
        <div className="reg-table">
          <div className="reg-head">
            <span>Автор</span>
            <span>Идея</span>
            <span>Грейд</span>
            <span>Сумма</span>
            <span>Статус</span>
            <span>Действие</span>
          </div>
          {(registry ?? []).map((r: any, i: number) => (
            <div key={r.id ?? i} className="reg-row">
              <span className="reg-author">
                <Avatar name={r.idea?.author?.name ?? '?'} size="sm" />
                {r.idea?.author?.name ?? '—'}
              </span>
              <span className="reg-idea">
                {(r.idea?.cardData as any)?.title ?? 'Без названия'}
              </span>
              <span className="reg-grade">{r.grade ?? '—'}</span>
              <span className="reg-sum">
                {r.amount ? r.amount.toLocaleString('ru') + ' ₽' : '—'}
              </span>
              <span className={`reg-st ${r.status === 'paid' ? 'paid' : r.status === 'approved' ? 'pay' : 'wait'}`}>
                {STATUS_RU[r.status] ?? r.status ?? '—'}
              </span>
              <span>
                {r.status === 'pending' && (
                  <button
                    className="btn btn-sm btn-primary"
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate({ id: r.id, status: 'approved' })}
                  >
                    Одобрить
                  </button>
                )}
                {r.status === 'approved' && (
                  <button
                    className="btn btn-sm btn-ghost"
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate({ id: r.id, status: 'paid' })}
                  >
                    <Icon name="check" size={14} />
                    Выплачено
                  </button>
                )}
                {r.status === 'paid' && (
                  <span style={{ fontSize: 13, color: 'var(--faint)' }}>—</span>
                )}
              </span>
            </div>
          ))}
          {(!registry || registry.length === 0) && (
            <div className="reg-row" style={{ justifyContent: 'center', color: 'var(--faint)' }}>
              <span>Реестр пуст</span>
            </div>
          )}
          {registry && registry.length > 0 && (
            <div className="reg-total">
              <span>Итого к выгрузке</span>
              <b>{total.toLocaleString('ru')} ₽</b>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// --- HR engagement tab ---
function HrDashboard() {
  const { data: hr } = trpc.analytics.getHrStats.useQuery()

  return (
    <div className="admin-pane fade">
      {/* Stat cards */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="kpi card">
          <div className="kpi-val">{hr?.totalUsers ?? '—'}</div>
          <div className="kpi-lbl">Сотрудников в системе</div>
        </div>
        <div className="kpi card">
          <div className="kpi-val" style={{ color: 'var(--accent)' }}>{hr?.participationRate ?? '—'}%</div>
          <div className="kpi-lbl">Вовлечённость</div>
        </div>
        <div className="kpi card">
          <div className="kpi-val">{hr?.activeUsers ?? '—'}</div>
          <div className="kpi-lbl">Хотя бы 1 идея</div>
        </div>
        <div className="kpi card">
          <div className="kpi-val" style={{ color: 'var(--muted)' }}>{hr?.neverActive ?? '—'}</div>
          <div className="kpi-lbl">Не подавали идей</div>
        </div>
      </div>

      <div className="admin-2col">
        {/* Department breakdown */}
        <div className="card cur-card">
          <div className="section-h" style={{ marginBottom: 16 }}>
            <div><h2>Вовлечённость по подразделениям</h2></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(hr?.byDept ?? []).map((d) => (
              <div key={d.dept}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{d.dept}</span>
                  <span style={{ color: 'var(--muted)' }}>
                    {d.active}/{d.total} · {d.rate}% · {d.ideas} ид.
                  </span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-2)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${d.rate}%`,
                    background: d.rate >= 60 ? 'var(--st-done-d)' : d.rate >= 30 ? 'var(--accent)' : '#e53935',
                    borderRadius: 3,
                    transition: 'width 0.4s',
                  }} />
                </div>
              </div>
            ))}
            {(!hr?.byDept || hr.byDept.length === 0) && (
              <div className="empty" style={{ padding: 16 }}><p>Нет данных</p></div>
            )}
          </div>
        </div>

        {/* Dormant info */}
        <div className="card cur-card">
          <div className="section-h" style={{ marginBottom: 16 }}>
            <div>
              <h2>Требуют внимания HR</h2>
              <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>
                Не подавали идей более 90 дней
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: hr && hr.dormant > 0 ? '#fff3e0' : 'var(--bg-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Icon name="bell" size={22} />
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
                  {hr?.dormant ?? '—'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                  активных ранее, заснувших
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 12, borderTop: '1px solid var(--line-2)' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: hr && hr.neverActive > 0 ? '#fce4ec' : 'var(--bg-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Icon name="user" size={22} />
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
                  {hr?.neverActive ?? '—'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                  ни разу не подавали идею
                </div>
              </div>
            </div>
            <div style={{ marginTop: 8, padding: '10px 14px', background: 'var(--bg-2)', borderRadius: 10, fontSize: 13, color: 'var(--ink-2)' }}>
              Рекомендация: направьте письмо-напоминание или проведите встречу с этими сотрудниками.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Main Admin screen ---
export default function Admin() {
  const [tab, setTab] = useState<TabKey>('dict')

  const tabs: { k: TabKey; label: string; icon: string }[] = [
    { k: 'dict', label: 'Справочники', icon: 'grid' },
    { k: 'prompt', label: 'Промт ИИ / Аудит', icon: 'sparkles' },
    { k: 'users', label: 'Пользователи', icon: 'users' },
    { k: 'registry', label: 'Реестр выплат', icon: 'download' },
    { k: 'hr', label: 'HR вовлечённость', icon: 'bars' },
  ]

  return (
    <div className="wrap fade">
      <div className="tabs" style={{ marginBottom: 20, display: 'inline-flex' }}>
        {tabs.map((t) => (
          <button
            key={t.k}
            className={`tab ${tab === t.k ? 'active' : ''}`}
            onClick={() => setTab(t.k)}
          >
            <Icon name={t.icon} size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dict' && <Directories />}
      {tab === 'prompt' && <PromptAdmin />}
      {tab === 'users' && <UsersAdmin />}
      {tab === 'registry' && <Registry />}
      {tab === 'hr' && <HrDashboard />}
    </div>
  )
}
