import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Avatar } from '../ui/Avatar'
import { useUIStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { trpc } from '@/lib/trpc'

const TITLES: Record<string, { t: string; s: string }> = {
  '/':          { t: 'Главная',               s: 'Лента идей и активности компании' },
  '/chat':      { t: 'Новая идея',            s: 'Расскажите своими словами — остальное сделает ИИ' },
  '/card':      { t: 'Карточка идеи',         s: 'Проверьте и отправьте на модерацию' },
  '/lists':     { t: 'Рейтинги идей',         s: 'Топ, в работе и зал славы' },
  '/cabinet':   { t: 'Личный кабинет',        s: 'Ваши идеи, баллы и вознаграждения' },
  '/curator':   { t: 'Кабинет куратора',      s: 'Очередь идей на модерацию' },
  '/impl':      { t: 'Реализация идей',       s: 'Внедрение, этапы и фактический эффект' },
  '/analytics': { t: 'Аналитика программы',  s: 'KPI, воронка и эффект для руководства' },
  '/admin':     { t: 'Администрирование',     s: 'Справочники, ИИ, грейды и реестр выплат' },
}

interface TopBarProps {
  onMenuToggle?: () => void
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { notifOpen, setNotifOpen, theme, setTheme } = useUIStore()
  const { user, logout } = useAuthStore()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const [q, setQ] = useState('')
  const debRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    setQ(new URLSearchParams(window.location.search).get('q') ?? '')
  }, [])

  const handleSearch = (val: string) => {
    setQ(val)
    clearTimeout(debRef.current)
    debRef.current = setTimeout(() => {
      window.history.pushState({}, '', val.trim() ? '/?q=' + encodeURIComponent(val.trim()) : '/')
      window.dispatchEvent(new PopStateEvent('popstate'))
    }, 350)
  }

  const pathKey = '/' + location.pathname.split('/')[1]
  const title = TITLES[pathKey] ?? TITLES['/']

  const { data: notifData } = trpc.notification.getUnreadCount.useQuery(undefined, {
    refetchInterval: 30_000,
  })
  const { data: notifList = [] } = trpc.notification.listMy.useQuery(
    undefined,
    { enabled: notifOpen }
  )

  const unread = notifData?.count ?? 0

  return (
    <header className="topbar">
      {/* Hamburger — visible only on mobile */}
      <button
        className="burger iconbtn"
        onClick={onMenuToggle}
        aria-label="Открыть меню"
        style={{ display: 'none', flexShrink: 0 }}
      >
        <Icon name="menu" size={20} />
      </button>

      <div className="topbar-title">
        <div className="pgtitle">{title.t}</div>
        <div className="pgsub">{title.s}</div>
      </div>

      <div className="topbar-search" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 10, padding: '7px 13px', width: 230, flexShrink: 0 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--faint)', flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input placeholder="Поиск по идеям…" value={q} onChange={e => handleSearch(e.target.value)} style={{ border: 'none', outline: 'none', background: 'none', fontSize: 13, color: 'var(--ink)', width: '100%', minWidth: 0 }} />
      </div>

      <button
        className="iconbtn"
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
      >
        {theme === 'dark' ? (
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        ) : (
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        )}
      </button>

      <button
        className="iconbtn"
        onClick={() => setNotifOpen(!notifOpen)}
        style={{ position: 'relative' }}
      >
        <Icon name="bell" size={19} />
        {unread > 0 && <span className="dot" />}

        {notifOpen && (
          <div className="notif-pop" onClick={(e) => e.stopPropagation()}>
            <div className="notif-h">Уведомления</div>
            {notifList.length === 0 && (
              <div style={{ padding: '16px 18px', fontSize: 13, color: 'var(--faint)' }}>
                Нет новых уведомлений
              </div>
            )}
            {notifList.map((n, i) => (
              <div key={n.id ?? i} className={`notif-row ${n.accent ? 'accent' : ''}`}>
                <div className="notif-ic"><Icon name={n.icon} size={17} /></div>
                <div>
                  <div className="notif-txt">{n.text}</div>
                  <div className="notif-time">{new Date(n.createdAt).toLocaleDateString('ru-RU')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </button>

      {user && (
        <div ref={userMenuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}
            title={user.name}
          >
            <Avatar name={user.name} size="md" />
          </button>

          {userMenuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)',
              background: 'var(--surface)', border: '1px solid var(--line-2)',
              borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              minWidth: 210, zIndex: 200, padding: '6px 0',
            }}>
              {/* User info */}
              <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid var(--line-2)' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{user.name}</div>
                <div style={{ fontSize: 12, color: 'var(--faint)' }}>{user.email}</div>
                {user.dept && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{user.dept}</div>}
              </div>
              {/* Actions */}
              <button
                onClick={() => { setUserMenuOpen(false); navigate('/cabinet') }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--ink)', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <Icon name="user" size={16} />
                Личный кабинет
              </button>
              <button
                onClick={() => { setUserMenuOpen(false); navigate('/guide') }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--ink)', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <Icon name="book" size={16} />
                Руководство
              </button>
              <div style={{ height: 1, background: 'var(--line-2)', margin: '4px 0' }} />
              <button
                onClick={async () => { setUserMenuOpen(false); await logout(); navigate('/login') }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#e53935', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <Icon name="logout" size={16} />
                Выйти
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
