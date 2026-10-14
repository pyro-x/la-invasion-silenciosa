# La Invasión Silenciosa — Reglas del juego y especificación funcional

**Cazadores de turistificación · La Latina, Madrid**
Iniciativa de la **A.V. La Chispera**

Este documento describe cómo funciona el juego (reglas, puntos, ciclo de validación) y qué hace cada pantalla de la app.

**Documentos relacionados:**
- [README del proyecto](../../README.md)
- [Brief técnico](../architecture/brief-tecnico.md)
- [Prototipo visual](../prototype/claude-design-handoff.md)

---

## 1. Concepto

Un juego de **ciencia ciudadana** gamificado: los vecinos ("exploradores urbanos") documentan las señales visibles de la turistificación del barrio, representadas como **criaturas**. Cada hallazgo validado suma puntos, sube de nivel y alimenta un mapa colectivo del fenómeno.

**Objetivo doble:**
1. **Social / activista** — visibilizar y movilizar al barrio de forma divertida y compartible.
2. **Datos** — construir un registro georreferenciado de dónde y cuánto avanza la turistificación.

---

## 2. Las criaturas (qué se documenta)

| # | Criatura | Qué es | Rareza |
|---|----------|--------|--------|
| 001 | 🔒 **Candadín** | Candado o caja de llaves instalada en la vía pública | Común |
| 002 | 🏚️ **Turistox** | Edificio con actividad turística observable desde el espacio público | Frecuente |
| 003 | 🤖 **Checkinchu** | Punto de acceso automatizado (pantalla / terminal de auto check-in) | Raro |
| 004 | 🔑 **Keymon** | Vivienda turística completa operando en el barrio | Legendario |
| 005 | 🏪 **Localín** | Antiguo local comercial a pie de calle convertido en alojamiento turístico o de corta estancia | Frecuente |

Cada criatura tiene una **ficha** (Pokédex) con: qué es, hábitat, pista de rastreo, rareza y progreso de capturas.

### 005 · 🏪 Localín

Incorporada en octubre de 2026 (D-066). Las cuatro especies anteriores y sus avistamientos no cambian.

**Qué es:** antiguo local comercial a pie de calle —por ejemplo, una panadería, una ferretería o una tienda de barrio— convertido en alojamiento turístico o de corta estancia para visitantes, independientemente de la plataforma que lo anuncie.

**Descripción de la ficha:** «Donde antes había una panadería, una ferretería o una tienda de barrio, ahora hay maletas. Localín habita antiguos locales comerciales a pie de calle convertidos en alojamientos turísticos.»

**Descripción corta (listado de especies y ficha del avistamiento en el mapa):** «Antiguo comercio de barrio convertido en alojamiento turístico.» La ficha de detalle de la especie muestra la descripción completa.

**Hábitat:** «Bajos comerciales que antes albergaban negocios del barrio.»

**Pista de rastreo:** «Tienen que cumplirse dos cosas: que antes fuera un comercio del barrio y que hoy aloje visitantes. Estar en un bajo, tener la persiana echada o un candado no basta.»

**Rareza:** frecuente. **Puntos:** los mismos que el resto de criaturas (§4); no tiene bonificación propia.

**Diseño:** opción 01, «El toldo»: fachada verde con toldo de franjas amarillas y crema, contorno oscuro y cuadrícula de 12 × 13 píxeles, como las criaturas existentes. [Sprite y paleta](../prototype/localin/localin-approved.json) · [Vista ampliada](../prototype/localin/localin-preview.png).

**Criterio de clasificación:** debe poder establecerse tanto el uso comercial anterior como el uso turístico actual. Estar en una planta baja, tener la persiana cerrada o mostrar un candado no basta para identificar un Localín. Cuando se cumplen ambos criterios, Localín es la categoría específica frente a Keymon; no se registra el mismo alojamiento como ambas especies por ese único hecho. No incluye alquileres residenciales ordinarios por el mero hecho de ser temporales.

Se aplica la misma regla de oro (§3.1) y el mismo ciclo de validación comunitaria que al resto de criaturas.

---

## 3. Reglas del juego

