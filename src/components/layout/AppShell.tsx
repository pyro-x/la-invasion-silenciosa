// The prototype's app frame: relative container where each screen renders
// absolutely (.screen, bottom: 76px) above the fixed tabbar.
import { Outlet } from 'react-router'
import { BottomNav } from './BottomNav'

export function AppShell() {
  return (
    <div className="app-root mx-auto h-dvh max-w-md">
      <Outlet />
      <BottomNav />
    </div>
  )
}
