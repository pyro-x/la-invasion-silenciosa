# Brief técnico — La Invasión Silenciosa

## 1. Propósito del documento

Este documento define la arquitectura técnica recomendada para construir la aplicación **La Invasión Silenciosa**.

La especificación funcional del juego, reglas, criaturas, puntuación, pantallas y mecánicas vive en un documento separado:

[reglas-y-especificacion.md](../product/reglas-y-especificacion.md)

Este brief técnico no debe duplicar todo el contenido funcional, sino tomarlo como referencia.

**Documentos relacionados:**
- [README del proyecto](../../README.md)
- [Reglas y especificación funcional](../product/reglas-y-especificacion.md)
- [Prototipo visual](../prototype/claude-design-handoff.md)

> **Cómo leer este documento.** Es un spec vivo: se actualiza en el mismo
> PR que cambia el comportamiento (regla de sincronización, ver
> [AGENTS.md](../../AGENTS.md)). Todas las secciones se consideran
> **`Decidido`** (no re-litigar sin hablarlo) salvo las marcadas
> explícitamente como **`[Explorando]`** en su título, que están abiertas.
>
> **Enmienda 2026-07-05 (LCHP-1):** el MVP **no tiene moderación previa**.
> Los avistamientos nacen `pending` y son **visibles en el mapa** con
> marcador de aviso (como siempre describió
> [reglas-y-especificacion.md](../product/reglas-y-especificacion.md) §5);
> **una (1) confirmación** de otro usuario los pasa a `approved` — el
> umbral es configurable vía `app_config.validation_threshold` (1 para el
> piloto; la maqueta sugiere ~3 a futuro) —, consolidando +10 al autor y
> +5 al verificador. Los estados
> `rejected`/`removed`, la tabla `reports` y los roles de moderación se
> conservan en el esquema como válvula de escape, sin UI ni lógica en el
> MVP. Las secciones siguientes están redactadas conforme a esta enmienda.
> El diseño original basado en moderación NO se elimina: queda como
> **referencia post-MVP** en §5, §15, §20, §24, §36 y §37 (fase D), porque
> la intención es retomarlo a futuro si el piloto lo pide.

## 2. Descripción general del proyecto

**La Invasión Silenciosa** es una aplicación web mobile-first para una iniciativa vecinal de ciencia ciudadana gamificada en La Latina, Madrid.

La app permite a vecinos y colaboradores documentar señales visibles de turistificación mediante “avistamientos” geolocalizados. Cada avistamiento tiene una categoría o criatura, una ubicación aproximada y, normalmente, una foto como evidencia.

La aplicación debe funcionar como una herramienta de participación, documentación urbana y juego comunitario, no como una lista negra de propietarios o viviendas concretas.

Principios funcionales importantes, definidos en [reglas-y-especificacion.md](../product/reglas-y-especificacion.md):

* se documentan señales urbanas, no personas;
* la privacidad es innegociable;
* los avistamientos pasan por estado pendiente antes de validarse;
* los puntos se consolidan tras validación;
* el mapa muestra pendientes (con marcador de aviso, «por verificar») y validados — la distinción de estado siempre es visible;
* la validación es comunitaria (1 confirmación), sin moderación previa en el MVP;
* la foto es evidencia, no contenido principal del mapa.

## 3. Fuente funcional

El documento funcional principal es:

[reglas-y-especificacion.md](../product/reglas-y-especificacion.md)

Este documento define:

* concepto del juego;
* criaturas;
* reglas de privacidad;
* ciclo de avistamiento;
* sistema de puntos;
* niveles;
* pantallas;
* verificación comunitaria;
* modo asociación post-MVP.

Cualquier duda de producto debe resolverse primero contra ese documento.

## 4. Regla de puntos de observación

La especificación funcional y la implementación deben mantener esta regla:

```text
Una observación enviada queda pendiente.
Los +10 puntos de nueva observación solo se consolidan cuando el avistamiento se valida.
```

Por tanto, en la pantalla de éxito tras enviar un avistamiento, no se debe mostrar:

```text
+10 puntos
```

como si ya fueran definitivos.

Mejor mostrar una de estas opciones:

```text
Avistamiento enviado · +10 puntos pendientes de validación
```

o:

```text
Avistamiento enviado · cuando se valide sumarás +10 puntos
```

Al validarse:

```text
Avistamiento validado · +10 puntos consolidados
```

La verificación de otro usuario sí puede sumar `+5` cuando la verificación sea aceptada según las reglas del sistema.

## 5. Objetivo del MVP técnico

El MVP técnico debe convertir la maqueta navegable existente en una aplicación funcional.

Ya existe una maqueta creada en Claude Design en el [directorio prototipo](../prototype/claude-design-handoff.md) con las pantallas principales. Esa maqueta debe considerarse la fuente visual y de flujo.

El objetivo del MVP no es rediseñar la experiencia, sino implementar funcionalidad real sobre esa base.

El MVP debe permitir:

* abrir la app desde una URL o QR;
* ver un mapa del barrio;
* mostrar avistamientos como iconos;
* navegar por las pantallas principales;
* ver la Pokédex/listado de especies;
* crear un nuevo avistamiento;
* elegir criatura/especie;
* subir o capturar foto;
* obtener ubicación aproximada;
* guardar foto en Supabase Storage privado;
* guardar avistamiento en Supabase;
* crear siempre los nuevos avistamientos como `pending`;
* mostrar en el mapa los `pending` (marcador de aviso «por verificar») y los `approved`;
* validar por confirmación comunitaria: 1 confirmación de otro usuario → `approved`, +10 al autor y +5 al verificador;
* cargar la foto solo bajo demanda;
* mantener estructura preparada para ranking, perfil y moderación futura (estados y tablas en el esquema, sin UI).

Quedan fuera del MVP inicial, pero deben estar previstos:

* moderación/aprobación manual con cola de revisión (el diseño original del MVP; ver §24 y §37 fase D);
* moderación automática de imágenes;
* blur automático;
* OCR;
* análisis de personas/matrículas/texto;
* integración social/Instagram del modo asociación;
* ranking avanzado;
* badges complejas;
* vídeos para redes;
* app stores;
* React Native;
* self-hosting de tiles.

## 6. Principios técnicos

El proyecto debe diseñarse con estos principios:

```text
coste cero o casi cero;
mobile-first;
PWA antes que app nativa;
abrir desde QR sin instalación obligatoria;
privacidad primero;
validación comunitaria antes de consolidar puntos (sin moderación previa en MVP);
mapa ligero;
fotos bajo demanda;
storage privado;
RLS estricto;
sin backend propio pesado;
sin self-hosting en casa;
sin infraestructura difícil de mantener;
free-tier first;
arquitectura preparada para evolucionar.
```

## 7. Stack recomendado

### Frontend

```text
React 19
TypeScript
Vite
React Router
TanStack Query
Zustand cuando haga falta
Tailwind CSS v4
shadcn/ui
Radix UI
lucide-react
vite-plugin-pwa
MapLibre GL JS
```

### Backend

```text
Supabase Free
Postgres
PostGIS
Supabase Auth
Supabase Storage privado
Supabase Row Level Security
Supabase Edge Function única tipo API router
```

### Hosting

```text
Cloudflare Pages para frontend estático
Cloudflare Turnstile preparado para anti-bot
```

### Futuro móvil

```text
Capacitor preparado para empaquetado futuro
```

## 8. Tecnologías descartadas para MVP

No usar inicialmente:

```text
Next.js
React Native
Redux
backend Node propio
múltiples Edge Functions separadas
self-hosting
push notifications
realtime
ranking avanzado
moderación automática obligatoria
tiles vectoriales autoalojados
bucket público de imágenes
```

Estas opciones pueden reevaluarse después del piloto.

## 9. Maqueta existente

> **Enmienda 2026-10-08 (D-058):** la maqueta pasa de «réplica al 100 %»
> (D-019, barra de aceptación de M1, ya cumplida) a **guía**. Se sigue por
> defecto, pero cualquier pantalla puede apartarse de ella cuando la
> alternativa es una mejora clara de UX en móvil, verificada en el loop
> visual contra la app real. Lo que sigue siendo fijo: tokens del tema
> chispera y hoja de estilos portada, sprites pixel-art, inventario de
> pantallas, navegación, copy en castellano y la regla de oro. Lo que queda
> abierto: composición de cada pantalla y el cromo alrededor del mapa (mapa
> a pantalla completa, controles flotantes, hoja inferior). Una pantalla
> que se aparta de su captura genera una captura de referencia nueva en su
> PR; las capturas de `docs/prototype/` se conservan como referencia
> histórica.

La app debe respetar la maqueta de Claude Design como guía (ver enmienda).

Prioridades:

* conservar estructura de pantallas;
* conservar navegación;
* conservar tono visual;
* conservar conceptos de criaturas/avistamientos;
* mantener carácter gamificado;
* no rediseñar sin motivo (una mejora clara de UX en móvil es motivo — D-058);
* reemplazar mocks por datos reales gradualmente;
* conservar experiencia mobile-first.

El agente que implemente debe tratar la maqueta como base visual y funcional.

## 10. Arquitectura general

Arquitectura recomendada:

```text
React/Vite/PWA
  ↓
Cloudflare Pages
  ↓
Supabase client con anon key
  ↓
Supabase Postgres + RLS
Supabase Storage privado
Supabase Edge Function única para acciones sensibles
```

La app puede leer directamente desde Supabase cuando la lectura sea pública y esté protegida por RLS/views.

Las acciones sensibles deben pasar por la Edge Function única.

## 11. Seguridad y claves

La `anon key` de Supabase puede estar en el frontend. No es un secreto. La seguridad real debe estar en:

* Row Level Security;
* Storage policies;
* Edge Function API;
* validaciones server-side;
* roles;
* signed URLs temporales;
* rate limits;
* Turnstile cuando se active.

Variables públicas frontend:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_TURNSTILE_SITE_KEY=
```

Nunca poner en frontend:

```env
SUPABASE_SERVICE_ROLE_KEY=
TURNSTILE_SECRET_KEY=
SIGHTENGINE_SECRET=
GOOGLE_VISION_PRIVATE_KEY=
API keys privadas=
```

Secrets de Edge Function:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TURNSTILE_SECRET_KEY=
SIGHTENGINE_API_USER=
SIGHTENGINE_API_SECRET=
GOOGLE_CLOUD_PROJECT_ID=
GOOGLE_CLOUD_PRIVATE_KEY=
GOOGLE_CLOUD_CLIENT_EMAIL=
```

Los secrets de moderación pueden dejarse sin configurar en el MVP inicial.

## 12. Supabase y RLS

Regla general:

```text
Todo bloqueado por defecto.
Solo se abre lo necesario.
```

### Políticas implementadas (LCHP-11, migración 0004; enmendada por LCHP-15, migración 0007) `Decidido`

Esta sección es el **espejo exacto** de `supabase/migrations/0004_rls_policies_and_storage.sql` + `0007_community_verification.sql`; cada línea está cubierta por las suites pgTAP (`supabase/tests/*.test.sql`, corren en CI). El reparto de caminos (qué va directo por PostgREST y qué pasa por la Edge Function) es la decisión D-037: híbrido *PostgREST-first* — lecturas y verificaciones directas; creación de avistamientos y acceso a fotos exclusivamente vía Edge Function.

**Privilegios (defensa en profundidad):** `REVOKE ALL` sobre las 7 tablas para `anon` y `authenticated`, re-concediendo solo el mínimo. Una query directa a una tabla cerrada falla con `42501` (permission denied) en vez de devolver conjuntos vacíos engañosos.

**Lecturas permitidas desde el frontend:**

* especies activas — policy `species_select_active` (`is_active`, para `anon` + `authenticated`);
* perfil propio — policy `profiles_select_own` (`auth.uid() = id`); el ranking tendrá su propia vista pública (LCHP-16);
* mapa **únicamente vía la vista** `public_map_sightings` — la tabla `sightings` no es legible directamente ni siquiera con SELECT;
* verificaciones propias — policy `verifications_select_own`.

**Vista `public_map_sightings`** (owner-rights a propósito — `security_invoker = false` + `security_barrier`): expone exactamente 8 columnas y filtra `moderation_status in ('pending','approved')`:

```ts
type PublicMapSighting = {
  id: string;
  species_id: string;
  lat_public: number;
  lng_public: number;
  status: 'pending' | 'approved'; // moderation_status renombrado y filtrado
  confidence: string;
  verification_count: number;
  created_at: string;
};
```

Lista prohibida — **nunca** añadir a la vista: `photo_path`, `photo_blurred_path`, `photo_thumbnail_path`, `lat_private`, `lng_private`, `location_accuracy_m`, `created_by`, `reviewed_by`, `reviewed_at`, `rejection_reason`, `points_awarded*`, `auto_moderation_*`, `image_processing_status`, `report_count`, `updated_at`.

**Escrituras desde el cliente:**