### 3.1. Regla de oro (privacidad) — INNEGOCIABLE
Se documentan **criaturas, nunca personas**. Está prohibido fotografiar:
- Huéspedes, porteros, vecinos o trabajadores.
- Información privada (nombres, timbres con datos, documentos).
- Matrículas de vehículos.

La app recuerda esta regla en el onboarding, en el flujo de captura y en la bandeja de validación. Cualquier registro que la incumpla debe descartarse.

### 3.2. Cómo se juega (bucle principal)
1. **Explora** el barrio con la app abierta: el mapa te sigue mientras caminas.
2. **Caza** una criatura: haz una foto (solo del objeto/edificio).
3. **Registra** el avistamiento: foto + ubicación aproximada + categoría.
4. **Envía** → queda **pendiente de validación**.
5. La **comunidad verifica** el avistamiento → se valida → sumas los puntos.
6. También puedes **verificar** hallazgos de otros y **subir vídeos** para redes.

**Se juega en la calle, donde estás.** Una criatura solo se registra estando
junto a ella (a menos de **50 m**), y solo se verifica estando cerca de donde
aparece en el mapa (a menos de **85 m**: los 50 m más el margen de la
ubicación aproximada). Desde casa se puede mirar el mapa y ver las pruebas,
pero no cazar ni verificar. Si el móvil da una posición poco precisa (peor
que ± 150 m), tampoco: la app lo dice y explica cómo arreglarlo. Tu posición
se usa solo en tu móvil para estas comprobaciones; no se envía ni se guarda.

### 3.3. Qué debe contener cada avistamiento
- **Foto** de la criatura (sin personas ni datos privados).
- **Ubicación aproximada** (por privacidad, no se guarda la posición exacta).
- **Categoría** (Candadín / Turistox / Checkinchu / Keymon / Localín).

---

## 4. Sistema de puntos

| Acción | Puntos |
|--------|:------:|
| Nueva observación **validada** | **+10** |
| **Verificación** de otro usuario | **+5** |
| **Vídeo** para redes | **+10** | (a evaluar post MVP, ahora mismo no hay videos)

> Una observación **enviada** queda *pendiente*; los +10 se consolidan cuando la comunidad la **valida**. La verificación (+5) premia a quien confirma el hallazgo de otro vecino.

### 4.1. Niveles

| Nivel | Rango de puntos | Rango |
|:-----:|:---------------:|-------|
| 1 | 0 – 30 | **Explorador** |
| 2 | 31 – 60 | **Rastreador** |
| 3 | 61+ | **Cartógrafo** |

### 4.2. Premios
- **Insignias** por hitos (primer hallazgo, 10 Candadines, verificador ×5, vídeo viral, cazar un Keymon, dex al 50%, ronda nocturna, cartógrafo…).
- **Certificado humorístico** "Explorador del Mes", sellado por la A.V. La Chispera.

---

## 5. Ciclo de avistamiento y verificación (estados)

```
        [ Caza + registro ]
                 │
                 ▼
          ● PENDIENTE ──────────────┐
                 │                   │
      (otro vecino verifica +5)      │ (se descarta si
                 │                   │  incumple la regla
                 ▼                   │  de oro)
          ● VALIDADO (+10 al autor)  ▼
                 │              ✕ DESCARTADO
                 ▼
        aparece en el mapa,
        cuenta para nivel y ranking
```

- **Pendiente:** recién enviado; se muestra con marcador de aviso (parpadea en el mapa) y aparece en "Cerca de ti · por verificar".
- **Verificar es haberlo visto allí:** quien confirma tiene que estar cerca de la criatura (ver §3.2). Verificar no es opinar sobre una foto desde lejos.
- **Validado:** confirmado por la comunidad; suma al autor y pesa más en el mapa de calor.
- **Descartado:** incumple la regla de oro o es erróneo; puede reclasificarse a otra criatura antes de descartar.

---

## 6. Pantallas (arquitectura de la app)

Navegación por **barra inferior** de 5 destinos, con el botón central (Cazar) destacado:
`Mapa · Especies · [Cazar] · Ranking · Perfil`.

