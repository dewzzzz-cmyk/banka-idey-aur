import { Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Rail } from './Rail'
import { TopBar } from './TopBar'
import { IdeaDrawer } from '../ui/IdeaDrawer'
import { OnboardingModal } from '../ui/OnboardingModal'
import { useUIStore } from '@/stores/ui'

export function AppShell() {
  const { accent, radius, theme, notifOpen, setNotifOpen } = useUIStore()
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent)
    document.documentElement.style.setProperty('--r', radius + 'px')
    document.documentElement.setAttribute('data-theme', theme)
  }, [accent, radius, theme])

  // Close nav on route change (mobile)
  useEffect(() => {
    setNavOpen(false)
  }, [])

  return (
    <div className="app">
      {/* Mobile overlay — closes nav on tap */}
      <div
        className={`rail-overlay${navOpen ? ' open' : ''}`}
        onClick={() => setNavOpen(false)}
        aria-hidden="true"
      />
      <Rail isOpen={navOpen} onClose={() => setNavOpen(false)} />
      <div className="main">
        <TopBar onMenuToggle={() => setNavOpen(v => !v)} />
        <div
          className="canvas"
          onClick={() => {
            if (notifOpen) setNotifOpen(false)
            if (navOpen) setNavOpen(false)
          }}
        >
          <Outlet />
        </div>
      </div>
      <IdeaDrawer />
      <OnboardingModal />
    </div>
  )
}
