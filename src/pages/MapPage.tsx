// Map screen (LCHP-13; full-bleed layout LCHP-34, D-061): the map IS the
// screen. Title, mode chips and the locate button float over it; one
// bottom sheet carries the sighting detail and the «Cerca de ti» list, and
// the map centres itself in the part the sheet leaves free.
//
// Validated sightings show the species sprite; pending ones blink with an
// amber ring. The detail shows species · status · age · approximate location
// — NO author and NO exact street (the public view exposes neither; golden
// rule / D-046). «Ver evidencia» loads the photo on demand. «Verificar»
// (LCHP-15) opens the verification modal from its two doors — the detail
// card and the «Cerca de ti» rows.
import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LocateFixed } from 'lucide-react'
import { MapSheet } from '@/components/map/MapSheet'
import type { MapFocus } from '@/components/map/BarrioMap'
import { CreatureSprite } from '@/components/pixel/CreatureSprite'
import { VerifyModal } from '@/components/sightings/VerifyModal'
import { Toast } from '@/components/ui/Toast'
import { formatAge } from '@/lib/age'
import { isWithinLaLatina } from '@/lib/geo'
import {
  resumeGeoWatchIfGranted,
  startGeoWatch,
  stopGeoWatch,
  useGeoWatch,
  type GeoWatchState,
} from '@/lib/geoWatch'
import { locationSettingsGuidance } from '@/lib/permissions'
import { getEvidenceUrl, type EvidenceResult } from '@/services/evidence.service'
import { listMapSightings } from '@/services/sightings.service'
import { listSpecies } from '@/services/species.service'
import type { VerifyOutcome } from '@/services/verifications.service'
import type { MapSightingGeo } from '@/types/sighting'

// One shared empty list: a fresh [] on every render would make the map
// reconcile its pins again for nothing.
const NO_SIGHTINGS: MapSightingGeo[] = []

// MapLibre is ~210 KB gzipped (spike LCHP-4): load it only on /mapa.
const BarrioMap = lazy(() =>
  import('@/components/map/BarrioMap').then((m) => ({ default: m.BarrioMap })),
)

function SightingMarker({ sighting, selected }: { sighting: MapSightingGeo; selected: boolean }) {
  const pending = sighting.status === 'pending'
  return (
    <div
      style={{
        width: 34,
        height: 34,
        display: 'grid',
        placeItems: 'center',
        borderRadius: 8,
        background: 'var(--card)',
        border: `2px solid ${selected ? 'var(--accent)' : pending ? 'var(--warn)' : 'var(--line)'}`,
        boxShadow: selected ? '0 0 0 3px var(--accent)' : '0 1px 3px rgba(0,0,0,0.25)',
        animation: pending ? 'blinkdot 1.4s ease-in-out infinite' : 'none',
      }}
    >
      <CreatureSprite id={sighting.speciesId} scale={2} />
    </div>
  )
}

// Evidence is keyed to the sighting that requested it (Codex review, HIGH):
// a late response for sighting A must never render under sighting B.
type EvidenceState = { sightingId: string; state: 'loading' | EvidenceResult } | null

const VERIFY_TOASTS: Record<VerifyOutcome['kind'], string> = {
  validated: 'Avistamiento validado · +10 para el autor · +5 para ti',
  counted: 'Confirmación registrada · +5 cuando se valide',
  saved_provisional: 'Apoyo guardado · regístrate para que cuente y cobrar tus +5',
  already_verified: 'Ya habías verificado este avistamiento',
  not_verifiable: 'Este avistamiento ya no se puede verificar',
  error: 'No se pudo enviar, inténtalo de nuevo',
}

// What to tell the neighbour about «dónde estoy», if anything. The map is a
// barrio game: a position outside La Latina is shown no map to follow.
function locateNotice(geo: GeoWatchState, outsideBarrio: boolean): string | null {
  if (geo.kind === 'denied') return locationSettingsGuidance()
  if (geo.kind === 'unavailable' || geo.kind === 'timeout') {
    return 'No se pudo obtener tu posición. Inténtalo otra vez al aire libre.'
  }
  if (geo.kind === 'unsupported') return 'Este navegador no ofrece tu ubicación.'
  if (outsideBarrio) return 'Estás fuera de La Latina: el mapa se queda en el barrio.'
  return null
}