### 0 · Inicio (Press Start)
- **Qué hace:** pantalla de arranque con el emblema de La Chispera y botón "Empezar la misión".
- **Función técnica:** en móvil, ese toque activa la **pantalla completa**.

### 1 · Onboarding
- **Qué hace:** presenta la misión (locución de bienvenida) con las cinco criaturas en la cabecera, el guiño a las chisperas de 1808, la **regla de oro** y el sello de la asociación.
- **Comportamiento:** se muestra solo la **primera vez** (se recuerda en el dispositivo). Forzable con `?onboarding=1` o desde Tweaks.

### 2 · Mapa
- **Contenido:** cartografía real de La Latina (OpenStreetMap) con los **avistamientos anclados a calles reales**; leyenda de las 5 criaturas.
- **Interacciones:**
  - Toggle **Avistamientos / Mapa de calor**.
  - Tocar un pin → ficha rápida (criatura, calle, autor, estado); si está pendiente, botón **Verificar**.
  - Lista **"Cerca de ti · por verificar"** con scroll propio (el mapa queda fijo y se adapta a la altura disponible), **ordenada por distancia a ti**, con la distancia en cada fila («a 80 m · hace 35 min»). Sin posición se ordena por fecha y se titula «En el barrio».
  - **El mapa te sigue:** se abre sobre tu posición, a nivel de calle, y se mueve contigo. Si lo arrastras para mirar otra zona deja de seguirte, y vuelve solo cuando llevas un rato sin tocarlo y te has alejado más de 85 m del centro del mapa (nunca mientras tengas una ficha abierta). Alrededor de tu punto se dibuja el círculo dentro del cual puedes verificar, y junto al título la precisión de tu posición («± 12 m»; «Posición de hace 3 min» si es antigua).
  - **Sin posición el mapa la pide**, nunca al cargar por su cuenta: «Para jugar, el mapa tiene que saber dónde estás.» + **Usar mi ubicación**. Quien solo quiera mirar puede cerrar el aviso.
  - Tocar una fila o un pin lejano **lleva el mapa hasta él**, pero **Verificar** solo se ofrece dentro del radio; fuera, la ficha dice por qué («Está a 400 m de ti. Acércate a menos de 85 m para verificar.»). **Ver evidencia** funciona desde cualquier sitio.
  - Fuera de La Latina se puede mirar, no jugar: «Estás fuera de La Latina: puedes mirar el mapa, pero para cazar o verificar hay que estar en el barrio.»
- **Mapa de calor:** densidad real — cada avistamiento es un foco que se intensifica (amarillo → naranja → rojo) donde se solapan. Cuentan todos, también los pendientes; los validados pesan más.

### 3 · Especies (Pokédex)
- **Contenido:** listado de las 5 criaturas con número, nombre, descripción, rareza y progreso (capturadas / total).
- **Ficha de detalle:** sprite grande, qué es, hábitat, pista de rastreo, rareza y puntos que otorga.

### 4 · Cazar / Registrar (botón central)
**La puerta:** al entrar, la app necesita la cámara y tu ubicación. Si falta alguna, una pantalla lo explica («¡Prepara tu equipo!») y un solo toque pide las dos; el permiso nunca se pide al cargar. Si eres tú quien la pide con ese toque, la app espera la respuesta antes de seguir; si el navegador ya la tenía concedida de otra vez, el flujo sigue mientras el móvil la busca y el paso 3 espera a tenerla. **Sin ubicación no se puede cazar:** si la deniegas, la app explica cómo activarla y te deja volver al mapa. Sin cámara sí se puede seguir (cámara del sistema o galería).

