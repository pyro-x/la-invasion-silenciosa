// Captures app screenshots at the mobile viewport (412×892, the prototype's)
// for the visual verification loop against docs/prototype/prototipo_en_imagenes/.
// Usage: pnpm build && node scripts/screenshots.mjs [route1 route2 …]
// Without arguments it captures ROUTES. Output: .screenshots/<name>.png (gitignored).
import { chromium } from 'playwright'
import { preview } from 'vite'
import { mkdirSync } from 'node:fs'

const ROUTES = ['/']

const VIEWPORT = { width: 412, height: 892 }
const OUT = '.screenshots'

const routes = process.argv.slice(2).length ? process.argv.slice(2) : ROUTES
mkdirSync(OUT, { recursive: true })

const server = await preview({ preview: { port: 4173, strictPort: true } })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 })

for (const route of routes) {
  await page.goto(`http://localhost:4173${route}`, { waitUntil: 'networkidle' })
  const name = route === '/' ? 'home' : route.replaceAll('/', '-').replace(/^-/, '')
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log(`✓ ${route} → ${OUT}/${name}.png`)
}

await browser.close()
await server.close()
