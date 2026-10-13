// LCHP-50, the policy end to end (D-067): what the database answers goes
// through the real sightings service into the real screen. Only Supabase
// and the WebGL map are stubbed, so a service that stopped dropping a
// species this build does not know would fail here.
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { resetGeoWatchForTests } from '@/lib/geoWatch'
import { renderRoute } from '@/test/render'
import type { MapSightingGeo } from '@/types/sighting'

const SPECIES_ROWS = [
  { id: 'uuid-candadin', slug: 'candadin' },
  { id: 'uuid-turistox', slug: 'turistox' },
  { id: 'uuid-newer', slug: 'gentrificator' },
]

const viewRow = (id: string, speciesUuid: string, status: 'pending' | 'approved') => ({
  id,
  species_id: speciesUuid,
  lat_public: 40.4115,
  lng_public: -3.7115,
  status,
  verification_count: 0,
  created_at: new Date(Date.now() - 60 * 60_000).toISOString(),
})

const VIEW_ROWS = [
  viewRow('s-newer-pending', 'uuid-newer', 'pending'),
  viewRow('s-newer-approved', 'uuid-newer', 'approved'),
  viewRow('s-turistox-pending', 'uuid-turistox', 'pending'),
  viewRow('s-candadin-approved', 'uuid-candadin', 'approved'),
]

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) =>
      table === 'species'
        ? { select: () => Promise.resolve({ data: SPECIES_ROWS, error: null }) }
        : { select: () => ({ order: () => Promise.resolve({ data: VIEW_ROWS, error: null }) }) },
  },
}))

vi.mock('@/components/map/BarrioMap', () => ({
  BarrioMap: ({ sightings }: { sightings: MapSightingGeo[] }) => (
    <ul data-testid="map">
      {sightings.map((s) => (
        <li key={s.id}>{`${s.id} ${s.speciesId}`}</li>
      ))}
    </ul>
  ),
}))

beforeEach(() => {
  resetGeoWatchForTests()
  localStorage.clear()
})

describe('map screen · a species the database has and this build does not', () => {
  it('leaves its sightings out of the list, the counter and the map', async () => {
    renderRoute('/mapa')
    const sheet = within(await screen.findByRole('region', { name: 'Avistamientos cerca de ti' }))
    expect(await sheet.findByText('1 Por verificar')).toBeInTheDocument()
    expect(sheet.getAllByText(/^La Latina · hace/)).toHaveLength(1)
    expect(sheet.getByText('TURISTOX')).toBeInTheDocument()

    const handedToTheMap = within(await screen.findByTestId('map'))
      .getAllByRole('listitem')
      .map((item) => item.textContent)
    expect(handedToTheMap).toEqual(['s-turistox-pending turistox', 's-candadin-approved candadin'])
    expect(screen.queryByText(/Unexpected Application Error/)).not.toBeInTheDocument()
  })

  it('does not count them in the heat map either', async () => {
    const user = userEvent.setup()
    renderRoute('/mapa')
    await screen.findByText('1 Por verificar')
    await user.click(screen.getByRole('button', { name: 'Mapa de calor' }))
    expect(await screen.findByText('2 avistamientos')).toBeInTheDocument()
  })
})
