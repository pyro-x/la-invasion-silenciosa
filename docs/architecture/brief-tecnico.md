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

La app debe respetar la maqueta de Claude Design.

Prioridades:

* conservar estructura de pantallas;
* conservar navegación;
* conservar tono visual;
* conservar conceptos de criaturas/avistamientos;
* mantener carácter gamificado;
* no rediseñar sin motivo;
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

Activar automatic RLS.

Regla general:

```text
Todo bloqueado por defecto.
Solo se abre lo necesario.
```

Lecturas directas desde frontend permitidas:

* especies activas;
* avistamientos `pending` y `approved` para el mapa (el estado siempre visible; enmienda 2026-07-05);
* detalle público de avistamiento `pending` o `approved`;
* perfil propio básico.

No devolver nunca en vistas públicas:

* `photo_path`;
* `lat_private`;
* `lng_private`;
* `created_by`;
* `reviewed_by`;
* `auto_moderation_result`;
* `rejection_reason`;
* datos internos de moderación.

Se recomienda crear una view o RPC pública para el mapa:

```ts
type PublicMapSighting = {
  id: string;
  species_id: string;
  lat_public: number;
  lng_public: number;
  status: 'pending' | 'approved';
  confidence: string;
  verification_count: number;
  created_at: string;
};
```

## 13. Edge Function única

Para evitar complejidad, se usará una única Edge Function tipo API router:

```text
supabase/functions/api/index.ts
```

Endpoints previstos:

```text
POST /create-sighting
POST /get-photo-url
POST /report-sighting
POST /verify-sighting
POST /moderation/approve
POST /moderation/reject
POST /moderation/remove
POST /moderation/analyze-image
POST /admin/update-config
```

En el MVP inicial solo hacen falta (enmienda 2026-07-05):

```text
POST /create-sighting
POST /get-photo-url
POST /verify-sighting
```

Las rutas `moderation/*`, `report-sighting` y `admin/*` quedan previstas
para post-MVP; el router deja el hueco pero no las implementa.

### Pros de una única Edge Function

* menos despliegues;
* más simple para MVP;
* permite usar secrets privados;
* evita meter Next.js solo para tener backend;
* mantiene bajo mantenimiento.

### Contras

* puede crecer demasiado si no se modulariza;
* requiere routing interno;
* quizá en el futuro convenga separarla.

### Decisión

Usar una única Edge Function en MVP, pero modularizar internamente.

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

Reglas de la verificación (enmienda 2026-07-05):

```text
El autor no puede verificar su propio avistamiento.
Un usuario solo puede verificar cada avistamiento una vez.
El umbral de confirmaciones para validar vive en app_config
(validation_threshold); para el piloto es 1.
Cuando verification_count alcanza el umbral → pending → approved.
Las transiciones de estado y los PointEvent se crean SOLO server-side.
```

Referencia post-MVP (diseño original, a retomar si hace falta más robustez):

```text
Subir validation_threshold (p. ej. a 3, como sugieren los datos seed de
la maqueta — los validados tienen 3-6 votes) es solo un cambio de
configuración: sin migración, sin despliegue, sin tocar código.
Además, las verificaciones podrán tener estado propio
(verification.status = pending o accepted según reglas), con aceptación
diferida; el PointEvent verification_accepted se crearía solo al
aceptarse la verificación, no al emitirse.
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
* enviar contenido siempre como `pending`.

No puede:

* publicar directamente;
* moderar;
* hacer acciones masivas;
* aprobar contenido.

### Usuario registrado

Puede:

* crear más avistamientos;
* verificar/reportar;
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

## 18. Flujo de mapa

```text
Usuario abre mapa
↓
La app carga solo avistamientos approved
↓
Se muestran iconos por especie
↓
No se cargan fotos
↓
Usuario pulsa icono
↓
Se abre bottom sheet/detalle
↓
Puede pedir ver evidencia
↓
Solo entonces se solicita signed URL
```

La foto es evidencia bajo demanda, no contenido principal del mapa.

## 19. Flujo de captura

```text
Usuario pulsa “Cazar”
↓
Lee/acepta reglas básicas
↓
Hace o selecciona foto
↓
Elige especie
↓
Obtiene ubicación aproximada
↓
Envía a Edge Function /create-sighting
↓
Se guarda imagen privada
↓
Se crea sighting con moderation_status = pending
↓
Se muestra confirmación:
“Avistamiento enviado · +10 puntos pendientes de validación”
```

El avistamiento no aparece automáticamente en el mapa público hasta pasar a `approved`.

## 20. Flujo de validación (comunitaria — enmienda 2026-07-05)

```text
Avistamiento pending (ya visible en el mapa con marcador de aviso)
↓
Otro vecino lo confirma desde el modal de verificación
(al alcanzar validation_threshold — 1 en el piloto)
↓
Avistamiento pasa a approved
↓
Se crea PointEvent +10 para el autor y +5 para el verificador
↓
El pin deja de parpadear (pasa a icono de especie normal)
↓
Cuenta para ranking, perfil y progreso
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

