import { NavLink, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Icon } from '../ui/Icon'
import { useAuthStore } from '@/stores/auth'

const NAV = [
  { to: '/',        label: 'Главная',      icon: 'home' },
  { to: '/chat',    label: 'Подать идею',  icon: 'bulb' },
  { to: '/lists',   label: 'Рейтинги',     icon: 'fire',   count: '24' },
  { to: '/cabinet', label: 'Мои идеи',     icon: 'user' },
]

const NAV_CUR = [
  { to: '/curator', label: 'Модерация',  icon: 'shield', count: '5' },
  { to: '/impl',    label: 'Реализация', icon: 'rocket', count: '2' },
]

const NAV_ADMIN = [
  { to: '/analytics', label: 'Аналитика',           icon: 'bars' },
  { to: '/admin',     label: 'Администрирование',    icon: 'cog' },
]

interface RailProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Rail({ isOpen, onClose }: RailProps) {
  const { user } = useAuthStore()
  const location = useLocation()

  // Close rail on navigation (mobile)
  useEffect(() => {
    onClose?.()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  return (
    <nav className={`rail${isOpen ? ' open' : ''}`}>
      <div className="brand">
        <div className="logo" style={{ background: 'linear-gradient(150deg, var(--accent), #4D7BFF)', borderRadius: 11, width: 38, height: 38, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="5" width="12" height="14" rx="1"/>
            <ellipse cx="12" cy="5" rx="6" ry="2"/>
            <ellipse cx="12" cy="19" rx="6" ry="2"/>
            <path d="M11 3.5 C11.5 2.8 12.5 2.8 13 3.5"/>
            <line x1="7" y1="9" x2="17" y2="9"/>
            <line x1="7" y1="15" x2="17" y2="15"/>
          </svg>
        </div>
        <div className="name">
          Банка Идей
          <small>Открой идею · can.ru</small>
        </div>
        {/* Close button — visible only on mobile */}
        <button
          className="rail-close"
          onClick={onClose}
          aria-label="Закрыть меню"
          style={{ display: 'none' }}
        >
          <Icon name="x" size={20} />
        </button>
      </div>

      {NAV.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.to === '/'}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <Icon name={n.icon} size={19} />
          {n.label}
          {n.count && <span className="count">{n.count}</span>}
        </NavLink>
      ))}

      {user?.roles?.some((r) => ['curator', 'admin', 'owner', 'committee', 'implementer'].includes(r)) && (
        <>
          <div className="nav-group-label">Кураторам</div>
          {NAV_CUR.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon name={n.icon} size={19} />
              {n.label}
              {n.count && <span className="count">{n.count}</span>}
            </NavLink>
          ))}
        </>
      )}

      {user?.roles?.some((r) => ['admin', 'owner'].includes(r)) && (
        <>
          <div className="nav-group-label">Управление</div>
          {NAV_ADMIN.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon name={n.icon} size={19} />
              {n.label}
            </NavLink>
          ))}
        </>
      )}

      <div className="co">
        <div className="colog" style={{ background: 'var(--accent)', borderRadius: 8, width: 30, height: 30, display: 'grid', placeItems: 'center' }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 12, letterSpacing: '-0.02em' }}>АУР</span>
        </div>
        <div className="cotxt">
          <b style={{ color: 'var(--ink-2)' }}>АУР</b>
          <br />Открой идею · can.ru
        </div>
      </div>
    </nav>
  )
}
