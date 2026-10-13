// Sample nickname for this device while Ranking and Perfil run on fake
// services (D-007, D-065). Built from fixed word lists only, never from user
// or device data.
const STORAGE_KEY = 'sil_demo_alias_v1'
const ALIAS_PATTERN = /^[a-z]+_[a-z]+_\d{2}$/

const NOUNS = [
  'gato',
  'gorrion',
  'vencejo',
  'mirlo',
  'erizo',
  'caracol',
  'grillo',
  'buho',
  'zorro',
  'mapache',
  'botijo',
  'churro',
  'farol',
  'adoquin',
  'organillo',
  'barquillo',
]

const ADJECTIVES = [
  'castizo',
  'chulapo',
  'curioso',
  'sigiloso',
  'nocturno',
  'veloz',
  'tranquilo',
  'valiente',
  'despierto',
  'discreto',
  'travieso',
  'madrugador',
]

let memoryAlias: string | null = null

function pick(words: string[], random: () => number): string {
  return words[Math.min(Math.floor(random() * words.length), words.length - 1)]
}

export function generateDemoAlias(random: () => number = Math.random): string {
  const number = 10 + Math.min(Math.floor(random() * 90), 89)
  return `${pick(NOUNS, random)}_${pick(ADJECTIVES, random)}_${number}`
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
