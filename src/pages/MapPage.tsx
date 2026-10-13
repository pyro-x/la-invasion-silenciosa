// Map screen (LCHP-13; full-bleed layout LCHP-34, D-061): the map IS the
// screen. The mode switch and the locate button float over it; one bottom
// sheet carries the sighting detail and the «Cerca de ti» list, and the map
// centres itself in the part the sheet leaves free.
//
// The game is played where the neighbour stands (LCHP-49, D-069): the map
// follows their position from the first fix, the pending list is ordered by
// how far each creature is, and «Verificar» needs them to be there.
//
// The map draws the sightings itself: validated ones as the species sprite,
// pending ones blinking with an amber ring, clusters where they overlap, or
// a heat map of all of them. The detail shows species · status · age ·
// approximate location
// — NO author and NO exact street (the public view exposes neither; golden
// rule / D-046). «Ver evidencia» loads the photo on demand. «Verificar»
// (LCHP-15) opens the verification modal from its two doors — the detail
// card and the «Cerca de ti» rows.
import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LocateFixed } from 'lucide-react'
import { blinkDelayMs } from '@/components/map/blink'
import { MapSheet } from '@/components/map/MapSheet'
import { PrecisionBadge } from '@/components/map/PrecisionBadge'
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
import { locationSettingsGuidance, precisionGuidance } from '@/lib/permissions'
import {
  distanceMeters,
  formatMeters,
  isVague,
  PLAY_RULES,
  presenceAt,
  roundedDistance,
  type Presence,
} from '@/lib/proximity'
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

// The ring of the «Por verificar» chips blinks in step with the pending
// pins: it starts its CSS animation where the page's clock already is.
function Ring() {
  const [delay] = useState(() => blinkDelayMs(performance.now()))
  return <span className="chip-ring" aria-hidden style={{ animationDelay: `${delay}ms` }} />
}

const lessMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')
const watchMotion = (changed: () => void) => {
  const query = lessMotion()
  query?.addEventListener('change', changed)
  return () => query?.removeEventListener('change', changed)
}

