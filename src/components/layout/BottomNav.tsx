import { NavLink, useNavigate } from 'react-router'
import { Map, BookOpen, Camera, Trophy, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/mapa', label: 'Mapa', Icon: Map },
  { to: '/especies', label: 'Especies', Icon: BookOpen },
  { to: '/ranking', label: 'Ranking', Icon: Trophy },
  { to: '/perfil', label: 'Perfil', Icon: User },
] as const

export function BottomNav() {
  const navigate = useNavigate()
  return (
    <nav
      aria-label="Navegación principal"
      className="z-40 flex h-19 items-stretch justify-around border-t-2 border-line bg-canvas-2 px-1.5"
    >
      {TABS.slice(0, 2).map((tab) => (
        <Tab key={tab.to} {...tab} />
      ))}
      <button
        type="button"
        aria-label="Cazar"
        onClick={() => navigate('/cazar')}
        className="flex flex-1 -translate-y-3.5 cursor-pointer flex-col items-center justify-center gap-1 font-mono text-[9.5px] font-bold tracking-wider text-ink-dim uppercase"
      >
        <span
          className="flex size-14 items-center justify-center rounded-full border-2 border-line bg-accent text-on-accent"
          style={{ boxShadow: 'var(--shadow-app)' }}
        >
          <Camera aria-hidden className="size-6" />
        </span>
        Cazar
      </button>
      {TABS.slice(2).map((tab) => (
        <Tab key={tab.to} {...tab} />
      ))}
    </nav>
  )
}

function Tab({ to, label, Icon }: (typeof TABS)[number]) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 pt-2 font-mono text-[9.5px] font-bold tracking-wider uppercase',
          isActive ? 'text-accent' : 'text-ink-dim',
        )
      }
    >
      <Icon aria-hidden className="size-6" strokeWidth={2.4} />
      {label}
    </NavLink>
  )
}