* `verifications` INSERT es la **única** vía de escritura abierta (D-038, enmendada por D-054): `WITH CHECK` de `user_id = auth.uid()` **y** target válido vía `private.verification_target_is_valid(sighting_id)` (helper `security definer` en el esquema **`private`, no expuesto por PostgREST**, que deriva el verificador de `auth.uid()` internamente — en `public` con parámetro libre sería un RPC-oráculo para sondear la autoría oculta de los avistamientos): el avistamiento debe estar **`pending`** y **no ser del propio autor** — la auto-aprobación y verificar estados no verificables se bloquean en la frontera de la base de datos, no en código de aplicación (hallazgos de la review adversarial de LCHP-11, rondas 1 y 2); GRANT por columnas (`sighting_id, user_id, type, note`) para que `status`/`points_awarded` jamás vengan del cliente; unicidad por el `UNIQUE (sighting_id, user_id)` del esquema. **Los anónimos SÍ pueden insertar** (D-054, migración 0007): su confirmación se guarda como apoyo **provisional** — el trigger de consolidación decide si cuenta. Mientras `app_config.verification_requires_registration = 'true'` (el valor por defecto y el del piloto), una confirmación anónima no suma al umbral ni acuña puntos: el coste sybil de cambiar el estado del mapa o fabricar puntos sigue siendo un email (el ataque de auto-validación por incógnito de la review de LCHP-11 sigue muerto).
* La consolidación (umbral → `approved`, +10/+5) es el trigger server-side `private.consolidate_sighting()` (LCHP-15, migración 0007), que ES la frontera de concurrencia: lock de fila sobre el avistamiento (`FOR UPDATE`) + `UPDATE … WHERE moderation_status = 'pending'` atómico; los puntos solo se acuñan cuando esa transición sucede (contrato de la review de LCHP-11, verificado con carrera real a umbral 1). Al registrarse un usuario anónimo (misma fila de `auth.users`, LCHP-3), el trigger `on_auth_user_registered` **activa retroactivamente** sus confirmaciones: cuentan para el umbral (pudiendo validar entonces) y cobran sus +5 acumulados.
* Todo lo demás, cerrado: `sightings` (INSERT/UPDATE/DELETE), `point_events`, `reports` y `app_config` no tienen ninguna política — la Edge Function con `service_role` es el único camino de escritura (D-037), y los triggers/CHECKs de Postgres la vigilan también a ella (cuota D-032, invariantes 0003).

**Storage:** bucket `sightings-photos` privado con **cero políticas** en `storage.objects` (el cliente no puede leer, listar ni subir nada); límites de bucket como red de seguridad para cualquier caller, service role incluido: 512 KB y `image/jpeg`/`image/webp`. La foto solo se ve mediante la signed URL temporal de `/get-photo-url` (LCHP-12).

## 13. Edge Function única

Para evitar complejidad, se usa una única Edge Function tipo API router:

```text
supabase/functions/api/index.ts
```

### Contrato implementado (LCHP-12 — enmienda 2026-07-06) `Decidido`

Esta sección es el espejo del código real (`supabase/functions/api/`),
cubierto por tests unitarios Deno en CI. Reparto según D-037: la función
posee exactamente las dos operaciones que necesitan servidor; el resto de
la app va directo por PostgREST bajo RLS (§12).

**Autenticación:** ambas rutas exigen un JWT válido (sesión anónima o
registrada — D-032) en `Authorization: Bearer`. Ver la evidencia
fotográfica requiere por tanto tener sesión (anti-scraping barato: crear
sesiones anónimas está limitado por GoTrue a 30/h/IP), aunque leer el mapa
siga sin exigirla. CORS restringido a producción, previews de Cloudflare
Pages y localhost.

**`POST /create-sighting`** — multipart/form-data: `photo` (archivo),
`species_id`, `lat`, `lng`, `accuracy` (opcional).

* Validaciones server-side: especie existente y activa; coordenadas dentro
  del bbox de La Latina (§21) con margen de deriva GPS ±0,002°; imagen
  JPEG/WebP **por magic bytes** (el Content-Type declarado no se cree) y
  ≤512 KB (alineado con los caps del bucket).
* Privacidad: la coordenada exacta se guarda en `lat/lng_private`; la
  pública se redondea a una rejilla de 0,0005° (~55 m) antes de insertar.
* Cuota: pre-check amable (2/día anónimo · 5/día registrado) y, como
  fuente de verdad, el trigger 0005 (§30); perder la carrera contra el
  trigger devuelve el mismo error.
* La foto sube al bucket privado con ruta generada en servidor
  (`{uid}/{uuid}.{ext}`); si el insert posterior falla, la foto se borra
  (sin huérfanos). `moderation_status='pending'` SIEMPRE (el cliente no
  elige estado) y sin `PointEvent` (el +10 espera a la validación, §4).
* Respuesta `201`: `{ id, status: 'pending', created_at }`.

**`POST /get-photo-url`** — JSON: `{ sighting_id }`.

* Solo avistamientos visibles (`pending|approved`); un id oculto o
  inexistente responde **idéntico** (`404 not_found`) para no ser oráculo
  de estados de moderación.
* Respuesta `200`: `{ url, expires_in: 300 }` — URL firmada de 5 minutos.
  `photo_path` no aparece jamás en ninguna respuesta (D-037).

**Errores** — JSON `{ error, message }`; `error` es código máquina y
`message` va en castellano para el usuario:

| HTTP | `error` |
|---|---|
| 400 | `invalid_payload` · `unknown_species` · `out_of_bounds` · `invalid_image` |
| 401 | `unauthorized` |
| 404 | `unknown_route` · `not_found` |
| 405 | `method_not_allowed` |
| 413 | `image_too_large` |
| 429 | `daily_quota_exceeded` («Has llegado al límite de hoy») |
| 500 | `internal_error` |

Nota sobre tamaños (verificado en hosted): una imagen por encima de 512 KB
pero con cuerpo dentro del margen la rechaza la función con `413`; un
cuerpo descomunal lo corta antes la propia plataforma Edge de Supabase con
un `503` (nunca llega a la función). Ambos casos se rechazan sin procesar
ni tocar Storage; el guard de `Content-Length` de la función es defensa en
profundidad para lo que sí le llega.

**Huecos reservados (post-MVP, sin implementar):** `report-sighting`,
`moderation/*`, `admin/update-config`. `verify-sighting` queda fuera a
propósito: la verificación es INSERT directo bajo RLS consolidado por
trigger (D-038); solo volvería aquí si LCHP-15 necesitara errores más
amables.

### Decisión

Una única Edge Function, modularizada internamente (`routes/` + `lib/`,
ver §34). Los datos que toca con `service_role` están concedidos de forma
explícita y mínima (migración 0006, D-042).

## 14. Modelo de datos inicial

Implementado en `supabase/migrations/` (LCHP-10 — enmienda 2026-07-06);
esta sección es el espejo del esquema real. Notas de implementación:

* Los campos de estado/vocabulario son `text` + `CHECK`, no enums nativos
  de Postgres (D-034): cambiar el vocabulario es una migración de una
  línea y los tipos TS generados son idénticos.
* PostGIS está habilitado desde la migración inicial, pero las columnas
  de coordenadas del MVP siguen siendo `double precision` (D-035).
* **RLS está activado en TODAS las tablas sin ninguna policy** (deny-all
  de nacimiento); las policies y la view pública del mapa llegan con
  LCHP-11.
* Triggers: `set_updated_at()` mantiene `updated_at` en `sightings` y
  `app_config`; `handle_new_user()` (security definer, `search_path`
  fijado) crea la fila de `profiles` en cada alta de `auth.users`,
  incluidos los usuarios anónimos (D-032).
* Borrados: `sightings.created_by` y `sightings.reviewed_by` → `SET NULL`
  (borrar una cuenta no borra el mapa); `profiles.id` → `CASCADE` desde
  `auth.users`; `point_events.user_id` y `verifications.user_id` →
  `CASCADE` (el borrado de cuenta arrastra su libro de puntos y sus
  verificaciones); `sightings.species_id` → `RESTRICT`.
* Invariantes de datos (revisión adversarial D-033): las coordenadas y la
  precisión tienen `CHECK` de rango (lat ∈ [-90, 90], lng ∈ [-180, 180],
  `location_accuracy_m` ≥ 0, sin NaN ni Infinity).
* `verification_count` y `report_count` son **contadores históricos**
  que incrementa el servidor (LCHP-12/15), NO agregados en vivo de las
  tablas `verifications`/`reports`: si un verificador borra su cuenta,
  sus filas de `verifications` desaparecen (GDPR) pero el contador, las
  transiciones de estado ya producidas y los puntos otorgados NO se
  rebobinan — un avistamiento aprobado sigue aprobado.

### species

La ficha real de la Pokédex (reglas §2) necesita más campos que el boceto
original: se añaden `dex_number`, `rarity`, `habitat` y `tracking_tip`, y
se elimina `icon` (los sprites pixel-art viven en el código, indexados
por `slug`). Los valores de `rarity` son copy de producto en español.

```ts
type Species = {
  id: string;
  slug: string;
  dex_number: string;
  name: string;
  rarity: 'común' | 'frecuente' | 'raro' | 'legendario';
  description: string;
  habitat: string;
  tracking_tip: string;
  points: number;
  is_active: boolean;
  created_at: string;
};
```

### sightings

```ts
type Sighting = {
  id: string;
  species_id: string;
  created_by: string | null;

  lat_public: number;
  lng_public: number;
  lat_private?: number | null;
  lng_private?: number | null;
  location_accuracy_m?: number | null;

  photo_path?: string | null;
  photo_blurred_path?: string | null;
  photo_thumbnail_path?: string | null;

  moderation_status:
    | 'pending'
    | 'needs_review'
    | 'auto_rejected'
    | 'approved'
    | 'rejected'
    | 'removed';

  confidence:
    | 'unverified'
    | 'community_verified'
    | 'moderator_verified'
    | 'disputed';

  verification_count: number;
  report_count: number;

  points_awarded: boolean;
  points_awarded_at?: string | null;

  auto_moderation_provider?: string | null;
  auto_moderation_result?: unknown | null;
  auto_moderation_score?: number | null;
  auto_moderation_flags?: string[] | null;

  image_processing_status?:
    | 'not_started'
    | 'processed'
    | 'failed';

  created_at: string;
  updated_at: string;

  reviewed_by?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
};
```

### profiles

```ts
type Profile = {
  id: string;
  display_name?: string | null;
  role:
    | 'user'
    | 'trusted_contributor'
    | 'moderator'
    | 'admin';
  total_points: number;
  weekly_points: number;
  created_at: string;
};
```

### point_events

Tabla recomendada para evitar inconsistencias de puntos.

```ts
type PointEvent = {
  id: string;
  user_id: string;
  sighting_id?: string | null;
  verification_id?: string | null;

  type:
    | 'sighting_validated'
    | 'verification_accepted'
    | 'video_bonus'
    | 'manual_adjustment';

  points: number;
  created_at: string;
};
```

Regla:

```text
Los puntos no se calculan solo desde campos sueltos.
Se registran como eventos para auditar cuándo y por qué se otorgaron.
```

### app_config

Configuración operativa editable sin despliegue (fuente del umbral de
validación y futuros interruptores de features):

```ts
type AppConfig = {
  key: string;
  value: string;
  updated_at: string;
};
```

Claves iniciales:

```text
validation_threshold = 1   (confirmaciones necesarias para validar;
                            el piloto usa 1, la maqueta sugiere ~3 a futuro)
verification_requires_registration = true
                           (D-054: con true, la confirmación de una sesión
                            anónima queda como apoyo provisional — no suma
                            al umbral ni acuña puntos hasta que su autor se
                            registre; con false cuenta de pleno derecho —
                            y al abrirlo se activan también las provisionales
                            YA guardadas (trigger sobre app_config).
                            Cambiarla es un UPDATE, no un deploy)
```

### reports

Preparada para post-MVP:

```ts
type Report = {
  id: string;
  sighting_id: string;
  user_id: string | null;
  reason:
    | 'person_visible'
    | 'private_data_visible'
    | 'wrong_location'
    | 'duplicate'
    | 'offensive_content'
    | 'other';
  note?: string | null;
  status:
    | 'open'
    | 'reviewed'
    | 'dismissed'
    | 'resolved';
  created_at: string;
};
```

### verifications

```ts
type Verification = {
  id: string;
  sighting_id: string;
  user_id: string;
  type:
    | 'confirm_exists'
    | 'not_found'
    | 'duplicate'
    | 'problematic';
  status:
    | 'pending'
    | 'accepted'
    | 'rejected';
  note?: string | null;
  points_awarded: boolean;
  created_at: string;
};
```

### image_moderation_events

Opcional post-MVP (a diferencia del resto de tablas de esta sección, NO
está creada en las migraciones de LCHP-10: llegaría con la moderación
automática de imágenes, §25–§27):

