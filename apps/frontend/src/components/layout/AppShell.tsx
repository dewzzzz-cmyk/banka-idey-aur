import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import { Rail } from './Rail'
import { TopBar } from './TopBar'
import { IdeaDrawer } from '../ui/IdeaDrawer'
import { OnboardingModal } from '../ui/OnboardingModal'
import { useUIStore } from '@/stores/ui'

export function AppShell() {
  const { accent, radius, theme, notifOpen, setNotifOpen } = useUIStore()

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent)
    document.documentElement.style.setProperty('--r', radius + 'px')
    document.documentElement.setAttribute('data-theme', theme)
  }, [accent, radius, theme])

  return (
    <div className="app">
      <Rail />
      <div className="main">
        <TopBar />
        <div className="canvas" onClick={() => notifOpen && setNotifOpen(false)}>
          <Outlet />
        </div>
      </div>
      <IdeaDrawer />
      <OnboardingModal />
    </div>
  )
}
