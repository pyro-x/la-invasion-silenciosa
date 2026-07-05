import { useParams } from 'react-router'
import { PagePlaceholder } from './PagePlaceholder'

export function SpeciesDetailPage() {
  const { speciesId } = useParams()
  return (
    <PagePlaceholder eyebrow="Ficha de especie" title={speciesId ?? 'Especie'} ticket="LCHP-8" />
  )
}