```ts
type ImageModerationEvent = {
  id: string;
  sighting_id: string;
  provider: string;
  status:
    | 'passed'
    | 'flagged'
    | 'rejected'
    | 'failed';

  flags: string[];
  raw_result: unknown;
  created_at: string;
};
```

## 15. Puntos y ranking

La lógica de puntos debe seguir [reglas-y-especificacion.md](../product/reglas-y-especificacion.md), con esta precisión técnica:

```text
Enviar un avistamiento no concede puntos definitivos.
Validar un avistamiento concede +10 al autor.
Aceptar una verificación concede +5 al verificador.
Los vídeos/redes quedan post-MVP.
```

Modelo recomendado:

* `point_events` como fuente de verdad;
* `profiles.total_points` como caché derivada;
* `profiles.weekly_points` como caché o cálculo derivado;
* ranking semanal calculado desde `point_events`.

Flujo:

```text
Usuario crea avistamiento
↓
sighting.status = pending
↓
sin PointEvent todavía
↓
otro usuario lo confirma (1 confirmación, comunitaria)
↓
sighting.status = approved
↓
en la misma transacción:
  crear PointEvent(type = sighting_validated, points = 10) para el autor
  crear PointEvent(type = verification_accepted, points = 5) para el verificador
↓
actualizar total_points/weekly_points
```

Reglas de la verificación (enmienda 2026-07-05; modelo D-054 implementado en LCHP-15, 2026-07-07):

```text
El autor no puede verificar su propio avistamiento.
Un usuario solo puede verificar cada avistamiento una vez.
Cualquiera puede CONFIRMAR, sesiones anónimas incluidas (D-054):
  la confirmación anónima se guarda como apoyo provisional — no suma
  al umbral ni acuña puntos mientras
  app_config.verification_requires_registration = true (piloto).
  Al registrarse su autor (mismo id), se activa retroactivamente:
  cuenta para el umbral (pudiendo validar entonces) y cobra sus +5.
El umbral de confirmaciones para validar vive en app_config
(validation_threshold); para el piloto es 1.
Cuando las confirmaciones QUE CUENTAN alcanzan el umbral → pending →
approved (+ confidence = community_verified).
Al validar, TODOS los verificadores confirmantes cobran +5 (no solo el
que alcanza el umbral): verification.status pasa a accepted y
points_awarded evita el doble pago.
Las transiciones de estado y los PointEvent se crean SOLO server-side
(trigger private.consolidate_sighting, migración 0007): lock de fila +
UPDATE atómico WHERE pending — la concurrencia a umbral 1 está
serializada y probada (pgTAP + carrera real por curl).
```

Referencia post-MVP (diseño original, a retomar si hace falta más robustez):

```text
Subir validation_threshold (p. ej. a 3, como sugieren los datos seed de
la maqueta — los validados tienen 3-6 votes) es solo un cambio de
configuración: sin migración, sin despliegue, sin tocar código.
La aceptación diferida del diseño original (verification.status =
pending → accepted) quedó IMPLEMENTADA con la semántica D-054: las
confirmaciones anónimas nacen pending y se aceptan al activarse.
```

## 16. Auth y roles

Modelo recomendado:

* lectura pública del mapa sin login fuerte;
* Supabase anonymous auth para participación inicial;
* magic link para registro;
* roles internos para moderadores;
* registro progresivo, no obligatorio desde el minuto cero.

### Verificado contra Supabase real (spike LCHP-3 — enmienda 2026-07-06) `Decidido`

Todo lo anterior se comprobó contra el proyecto real del MVP (free tier) y
contra un stack local de Supabase; deja de ser una recomendación y pasa a
ser comportamiento verificado:

* **Anonymous sign-in existe en el free tier.** Viene desactivado por
  defecto; se activa por proyecto (dashboard o Management API,
  `external_anonymous_users_enabled`). Ya está activado en el proyecto.
* **Sesión anónima real**: `POST /auth/v1/signup` con cuerpo vacío
  devuelve un JWT con `role=authenticated` y claim `is_anonymous=true`,
  access token de 1 h y refresh token. La sesión se renueva
  indefinidamente con el refresh token: **el usuario anónimo no caduca ni
  se borra solo** — es una fila permanente en `auth.users`, así que sus
  avistamientos no se pierden por expiración. Contrapartida: los anónimos
  abandonados se acumulan; conviene una limpieza periódica post-MVP.
* **Upgrade anónimo → registrado conserva `user.id`.** Verificado de
  extremo a extremo en local: `updateUser({ email })` sobre la sesión
  anónima envía el enlace de confirmación al correo; al seguirlo, la
  **misma** fila de usuario pasa a tener `email` confirmado,
  `is_anonymous=false` y una identidad `email` nueva. En el proyecto
  hosted se verificó la primera mitad (mismo `id`, `new_email` pendiente).
  Consecuencia: la consolidación de puntos y avistamientos al registrarse
  es automática — no hay migración de datos, el `id` no cambia.
* **Anti-abuso integrado**: GoTrue limita por defecto los sign-ins
  anónimos a 30/hora por IP (configurable).

**Decisión MVP** `Decidido`: **los usuarios anónimos SÍ pueden crear
avistamientos desde el primer envío**, sin exigir magic link, con la cuota
de §30 (1–2/día) aplicada en Postgres. Razones: (a) la fricción del email
en la primera participación mataría el piloto vecinal; (b) la cuota diaria
verificada limita el abuso; (c) como el `id` sobrevive al upgrade, no se
pierde nada por empezar anónimo. El magic link se ofrece como mejora
(«guarda tu historial y tus puntos»), no como barrera.

### Registro progresivo implementado (LCHP-29 — 2026-07-07; enmienda 2026-10-08, D-060) `Decidido`

> **Enmienda 2026-10-08 (D-060):** el upgrade vuelve al **enlace de
> confirmación estándar de Supabase**; se retira el código OTP tecleado
> en la app. Motivo: el proyecto hosted está en el plan gratuito con el
> remitente integrado, y Supabase **no permite modificar las plantillas
> de correo** en esa combinación (la Management API responde 400: «Email
> template modification is not available for free tier projects using the
> default email provider»). Sin plantilla propia el correo no puede llevar
> el código, así que el flujo OTP era inservible en producción (David lo
> reprodujo en la preview: pantalla de código en la app, correo solo con
> enlace). El código OTP vuelve a ser posible cuando haya SMTP propio
> (LCHP-31).

> **Estado: fusionado pero OCULTO** (`REGISTRATION_ENABLED = false` en
> `src/lib/flags.ts`; Perfil no muestra el panel). Se enciende cuando se
> decidan dos cosas: el envío de correo (LCHP-31 — el remitente integrado
> de Supabase está documentado como no apto para producción: ~2
> correos/hora y solo a miembros del equipo del proyecto) y si la
> asociación quiere exigir login antes de usar la app. Antes de encenderlo
> hay que probar el flujo de extremo a extremo, en un iPhone con la app
> instalada, y pasarlo por la review adversarial.

El flujo implementado (`src/lib/registration.ts` + panel «Guarda tu
cuenta», hoy oculto, en Perfil):

```text
updateUser({ email }, { emailRedirectTo: <origen>/perfil })
sobre la sesión anónima
↓
llega el correo ESTÁNDAR de Supabase (en inglés, remitente
«Supabase Auth», asunto «Confirm your new email address») con un enlace
↓
el vecino abre el enlace → GoTrue confirma el correo EN EL SERVIDOR
↓
misma fila de auth.users: is_anonymous=false, mismo id
↓
el trigger de LCHP-15 activa sus apoyos provisionales:
cuentan para el umbral y cobra sus +5 acumulados
↓
al volver a la app, esta REFRESCA su sesión (refreshSession) y ve el
cambio: «Cuenta guardada · +N puntos recuperados»
```

**Por qué la app no depende de la redirección.** En una PWA instalada en
iOS el enlace se abre en Safari, que no comparte almacenamiento con la
PWA: la página a la que redirige no tiene la sesión. Pero la confirmación
ocurre en el servidor, sobre la misma cuenta, se abra donde se abra. Por
eso el panel nunca espera a la redirección: pregunta al servidor
(refrescando su propia sesión) al montarse con un enlace pendiente, cada
vez que la app vuelve a primer plano y cuando el vecino pulsa «Ya lo he
abierto». El refresco importa además porque el nuevo token es el que
lleva el claim «no anónimo» que lee RLS. **Pendiente de verificar en un
iPhone real con la app instalada** (no se ha probado en dispositivo).

Notas operativas:

* la sesión anónima sigue plenamente usable mientras el enlace está
  pendiente — que caduque o no se abra es inofensivo;
* `emailRedirectTo` devuelve al origen que pidió el enlace (producción o
  una preview de Cloudflare); el Site URL del hosted y la lista de
  redirecciones (`https://la-invasion-silenciosa.pages.dev` y
  `https://*.la-invasion-silenciosa.pages.dev`) se configuraron el
  2026-10-08 — antes el enlace iba a `http://localhost:3000`;
* el correo no se puede traducir ni personalizar (plan gratuito): el panel
  le dice al vecino qué remitente y qué asunto buscar;
* los puntos recuperados se calculan contra los que había al pedir el
  enlace, guardados en `localStorage` (`lis.registration.requested`),
  porque el trigger paga en el servidor, quizá con la app cerrada;
* un correo ya registrado en otra cuenta se rechaza con explicación (no
  hay fusión de cuentas: limitación conocida de linkIdentity/updateUser);
* el stack local espeja al hosted: confirmaciones activadas y **sin**
  plantilla propia (correo por defecto en Mailpit);
* **SMTP propio pendiente ANTES del piloto** (LCHP-31): el remitente
  integrado de Supabase envía ~2 correos/hora, inservible en la calle.

Roles:

```text
anonymous
registered/user
trusted_contributor
moderator
admin
```

### Usuario anónimo

Puede:

* ver mapa;
* crear 1–2 avistamientos/día;
* enviar contenido siempre como `pending`;
* **confirmar avistamientos ajenos como apoyo provisional** (D-054):
  su confirmación se guarda y se activa retroactivamente al registrarse
  (cuenta para el umbral y cobra sus +5 acumulados), pero por sí sola no
  valida ni acuña puntos mientras
  `verification_requires_registration = true`.

No puede:

* publicar directamente;
* **validar** (hacer que una confirmación suya cuente para el umbral)
  con el interruptor del piloto cerrado;
* moderar;
* hacer acciones masivas;
* aprobar contenido.

### Usuario registrado

Puede:

* crear más avistamientos;
* verificar/reportar (sus confirmaciones cuentan y cobran +5 al validar);
* mantener historial;
* participar en ranking.

### Trusted contributor

Puede:

* tener más cuota;
* aparecer priorizado en cola de moderación.

No debería publicar automáticamente en MVP.

### Moderator (rol en esquema; SIN uso en el MVP — enmienda 2026-07-05)

En el MVP no hay moderación: el rol existe en `profiles.role` como
preparación post-MVP, pero ninguna UI ni ruta lo usa. Post-MVP podrá:

* ver cola de moderación;
* aprobar;
* rechazar;
* resolver reportes;
* marcar duplicados;
* ocultar contenido.

### Admin

Puede:

* gestionar roles;
* gestionar especies;
* configurar límites;
* activar/desactivar features.

## 17. Imágenes y Storage

Las imágenes se guardarán en Supabase Storage privado.

Reglas:

```text
No bucket público en MVP.
No mostrar fotos en el mapa.
No devolver photo_path en queries públicas.
Generar signed URL temporal solo bajo demanda.
Guardar imagen comprimida.
Eliminar EXIF cuando se implemente procesamiento.
```

Para MVP inicial:

```text
Puede subirse una imagen optimizada desde el cliente si simplifica.
Debe guardarse en bucket privado.
Debe asociarse al sighting.
La foto solo debe verse mediante get-photo-url.
```

Más adelante:

```text
procesar imagen en backend;
quitar EXIF garantizado;
crear thumbnails;
blur de datos sensibles;
moderación automática;
borrado automático de rechazadas.
```

Objetivo post-MVP:

```text
Foto final: 150–300 KB
Thumbnail: 20–60 KB
Lado largo máximo: 1280 px
Formato preferente: WebP
```

### 17.1 Pipeline de imagen en cliente (LCHP-14 — enmienda 2026-07-06) `Decidido`

Verificado en dispositivo real por el spike LCHP-5 (Android + Chrome-iOS +
Safari-iOS) e implementado en `src/lib/photo.ts` (D-051):

```text
Foto (visor getUserMedia · cámara del sistema · galería — D-050)
↓
Decodificar respetando orientación EXIF
(createImageBitmap from-image; fallback <img>)
↓
Reducir a máx. 1280 px de lado largo
↓
Re-codificar JPEG en canvas (q0.8)
— esto ya elimina el EXIF original, GPS incluido, en las 3 plataformas
↓
Stripper determinista de segmentos JPEG (byte a byte):
fuera TODO APP1–APP15 y COM; se conserva solo APP0/JFIF
— WebKit re-añade orientación/perfil de color al exportar; la garantía
  de privacidad no depende del encoder de cada motor
↓
Si supera el tope de subida (512 KB, alineado con la Edge Function y el
bucket), se baja la calidad por pasos (0.8 → 0.5)
↓
Blob image/jpeg SIN metadatos — nada sale del dispositivo sin pasar por aquí
```