export function MapPage() {
  const queryClient = useQueryClient()
  const [heat, setHeat] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [evidence, setEvidence] = useState<EvidenceState>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  // Monotonic token so only the LATEST evidence request wins — covers both a
  // different-sighting switch and same-sighting re-taps (Codex review): an
  // older response (even a late error) never clobbers a newer one.
  const evidenceReq = useRef(0)

  const [sheetOpen, setSheetOpen] = useState(true)
  const [sheetHeight, setSheetHeight] = useState(0)
  const [focus, setFocus] = useState<MapFocus | null>(null)
  const [zoomStep, setZoomStep] = useState<{ delta: number } | null>(null)
  const [following, setFollowing] = useState(false)
  const [dismissedNotice, setDismissedNotice] = useState<string | null>(null)
  const geo = useGeoWatch()

  // Resuming never prompts: it only starts when the browser already granted.
  useEffect(() => {
    void resumeGeoWatchIfGranted()
    return stopGeoWatch
  }, [])

  const {
    data: sightings = NO_SIGHTINGS,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['sightings', 'map'],
    queryFn: listMapSightings,
  })
  const { data: species = [] } = useQuery({ queryKey: ['species'], queryFn: listSpecies })

  const pick = (id: string) => {
    setSel(id)
    setVerifying(false)
    setEvidence(null)
    evidenceReq.current++ // drop any in-flight request from the previous pin
    setSheetOpen(true)
    setFollowing(false)
    const target = sightings.find((s) => s.id === id)
    if (target) setFocus({ lat: target.lat, lng: target.lng })
  }

  const onVerifyResult = (outcome: VerifyOutcome) => {
    setVerifying(false)
    showToast(VERIFY_TOASTS[outcome.kind])
    if (
      outcome.kind === 'validated' ||
      outcome.kind === 'counted' ||
      outcome.kind === 'saved_provisional'
    ) {
      // The pin may stop blinking / the count may move: re-read the public
      // view on every stored confirmation (a provisional one can still have
      // validated the sighting when the operational switch is open).
      void queryClient.invalidateQueries({ queryKey: ['sightings', 'map'] })
    }
  }

  const loadEvidence = async (id: string) => {
    const token = ++evidenceReq.current
    setEvidence({ sightingId: id, state: 'loading' })
    const result = await getEvidenceUrl(id)
    if (evidenceReq.current !== token) return // superseded by a newer request
    setEvidence({ sightingId: id, state: result })
  }

  // Dismissing must also invalidate the in-flight token so a late response
  // can't reopen the overlay after the user closed it (Codex review).
  const closeEvidence = () => {
    evidenceReq.current++
    setEvidence(null)
  }

  const showToast = (msg: string) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }

  // The native permission prompt fires here and only here: on this tap.
  const locate = () => {
    setDismissedNotice(null)
    setFollowing(true)
    startGeoWatch()
  }

  const speciesName = (id: string) => species.find((c) => c.id === id)?.name ?? ''
  const pending = sightings.filter((s) => s.status === 'pending')
  const selS = sightings.find((s) => s.id === sel)

  const me = geo.kind === 'ok' ? geo.position : null
  const outsideBarrio = me !== null && !isWithinLaLatina(me.lat, me.lng)
  const notice = locateNotice(geo, outsideBarrio)
  const follow = following && me !== null && !outsideBarrio

  const nearbyHeader = (
    <div className="row" style={{ justifyContent: 'space-between' }}>
      <span className="eyebrow">Cerca de ti</span>
      {!isError && <span className="chip chip-warn">{pending.length} Por verificar</span>}
    </div>
  )

  const sheetVars: CSSProperties & Record<'--sheet-h', string> = { '--sheet-h': `${sheetHeight}px` }

  return (
    <div className="screen map-screen" style={sheetVars}>
      <Suspense
        fallback={<div style={{ position: 'absolute', inset: 0, background: 'var(--bg2)' }} />}
      >
        <BarrioMap
          sightings={heat || isError ? NO_SIGHTINGS : sightings}
          selectedId={sel}
          onPick={pick}
          onMapTap={() => setSel(null)}
          onUserMove={() => setFollowing(false)}
          renderMarker={(s, selected) => <SightingMarker sighting={s} selected={selected} />}
          me={me && !outsideBarrio ? me : null}
          follow={follow}
          bottomPadding={sheetHeight}
          focus={focus}
          zoomStep={zoomStep}
        />
      </Suspense>

      <div className="map-top">
        <div className="map-title">
          <div className="eyebrow">Mapa del barrio</div>
          <div className="scr-title" style={{ fontSize: 16 }}>
            Avistamientos en La Latina
          </div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button
            type="button"
            className={'chip map-chip ' + (!heat ? 'chip-accent' : 'chip-ghost')}
            aria-pressed={!heat}
            onClick={() => setHeat(false)}
          >
            Avistamientos
          </button>
          <button
            type="button"
            className={'chip map-chip ' + (heat ? 'chip-accent' : 'chip-ghost')}
            aria-pressed={heat}
            onClick={() => setHeat(true)}
          >
            Mapa de calor
          </button>
        </div>
      </div>

      {/* a failed read must LOOK failed, never like a valid empty map */}
      {isError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            display: 'grid',
            placeItems: 'center',
            background: 'color-mix(in srgb, var(--bg) 75%, transparent)',
          }}
        >
          <div className="panel pad stack center" style={{ padding: 16, gap: 10 }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
              No se pudieron cargar los avistamientos
            </span>
            <button type="button" className="btn btn-accent" onClick={() => void refetch()}>
              Reintentar
            </button>
          </div>
        </div>
      )}
      {heat && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            display: 'grid',
            placeItems: 'center',
            pointerEvents: 'none',
          }}
        >
          <span className="chip chip-ghost mono map-chip" style={{ fontSize: 10 }}>
            Mapa de calor · próximamente
          </span>
        </div>
      )}

      <div className="map-float map-fabs">
        <button
          type="button"
          className="map-fab only-fine"
          aria-label="Acercar el mapa"
          onClick={() => setZoomStep({ delta: 1 })}
        >
          +
        </button>
        <button
          type="button"
          className="map-fab only-fine"
          aria-label="Alejar el mapa"
          onClick={() => setZoomStep({ delta: -1 })}
        >
          −
        </button>
        <button
          type="button"
          className={
            'map-fab' + (follow ? ' is-active' : '') + (geo.kind === 'searching' ? ' is-busy' : '')
          }
          aria-label="Ir a mi posición"
          aria-pressed={follow}
          onClick={locate}
        >
          <LocateFixed size={22} aria-hidden />
        </button>
      </div>

      <MapSheet
        label="Avistamientos cerca de ti"
        open={sheetOpen}
        onToggle={setSheetOpen}
        onHeight={setSheetHeight}
        header={
          selS ? (
            <div>
              <div className="row" style={{ gap: 12 }}>
                <div
                  className="panel-2 center"
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 8,
                    border: 'var(--bw) solid var(--line)',
                    flexShrink: 0,
                  }}
                >
                  <CreatureSprite id={selS.speciesId} scale={3} />
                </div>
                <div className="grow">
                  <div className="display" style={{ fontSize: 12 }}>
                    {speciesName(selS.speciesId)}
                  </div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
                    Ubicación aproximada · La Latina · {formatAge(selS.createdAt)}
                  </div>
                </div>
                <span className={'chip ' + (selS.status === 'pending' ? 'chip-warn' : 'chip-good')}>
                  {selS.status === 'pending' ? 'Por verificar' : 'Validado'}
                </span>
              </div>
              <div className="row" style={{ gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ flex: 1 }}
                  onClick={() => void loadEvidence(selS.id)}
                >
                  Ver evidencia
                </button>
                {selS.status === 'pending' && (
                  <button
                    type="button"
                    className="btn btn-accent"
                    style={{ flex: 1 }}
                    onClick={() => setVerifying(true)}
                  >
                    ✔ Verificar
                  </button>
                )}
              </div>
            </div>
          ) : (
            nearbyHeader
          )
        }
      >
        {notice && notice !== dismissedNotice && (
          <div
            className="panel panel-2 pad row"
            role="status"
            style={{ padding: 10, gap: 8, fontSize: 12, boxShadow: 'none' }}
          >
            <span className="grow" style={{ color: 'var(--ink-dim)' }}>
              {notice}
            </span>
            <button
              type="button"
              className="chip chip-ghost"
              aria-label="Cerrar aviso"
              onClick={() => setDismissedNotice(notice)}
            >
              ✕
            </button>
          </div>
        )}
        {selS && nearbyHeader}
        {pending.map((s) => (
          <button
            key={s.id}
            type="button"
            className="panel pad"
            onClick={() => {
              pick(s.id)
              setVerifying(true) // the list is the second door to the modal
            }}
            style={{
              padding: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              textAlign: 'left',
              cursor: 'pointer',
              width: '100%',
              flexShrink: 0,
              boxShadow: 'none',
            }}
          >
            <CreatureSprite id={s.speciesId} scale={2.8} />
            <div className="grow">
              <div style={{ fontWeight: 600, fontSize: 14 }}>{speciesName(s.speciesId)}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
                La Latina · {formatAge(s.createdAt)}
              </div>
            </div>
            <span className="chip chip-accent">Verificar</span>
          </button>
        ))}
      </MapSheet>

      {/* verification modal (LCHP-15): only over a pending selection */}
      {verifying && selS && selS.status === 'pending' && (
        <VerifyModal
          sighting={selS}
          speciesName={speciesName(selS.speciesId)}
          onClose={() => setVerifying(false)}
          onResult={onVerifyResult}
          onReclassify={() => showToast('Reclasificar · próximamente')}
        />
      )}

      {/* evidence overlay (brief §18): the photo is on-demand proof, shown
          over the map like the mockup's verify modal — never inline, never
          preloaded */}
      {evidence && selS && evidence.sightingId === selS.id && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 80,
            display: 'flex',
            alignItems: 'flex-end',
            background: 'rgba(0,0,0,0.55)',
          }}
          onClick={closeEvidence}
        >
          <div
            className="panel slidein"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              borderRadius: 'var(--radius) var(--radius) 0 0',
              padding: 18,
              boxShadow: 'none',
              borderBottom: 'none',
            }}
          >
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
              <span className="display" style={{ fontSize: 13 }}>
                Evidencia · {speciesName(selS.speciesId)}
              </span>
              <button
                type="button"
                className="chip chip-ghost"
                onClick={closeEvidence}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            {evidence.state === 'loading' && (
              <div className="photo-ph center" style={{ height: 220 }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
                  Cargando foto…
                </span>
              </div>
            )}
            {typeof evidence.state === 'object' && evidence.state.kind === 'ready' && (
              <img
                src={evidence.state.url}
                alt={`Evidencia del avistamiento de ${speciesName(selS.speciesId)}`}
                style={{
                  width: '100%',
                  maxHeight: 320,
                  objectFit: 'contain',
                  borderRadius: 8,
                  border: 'var(--bw) solid var(--line)',
                  background: 'var(--bg2)',
                }}
              />
            )}
            {typeof evidence.state === 'object' && evidence.state.kind !== 'ready' && (
              <div className="photo-ph center" style={{ height: 120 }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
                  {evidence.state.kind === 'unavailable'
                    ? 'Este avistamiento aún no tiene foto disponible'
                    : 'No se pudo cargar la foto, inténtalo de nuevo'}
                </span>
              </div>
            )}
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)', marginTop: 10 }}>
              Ubicación aproximada · La Latina · {formatAge(selS.createdAt)}
            </div>
          </div>
        </div>
      )}

      <Toast message={toast} />
    </div>
  )
}
