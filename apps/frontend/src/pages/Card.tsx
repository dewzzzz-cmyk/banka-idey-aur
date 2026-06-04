import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { trpc } from '@/lib/trpc'
import { useAuthStore } from '@/stores/auth'
import { Icon } from '@/components/ui/Icon'
import { CatChip } from '@/components/ui/CatChip'
import { Avatar } from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { IdeaCategory } from '@portal/types'

interface FormState {
  title: string
  problem: string
  who: string
  proposal: string
  resources: string
  effect: string
  effectEstimate: string
  openQuestions: string
  category: IdeaCategory
  isAnonymous: boolean
  isConfidential: boolean
}

interface FieldProps {
  icon: string
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  placeholder: string
  hint?: string
}

function Field({ icon, label, value, onChange, multiline, placeholder, hint }: FieldProps) {
  const [editing, setEditing] = useState(false)
  return (
    <div className={`field ${editing ? 'editing' : ''}`}>
      <div className="field-h">
        <span className="field-lbl">
          <Icon name={icon} size={15} />
          {label}
        </span>
        {hint && <span className="field-hint">{hint}</span>}
        <button className="field-edit" onClick={() => setEditing((e) => !e)}>
          <Icon name={editing ? 'check' : 'edit'} size={14} />
          {editing ? 'Готово' : 'Изменить'}
        </button>
      </div>
      {editing ? (
        multiline ? (
          <textarea
            className="field-input"
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            autoFocus
          />
        ) : (
          <input
            className="field-input"
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
          />
        )
      ) : (
        <div className={`field-val ${!value ? 'empty' : ''}`}>{value || placeholder}</div>
      )}
    </div>
  )
}

const CAT_OPTS: { k: IdeaCategory; label: string; cls: string; icon: string }[] = [
  { k: 'proc', label: 'Процессы', cls: 'cat-proc', icon: 'flow' },
  { k: 'it', label: 'IT', cls: 'cat-it', icon: 'cpu' },
  { k: 'prod', label: 'Продукт', cls: 'cat-prod', icon: 'box' },
  { k: 'save', label: 'Экономия', cls: 'cat-save', icon: 'piggy' },
  { k: 'work', label: 'Условия труда', cls: 'cat-work', icon: 'smile' },
  { k: 'cx', label: 'Клиентский опыт', cls: 'cat-cx', icon: 'heart' },
]

