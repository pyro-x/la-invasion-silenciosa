import { Outlet } from 'react-router'
import { BottomNav } from './BottomNav'

/**
 * Mobile shell: full-height column with the tab screens on top and the
 * prototype's bottom bar (5 destinations, highlighted central «Cazar»).
 */
export function AppShell() {
  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col overflow-hidden bg-canvas">
      <main className="min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
