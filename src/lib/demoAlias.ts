// Sample nickname for this device while Ranking and Perfil run on fake
// services (D-007, D-065). Built from a fixed word list only, never from user
// or device data.
const STORAGE_KEY = 'sil_demo_alias_v1'
const ALIAS_PATTERN = /^[a-z]{3,4}_\d{3}$/

// Four letters at most: eight characters is what fits in the ranking row
// next to «· tú» without wrapping at the 412 px viewport.
const WORDS = [
  'gato',
  'buho',
  'pato',
  'topo',
  'sapo',
  'lobo',
  'oso',
  'puma',
  'mono',
  'loro',
  'pez',
  'pavo',
  'gamo',
  'rana',
  'foca',
  'olmo',
  'pino',
  'seta',
  'nube',
  'luna',
  'faro',
  'kiwi',
  'higo',
  'coco',
]

let memoryAlias: string | null = null

export function generateDemoAlias(random: () => number = Math.random): string {
  const word = WORDS[Math.min(Math.floor(random() * WORDS.length), WORDS.length - 1)]
  const number = 100 + Math.min(Math.floor(random() * 900), 899)
  return `${word}_${number}`
}

function readStoredAlias(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored !== null && ALIAS_PATTERN.test(stored) ? stored : null
  } catch {
    return null
  }
}

export function getDemoAlias(): string {
  const stored = readStoredAlias()
  if (stored) return stored
  memoryAlias ??= generateDemoAlias()
  try {
    localStorage.setItem(STORAGE_KEY, memoryAlias)
  } catch {
    // storage unavailable (private mode): the nick lasts for this page session
  }
  return memoryAlias
}