Flujo de **4 pasos**:
1. **Captura** — visor de cámara + recordatorio de privacidad → disparar / repetir / usar foto.
2. **Identificar** — elegir la especie (Candadín / Turistox / Checkinchu / Keymon / Localín).
3. **¿Dónde está la criatura?** — el mapa ocupa la pantalla, abre centrado en tu posición y te sigue mientras te mueves; el pin es la mira fija en el centro («Por privacidad, en el mapa solo se muestra una ubicación aproximada»). **Hace falta tu posición:** el pin se puede ajustar a mano moviendo el mapa —arrastrándolo, pellizcándolo o con la rueda— (en cuanto lo mueves deja de seguirte, hasta que pulses «Volver a mi posición»; un simple toque no cambia nada), pero solo a menos de 50 m de donde estás («Ese punto está a 120 m de ti. El máximo son 50 m.»). Sin posición, con una poco precisa, o con el mapa tan alejado que no se ve la calle, no se puede continuar; si te alejas con el paso abierto, la app te lo dice en el momento.
4. **Revisar y enviar** — resumen (foto, especie, ubicación, estado pendiente) → enviar.
- **Salida:** pantalla de éxito con **+10 pts pendientes de validación** y vuelta al mapa; el avistamiento queda **pendiente**. Los puntos se consolidan solo cuando se valida.

### 5 · Ranking
- **Contenido:** **Top 10 semanal** con podio (1-2-3) y lista 4–10; el usuario propio aparece resaltado en su posición.
- **Redes:** el top 10 se publica cada lunes; incentiva subir vídeos.

### 6 · Perfil
- **Contenido:** alias, **nivel** (Explorador/Rastreador/Cartógrafo) con **barra de progreso** al siguiente nivel, puntos totales y posición semanal.
- **Stats:** observaciones validadas (+10), verificaciones aceptadas (+5), vídeos (+10).
- **Capturas por especie:** progreso por cada criatura.
- **Insignias** y **certificado "Explorador del Mes"** sellado.
- **Acceso al "Modo asociación".**
- **Recordatorio** de cómo se suman los puntos.

### 7 · Verificación (modal)
- **Qué hace:** muestra el avistamiento de otro vecino (foto, criatura, calle, autor) y pregunta si está bien clasificado.
- **Acciones:** **Confirmar (+5)** · Reclasificar · Saltar.
- **Recordatorio:** comprobar que no aparezcan personas ni datos privados.
- **Solo se abre estando cerca** de la criatura (§3.2).

### 8 · Pantalla de error y dirección desconocida
- **Qué hace:** si una pantalla falla al dibujarse, el vecino ve una pantalla propia de la app, nunca el volcado técnico del error. Si la pantalla que falla es una de las de la barra inferior, la barra sigue ahí y se puede salir por cualquiera de sus destinos.
- **Contenido (fallo inesperado):** una criatura «con interferencias», el aviso «Algo ha fallado», el título «Se nos ha colado un bicho», el texto «Este no sale en el catálogo: es un fallo de la app, no tuyo. Prueba otra vez o vuelve al mapa.». Nada técnico a la vista: ni el mensaje del error ni ningún código.
- **Acciones:** **Reintentar** (vuelve a dibujar la pantalla, sin recargar la página) · **Volver al mapa**. Si la que ha fallado es el propio mapa, la segunda acción es **Ir al inicio**.
- **Dirección desconocida:** una silueta vacía con ojos, «Página no encontrada», «Aquí no hay ninguna criatura», «Esta dirección no existe o ha cambiado de sitio. En el mapa sí hay rastro.» y **Volver al mapa**. Sin Reintentar.
- **Código del fallo:** la app calcula un código corto para cada fallo (el mismo fallo en la misma versión da el mismo código), pero **no se enseña en pantalla**: hoy no hay dónde consultarlo. Queda en el registro técnico del dispositivo y volverá a la pantalla cuando exista un sitio donde buscarlo. No identifica al vecino ni su ubicación, y no se envía a ningún sitio.
- Textos y dibujos propuestos en LCHP-52, pendientes del visto bueno de David.

### + Modo asociación (herramienta interna) (POST - VMP)
Panel para la organización, con dos pestañas:
- **Instagram** — feed simulado de @avlachispera (criatura de la semana, ranking del lunes, mapa de calor) donde el vecino participa **comentando la calle** (sin instalar nada).
- **Bandeja** — convierte esos comentarios en **avistamientos validados**, detecta criatura + calle, marca posibles datos privados y **da los puntos al @usuario**. Acciones: Validar (+10) · Reclasificar · Descartar.

---



---

*A.V. La Chispera · La Latina, Madrid — documento de reglas y especificación funcional del prototipo.*