## 21. Mapas: MapLibre, OSM y tiles

> **Enmienda 2026-07-06 (spike LCHP-4):** la combinación MapLibre GL JS +
> raster OSM quedó **verificada con evidencia** (página desechable +
> Playwright, viewport móvil 412×892 @2.625x). Esta sección pasa de
> propuesta a **`Decidido` verificado**; se añaden los límites concretos
> de la Tile Usage Policy, el hallazgo crítico sobre la geodata del
> prototipo (lienzo, no lat/lng) y la forma final de la abstracción
> `tileProvider`. Quien implemente **LCHP-13** debe leer esta sección
> entera antes de escribir código.

### Decisión MVP (verificada en LCHP-4)

Para el MVP inicial se usará:

```text
MapLibre GL JS
+
raster tiles públicos de OpenStreetMap
+
iconos propios encima
```

Esto permite coste cero, sin cuenta y sin API key.

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
  sprites (queda anotado en §22).
* Una sesión completa de prueba (carga + pan + zoom 15→17,5) consumió
  104 tiles ≈ 2 MB: el uso interactivo normal está lejísimos de cualquier
  umbral problemático.

### Límites concretos de la OSM Tile Usage Policy (verificados 2026-07-06)

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
   del prototipo y se borran al completar la migración.
2. **Encuadre:** usar el bbox de arriba como `bounds` iniciales /
   `maxBounds` del mapa
   (`[[-3.7173, 40.4093], [-3.7068, 40.4138]]`).
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

### Abstracción `tileProvider` (validada en LCHP-4)

El boceto original mapeaba bien sobre MapLibre; la forma final corrige un
detalle: un estilo vectorial es una **URL que se pasa tal cual** a
`new Map({ style })`, mientras que raster exige construir un estilo JSON
inline (source `type: 'raster'` + una capa `raster`). Una unión
discriminada evita los campos huérfanos (`styleUrl: undefined`):

```ts
import type { StyleSpecification } from 'maplibre-gl'

export type TileProviderId =
  | 'osm-raster'
  | 'maptiler-vector'
  | 'stadia-vector'
  | 'custom-vector'

export type TileProviderConfig =
  | {
      id: TileProviderId
      kind: 'raster'
      tiles: string[]
      tileSize: 256
      maxzoom: number
      attribution: string
    }
  | { id: TileProviderId; kind: 'vector'; styleUrl: string }

export const tileProvider: TileProviderConfig = {
  id: 'osm-raster',
  kind: 'raster',
  tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
  tileSize: 256,
  maxzoom: 19,
  attribution: '© OpenStreetMap contributors',
}

export function buildMapStyle(cfg: TileProviderConfig): string | StyleSpecification {
  if (cfg.kind === 'vector') return cfg.styleUrl
  return {
    version: 8,
    sources: {
      basemap: {
        type: 'raster',
        tiles: cfg.tiles,
        tileSize: cfg.tileSize,
        maxzoom: cfg.maxzoom,
        attribution: cfg.attribution,
      },
    },
    layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }],
  }
}
```

Este `buildMapStyle` exacto se usó en la página del spike y renderiza sin
ajustes. Cambiar a vector post-MVP = cambiar el objeto de config; ningún
componente toca el proveedor. No hardcodear el proveedor en varios
componentes.

## 22. Opciones futuras para mapas `[Explorando]`

> **Nota (LCHP-4, 2026-07-06):** la elección MVP (opción A) ya está
> verificada y decidida en §21; esta sección solo queda abierta para el
> **post-MVP**. Hallazgo del spike a tener en cuenta aquí: los marcadores
> DOM reposicionan por frame durante pan/zoom (~20–29 fps con 100
> marcadores sin GPU); si el volumen de avistamientos crece mucho, la
> evolución natural es una capa `symbol` con sprites para los `approved`,
> independiente del cambio de proveedor de tiles.

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

## 23. Vector tiles como objetivo a medio plazo `[Explorando]`

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
OSM raster tiles para MVP pequeño.
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
    0001_initial_schema.sql          # LCHP-10 (incluye RLS deny-all)
    0002_seed_reference_data.sql     # LCHP-10 (species + app_config)
    0003_rls_policies.sql            # LCHP-11
    0004_storage_policies.sql        # LCHP-11
    0005_points_and_ranking.sql
    0006_image_moderation_optional.sql

  functions/
    api/
      index.ts
      routes/
        create-sighting.ts
        get-photo-url.ts
        moderation.ts
        verification.ts
        ranking.ts
        analyze-image.ts
      lib/
        auth.ts
        cors.ts
        rate-limit.ts
        supabase-admin.ts
        validation.ts
        storage.ts
        points.ts
        image-processing.ts
        image-moderation.ts
        providers/
          sightengine.ts
          google-vision.ts
          cloudflare-ai.ts

  seed.sql
```

Aunque haya una única Edge Function desplegada, el código interno puede estar modularizado.

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
* raster tiles OSM temporales;
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