La localización del avistamiento viene SIEMPRE de la Geolocation API o del
pin manual, nunca del EXIF (que se elimina, no se lee). El pipeline servidor
post-MVP (§27: thumbnails, blur, WebP) se añade por detrás de esta garantía,
no la sustituye.

Refuerzo en la frontera de confianza (review adversarial LCHP-14): la Edge
Function `/create-sighting` **rechaza** (400) cualquier JPEG con segmentos
APP1–APP15/COM y cualquier WebP con chunks EXIF/XMP — un cliente legítimo
nunca los envía (el pipeline los elimina), así que metadatos entrantes =
cliente modificado. La garantía no depende del cliente.

## 18. Flujo de mapa

### Implementado (LCHP-13 — enmienda 2026-07-06) `Decidido`

Espejo del comportamiento real (`BarrioMap` + `MapPage`, verificado e2e):

```text
Usuario abre mapa (sin sesión: lectura pública)
↓
La app lee public_map_sightings: pending Y approved
(enmienda LCHP-1: los pending son visibles desde el primer momento)
↓
Iconos de especie sobre MapLibre + vector tiles de OpenFreeMap con el
estilo propio «chispera» (LCHP-33, D-059; antes raster OSM teñido por CSS,
D-045 — paleta «papel», elegida por David en el loop visual entre 4
candidatas)
↓
Los pending llevan anillo ámbar y parpadean (blinkdot); los validados no
↓
NO se carga ninguna foto (verificado: 0 peticiones a Storage al cargar)
↓
Usuario pulsa icono (o fila de «Cerca de ti»)
↓
Ficha de detalle: especie · estado · antigüedad ·
«Ubicación aproximada · La Latina»
— SIN autor y SIN calle exacta: la vista pública no los expone (§12);
  la etiqueta adaptativa por precisión llegará con el geocodificado
  privado (ticket LCHP-26)
↓
«Ver evidencia» → sesión anónima perezosa si no hay (D-032/D-043)
→ POST /get-photo-url → overlay con la foto (URL firmada de 5 min)
(verificado: exactamente 1 petición a Storage, solo tras pedirla;
un avistamiento sin foto muestra un aviso amable)
↓
«Verificar» → «próximamente» (la transacción real es LCHP-15)
```

La foto es evidencia bajo demanda, no contenido principal del mapa. El
«Mapa de calor» es un modo real desde LCHP-35 (D-063; ver «Los
avistamientos son datos del mapa», más abajo).

### Pantalla a mapa completo (LCHP-34 — enmienda 2026-10-08, D-061) `Decidido`

El flujo de arriba no cambia; cambia la **composición de la pantalla**
(D-058: la maqueta es guía, la UX en móvil manda). El mapa ya no es una
tarjeta dentro de una columna: **es la pantalla**, y ocupa todo lo que
queda por encima de la barra de pestañas (que se mantiene — decisión de
David). Medido a 390×780: el canvas pasa de 358×216 px a 390×704 px.

```text
┌──────────────────────────────┐
│  [ Avistamientos | Calor ]   │  un único conmutador, centrado
│                              │  (sin tarjeta de título)
│          MAPA                │  pines; al tocar uno se centra en la
│                              │  parte visible
│                       [◎]    │  «Ir a mi posición»
│ (i)                   [+][−] │  crédito · zoom (solo con ratón)
├──────────────────────────────┤
│ ▬  HOJA INFERIOR             │  ficha del avistamiento (si hay uno
│ Cerca de ti · ◉ N por verific│  elegido) + lista «Cerca de ti»
└──────────────────────────────┘
│ Mapa · Especies · ◉ · …      │  barra de pestañas
```

* **Sobre el mapa solo queda lo imprescindible** (ronda de opinión de
  diseño con dos modelos sobre la captura del móvil de David, 2026-10-08;
  ambos coincidieron): se elimina la tarjeta de título — la pestaña «Mapa»
  ya dice dónde estás — y los dos chips sueltos pasan a ser **un conmutador
  centrado** «Avistamientos | Mapa de calor» sobre fondo opaco. En las
  esquinas, únicamente el crédito (i) y «Ir a mi posición».
* **No hay leyenda** (segunda ronda de opinión de diseño, 2026-10-08;
  David descartó tanto el botón «Leyenda» sobre el mapa como una fila
  «Especies» plegada en la hoja). Lo que faltaba no era una tabla de
  especies sino dos frases, y se dicen donde surge la duda:
  * los chips «Por verificar» (el contador de la hoja y el de la ficha)
    llevan un **aro que parpadea al ritmo de los pines pendientes**: une el
    aro naranja del mapa con su significado sin añadir nada a la pantalla;
  * la **ficha del avistamiento** dice qué es el bicho (la `description`
    de la especie, la misma del catálogo), y si está pendiente añade
    «Parpadea en el mapa hasta que otros vecinos lo confirmen.»;
  * la referencia completa es la pestaña «Especies», que ya está en
    pantalla bajo la ficha: no se repite con un enlace.
* **Plegar la hoja cierra la ficha.** Con un bicho elegido, bajar la hoja
  (o tocar su asa o la fila «Cerca de ti») quita también la ficha, igual
  que tocar el mapa; si no, la hoja parecía imposible de cerrar.
* **Elegir otro bicho sube la hoja al principio.** La ficha va arriba y
  se desplaza con la lista: al tocar una fila lejana, la ficha cambiaba
  fuera de la vista. Vale también al volver a tocar el mismo bicho.
* **El pin elegido se dibuja encima de los demás**: donde hay varios
  avistamientos juntos los pines se pisan, y el elegido podía quedar
  debajo de otro.
* El (i) es el crédito de datos del mapa, no una leyenda.
* **La fila «Cerca de ti · N por verificar» es un botón entero** que
  pliega y despliega la hoja: el contador naranja parecía un botón y no
  hacía nada.
* **Cada fila de «Cerca de ti» tiene dos gestos:** tocar la fila elige el
  bicho (el mapa va a su pin y aparece su ficha); solo su botón
  «Verificar» abre la ventana de verificación directamente. Así se puede
  mirar antes de confirmar.
* **Los pines parpadeantes se mantienen** para los pendientes (decisión de
  David); con `prefers-reduced-motion` no parpadean ni los pines ni el aro
  de los chips. El punto de la posición del vecino se dibuja **debajo** de
  los pines: encima parecía una insignia del bicho.
* **Una sola hoja inferior** sustituye a la ficha emergente y a la lista
  separada. Plegada muestra solo su cabecera (el contador «N por
  verificar» y, si lo hay, el aviso de ubicación); desplegada añade la
  lista, con scroll propio, hasta un 44 % de la pantalla. Se pliega y
  despliega tocando o deslizando su tirador. Tocar un pin o una fila la
  despliega y pone su ficha en la cabecera; plegarla o tocar el mapa
  cierra la ficha (no existe el estado «ficha abierta con la hoja
  plegada»).
* **La altura de la hoja es el `padding` inferior del mapa**
  (`ResizeObserver` → controlador): el centro del mapa es siempre el
  centro de la parte visible, el encuadre inicial del barrio se ajusta a
  ella, y los controles flotantes y el crédito suben y bajan con la hoja
  (variable CSS `--sheet-h`). Esto elimina de raíz el solapamiento que
  D-057 parcheaba con un `z-index`. Detalle que importa: `map.setPadding`
  detiene cualquier animación en curso, y elegir un pin a la vez mueve el
  mapa y cambia la altura de la hoja; por eso, si hay un movimiento hacia
  un pin en curso, el controlador lo vuelve a lanzar con el `padding`
  nuevo en vez de llamar a `setPadding` (si no, el pin se quedaba a medio
  camino). El encuadre inicial usa la primera altura medida de la hoja y
  no se repite si la lista crece después; en móvil vertical el encuadre lo
  limita el ancho, así que no se nota.
* **«Ir a mi posición»** (`src/lib/geoWatch.ts`, portado de Alcorqueando):
  el permiso nativo se pide **solo al tocar el botón, nunca al cargar**
  (D-052). Con posición: punto verde + círculo de precisión, y el mapa la
  sigue hasta que el vecino arrastra el mapa, hace zoom con los dedos o la
  rueda, o elige un pin (los botones +/− cambian el zoom sin dejar de
  seguir). Cada toque en el botón acerca el mapa hasta z17; las posiciones
  siguientes solo recentran, para no deshacer un zoom del vecino. Un
  recentrado del seguimiento que llega mientras sigue en curso un
  acercamiento, o un paso de los botones +/−, conserva ese zoom: un móvil
  entrega varias posiciones en el primer segundo y, si no, cada una
  cortaba el movimiento anterior (visto en iPhone: el punto aparecía y el
  mapa no se movía). Solo el seguimiento hereda el zoom: un pin elegido en
  ese instante se centra con el zoom que encuentra. Un cambio de altura de
  la hoja durante un paso de +/− tampoco lo corta: el paso se vuelve a
  lanzar. El encuadre inicial tiene prioridad: un paso o un movimiento
  empezado antes de conocer la altura de la hoja se descarta. Un paso
  de +/− solo se guarda como vista si llegó a su destino (el zoom pedido,
  o el más cercano que permiten los límites de zoom y de paneo): cortado
  a medias — por la hoja, por ir a un pin, por otra pulsación o por un
  gesto del vecino — no guarda su zoom intermedio (el gesto guarda luego
  lo suyo). En una
  visita posterior **el punto reaparece** sin preguntar solo si el
  navegador confirma que el permiso sigue concedido; el mapa **no** se
  recentra solo (seguir exige tocar el botón). Al volver de segundo plano
  la observación se reanuda **solo si el navegador afirma que el permiso
  sigue concedido**. Si va a preguntar de nuevo (un permiso «solo esta
  vez» caducado) o no sabe decirlo (sin API de permisos; Safari, que
  responde «preguntar» a casi todo), se pausa en vez de arriesgar el aviso
  nativo sin toque, y la hoja dice «Toca «Ir a mi posición» para volver a
  ver dónde estás.» En el iPhone de David (2026-10-09) el punto seguía
  ahí al cambiar de app y volver; no se anotó la versión de iOS ni si la
  observación se reanudó o nunca llegó a pausarse, así que no está medido
  cuántas veces ocurre la pausa en otros iPhone. Al salir de la pantalla se deja
  de observar y se olvida la posición (también en memoria). Los avisos
  (denegado → cómo permitirlo, texto por plataforma; sin señal; **fuera de
  La Latina no se muestra ni se sigue la posición**) se ven en la cabecera
  de la hoja, plegada o no, y **solo tras tocar el botón**: una
  observación reanudada al llegar no saluda con un aviso.
* **Privacidad de la posición del vecino:** no se envía a nuestros
  servidores ni se guarda. La vista recordada (abajo) solo registra
  movimientos hechos por el vecino, nunca los de la app, y **no registra
  nada desde que su posición aparece en el mapa hasta que se sale de la
  pantalla**: aunque el punto desaparezca (permiso retirado, pausa, salir
  del barrio), el mapa puede seguir centrado en, o al lado de, donde está. Lo único que sale del dispositivo son las peticiones de
  teselas del basemap, como en cualquier mapa: OpenFreeMap sirve teselas
  hasta z14, así que ve, como mucho, qué celda de ~1,7×1,3 km se está
  mirando — con el mapa acotado a La Latina, una de unas nueve.
* **Se recuerda la última vista que eligió el vecino** (centro y zoom,
  `localStorage` `lis.map.view`) si cae dentro del límite de paneo; si no,
  se abre encuadrado al barrio. Los movimientos de la app (encuadre
  inicial, cambio de altura de la hoja, ir a un pin, seguir la posición)
  no se guardan; los botones +/− sí cuentan como elección del vecino.
  Consecuencia aceptada: quien ha visto su posición en el mapa no ve
  recordada la vista de esa visita a la pantalla. Al aparecer la posición
  se borra además la vista guardada: como ya no se va a guardar otra, la
  antigua volvería en cada visita. Tras una visita en la que apareció el
  punto, la siguiente abre encuadrada al barrio. (Si el punto no llega a
  aparecer — posición fuera del barrio, navegador que no reanuda sin
  toque, salir antes de la primera posición — la vista se sigue
  recordando.)
* **Arquitectura:** `createBarrioMap()` (`src/components/map/`) es el
  único módulo que habla con MapLibre para esta pantalla — una factoría
  sin React que devuelve una API pequeña (`setSightings`, `setSelected`,
  `setHeat`, `setMe`, `setBottomPadding`, `goTo`, `follow`, `zoomBy`,
  `destroy`), al estilo del `mapview.js` de Alcorqueando. `BarrioMap.tsx` es
  un envoltorio fino.

