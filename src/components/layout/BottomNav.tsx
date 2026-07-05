// The prototype's tabbar, ported verbatim: 5 destinations, pixel-art icons
// (NavIcon) and the raised central «Cazar» FAB (docs/prototype app.jsx + CSS).
import { NavLink, useNavigate } from 'react-router'
import { NavIcon } from '@/components/pixel/NavIcon'
import type { NavIconName } from '@/components/pixel/sprites'
import { cn } from '@/lib/utils'

const TABS: { to: string; label: string; icon: NavIconName }[] = [
  { to: '/mapa', label: 'Mapa', icon: 'map' },
  { to: '/especies', label: 'Especies', icon: 'dex' },
  { to: '/ranking', label: 'Ranking', icon: 'rank' },
  { to: '/perfil', label: 'Perfil', icon: 'me' },
]

export function BottomNav() {
  const navigate = useNavigate()
  return (
    <nav aria-label="Navegación principal" className="tabbar">
      {TABS.slice(0, 2).map((tab) => (
        <Tab key={tab.to} {...tab} />
      ))}
      <button
        type="button"
        aria-label="Cazar"
        className="tab cta"
        onClick={() => navigate('/cazar')}
      >
        <span className="fab">
          <NavIcon name="hunt" scale={4} />
        </span>
      </button>
      {TABS.slice(2).map((tab) => (
        <Tab key={tab.to} {...tab} />
      ))}
    </nav>
  )
}

function Tab({ to, label, icon }: (typeof TABS)[number]) {
  return (
    <NavLink to={to} className={({ isActive }) => cn('tab', isActive && 'active')}>
      <span className="glyph">
        <NavIcon name={icon} scale={3.2} />
      </span>
      {label}
    </NavLink>
  )
}
