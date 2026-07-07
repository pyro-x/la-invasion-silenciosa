// Endowed-progress banner (LCHP-30, D-055): shown in Perfil when an
// anonymous neighbor has stored provisional support waiting — it lives
// where points are already being looked at, it never interrupts. Real
// numbers, real reason: the +5s exist in the database, one email away.
import { useQuery } from '@tanstack/react-query'
import { registrationState } from '@/lib/registration'
import { countOwnProvisionalConfirmations } from '@/services/verifications.service'

export function PendingValueBanner() {
  const { data } = useQuery({
    queryKey: ['registration', 'pending-value'],
    queryFn: async () => {
      const state = await registrationState()
      if (state.kind === 'registered') return { show: false as const, count: 0 }
      const count = await countOwnProvisionalConfirmations()
      return { show: count > 0, count }
    },
  })

  if (!data?.show) return null

  const supports = data.count === 1 ? '1 apoyo vecinal' : `${data.count} apoyos vecinales`
  return (
    <div
      className="panel panel-2 pad"
      style={{ padding: 12, display: 'flex', gap: 10, alignItems: 'center' }}
    >
      <span style={{ fontSize: 18 }}>⏳</span>
      <span style={{ fontSize: 12.5 }}>
        Tienes <strong>{supports}</strong> y <strong>+{data.count * 5} puntos</strong> esperando.
        Actívalos guardando tu cuenta aquí abajo.
      </span>
    </div>
  )
}
