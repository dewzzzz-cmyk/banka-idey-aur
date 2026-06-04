import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '@/lib/trpc'
import { useAuthStore } from '@/stores/auth'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'

const STEPS = [
  { key: 'problem', label: 'Проблема' },
  { key: 'who', label: 'Контекст' },
  { key: 'proposal', label: 'Предложение' },
  { key: 'resources', label: 'Ресурсы' },
  { key: 'effect', label: 'Эффект' },
]

interface ChatMsg {
  from: 'ai' | 'me'
  text: string
  kind?: 'filter' | 'rag'
}

export default function Chat() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [sessionId, setSessionId] = useState<string | undefined>()
  const [collectedFields, setCollectedFields] = useState<Record<string, string>>({})
  const [step, setStep] = useState(0)
  const [ready, setReady] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [aiDown, setAiDown] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    {
      from: 'ai',
      text: 'Привет! Расскажите о своей идее — что вы хотите улучшить в работе компании? Можно в свободной форме, одним предложением.',
    },
  ])
  const scrollRef = useRef<HTMLDivElement>(null)

  const saveDraft = trpc.idea.saveDraft.useMutation()

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [chatMessages, streaming])

  const send = async () => {
    if (!inputVal.trim() || streaming) return
    const text = inputVal.trim()
    setInputVal('')
    setChatMessages((m) => [...m, { from: 'me', text }])
    setStreaming(true)

    let aiText = ''
    let newSessionId = sessionId

    try {
      const resp = await fetch((import.meta.env.VITE_API_URL ?? '') + '/api/ai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: text, sessionId, collectedFields }),
      })

      if (!resp.ok) throw new Error('AI unavailable')

      const reader = resp.body!.getReader()
      const decoder = new TextDecoder()

      setChatMessages((m) => [...m, { from: 'ai', text: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value).split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.text) {
              aiText += data.text
              setChatMessages((m) => {
                const copy = [...m]
                copy[copy.length - 1] = { from: 'ai', text: aiText }
                return copy
              })
            }
            if (data.sessionId) newSessionId = data.sessionId
            if (data.collectedFields) setCollectedFields(data.collectedFields)
            if (data.error) {
              setAiDown(true)
              setChatMessages((m) => {
                const copy = [...m]
                copy[copy.length - 1] = { from: 'ai', text: data.error }
                return copy
              })
            }
            if (data.done) {
              if (newSessionId && newSessionId !== sessionId) setSessionId(newSessionId)
              setStep((s) => {
                const ns = Math.min(s + 1, STEPS.length - 1)
                if (ns >= 3) setReady(true)
                return ns
              })
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch {
      setAiDown(true)
      setChatMessages((m) => {
        const copy = [...m]
        if (copy[copy.length - 1]?.from === 'ai' && copy[copy.length - 1].text === '') {
          copy[copy.length - 1] = {
            from: 'ai',
            text: 'ИИ-помощник временно недоступен. Заполните карточку вручную.',
          }
        } else {
          copy.push({
            from: 'ai',
            text: 'ИИ-помощник временно недоступен. Заполните карточку вручную.',
          })
        }
        return copy
      })
    } finally {
      setStreaming(false)
    }
  }

  const makeCard = async () => {
    const draft = await saveDraft.mutateAsync({
      cardData: {
        title: collectedFields.title ?? '',
        problem: collectedFields.problem ?? '',
        who: collectedFields.who ?? '',
        proposal: collectedFields.proposal ?? '',
        resources: collectedFields.resources ?? '',
        effect: collectedFields.effect ?? '',
        effectEstimate: collectedFields.effectEstimate ?? '',
        openQuestions: '',
      },
    })
    navigate(`/card/${draft.id}`)
  }

  const blocks = STEPS.map((s, i) => ({ ...s, done: i < step }))

  const quickChips = [
    'Каждый день, 3 склада, ~25 человек',
    'Печатать QR на паллетах и сканировать терминалом',
    'Сэкономим ~60% времени приёмки',
  ]

  return (
    <div className="wrap-narrow fade" style={{ maxWidth: 1060 }}>
      {/* Chat header */}
      <div className="chat-head">
        <div className="chat-head-ic">
          <Icon name="sparkles" size={20} />
        </div>
        <div>
          <div className="chat-head-t">ИИ-помощник «Банка Идей»</div>
          <div className="chat-head-s">
            {aiDown ? 'Не в сети — ручной режим' : 'Поможет раскрыть идею за пару вопросов'}
          </div>
        </div>
        <span className="chat-status">
          <span className={`live ${aiDown ? 'off' : ''}`} />
          {aiDown ? 'офлайн' : 'на связи'}
        </span>
      </div>

      {aiDown && (
        <div className="aidown">
          <div className="aidown-ic">
            <Icon name="wifiOff" size={20} />
          </div>
          <div className="aidown-txt">
            <b>ИИ-помощник сейчас недоступен</b>
            <span>Ничего страшного — можно заполнить карточку вручную, мы сохраним черновик.</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={makeCard}>
            Заполнить вручную
          </button>
        </div>
      )}

      <div className="chat-layout has-side">
        {/* Chat column */}
        <div className="chat-col">
          <div className="chat-scroll" ref={scrollRef}>
            <div className="chat-day">Сегодня</div>
            {chatMessages.map((m, i) => (
              <div key={i} className={`msg ${m.from === 'ai' ? 'ai' : 'me'}`}>
                {m.from === 'ai' && (
                  <div className={`msg-av ${m.kind === 'filter' ? 'filter' : ''}`}>
                    {m.kind === 'filter' ? (
                      <Icon name="shield" size={15} />
                    ) : (
                      <Icon name="sparkles" size={16} />
                    )}
                  </div>
                )}
                <div className={`msg-bub ${m.kind ? `msg-${m.kind}` : ''}`}>
                  {streaming && i === chatMessages.length - 1 && m.from === 'ai' && !m.text ? (
                    <span className="typing"><i /><i /><i /></span>
                  ) : (
                    m.text
                  )}
                </div>
                {m.from === 'me' && user && <Avatar name={user.name} size="sm" />}
              </div>
            ))}

            {ready && (
              <div className="card-ready">
                <div className="card-ready-ic">
                  <Icon name="checkCircle" size={22} />
                </div>
                <div>
                  <b>Карточка готова к проверке</b>
                  <span>
                    Все ключевые блоки заполнены. Откройте карточку, чтобы отредактировать поля и
                    отправить на модерацию.
                  </span>
                </div>
                <button className="btn btn-primary" onClick={makeCard}>
                  Открыть карточку <Icon name="arrowRight" size={17} />
                </button>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="composer">
            {!ready && (
              <div className="quickrow">
                {quickChips.map((q) => (
                  <button key={q} className="quickchip" onClick={() => setInputVal(q)}>
                    {q}
                  </button>
                ))}
              </div>
            )}
            <div className="helprow">
              <span className="helprow-lbl">
                <Icon name="book" size={13} />
                Спросить о правилах:
              </span>
              {['Как считается премия?', 'Можно ли анонимно?'].map((q) => (
                <button key={q} className="helpchip" onClick={() => setInputVal(q)}>
                  {q}
                </button>
              ))}
            </div>
            <div className="composer-box">
              <button className="comp-attach" title="Прикрепить файл">
                <Icon name="paperclip" size={19} />
              </button>
              <textarea
                rows={1}
                placeholder="Опишите идею своими словами…"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                disabled={streaming}
              />
              <button
                className="comp-send"
                disabled={!inputVal.trim() || streaming}
                onClick={send}
              >
                <Icon name="send" size={18} />
              </button>
            </div>
            <div className="composer-foot">
              <span>
                <Icon name="lock" size={13} />
                Диалог хранится только внутри компании
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-quiet btn-sm" onClick={makeCard}>
                  Пропустить диалог
                </button>
                <button className="btn btn-soft btn-sm" onClick={makeCard}>
                  <Icon name="edit" size={15} />
                  Оформить карточку
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Progress sidebar */}
        <aside className="chat-side">
          <div className="prog side">
            <div className="prog-h">Прогресс по идее</div>
            <div className="prog-track">
              {blocks.map((b, i) => (
                <div
                  key={b.key}
                  className={`prog-step ${b.done ? 'done' : ''} ${
                    !b.done && (i === 0 || blocks[i - 1]?.done) ? 'active' : ''
                  }`}
                >
                  <span className="prog-dot">
                    {b.done ? <Icon name="check" size={13} strokeWidth={2.6} /> : i + 1}
                  </span>
                  <span className="prog-lbl">{b.label}</span>
                  {i < blocks.length - 1 && <span className="prog-line" />}
                </div>
              ))}
            </div>
            <div className="prog-foot">
              <p>
                Заполните хотя бы <b>проблему</b>, <b>предложение</b> и <b>эффект</b> — этого
                достаточно для карточки.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