### Los avistamientos son datos del mapa (LCHP-35, D-063) `Decidido`

Los pines ya no son elementos de la página colocados encima del mapa: son
datos que el propio mapa dibuja.

* **Una fuente GeoJSON con agrupación** (`cluster: true`, radio 46 px,
  hasta z17) y capas `symbol`. Cada pin es una imagen registrada en el
  mapa, generada una vez por especie y estado (validado, pendiente,
  elegido) a partir del **mismo arte SVG** que usa el resto de la app
  (D-062): la baldosa de 34 px con su borde y el bicho dentro. No hay
  ficheros de imagen nuevos.
* **Agrupaciones:** donde los pines se pisan aparece un círculo con el
  número; lleva aro naranja si dentro hay algo por verificar. Tocarlo
  acerca el mapa hasta que se separan, y cuenta como un movimiento del
  vecino (deja de seguir su posición; es una vista elegida).
* **El avistamiento elegido se dibuja desde su propia fuente, sin
  agrupar y encima de todo**: elegido desde la lista con el mapa alejado,
  nunca queda escondido dentro de una agrupación.
* **Toque:** se busca en un cuadro de ±14 px alrededor del dedo y gana lo
  más cercano; si no hay nada, es un toque en el mapa (cierra la ficha).
* **Parpadeo de los pendientes:** como una capa del mapa no admite
  animaciones CSS, la opacidad se cambia desde código siguiendo el reloj
  de la página, unas veinte veces por segundo. El aro de los chips «Por
  verificar» arranca su animación CSS en la misma fase, así que **pin y
  chip parpadean a la vez**. Se detiene con la pestaña oculta, en modo
  calor, sin pendientes y con `prefers-reduced-motion`. Coste conocido:
  mientras parpadea, el mapa se repinta entero esas veinte veces por
  segundo aunque nadie lo mueva (una animación CSS no costaba nada);
  no se ha medido en batería.
* **Mapa de calor:** una capa `heatmap` sobre los mismos puntos, con la
  rampa del prototipo (amarillo → rojo oscuro). En ese modo no hay pines
  ni lista «Cerca de ti» ni avistamiento elegido: la hoja muestra «Mapa de
  calor · N avistamientos» y una línea, y un toque en el mapa no elige
  nada. Entra en el MVP por decisión de David (el brief lo tenía como
  post-MVP): con los avistamientos ya en una fuente, es una definición de
  capa.
* **La posición del vecino también es una capa** (punto y halo), añadida
  antes que los pines para quedar debajo de ellos.
* **Rendimiento medido** (app compilada, Chromium sin GPU, arrastre de
  ~6 s): con 200 avistamientos, 18,5 fps a 390×780 @2x y 27,3 a 1100×800
  — lo mismo que con un solo pin, es decir, el límite lo pone dibujar el
  mapa vectorial por software. Con 200 marcadores DOM eran 17,1 y 25,3.
* **Accesibilidad:** un pin dibujado por el mapa no es alcanzable con
  teclado ni lector de pantalla. Fuera de alcance aquí por decisión de
  David (es un juego visual); queda como pregunta en LCHP-40.
* Se borra el mapa del prototipo que ya no usaba nadie: `StreetMap.tsx`,
  `HeatCanvas.tsx`, `lalatina-geo.ts` y el tipo `MapSighting`.

Capturas de referencia de esta pantalla (sustituyen a `captura_03`,
`captura_29` y `captura_30` como base de comparación, D-058): se generan
con el loop visual sobre la app compilada y se adjuntan al PR.

## 19. Flujo de captura

### Implementado (LCHP-14 + LCHP-28 — enmienda 2026-07-06) `Decidido`

Espejo del comportamiento real (`HuntPage` + `EquipmentGate` + `PhotoStep` +
`LocationStep`):

```text
Usuario pulsa “Cazar”
↓
Puerta de equipamiento (D-053) — SOLO si viene un prompt nativo
(cámara no concedida): «¡Prepara tu equipo!» + regla de oro; UN tap
dispara cámara + ubicación en un solo gesto. El stream concedido pasa
vivo al visor y el fix GPS se cachea para el paso de ubicación.
«Ahora no» → cámara del sistema / galería. En Android se auto-salta
desde la 2ª visita; en iOS re-aparece por sesión (WebKit no persiste
el permiso de cámara, bug 215884) — un diálogo nativo nunca
interrumpe a mitad de acción
↓
Foto: visor in-app (getUserMedia, cámara trasera) o cámara del
sistema / galería (D-050) → pipeline §17.1 → previsualización
↓
Elige especie (catálogo real)
↓
Ubicación: mapa MapLibre con pin fijo al centro — arrastra el mapa
debajo del pin (D-052); si la puerta cacheó un fix GPS, abre ya
centrado en ti. «Usar mi ubicación» dispara getCurrentPosition EN EL
TAP; si code=1 / no disponible → guía POR PLATAFORMA (iOS: Ajustes →
Privacidad y seguridad → Localización → Sitios web de Safari; resto:
el candado del navegador) y el pin manual sigue funcionando.
Un pin fuera de La Latina bloquea el paso (espejo del bbox servidor)
↓
Revisa y envía → POST /create-sighting (multipart: foto limpia +
species_id + lat/lng exactos + accuracy si es GPS)
↓
El servidor guarda la imagen privada, lat/lng_private exactos (D-049)
y snapea lat/lng_public a la rejilla de privacidad
↓
Se crea sighting con moderation_status = pending
↓
Confirmación con la cadena EXACTA (§4):
“Avistamiento enviado · +10 puntos pendientes de validación”
↓
Invalidación de la query del mapa → al volver, el nuevo pin
parpadea como pendiente
```

Errores con estado conservado (reintentar no pierde nada): cuota agotada →
«Has llegado al límite de hoy» (429, §30) · fuera del barrio → mensaje del
servidor · red → «No se pudo enviar. Revisa tu conexión e inténtalo de
nuevo.»

Nota enmienda LCHP-1: los `pending` SÍ son visibles en el mapa desde el
primer momento (con marcador de aviso); `approved` llega con la validación
comunitaria (§20).

## 20. Flujo de validación (comunitaria — enmienda 2026-07-05; implementado en LCHP-15 con el modelo D-054)

```text
Avistamiento pending (ya visible en el mapa con marcador de aviso)
↓
Otro vecino lo confirma desde el modal de verificación
(dos puertas: la tarjeta del pin y la lista «Cerca de ti»;
 la foto se carga al abrir el modal — la evidencia ES lo que se juzga)
↓
├─ vecino REGISTRADO: la confirmación cuenta
│  (al alcanzar validation_threshold — 1 en el piloto)
│  ↓
│  Avistamiento pasa a approved (confidence = community_verified)
│  ↓
│  PointEvent +10 para el autor y +5 para CADA verificador confirmante
│  (todo en la transacción del INSERT, trigger server-side)
│  ↓
│  El pin deja de parpadear (invalidación de la query del mapa)
│  ↓
│  Cuenta para ranking, perfil y progreso
│
└─ vecino ANÓNIMO: apoyo provisional (D-054)
   «Apoyo guardado · regístrate para que cuente y cobrar tus +5»
   ↓
   Al registrarse (mismo id, LCHP-3): activación retroactiva —
   sus confirmaciones cuentan (pudiendo validar entonces) y cobra
   sus +5 acumulados de golpe
```

Descarte en el MVP:

```text
No hay flujo de descarte en el MVP (sin moderación).
Los estados rejected/removed existen en el esquema como válvula de escape:
si el piloto detecta abuso o incumplimientos de la regla de oro,
se activará el flujo de moderación post-MVP (fase D).
Mientras tanto, un caso problemático puntual se resuelve con un
manual_adjustment / UPDATE administrativo directo, documentándolo.
```

Flujo de descarte post-MVP (diseño original, se activará con la moderación — fase D):

```text
Avistamiento pending
↓
Revisión detecta error o incumplimiento
↓
Avistamiento pasa a rejected/removed
↓
No se conceden puntos
```

## 21. Mapas: MapLibre, OpenFreeMap y tiles

> **Enmienda 2026-10-08 (LCHP-33, D-059):** el basemap pasa de **raster
> OSM teñido por CSS** a **vector tiles de OpenFreeMap con estilo propio
> «chispera»** (`src/components/map/styles/chispera.ts`, derivado del
> estilo `positron` de OpenFreeMap). OpenFreeMap no exige cuenta ni API
> key, no declara límites de peticiones, permite uso comercial y solo pide
> atribución — las mismas condiciones que hicieron elegir el raster OSM,
> sin sus contras (sin estilo propio, borroso en retina, policy estricta).
> La subsección «Decisión vigente» describe lo implementado; la decisión
> original raster y los límites de la OSM Tile Usage Policy se conservan
> como histórico. §22 y §23 quedan resueltos.
>
> **Enmienda 2026-07-06 (spike LCHP-4):** la combinación MapLibre GL JS +
> raster OSM quedó **verificada con evidencia** (página desechable +
> Playwright, viewport móvil 412×892 @2.625x). Esta sección pasa de
> propuesta a **`Decidido` verificado**; se añaden los límites concretos
> de la Tile Usage Policy, el hallazgo crítico sobre la geodata del
> prototipo (lienzo, no lat/lng) y la forma final de la abstracción
> `tileProvider`. Quien implemente **LCHP-13** debe leer esta sección
> entera antes de escribir código.

### Decisión vigente: OpenFreeMap vector + estilo chispera (LCHP-33) `Decidido`

```text
MapLibre GL JS
+
vector tiles de OpenFreeMap (esquema OpenMapTiles, tilejson
https://tiles.openfreemap.org/planet, glifos de OpenFreeMap)
+
estilo propio «chispera» vendorizado en el repo
+
iconos propios encima
```