// Turning reduced motion off restarts the CSS animation from zero, so the
// ring is mounted afresh to pick the clock up again.
function BlinkRing() {
  const still = useSyncExternalStore(
    watchMotion,
    () => lessMotion()?.matches ?? false,
    () => false,
  )
  return <Ring key={still ? 'still' : 'moving'} />
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

// What the sheet says about the neighbour's position, and the one thing to
// do about it (Alcorqueando's dock: ask, searching, error, imprecise). The
// native prompt is never raised on arrival (D-052): without a position the
// sheet asks, and the tap on its button is the gesture the browser wants.
/** `kind` names the notice whatever its numbers say: closing «poco precisa»
 * at ± 180 m keeps it closed at ± 172 m. */
type LocatePanel = { kind: string; text: string; action: string | null }

function locatePanel(geo: GeoWatchState, outsideBarrio: boolean): LocatePanel | null {
  switch (geo.kind) {
    case 'idle':
      return {
        kind: 'ask',
        text: 'Para jugar, el mapa tiene que saber dónde estás.',
        action: 'Usar mi ubicación',
      }
    case 'paused':
      return {
        kind: 'paused',
        text: 'Para seguir jugando, el mapa tiene que volver a saber dónde estás.',
        action: 'Usar mi ubicación',
      }
    case 'searching':
      return {
        kind: 'searching',
        text: 'Buscando tu posición… Si el navegador pregunta, pulsa «Permitir».',
        action: null,
      }
    case 'denied':
      return { kind: 'denied', text: locationSettingsGuidance(), action: 'Reintentar' }
    case 'unavailable':
    case 'timeout':
      return {
        kind: 'no-signal',
        text: 'No se pudo obtener tu posición. Inténtalo otra vez al aire libre.',
        action: 'Reintentar',
      }
    case 'unsupported':
      return { kind: 'unsupported', text: 'Este navegador no ofrece tu ubicación.', action: null }
    case 'ok':
      // The map is a barrio game: a position outside La Latina is shown no
      // map to follow, and nothing there can be captured or verified.
      if (outsideBarrio) {
        return {
          kind: 'outside',
          text: 'Estás fuera de La Latina: puedes mirar el mapa, pero para cazar o verificar hay que estar en el barrio.',
          action: null,
        }
      }
      if (isVague(geo.position)) {
        return {
          kind: 'vague',
          text: `Tu ubicación es poco precisa (± ${formatMeters(geo.position.accuracyM)}). ${precisionGuidance()}`,
          action: 'Reintentar',
        }
      }
      return null
  }
}

const OUTSIDE_BLOCK = 'Estás fuera de La Latina: desde ahí no se puede verificar.'

// Why «Verificar» is not offered, in the neighbour's terms.
function verifyBlock(presence: Presence): string | null {
  switch (presence.kind) {
    case 'near':
      return null
    case 'far':
      return `Está a ${formatMeters(roundedDistance(presence.distanceM))} de ti. Acércate a menos de ${formatMeters(PLAY_RULES.verifyRadiusM)} para verificar.`
    case 'vague':
      return `Tu ubicación es poco precisa (± ${formatMeters(presence.accuracyM)}) para verificar.`
    case 'unknown':
      return 'Activa tu ubicación para verificar: hay que estar junto a la criatura.'
  }
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
  // On from the start: the first fix takes the map to the neighbour, with
  // or without a tap (a watch resumed on arrival is followed too).
  const [following, setFollowing] = useState(true)
  const [pickCount, setPickCount] = useState(0)
  const [locateCount, setLocateCount] = useState(0)
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
    isSuccess,
    refetch,
  } = useQuery({
    queryKey: ['sightings', 'map'],
    queryFn: listMapSightings,
  })
  const { data: species = [] } = useQuery({ queryKey: ['species'], queryFn: listSpecies })

  const pick = (id: string) => {
    setSel(id)
    setPickCount((count) => count + 1)
    setVerifying(false)
    setEvidence(null)
    evidenceReq.current++ // drop any in-flight request from the previous pin
    setSheetOpen(true)
    setFollowing(false)
    const target = sightings.find((s) => s.id === id)
    if (target) setFocus({ id: target.id, lat: target.lat, lng: target.lng })
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

  // Folding the sheet puts the open card away with it: a neighbour who
  // pulls it down is done with that creature.
  const foldSheet = (open: boolean) => {
    if (!open) setSel(null)
    setSheetOpen(open)
  }

  // The heat map shows where sightings pile up, not which: nothing stays
  // picked, and the list of single creatures gives way to it.
  const showHeat = () => {
    setHeat(true)
    setSel(null)
  }

  // The native permission prompt fires here and only here: on this tap.
  const locate = () => {
    setDismissedNotice(null)
    setLocateCount((count) => count + 1)
    setFollowing(true)
    startGeoWatch()
  }

  const speciesName = (id: string) => species.find((c) => c.id === id)?.name ?? ''
  const speciesMeaning = (id: string) => species.find((c) => c.id === id)?.description ?? ''
  const selS = sightings.find((s) => s.id === sel)

  const me = geo.kind === 'ok' ? geo.position : null
  const outsideBarrio = me !== null && !isWithinLaLatina(me.lat, me.lng)
  const panel = locatePanel(geo, outsideBarrio)
  const notice = panel?.kind ?? null
  const follow = following && me !== null && !outsideBarrio

  // A position good enough to measure from. Distances go to the public
  // coordinate of each sighting, the only one the browser has (D-046).
  const here = me !== null && !isVague(me) ? me : null
  // Outside La Latina nobody verifies, however close to a creature at the
  // barrio's edge: there the neighbour is a spectator.
  const blockOf = (s: MapSightingGeo) =>
    outsideBarrio ? OUTSIDE_BLOCK : verifyBlock(presenceAt(me, s, PLAY_RULES.verifyRadiusM))
  const pending = sightings
    .filter((s) => s.status === 'pending')
    .map((s) => ({
      sighting: s,
      distanceM: here ? roundedDistance(distanceMeters(here, s)) : null,
      near: blockOf(s) === null,
    }))
  // Nearest first; the sort is stable, so creatures the same tens of metres
  // away stay newest first and GPS jitter does not shuffle the list.
  if (here) pending.sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0))
  const selBlock = selS ? blockOf(selS) : null

  // The whole row is the control: the orange counter looks like a button,
  // so it is one.
  const nearbyHeader = (
    <button
      type="button"
      className="map-sheet-row"
      aria-expanded={sheetOpen}
      onClick={() => foldSheet(!sheetOpen)}
    >
      <span className="row" style={{ gap: 8 }}>
        <span className="eyebrow">{here ? 'Cerca de ti' : 'En el barrio'}</span>
        {me && <PrecisionBadge accuracyM={me.accuracyM} at={me.at} />}
      </span>
      {!isError && (
        <span className="chip chip-warn">
          <BlinkRing />
          {pending.length} Por verificar
        </span>
      )}
    </button>
  )

  const heatHeader = (
    <div className="stack" style={{ gap: 4 }}>
      <div className="map-sheet-row">
        <span className="eyebrow">Mapa de calor</span>
        {isSuccess && (
          <span className="chip">
            {sightings.length} {sightings.length === 1 ? 'avistamiento' : 'avistamientos'}
          </span>
        )}
      </div>
      <p className="map-card-text map-card-hint" style={{ margin: 0 }}>
        Dónde se concentran los avistamientos. Los validados pesan más.
      </p>
    </div>
  )

  // In the part of the sheet that stays when it is folded: what the map
  // needs from the neighbour must not depend on the list being open.
  const noticeBox = panel && notice !== dismissedNotice && (
    <div
      className="panel panel-2 pad row"
      role="status"
      style={{ padding: 10, gap: 8, fontSize: 12, boxShadow: 'none' }}
    >
      <span className="grow" style={{ color: 'var(--ink-dim)' }}>
        {panel.text}
      </span>
      {panel.action && (
        <button type="button" className="chip chip-accent map-locate-ask" onClick={locate}>
          {panel.action}
        </button>
      )}
      <button
        type="button"
        className="chip chip-ghost"
        aria-label="Cerrar aviso"
        onClick={() => setDismissedNotice(notice)}
      >
        ✕
      </button>
    </div>
  )

  const sheetVars: CSSProperties & Record<'--sheet-h', string> = { '--sheet-h': `${sheetHeight}px` }

  return (
    <div className="screen map-screen" style={sheetVars}>
      <Suspense
        fallback={<div style={{ position: 'absolute', inset: 0, background: 'var(--bg2)' }} />}
      >
        <BarrioMap
          sightings={isError ? NO_SIGHTINGS : sightings}
          selectedId={sel}
          heat={heat}
          onPick={pick}
          onMapTap={() => setSel(null)}
          onUserMove={() => setFollowing(false)}
          me={me && !outsideBarrio ? me : null}
          rangeM={PLAY_RULES.verifyRadiusM}
          follow={follow}
          mayResumeFollow={sel === null}
          onResumeFollow={() => setFollowing(true)}
          followRequest={locateCount}
          bottomPadding={sheetHeight}
          focus={focus}
          zoomStep={zoomStep}
        />
      </Suspense>

      <div className="map-top">
        <div className="map-modes" role="group" aria-label="Vista del mapa">
          <button
            type="button"
            className="map-mode"
            aria-pressed={!heat}
            onClick={() => setHeat(false)}
          >
            Avistamientos
          </button>
          <button type="button" className="map-mode" aria-pressed={heat} onClick={showHeat}>
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
        foldable={!heat}
        onToggle={foldSheet}
        headerKey={String(pickCount)}
        onHeight={setSheetHeight}
        header={
          <div className="stack" style={{ gap: 10 }}>
            {noticeBox}
            {selS ? (
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
                    <div className="map-card-title">
                      <span className="display" style={{ fontSize: 12 }}>
                        {speciesName(selS.speciesId)}
                      </span>
                      <span
                        className={
                          'chip ' + (selS.status === 'pending' ? 'chip-warn' : 'chip-good')
                        }
                      >
                        {selS.status === 'pending' && <BlinkRing />}
                        {selS.status === 'pending' ? 'Por verificar' : 'Validado'}
                      </span>
                    </div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
                      Ubicación aproximada · La Latina · {formatAge(selS.createdAt)}
                    </div>
                  </div>
                </div>
                <p className="map-card-text">{speciesMeaning(selS.speciesId)}</p>
                {selS.status === 'pending' && (
                  <p className="map-card-text map-card-hint">
                    Parpadea en el mapa hasta que otros vecinos lo confirmen.
                  </p>
                )}
                {selS.status === 'pending' && selBlock && (
                  <p className="map-card-text map-card-hint" role="note">
                    {selBlock}
                  </p>
                )}
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
                      disabled={selBlock !== null}
                      onClick={() => setVerifying(true)}
                    >
                      ✔ Verificar
                    </button>
                  )}
                </div>
              </div>
            ) : heat ? (
              heatHeader
            ) : (
              nearbyHeader
            )}
          </div>
        }
      >
        {selS && nearbyHeader}
        {/* Two taps, two meanings: the row shows the creature on the map
            first; its «Verificar» goes straight to the modal (the second
            door, LCHP-15). Verifying means "I have seen it there", so that
            door is only on the rows the neighbour is standing next to; a
            far row still takes the map to its creature, where the card says
            how much closer to get. */}
        {(heat ? [] : pending).map(({ sighting: s, distanceM, near }) => (
          <div key={s.id} className="panel map-nearby-row">
            <button type="button" className="map-nearby-show" onClick={() => pick(s.id)}>
              <CreatureSprite id={s.speciesId} scale={2.8} />
              <span className="grow">
                <span style={{ display: 'block', fontWeight: 600, fontSize: 14 }}>
                  {speciesName(s.speciesId)}
                </span>
                <span
                  className="mono"
                  style={{ display: 'block', fontSize: 11, color: 'var(--ink-dim)' }}
                >
                  {distanceM !== null ? `a ${formatMeters(distanceM)}` : 'La Latina'} ·{' '}
                  {formatAge(s.createdAt)}
                </span>
              </span>
            </button>
            {near && (
              <button
                type="button"
                className="chip chip-accent map-nearby-verify"
                aria-label={`Verificar ${speciesName(s.speciesId)}`}
                onClick={() => {
                  pick(s.id)
                  setVerifying(true)
                }}
              >
                Verificar
              </button>
            )}
          </div>
        ))}
      </MapSheet>

      {/* verification modal (LCHP-15): only over a pending selection */}
      {verifying && selS && selS.status === 'pending' && (
        <VerifyModal
          sighting={selS}
          speciesName={speciesName(selS.speciesId)}
          blocked={selBlock}
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