export default function Card() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const utils = trpc.useUtils()

  const { data: ideaData, isLoading } = trpc.idea.getById.useQuery(
    { id: id! },
    { enabled: !!id },
  )

  const saveDraft = trpc.idea.saveDraft.useMutation()
  const submit = trpc.idea.submit.useMutation({
    onSuccess: () => {
      utils.idea.list.invalidate()
      navigate('/cabinet')
    },
  })

  const [f, setF] = useState<FormState>({
    title: '',
    problem: '',
    who: '',
    proposal: '',
    resources: '',
    effect: '',
    effectEstimate: '',
    openQuestions: '',
    category: 'proc',
    isAnonymous: false,
    isConfidential: false,
  })

  const [sent, setSent] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  // Populate from loaded idea
  useEffect(() => {
    if (ideaData) {
      const cd = ideaData.cardData as any
      setF({
        title: cd.title ?? '',
        problem: cd.problem ?? '',
        who: cd.who ?? '',
        proposal: cd.proposal ?? '',
        resources: cd.resources ?? '',
        effect: cd.effect ?? '',
        effectEstimate: cd.effectEstimate ?? '',
        openQuestions: cd.openQuestions ?? '',
        category: (ideaData.category as IdeaCategory) ?? 'proc',
        isAnonymous: ideaData.isAnonymous ?? false,
        isConfidential: ideaData.isConfidential ?? false,
      })
    }
  }, [ideaData])

  const set = (k: keyof FormState) => (v: string | boolean) =>
    setF((s) => ({ ...s, [k]: v }))

  const validate = () => {
    const errs: Partial<Record<keyof FormState, string>> = {}
    if (!f.title.trim() || f.title.trim().length < 3) errs.title = 'Минимум 3 символа'
    if (!f.problem.trim() || f.problem.trim().length < 10) errs.problem = 'Опишите проблему подробнее'
    if (!f.proposal.trim() || f.proposal.trim().length < 10) errs.proposal = 'Опишите предложение'
    if (!f.effect.trim() || f.effect.trim().length < 3) errs.effect = 'Опишите эффект'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSaveDraft = async () => {
    const draft = await saveDraft.mutateAsync({
      id,
      cardData: {
        title: f.title,
        problem: f.problem,
        who: f.who,
        proposal: f.proposal,
        resources: f.resources,
        effect: f.effect,
        effectEstimate: f.effectEstimate,
        openQuestions: f.openQuestions,
      },
      category: f.category,
      isAnonymous: f.isAnonymous,
      isConfidential: f.isConfidential,
    })
    return draft
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    const draft = await handleSaveDraft()
    submit.mutate({ id: draft.id })
    setSent(true)
  }

  if (isLoading) {
    return (
      <div className="wrap fade">
        <div className="sk" style={{ width: '60%', height: 28, marginBottom: 16 }} />
        <div className="sk" style={{ width: '100%', height: 300 }} />
      </div>
    )
  }

  const fields: Array<{
    key: keyof FormState
    icon: string
    label: string
    placeholder: string
    multiline?: boolean
    hint?: string
  }> = [
    { key: 'problem', icon: 'alert', label: 'Проблема или возможность', placeholder: 'Что не так сейчас?', multiline: true },
    { key: 'who', icon: 'users', label: 'Кого касается', placeholder: 'Кто сталкивается и как часто', multiline: true },
    { key: 'proposal', icon: 'bulb', label: 'Суть предложения', placeholder: 'Что предлагаете сделать', multiline: true },
    { key: 'resources', icon: 'cog', label: 'Что нужно для реализации', placeholder: 'Примерные ресурсы', multiline: true, hint: 'по возможности' },
    { key: 'effect', icon: 'trend', label: 'Ожидаемый эффект', placeholder: 'Какая польза, желательно в цифрах', multiline: true },
  ]

  return (
    <div className="wrap fade">
      <button className="backlink" onClick={() => navigate(-1)}>
        <Icon name="chevRight" size={16} style={{ transform: 'rotate(180deg)' }} />
        Назад к диалогу
      </button>

      <div className="cardscreen split">
        <main className="card-main">
          {/* AI note + title */}
          <div className="card-title-block card">
            <div className="ai-assembled">
              <Icon name="sparkles" size={15} />
              <span>
                Карточку собрал ИИ-помощник на основе вашего диалога. Проверьте формулировки и при
                необходимости поправьте — все поля редактируемые.
              </span>
            </div>
            <div className="field-h">
              <span className="field-lbl">
                <Icon name="flag" size={15} />
                Название идеи
              </span>
            </div>
            <input
              className="card-title-input"
              value={f.title}
              placeholder="Краткое название идеи"
              onChange={(e) => set('title')(e.target.value)}
            />
            {errors.title && (
              <span style={{ color: 'var(--red)', fontSize: 12 }}>{errors.title}</span>
            )}
          </div>

          <div className="card-fields card">
            {fields.map((fld) => (
              <div key={fld.key}>
                <Field
                  icon={fld.icon}
                  label={fld.label}
                  value={f[fld.key] as string}
                  onChange={(v) => set(fld.key)(v)}
                  multiline={fld.multiline}
                  placeholder={fld.placeholder}
                  hint={fld.hint}
                />
                {errors[fld.key] && (
                  <span style={{ color: 'var(--red)', fontSize: 12, marginLeft: 4 }}>
                    {errors[fld.key]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </main>

        {/* Sidebar */}
        <div className="card-side">
          <div className="cardmeta card">
            <div className="cardmeta-row">
              <span className="cardmeta-k">Автор</span>
              <span className="cardmeta-v author">
                {user && <Avatar name={user.name} size="sm" />}
                <b>{user?.name ?? '—'}</b>
              </span>
            </div>
            <hr className="sep" />
            <div className="cardmeta-row">
              <span className="cardmeta-k">Категория</span>
              <span className="cardmeta-v">
                <CatChip cat={f.category} />
              </span>
            </div>
            <div className="cat-picker">
              {CAT_OPTS.map((c) => (
                <button
                  key={c.k}
                  className={`catpick ${c.cls} ${f.category === c.k ? 'on' : ''}`}
                  onClick={() => set('category')(c.k)}
                >
                  <Icon name={c.icon} size={13} />
                  {c.label}
                </button>
              ))}
            </div>
            <hr className="sep" />
            <div className="cardmeta-row">
              <span className="cardmeta-k">Статус</span>
              <span className="cardmeta-v">
                <StatusBadge status={ideaData?.status ?? 'draft'} />
              </span>
            </div>
            <div className="cardmeta-row">
              <span className="cardmeta-k">Видимость</span>
              <label className="vis-toggle">
                <input
                  type="checkbox"
                  checked={f.isAnonymous}
                  onChange={(e) => set('isAnonymous')(e.target.checked)}
                />
                <span>Анонимно для коллег</span>
              </label>
            </div>
            <div className="cardmeta-row">
              <span className="cardmeta-k">
                <Icon
                  name="lock"
                  size={13}
                  style={{ verticalAlign: '-2px', marginRight: 4, color: 'var(--st-mod-t)' }}
                />
                Доступ
              </span>
              <label className="vis-toggle">
                <input
                  type="checkbox"
                  checked={f.isConfidential}
                  onChange={(e) => set('isConfidential')(e.target.checked)}
                />
                <span>Коммерческая тайна</span>
              </label>
            </div>
          </div>

          <div className="card-actions card">
            <button
              className="btn btn-primary btn-block btn-lg"
              onClick={handleSubmit}
              disabled={submit.isPending || saveDraft.isPending}
            >
              <Icon name="send" size={18} />
              Отправить на модерацию
            </button>
            <button
              className="btn btn-ghost btn-block"
              onClick={handleSaveDraft}
              disabled={saveDraft.isPending}
            >
              Сохранить черновик
            </button>
            <button className="btn btn-quiet btn-block" onClick={() => navigate('/chat')}>
              <Icon name="sparkles" size={16} />
              Доработать с ИИ
            </button>
          </div>

          <div className="card-tips">
            <Icon name="shield" size={15} />
            <span>
              Куратор увидит готовую карточку, а не текст диалога. Решение по идее принимает
              человек.
            </span>
          </div>
        </div>
      </div>

      {sent && (
        <div className="toast">
          <Icon name="checkCircle" size={18} />
          Идея отправлена куратору на модерацию
        </div>
      )}
    </div>
  )
}