Condiciones del proveedor (verificadas 2026-10-08 en
<https://openfreemap.org/> y en sus términos
<https://openfreemap.org/tos/>, actualizados 2026-09-09): sin registro,
sin API key, sin cookies, sin límite declarado de peticiones ni de vistas,
uso comercial permitido, **atribución obligatoria** (OpenStreetMap +
OpenMapTiles; OpenFreeMap opcional), **prohibida la recolección
automatizada** de datos del servicio sin permiso, servicio «tal cual» que
**puede discontinuarse sin aviso**. **Sin SLA**: la instancia pública se
financia con donaciones. Vía de escape post-MVP: el servidor es open
source, pero solo publica volcados del planeta completo (Btrfs/MBTiles
semanales), así que la opción C de §22 implica **cortar nuestro propio
extracto** de La Latina (planetiler o Geofabrik) y servir `z/x/y` desde
R2/Pages. Marcado como `// TODO(post-mvp)`. **No se conserva un fallback
raster en el código** (David, 2026-10-08): era una ruta que nadie
ejecutaba y arrastraba una rama del constructor de estilos, un flag por
proveedor y sus tests; si hiciera falta, volver al raster OSM es un revert
pequeño y su policy sigue documentada más abajo.

**Licencia del estilo:** `positron` es BSD-3 (código) + CC-BY 4.0 (diseño,
derivado de CartoDB Basemaps de Stamen/Paul Norman, CC-BY 3.0), vía
openfreemap-styles (MIT). Cumplimiento:

* **Código (BSD-3):** el `LICENSE.md` de upstream se conserva íntegro en
  `src/components/map/styles/POSITRON-LICENSE.md` (condiciones y descargo
  incluidos); la cabecera de `chispera.ts` mantiene las líneas de copyright
  y remite a él. La instantánea de la que partimos es la adaptación de
  OpenFreeMap, así que su fichero de licencias (MIT, © 2023 Zsolt Ero) se
  conserva también, en `OPENFREEMAP-STYLES-LICENSE.md`.
* **Diseño (CC-BY 4.0):** la licencia dice que el crédito de diseño «needs
  not to be provided on map images, but should be reasonably accessible
  from maps based on this style». Por eso **no** va en el control de
  atribución del mapa: vive en la página **`/perfil/creditos` «Créditos y
  licencias»**, enlazada desde el pie de Perfil, que muestra el crédito
  (MapTiler/OpenMapTiles, CartoDB, Stamen y Paul Norman, enlace a CC BY
  4.0) y el texto completo de ambas licencias, importado de los ficheros
  vendorizados para que página y código no puedan divergir.
* **Datos (OpenStreetMap + OpenMapTiles):** esos créditos sí son
  obligatorios en el mapa — ver «Atribución» más abajo.

**Peso (medido 2026-10-08, app compilada, 412×892 @3x):** la primera carga
pide 4 tiles vectoriales z14 ≈ 1,5 MB gzip (2,5 MB descomprimidos) + 3
rangos de glifos + el tilejson ≈ 1,6–1,7 MB, frente a 284 KB de 9 PNG z16
del raster (577 KB tras cargar + zoom + arrastre). A cambio, el mapa
acotado necesita como mucho 9 celdas z14 en toda su vida, servidas con
`max-age` de diez años: las visitas siguientes son casi gratis y el
service worker (LCHP-17) puede conservarlas. Privacidad: las peticiones de
tiles revelan ahora solo la celda z14 (~1,7×1,3 km) alrededor de la vista,
no celdas z16–z19.

El estilo `chispera.ts` es `positron` con estas modificaciones y nada
más (la procedencia y la lista viven en la cabecera del módulo):

* paleta chispera en las capas que este mapa puede mostrar (aeropuertos,
  glaciares y plataformas de hielo conservan el color de positron: nada
  dentro de `maxBounds` los dibuja);
* etiquetas `coalesce(name:es, name:latin, name)` en todas las capas con
  nombre (positron las escribe en inglés cuando existe `name_en`);
* eliminadas las tres capas de escudos de carretera y la capa `airport`
  (dependen del sprite de positron; La Latina no tiene ninguna) → el
  estilo no necesita `sprite`;
* eliminada la fuente raster de relieve `ne2_shaded` (solo visible por
  debajo de z6, inalcanzable dentro de `maxBounds`);
* eliminados los `icon-*` de las etiquetas de lugar (punto de sprite por
  debajo de z10);
* etiquetas de fuentes y estanques (`water_name_point_label`) reducidas de
  14 px a 10–12 px: gritaban más que los nombres de calle;
* corregido `["linear", 1]` → `["linear"]` en `boundary_3` (positron lo
  escribe así; MapLibre lo tolera, el tipo `StyleSpecification` no).

Regeneración: `node scripts/build-map-style.mjs [paleta]` lee la
**instantánea versionada** de positron (`scripts/positron.snapshot.json`,
descargada 2026-10-08), aplica la paleta y las modificaciones de arriba y
escribe el módulo; luego `pnpm format`. El resultado es reproducible byte a
byte; `--refresh` vuelve a descargar la instantánea para revisar su diff
antes de versionarla. Las cuatro paletas candidatas (pergamino, papel,
tierra, verde) viven en el script; la vigente es **papel** (elegida por
David, 2026-10-08).

**Regla de oro (D-046):** el estilo **no dibuja números de portal ni
puntos de interés** (`housenumber`, `poi`, tampoco `mountain_peak` ni
`aerodrome_label`) — un basemap que etiqueta la puerta o el local anularía
la ubicación aproximada. Fijado por test en `tileProvider.test.ts` con una
**lista blanca** de `source-layer` y, además, **el texto solo puede salir
de `transportation_name`, `water_name`, `waterway` y `place`** (una
etiqueta sobre `building`, `landuse` o `park` nombraría un local), junto
con «una sola fuente, OpenFreeMap», «sin key/token en el estilo», «la
expresión exacta `coalesce(name:es, name:latin, name)` en toda capa con
nombre» y «sin sprite». Pérdida
asumida frente al raster OSM: no hay etiquetas de locales, metro, iglesias
ni parques — el mapa nombra calles, agua y barrios (las plazas aparecen
cuando son vía en `transportation_name`). Se probó una capa `park_label`
y se retiró: en OpenMapTiles la capa `park` contiene áreas protegidas y
bienes de interés cultural (dentro de nuestro encuadre etiquetaba un resto
de muralla y un edificio institucional, no Las Vistillas); los nombres que
usan los vecinos están en `poi`, que la regla de oro excluye.

Atribución (`src/components/map/attribution.ts`): OpenMapTiles exige su
crédito «in the corner of the map» y las guías de atribución de la OSMF
piden el de OpenStreetMap en una esquina, permitiendo plegarlo al
interactuar con el mapa o pasados cinco segundos siempre que siga siendo
localizable. El mapa usa el control compacto de MapLibre con el texto que
da el tilejson («OpenFreeMap © OpenMapTiles Data from OpenStreetMap»):
**abierto al cargar — nunca plegado de inicio —** y plegado al botón (i)
a los **5 s** o al primer movimiento del usuario (arrastre, pellizco,
rueda o doble toque; MapLibre por sí solo solo pliega al arrastrar). Los
cinco segundos cuentan **desde que el crédito está en pantalla** — el
texto llega con el tilejson, que en una red lenta puede tardar — y solo
con la pestaña visible: si se oculta, el reloj se detiene y vuelve a
contar cinco segundos completos al regresar. El pliegue ocurre **una sola
vez**: si el usuario reabre el crédito con (i), nuestro código ya no lo
vuelve a plegar. Un movimiento programático (recentrado GPS) no pliega. Medido: abierto
ocupa 351×24 px a 412 px de ancho (una línea) y 308×44 / 268×44 px a
360 / 320 px (dos líneas); plegado, 24×24 px. La licencia de
OpenMapTiles no menciona el plegado: entender que el control compacto
estándar cumple «esquina del mapa» es interpretación nuestra.

Caché (para LCHP-17): tiles, glifos y estilo pueden cachearse en runtime
(stale-while-revalidate: es uso interactivo normal, que los términos
permiten); el basemap **nunca se precachea** — por tamaño y porque los
términos prohíben la recolección automatizada. Si algún día
hay CSP: `tiles.openfreemap.org` en `connect-src` e `img-src`,
`worker-src 'self' blob:`, y la CSP solo en páginas HTML (un worker
cacheado conserva una CSP vieja durante días — lección de Alcorqueando,
2026-10-05).

Retirado con esta decisión: el tinte CSS sobre el canvas y el velo
multiply de D-045 (el color vive ahora en el estilo, los sprites de los
marcadores no necesitaban protección alguna).

### Decisión MVP original: raster OSM (verificada en LCHP-4; sustituida por LCHP-33)

Para el MVP inicial se usó:

```text
MapLibre GL JS
+
raster tiles públicos de OpenStreetMap
+
iconos propios encima
```

Esto permitía coste cero, sin cuenta y sin API key — pero sin estilo
propio y borroso en pantallas retina; OpenFreeMap no se evaluó entonces.

Evidencia del spike (2026-07-06, capturas en el ticket LCHP-4):

* La Latina renderiza correctamente en viewport móvil 412×892 (dpr 2.625):
  etiquetas nítidas, «Barrio de la Latina» legible, primera carga ~1–2 s
  con 15 tiles (~460 KB).
* Peso de librería: `maplibre-gl` 4.7.1 ≈ 211 KB JS + 9 KB CSS (gzip).
  Aceptable para móvil; cargarla solo en la ruta `/mapa` (code-splitting).
* La atribución «© OpenStreetMap contributors» es visible por defecto
  (control de atribución de MapLibre, abajo a la derecha, modo no
  compacto). No desactivarla ni taparla: es requisito de la policy.
* ~100 marcadores DOM (`maplibregl.Marker`) con animación CSS de parpadeo:
  60 fps en reposo (la animación CSS no cuesta); durante pan/zoom animado
  el reposicionamiento por frame de los marcadores DOM baja a ~20–29 fps
  en Chromium *headless sin GPU* (peor caso; en un móvil real con GPU irá
  mejor). Para el piloto (~100 avistamientos) es suficiente; si el volumen
  crece, migrar los avistamientos `approved` a una capa `symbol` con
  sprites (queda anotado en §22). **Hecho en LCHP-35** para todos los
  avistamientos; ver §18.
* Una sesión completa de prueba (carga + pan + zoom 15→17,5) consumió
  104 tiles ≈ 2 MB: el uso interactivo normal está lejísimos de cualquier
  umbral problemático.

### Límites concretos de la OSM Tile Usage Policy (verificados 2026-07-06; histórico desde LCHP-33)

> Ya no aplican al basemap (OpenFreeMap tiene sus propias condiciones,
> arriba). Se conservan como referencia por si alguna vez hubiera que
> volver al raster OSM.

Fuente: <https://operations.osmfoundation.org/policies/tiles/>. Lo que nos
aplica, en concreto:

* **URL exacta** `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, solo
  HTTPS, sin subdominios alternativos (los antiguos `a/b/c.tile...` ya no).
* **Web (nuestro caso, PWA en navegador):** el navegador ya envía
  User-Agent y Referer válidos. Lo único que podemos romper nosotros:
  **no configurar una `Referrer-Policy` restrictiva** que suprima el
  Referer hacia tile.openstreetmap.org.
* **Caché:** no enviar `Cache-Control: no-cache` / `Pragma: no-cache`;
  respetar las cabeceras del servidor (observado en vivo: `max-age` ~4 h +
  `stale-while-revalidate` 7 días + ETag). Si no se pueden leer, TTL
  mínimo de 7 días.
* **Prohibido explícitamente:** pre-seed de zonas o pilas de zoom,
  archivos de tiles (.mbtiles/.zip), botones «descargar para offline»,
  escaneos automatizados en bbox anchos (especialmente z≥14), bots
  headless que fuercen render. **Consecuencia para nuestro service worker
  (PWA):** los tiles NO se precachean; como mucho runtime caching que
  respete las cabeceras HTTP. El modo offline de la app cubre shell y
  datos, no el basemap.
* **Atribución** «© OpenStreetMap contributors» siempre visible
  (típicamente abajo a la derecha), nunca tras un toggle ni fuera de
  pantalla.
* **Sin SLA:** disponibilidad best-effort; pueden bloquear sin aviso si
  se viola la policy. No hay exención formal para proyectos pequeños,
  pero el «uso interactivo normal del viewport» es exactamente el caso
  permitido → **un piloto de barrio encaja con holgura** (ver medición de
  consumo arriba). Para campaña amplia, reevaluar (§22).
* **Post-MVP (Capacitor):** una app nativa deberá enviar un User-Agent
  propio identificando la app; hoy no aplica.

### ⚠️ Realidad de la geodata: `lalatina-geo` está en lienzo 1000×527, NO en lat/lng (crítico para LCHP-13)

`src/components/map/lalatina-geo.ts` (y su original
`docs/prototype/fuentes/assets/lalatina-geo.js`) contiene calles,
edificios, plazas y topónimos reales de La Latina **pero en coordenadas de
un lienzo de 1000×527 px** (D-016), no en coordenadas geográficas. Los
avistamientos fake del servicio mock viven en ese mismo espacio.

Qué se comprobó en el spike (ajuste afín por mínimos cuadrados con 9
plazas como anclas, coordenadas reales vía Nominatim):

* El marco del lienzo corresponde aprox. al bbox
  `lon −3,7173…−3,7068 · lat 40,4093…40,4138` (rotación ~−2,5°, escala
  ~1,12 m/px).
* El mejor ajuste afín deja **residuos de 4–39 m (RMS ~25 m)**. A z17 eso
  son >100 px de error: superpuesta sobre los tiles reales, la geometría
  del lienzo **corta edificios y se separa visiblemente de las calles**
  (captura en el ticket). **La geometría del lienzo NO puede usarse como
  capa sobre MapLibre.**

Camino de migración decidido para LCHP-13:

1. **La geometría del lienzo se retira con MapLibre.** No hace falta
   sustituirla: los tiles OSM ya pintan calles, plazas y edificios.
   `StreetMap.tsx` + `lalatina-geo.ts` viven solo mientras exista el mapa
   del prototipo y se borran al completar la migración (borrados en
   LCHP-35; el original sigue en `docs/prototype/fuentes/assets/`).
2. **Encuadre (implementado LCHP-13):** el bbox de arriba
   (`[[-3.7173, 40.4093], [-3.7068, 40.4138]]`) es el **`bounds` inicial** —
   el mapa abre encuadrado a La Latina. El **`maxBounds`** (límite de paneo)
   es el mismo bbox **+ ~1,5 km de margen**
   (`[[-3.7350, 40.3958], [-3.6891, 40.4273]]`) para que respire sin poder
   irse a otra parte de la ciudad (es un juego de barrio; David, loop visual).
3. **Los avistamientos necesitan lat/lng reales.** Los seeds/fake en
   coordenadas de lienzo se convierten una única vez con la
   transformación afín del spike — válida porque el producto muestra
   ubicación **aproximada** por diseño (§31) y ±25 m entra en esa
   tolerancia — o se re-siembran a mano sobre el mapa real. Transformación
   (lienzo → Web Mercator en metros, EPSG:3857):

   ```text
   X = 1.11953·x + 0.08583·y − 413805.14
   Y = −0.04976·x − 1.16532·y + 4926260.13
   ```

   Los avistamientos nuevos del piloto nacen ya en lat/lng.
4. **El límite del barrio para lógica de juego** (si hace falta acotar
   capturas a La Latina) debe ser un polígono GeoJSON real — dibujado a
   mano o derivado del límite administrativo de OSM —, no el marco del
   lienzo.

### `tileProvider`: un único punto que nombra el proveedor (LCHP-4; simplificado en LCHP-33)

El spike LCHP-4 dejó una unión discriminada raster | vector con un
`buildMapStyle()` que construía el estilo raster inline. Con el paso a
vector y la retirada del fallback raster (D-059) queda lo mínimo: un
objeto con el estilo, que MapLibre acepta tal cual como objeto
`StyleSpecification` o como URL.

```ts
import type { StyleSpecification } from 'maplibre-gl'
import { chisperaStyle } from './styles/chispera'

export type TileProvider = {
  id: 'openfreemap-vector'
  style: StyleSpecification | string
}

export const tileProvider: TileProvider = {
  id: 'openfreemap-vector',
  style: chisperaStyle,
}
```

Los dos mapas (`BarrioMap`, `LocationPickerMap`) leen `tileProvider.style`
y añaden el crédito con `addAttribution(map)`; ningún componente nombra al
proveedor. El estilo se vendoriza como **módulo TypeScript tipado**
(`export const chisperaStyle: StyleSpecification = {…}`), no como JSON:
el compilador valida cada capa contra la especificación de MapLibre (así
se detectó el `["linear", 1]` de positron) y no hace falta ningún cast.
Cambiar de proveedor = cambiar ese objeto.

## 22. Opciones futuras para mapas (resuelto en LCHP-33)

> **Resolución 2026-10-08 (LCHP-33, D-059):** se eligió una opción que no
> estaba en la lista — **OpenFreeMap** (vector, sin cuenta ni key, sin
> límites declarados) — porque cumple las condiciones de la opción A con
> las ventajas de la B. La opción C (tiles propios de zona limitada en
> Cloudflare) queda como vía de escape si la instancia pública de
> OpenFreeMap desapareciera; B y D se descartan. Las opciones se conservan
> como registro de la evaluación.
>
> **Nota (LCHP-4, 2026-07-06):** la elección MVP (opción A) ya está
> verificada y decidida en §21; esta sección solo queda abierta para el
> **post-MVP**. Hallazgo del spike a tener en cuenta aquí: los marcadores
> DOM reposicionan por frame durante pan/zoom (~20–29 fps con 100
> marcadores sin GPU); si el volumen de avistamientos crece mucho, la
> evolución natural es una capa `symbol` con sprites para los `approved`,
> independiente del cambio de proveedor de tiles. (Hecho en LCHP-35, §18.)

### Opción A — Mantener raster OSM temporalmente

Pros:

* coste cero;
* sin cuenta;
* rápido;
* suficiente para piloto pequeño.

Contras:

* sin estilo propio;
* raster;
* menos bonito;
* no recomendable para alto tráfico;
* dependiente de servidores públicos OSM.

Recomendación:

```text
Solo MVP/piloto pequeño.
```

### Opción B — Vector tiles con proveedor free tier

Candidatos:

```text
MapTiler
Stadia Maps
Jawg
Geoapify
Thunderforest
```

Pros:

* vector tiles;
* estilo propio;
* estética más potente;
* mejor para identidad visual;
* más control de capas;
* no abusas de OSM público;
* compatible con MapLibre.

Contras:

* requiere cuenta;
* puede requerir API key;
* free tier limitado;
* posible coste si crece.

Recomendación:

```text
Evaluar post-MVP, antes de campaña pública amplia.
```

### Opción C — Tiles propios de zona limitada en Cloudflare

Idea:

```text
Generar tiles solo de La Latina / Centro / Madrid
↓
Subirlos a Cloudflare R2 o Pages
↓
Servirlos como tiles propios
```

Pros:

* muy interesante para área pequeña;
* posible coste cero o muy bajo;
* control de estilo;
* buen encaje con Cloudflare;
* no dependes tanto de proveedor de mapas.

Contras:

* hay que generar tiles;
* hay que decidir zooms;
* hay que mantenerlos;
* más trabajo técnico;
* no debe bloquear el MVP.

Recomendación:

```text
Muy buena opción futura si el proyecto crece y se quiere mantener coste bajo.
```

### Opción D — Self-hosting/OpenMapTiles

Pros:

* control total;
* independencia;
* estilo propio completo.

Contras:

* más infraestructura;
* más mantenimiento;
* más almacenamiento;
* más complejidad;
* mala opción para MVP free-tier.

Recomendación:

```text
No usar en MVP. Evaluar solo si hay tracción y capacidad técnica.
```

## 23. Vector tiles como objetivo a medio plazo (alcanzado en LCHP-33) `Decidido`

> **Enmienda 2026-10-08 (LCHP-33):** objetivo alcanzado en el MVP con
> OpenFreeMap y el estilo `chispera` (§21). Las ventajas listadas abajo
> son ahora la descripción de lo que hay; el bloque «Decisión» queda como
> histórico.

Lo ideal a medio plazo sería usar vector tiles.

Ventajas:

* estilo propio;
* colores adaptados a la identidad visual;
* ocultar POIs innecesarios;
* reducir ruido visual;
* mapa más limpio;
* estética más gamificada;
* mejor nitidez en pantallas retina;
* más control sobre capas;
* mejor evolución hacia heatmaps y capas propias.

Decisión:

```text
MVP:
raster OSM, coste cero, sin estilo propio.
(Verificado en el spike LCHP-4 — evidencia y límites en §21.)

Código:
preparado para cambiar a vector tiles
(la abstracción tileProvider de §21 quedó validada: cambiar a vector
= pasar un styleUrl, sin tocar componentes).

Post-MVP:
evaluar proveedor vectorial con free tier o tiles propios de zona limitada.
```

## 24. Moderación: enfoque por fases

La moderación se divide en fases.

### MVP inicial (enmienda 2026-07-05)

En el MVP inicial:

```text
Todo avistamiento nuevo se crea como pending.
El mapa muestra pending (marcador de aviso) y approved — el estado siempre visible.
La validación es comunitaria: 1 confirmación de otro usuario → approved.
No hay moderación previa ni cola de moderación.
No implementar IA de moderación.
No implementar pipeline completo de análisis de imagen.
La contención del MVP es: regla de oro visible en onboarding/captura/verificación,
rate limits por usuario, y el esquema preparado (rejected/removed, reports)
para activar moderación si el piloto muestra problemas.
```

### Post-MVP

Después del MVP se podrá añadir:

```text
Turnstile obligatorio para anónimos
Rate limit
Análisis automático de imagen
Detección de contenido problemático
Blur de datos sensibles
Cola de revisión humana
Aprobación/rechazo manual por moderadores
  (recupera el principio original «moderación antes que publicación inmediata»)
Reportes comunitarios
Estados de confianza
Retirada temporal ante reportes
```

## 25. Moderación automática de imágenes post-MVP `[Explorando]`

La moderación automática no entra como requisito del MVP inicial, pero debe quedar contemplada.

Objetivos:

```text
Reducir basura enviada por usuarios anónimos.
Detectar porno, desnudez, gore o violencia.
Detectar imágenes ofensivas o claramente no válidas.
Marcar contenido dudoso para revisión humana.
Proteger a la asociación de publicar contenido problemático.
Reducir carga de moderadores.
```

La moderación automática no debe decidir si una imagen representa turistificación. Esa decisión corresponde a moderadores o a la comunidad.

### Qué debería detectar

```text
desnudez
contenido sexual
gore
violencia explícita
armas visibles
contenido ofensivo
spam visual
imágenes no fotográficas
personas visibles
caras visibles
matrículas
texto sensible
nombres en buzones o timbres
códigos visibles de cajetines
interiores de viviendas o portales
```

### Resultado normalizado

```ts
type NormalizedImageModerationResult = {
  provider:
    | 'sightengine'
    | 'google-vision'
    | 'cloudflare-ai'
    | 'manual'
    | 'unknown';

  decision:
    | 'pass'
    | 'flag'
    | 'reject'
    | 'error';

  flags: Array<
    | 'nudity'
    | 'sexual'
    | 'violence'
    | 'gore'
    | 'offensive'
    | 'face_detected'
    | 'person_detected'
    | 'license_plate'
    | 'private_text'
    | 'possible_code'
    | 'indoor_scene'
    | 'low_quality'
    | 'spam'
    | 'unknown'
  >;

  confidence?: number;
  raw?: unknown;
};
```

## 26. Opciones de moderación automática `[Explorando]`

### Opción A — Sightengine

Pros:

* API centrada en moderación;
* sencilla;
* buena para porno, desnudez, violencia, gore y contenido ofensivo;
* más directa para empezar.

Contras:

* free tier limitado;
* coste si crece;
* falsos positivos/negativos;
* no sustituye revisión humana.

Recomendación:

```text
Primera opción a evaluar post-MVP para filtrar basura evidente.
```

### Opción B — Google Vision SafeSearch

Pros:

* proveedor sólido;
* detecta adulto/violencia/racy;
* puede combinarse con OCR;
* útil si interesa detectar texto o códigos.

Contras:

* más configuración;
* puede requerir billing setup;
* menos simple que Sightengine.

Recomendación:

```text
Buena opción si se necesita OCR o detección de texto sensible.
```

### Opción C — AWS Rekognition

Pros:

* potente;
* escalable;
* buen reconocimiento visual.

Contras:

* más complejo;
* otra nube;
* posible coste;
* demasiado para MVP vecinal.

Recomendación:

```text
No prioritario.
```

### Opción D — Cloudflare Workers AI / Cloudflare stack

Pros:

* encaja con Cloudflare Pages;
* potencialmente barato;
* interesante si se migra Storage a R2.

Contras:

* más experimental;
* más arquitectura manual;
* menos directo que una API especializada.

Recomendación:

```text
Interesante si el proyecto se apoya más en Cloudflare.
```

### Opción E — open source/self-hosted

Pros:

* control total;
* sin coste por API.

Contras:

* mantenimiento;
* disponibilidad;
* seguridad;
* infraestructura;
* mala opción para máquina de casa;
* carga operativa para la asociación.

Recomendación:

```text
Descartado para MVP y fases iniciales.
```

## 27. Pipeline post-MVP de imagen `[Explorando]`

Flujo ideal post-MVP:

```text
Usuario sube imagen
↓
Turnstile
↓
Rate limit
↓
Edge Function create-sighting
↓
Validación de tamaño y MIME
↓
Procesamiento de imagen
  - resize
  - compresión
  - eliminación EXIF
  - conversión WebP/JPEG
↓
Storage privado
↓
Análisis automático
  - Sightengine o Google Vision
↓
Normalización del resultado
↓
Decisión inicial:
  - auto_rejected
  - needs_review
  - pending
↓
Revisión humana
↓
approved / rejected / removed
```

## 28. Blur y privacidad post-MVP `[Explorando]`

Elementos a ocultar:

```text
caras
personas
matrículas
nombres en buzones
apellidos en timbres
códigos visibles
interiores privados
```

Fases:

```text
Fase 1:
reglas al usuario + moderación manual

Fase 2:
detectar caras/personas y marcar needs_review

Fase 3:
blur automático de caras/matrículas

Fase 4:
OCR para texto sensible
```

El blur automático puede fallar y no sustituye revisión humana.

## 29. Turnstile y anti-abuso `[Explorando]`

Cloudflare Turnstile debe prepararse para la fase pública.

Uso recomendado:

```text
Anónimo:
Turnstile obligatorio antes de crear avistamiento

Registrado:
Turnstile si hay ritmo sospechoso

Trusted contributor:
sin Turnstile salvo abuso
```

No hace falta Turnstile para leer el mapa.

## 30. Rate limits

Límites iniciales recomendados:

```text
Usuario anónimo:
1–2 subidas/día

Usuario registrado:
5 subidas/día

Trusted contributor:
10–20 subidas/día

Reportes:
limitar por usuario y sighting

Verificaciones:
una por usuario y sighting
```

Se puede implementar inicialmente en Postgres contando acciones por usuario/día.

Evitar guardar IP cruda si no es necesario. Si se usa IP, valorar hash y retención corta.

### Prototipo verificado (spike LCHP-3 — enmienda 2026-07-06) `Decidido`

El conteo por usuario/día en Postgres se prototipó y verificó contra el
proyecto real con sesiones reales de ambos tipos:

* Trigger `BEFORE INSERT` que llama a una función `security definer`; la
  función cuenta las filas del usuario en el día (`created_at >=
  date_trunc('day', now())`) y decide la cuota según el claim del JWT:
  `coalesce((auth.jwt()->>'is_anonymous')::boolean, false)` → 2/día
  anónimo, 5/día registrado.
* Resultado observado: sesión anónima — inserciones 1 y 2 aceptadas, la
  3.ª rechazada (`400`, «daily quota exceeded: 2 of 2 used»); sesión
  registrada — 5 aceptadas, la 6.ª rechazada.
* Las políticas RLS también distinguen ambos tipos: una policy con
  `with check` sobre el mismo claim denegó (`42501`) el insert anónimo en
  una tabla solo-registrados y aceptó el registrado.

**Decisión para LCHP-12** `Decidido`: la cuota se aplica en Postgres con
**trigger `BEFORE INSERT` + función `security definer`**, no en la Edge
Function. El trigger protege la tabla por cualquier camino de entrada
(PostgREST directo o Edge Function); la Edge Function puede además
pre-comprobar la cuota para devolver un error amable, pero la fuente de
verdad es el trigger. A escala del piloto el `count(*)` por usuario/día es
trivial; basta un índice `(user_id, created_at)`.

**Implementado (migración 0005 — enmienda 2026-07-06)** `Decidido`: con
una diferencia respecto al prototipo del spike — como los inserts llegan
vía `service_role` (D-037), el claim `is_anonymous` del JWT es el del
servicio, no el del usuario; el trigger deriva la anonimia de
`auth.users.is_anonymous` para el `created_by` de la fila (D-041). Las
filas sin autor (`created_by` null: cuentas borradas, inserts
administrativos) no consumen cuota. El corte de día es medianoche UTC
(aprox. aceptable de Madrid para el piloto). Cubierto por pgTAP en CI.

## 31. Privacidad y lenguaje

Reglas visibles al usuario:

```text
No fotografíes personas.
No fotografíes interiores.
No fotografíes buzones con nombres.
No fotografíes timbres con apellidos.
No fotografíes matrículas.
No publiques códigos visibles.
Fotografía solo señales visibles desde la vía pública.
```

Lenguaje recomendado:

```text
avistamiento
señal urbana
posible acceso automatizado
pendiente de revisión
verificado por comunidad
revisado por moderación
```

Lenguaje a evitar:

```text
ilegal
culpable
propietario
denuncia este piso
lista negra
```

## 32. Free-tier first

El proyecto debe estar diseñado para coste cero inicial.

Decisiones:

```text
Cloudflare Pages para frontend.
Supabase Free para backend.
Supabase Storage privado para fotos.
Vector tiles de OpenFreeMap (sin cuenta ni key) con estilo propio (LCHP-33).
No realtime.
No push notifications.
No fotos en mapa.
No ranking avanzado inicial.
No procesamiento IA obligatorio en MVP.
No backend propio.
```

Si se acercan límites:

```text
pausar subidas;
pausar visualización de fotos;
borrar rechazadas;
mantener mapa visible.
```

### Riesgos operativos del free tier (spike LCHP-3 — enmienda 2026-07-06) `Decidido`

Comprobado de primera mano sobre el proyecto real:

* **La pausa por inactividad es real y rápida.** El proyecto se creó el
  2026-06-18, no se usó, y el 2026-07-05 estaba `INACTIVE` (pausado por el
  free tier). La política oficial: pausa tras ~1 semana sin uso.
* **Restaurar es barato**: un clic (o una llamada a la Management API) y
  ~3–5 minutos observados hasta `ACTIVE_HEALTHY`. Los datos y la
  configuración sobreviven a la pausa.
* **Ventana de 90 días**: un proyecto pausado puede restaurarse durante
  90 días; pasado ese plazo solo queda descargar el backup y los objetos
  de Storage y restaurar a mano en un proyecto nuevo.

Límites oficiales del plan Free (consultados 2026-07): 500 MB de base de
datos, 1 GB de Storage, 5 GB de egress (+5 GB cacheado), 500 000
invocaciones de Edge Functions/mes, 50 000 MAU, máximo 2 proyectos
activos.

Obligaciones operativas para el piloto:

* **Keep-alive semanal.** El uso normal de la app ya cuenta como
  actividad; para semanas muertas (vacaciones, pre-lanzamiento), un ping
  programado (p. ej. GitHub Actions cron haciendo un `select` vía
  PostgREST) evita la pausa.
* **Si se pausa, no es un drama**: restaurar tarda minutos. Lo único
  irreversible es dejar pasar los 90 días.
* **Vigilar egress**: las fotos son el único consumo con riesgo real;
  Storage privado + no mostrar fotos en el mapa ya lo mitigan.

## 33. Estructura frontend propuesta

```text
src/
  app/
    App.tsx
    router.tsx
    providers.tsx

  pages/
    HomePage.tsx
    MapPage.tsx
    CapturePage.tsx
    SightingDetailPage.tsx
    SpeciesPage.tsx
    RankingPage.tsx
    ProfilePage.tsx
    RulesPage.tsx
    AdminModerationPage.tsx

  components/
    map/
      BarrioMap.tsx
      MapMarker.tsx
      MapControls.tsx

    sightings/
      SightingDetailSheet.tsx
      CaptureForm.tsx
      PhotoEvidence.tsx
      VerificationActions.tsx

    ranking/
      WeeklyRanking.tsx
      UserRankCard.tsx

    profile/
      LevelProgress.tsx
      SpeciesProgress.tsx
      BadgesPreview.tsx

    moderation/
      ModerationQueue.tsx
      ModerationItem.tsx
      ImageModerationBadge.tsx
      ModerationFlags.tsx

    layout/
      AppShell.tsx
      BottomNav.tsx
      InstallPwaBanner.tsx

    ui/
      shadcn components

  hooks/
    useAuth.ts
    useMapSightings.ts
    useSightingDetail.ts
    useSightingPhoto.ts
    useCreateSighting.ts
    useModerationQueue.ts
    useRanking.ts
    useProfile.ts

  stores/
    map.store.ts
    ui.store.ts
    capture.store.ts

  services/
    sightings.service.ts
    species.service.ts
    moderation.service.ts
    auth.service.ts
    ranking.service.ts
    profile.service.ts

  lib/
    supabase.ts
    queryClient.ts
    map.ts
    tileProvider.ts
    image.ts
    permissions.ts
    featureFlags.ts
    points.ts

  types/
    sighting.ts
    species.ts
    moderation.ts
    profile.ts
    points.ts
    image-moderation.ts
    map.ts

  styles/
    globals.css
```

## 34. Estructura Supabase propuesta

```text
supabase/
  migrations/
    0001_initial_schema.sql          # LCHP-10 (RLS deny-all + triggers base)
    0002_seed_reference_data.sql     # LCHP-10 (species + app_config)
    0003_sighting_data_invariants.sql# LCHP-10 (CHECKs de la review adversarial)
    0004_rls_policies_and_storage.sql# LCHP-11 (políticas + vista + bucket)
    0005_sighting_daily_quota.sql    # LCHP-12 (trigger de cuota, D-032/D-041)
    0006_service_role_grants.sql     # LCHP-12 (grants explícitos, D-042)

  functions/
    api/                             # implementado en LCHP-12
      deno.json                      # imports + fmt (toolchain Deno propia)
      index.ts                       # router + CORS + auth + huecos post-MVP
      routes/
        create-sighting.ts
        get-photo-url.ts
        routes.test.ts               # contratos con Db fake, sin red
      lib/
        auth.ts                      # JWT → Caller {id, isAnonymous}
        cors.ts (+ .test.ts)
        db.ts                        # interfaz estrecha sobre service_role
        config.ts                    # app_config con caché TTL 30 s
        points.ts                    # vocabulario +10/+5 preparado (LCHP-15)
        responses.ts                 # contrato de errores (§13)
        validation.ts (+ .test.ts)   # bbox, rejilla pública, magic bytes

  tests/
    rls_policies.test.sql            # pgTAP: §12 + cuota + grants (CI)

  seed.sql
```

Post-MVP (el esqueleto original preveía `moderation.ts`, `ranking.ts`,
`analyze-image.ts`, `image-processing`, `providers/…`): siguen siendo la
referencia de la fase C/D y se añadirán a esta estructura cuando toquen.

Aunque haya una única Edge Function desplegada, el código interno está modularizado.

## 35. Testing

Usar:

```text
Vitest
React Testing Library
@testing-library/jest-dom
@testing-library/user-event
happy-dom
```

Tests prioritarios:

```text
formulario de captura;
validación de reglas;
mapa sin fotos;
detalle con foto bajo demanda;
estado pending tras crear;
lectura solo de approved;
no conceder puntos al enviar;
conceder puntos al validar;
ranking derivado de point_events;
feature flags;
permisos de UI;
normalización de resultados de moderación;
decisiones pass/flag/reject.
```

E2E opcional:

```text
Playwright
```

## 36. Roadmap MVP

### Paso 1 — Integrar maqueta

* importar/ordenar pantallas desde Claude Design;
* montar routing real;
* conservar UI y navegación;
* sustituir mocks por servicios falsos bien tipados.

### Paso 2 — Supabase básico

* crear proyecto Supabase;
* activar automatic RLS;
* crear tablas;
* crear especies seed;
* crear Storage privado;
* configurar cliente Supabase.

### Paso 3 — Mapa funcional

* MapLibre;
* raster tiles OSM temporales (sustituidos por vector tiles de OpenFreeMap
  en LCHP-33, §21);
* leer avistamientos approved;
* mostrar iconos;
* abrir detalle.

### Paso 4 — Captura funcional

* formulario;
* foto;
* ubicación;
* especie;
* crear avistamiento pending;
* guardar imagen privada;
* mostrar “puntos pendientes de validación”.

### Paso 5 — Foto bajo demanda

* botón “Ver evidencia”;
* Edge Function get-photo-url;
* signed URL temporal;
* no cargar fotos en mapa.

### Paso 6 — Verificación comunitaria (enmienda 2026-07-05)

* modal de verificación (foto bajo demanda, criatura, calle, autor);
* Confirmar (+5) · Saltar; recordatorio de la regla de oro;
* al alcanzar validation_threshold (app_config; 1 en el piloto) → approved + PointEvent +10 (autor) y +5 (verificador), en transacción server-side;
* autor no puede autovalidarse; una verificación por usuario y avistamiento;
* sin moderación ni IA.

> Referencia post-MVP: el diseño original de este paso («Moderación
> mínima/dev»: vista protegida simple, listar pending, aprobar/rechazar
> manualmente, +10 al aprobar) no se descarta — queda recogido en la
> fase D del roadmap post-MVP (§37).

### Paso 7 — Perfil/ranking básico

* total de puntos;
* nivel;
* ranking semanal simple;
* progreso por especies si no complica demasiado.

### Paso 8 — Piloto interno

* usuarios reales de la asociación;
* validar flujo en calle;
* ajustar especies;
* revisar privacidad;
* revisar coste/uso.

## 37. Roadmap post-MVP `[Explorando]`

### Fase A — Anti-abuso básico

* Turnstile en subidas anónimas;
* rate limit;
* límite de tamaño;
* validación MIME;
* borrado de rechazadas.

### Fase B — Mejora de mapas

* evaluar proveedor vectorial free tier;
* probar estilo propio;
* reducir ruido visual;
* preparar clusters/heatmap;
* evaluar tiles propios zona limitada.

### Fase C — Análisis automático simple

* integrar Sightengine o Google Vision;
* normalizar resultado;
* marcar `auto_rejected` o `needs_review`;
* guardar resultado en `auto_moderation_result`.

### Fase D — Moderación humana completa

* vista de moderación mínima: listar pending, aprobar/rechazar manualmente (el Paso 6 del diseño original del MVP);
* cola de revisión;
* filtros por flags;
* aprobar/rechazar;
* motivos de rechazo;
* reportes;
* historial de revisión.

### Fase E — Privacidad avanzada

* detección de caras/personas;
* detección de matrículas;
* OCR para texto sensible;
* blur automático;
* revisión manual de casos dudosos.

### Fase F — Optimización de costes

* thumbnails;
* borrado automático de rechazadas;
* migración opcional de imágenes a Cloudflare R2;
* tiles propios si compensa;
* métricas de uso;
* apagado de features por `app_config`.

### Fase G — Modo asociación

* bandeja avanzada;
* integración social;
* flujos de Instagram/comentarios;
* validación asistida;
* publicación de ranking del lunes;
* material compartible.

## 38. Criterio de éxito del MVP

El MVP se considera válido si:

```text
Un usuario puede abrir la app desde un QR.
Puede ver un mapa con iconos.
Puede crear un avistamiento con foto.
El avistamiento queda pending y aparece en el mapa con marcador de aviso.
No recibe puntos definitivos al enviar.
Otro usuario puede confirmarlo (verificación comunitaria, 1 confirmación).
Al validarse, se consolidan +10 al autor y +5 al verificador.
El avistamiento approved aparece en el mapa con su icono de especie.
La foto solo se carga bajo demanda.
El estado (por verificar / validado) siempre es visible en el mapa.
La app respeta la maqueta de Claude Design.
El schema deja preparada la moderación posterior (rejected/removed, reports, roles).
El mapa usa coste cero inicial y está preparado para cambiar de proveedor.
```

El criterio original «no hay publicación automática sin revisión» no se
abandona: pasa a ser el objetivo de la fase D (moderación) si el piloto
muestra que la validación comunitaria no basta.

## 39. Decisión final

Construir una app Vite/PWA simple y funcional, basada en la maqueta existente y en las reglas de [reglas-y-especificacion.md](../product/reglas-y-especificacion.md).

Para MVP se prioriza:

```text
validar el flujo;
respetar la maqueta;
coste cero;
privacidad;
mapa ligero;
subida de avistamientos;
estado pending visible en el mapa;
validación comunitaria (1 confirmación);
puntos al validar, no al enviar;
perfil/ranking básico si no bloquea;
arquitectura preparada para crecer.
```

La moderación automática, los vector tiles, el blur avanzado, los reportes completos, el modo asociación avanzado, los vídeos/redes y el empaquetado con Capacitor quedan como fases posteriores.
