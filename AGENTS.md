# AGENTS.md — para agentes de IA y humanos que se incorporan al proyecto

Lee esto primero. Apunta a todas las fuentes de verdad y explica cómo se
trabaja aquí.

## Qué es este proyecto

**La Invasión Silenciosa** es un juego de ciencia ciudadana de la
**A.V. La Chispera** (La Latina, Madrid): una app web mobile-first (PWA)
donde los vecinos documentan señales visibles de turistificación
("criaturas") con foto y ubicación aproximada, alimentando un mapa
colectivo con validación comunitaria.

**Invariante de producto — la regla de oro (INNEGOCIABLE):** se documentan
**criaturas, nunca personas**. Nada de fotos con personas, datos privados
(nombres, timbres, buzones) ni matrículas. Cualquier feature que toque
fotos o ubicación debe preservar esta regla. Detalle en
`docs/product/reglas-y-especificacion.md` §3.1.

## Fuentes de verdad

| Qué buscas | Dónde |
|---|---|
| Reglas del juego, puntos, ciclo de validación, pantallas | `docs/product/reglas-y-especificacion.md` |
| Arquitectura, stack, modelo de datos, seguridad, roadmap | `docs/architecture/brief-tecnico.md` |
| Prototipo visual (fuente de verdad de UI y flujo) | `docs/prototype/` (fuentes JSX en `fuentes/`, capturas en `prototipo_en_imagenes/`) |
| Roadmap y trabajo abierto | [Linear · La Invasión Silenciosa — MVP](https://linear.app/ixine/project/la-invasion-silenciosa-mvp-5c9e727b8074) |
| Deuda técnica registrada | `FINDINGS.md` |
| Por qué se hizo cada cambio | `git log --no-merges` (los cuerpos de commit explican decisiones) |

**No hay carpeta de specs separada (decisión consciente):** los dos
documentos de `docs/` son los specs vivos. La sección siguiente explica
cómo se mantienen.

## Regla de sincronización (la ley de este repo)

> **Si un PR cambia comportamiento, actualiza el documento correspondiente
> en el MISMO PR.** La divergencia entre docs y código es un defecto.

- Los documentos son prescriptivos: la implementación se ajusta a ellos,
  no al revés. Si la realidad obliga a cambiar el doc, se cambia en el
  mismo PR explicando por qué.
- El brief técnico marca secciones como **`Decidido`** (no re-litigar sin
  hablarlo con David) o **`Explorando`** (abierto, elige y documenta).

## Linear y GitHub — cómo se trabaja

- **Proyecto Linear:** [La Invasión Silenciosa — MVP](https://linear.app/ixine/project/la-invasion-silenciosa-mvp-5c9e727b8074) · equipo **`av-la-chispera`** (prefijo **`LCHP`**). Milestones M0–M7.
- **El ticket es el brief autocontenido**: contexto, alcance, fuentes de
  verdad, incógnitas y checklist de aceptación. Se implementa leyendo el
  ticket + los docs que enlaza. Si el ticket contradice un doc → pregunta.
- **1 ticket = 1 rama = 1 PR.**
  - Rama: `feature/LCHP-N-slug-corto` (p. ej. `feature/LCHP-6-shell-app`).
  - Commits: `LCHP-N descripción imperativa en minúsculas`, en español,
    con cuerpo verboso explicando decisiones.
  - PR: título `LCHP-N: Título`, cuerpo en español con **Resumen / Por qué /
    Plan de pruebas**, y `Closes LCHP-N` para que la integración
    Linear↔GitHub cierre el ticket al mergear.
- **Nada se mergea sin CI en verde** (typecheck, lint, tests, gitleaks).
- Los hallazgos fuera del alcance del ticket actual van a `FINDINGS.md` y
  reciben SU PROPIO ticket con etiqueta `deuda` (máx. 2 semanas sin
  decisión: se programa o se degrada a `post-mvp`).
- Los spikes (etiqueta `spike`) entregan conocimiento documentado en el
  brief, no producto.

### Lo que NUNCA se hace

- ❌ Atribución a IA en commits o PRs (`Co-Authored-By: Claude`, etc.).
- ❌ `git add -A` / `git add .` — siempre archivos concretos por nombre.
- ❌ `git commit --amend` salvo petición explícita de David.
- ❌ Comitear `.env`, claves service-role, o cualquier secreto. La
  `anon key` de Supabase es pública por diseño; TODO lo demás no.
- ❌ Tocar el esquema de Supabase a mano en el dashboard: solo migraciones
  versionadas en `supabase/migrations/`.

## Idiomas

| Ámbito | Idioma |
|---|---|
| Código: identificadores, tipos, tablas, columnas | **Inglés** (`Sighting`, `point_events`, `moderation_status`…) |
| Strings de UI visibles al usuario | **Español** |
| Comentarios de código, docs, tickets, commits, PRs | **Español** |

## Stack — bloqueado, no re-litigar

| Tema | Decisión |
|---|---|
| Frontend | React 19 + TypeScript (estricto, sin `any`) + Vite |
| Estilos | Tailwind CSS v4 (CSS-first) + shadcn/ui + lucide-react |
| Datos remotos | TanStack Query; Zustand solo si hace falta estado global |
| Mapa | MapLibre GL JS + tiles raster OSM (abstracción `tileProvider.ts`) |
| Backend | Supabase Free: Postgres + RLS + Storage privado + **una única** Edge Function router |
| Hosting | Cloudflare Pages |
| Distribución | PWA (QR, sin stores); Capacitor solo post-MVP |
| Gestor de paquetes | pnpm |
| Descartado para MVP | Next.js, React Native, Redux, backend Node propio, realtime, push, self-hosting |

Justificación de cada elección: brief técnico §7–§8. Si te tienta cambiar
algo de esta tabla, lee antes la sección correspondiente del brief.

## El spec es el techo, no el suelo (alcance MVP)

El brief técnico contempla fases post-MVP enteras (moderación automática,
blur, OCR, Turnstile, vector tiles, modo asociación). **No las construyas
por adelantado.** Regla práctica:

- Si un problema lo detectaría un usuario gritando un minuto después de
  ocurrir → es del MVP.
- Si solo se manifiesta con abuso masivo, meses de datos o escenarios de
  recuperación exóticos → post-MVP; como mucho deja el hueco en el esquema
  o un comentario `// TODO(post-mvp):` apuntando a la sección del brief.
- El esquema de datos SÍ se crea completo (estados `rejected`/`removed`,
  `reports`…): es la válvula de escape barata. Lo que no se crea es la UI
  ni la lógica que los usa.

## Cosas que deben hacerte parar y preguntar

- Cualquier cambio en **policies RLS, políticas de Storage o la auth de la
  Edge Function** → es la zona de seguridad crítica; requiere revisión
  adversarial en el PR (otro modelo/agente intenta romperlo antes del merge).
- Cualquier cosa que afecte a la **regla de oro de privacidad** (fotos,
  EXIF, precisión de ubicación, qué columnas expone una vista pública).
- Añadir una dependencia que compita con el stack bloqueado.
- Un ticket que contradiga un doc, o un doc que contradiga otro.
- Cualquier acción que acerque el proyecto a salir del free tier.

## Mantenedor

David Monterroso ([@pyro-x](https://github.com/pyro-x)) — conversación en
español. Proyecto de la A.V. La Chispera.
