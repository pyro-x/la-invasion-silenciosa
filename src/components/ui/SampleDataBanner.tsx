// Thin ribbon shown while the app runs on fake services (D-008/LCHP-19),
// so nobody mistakes the public preview for real data. Removed in LCHP-13.
// Hidden under automation so the visual-replica loop screenshots stay clean.
import { USING_SAMPLE_DATA } from '@/lib/flags'

export function SampleDataBanner() {
  if (!USING_SAMPLE_DATA || navigator.webdriver) return null
  return (
    <div
      className="mono"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        textAlign: 'center',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        padding: '3px 8px',
        background: 'var(--warn)',
        color: '#3a2400',
        opacity: 0.92,
      }}
    >
      versión de prueba · datos de ejemplo
    </div>
  )
}
