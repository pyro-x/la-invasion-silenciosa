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

Cada criatura tiene una **ficha** (Pokédex) con: qué es, hábitat, pista de rastreo, rareza y progreso de capturas.

---

## 3. Reglas del juego

### 3.1. Regla de oro (privacidad) — INNEGOCIABLE
Se documentan **criaturas, nunca personas**. Está prohibido fotografiar:
- Huéspedes, porteros, vecinos o trabajadores.
- Información privada (nombres, timbres con datos, documentos).
- Matrículas de vehículos.

La app recuerda esta regla en el onboarding, en el flujo de captura y en la bandeja de validación. Cualquier registro que la incumpla debe descartarse.

### 3.2. Cómo se juega (bucle principal)
1. **Explora** el barrio con la app abierta.
2. **Caza** una criatura: haz una foto (solo del objeto/edificio).
3. **Registra** el avistamiento: foto + ubicación aproximada + categoría.
4. **Envía** → queda **pendiente de validación**.
5. La **comunidad verifica** el avistamiento → se valida → sumas los puntos.
6. También puedes **verificar** hallazgos de otros y **subir vídeos** para redes.

### 3.3. Qué debe contener cada avistamiento
- **Foto** de la criatura (sin personas ni datos privados).
- **Ubicación aproximada** (por privacidad, no se guarda la posición exacta).
- **Categoría** (Candadín / Turistox / Checkinchu / Keymon).

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
- **Validado:** confirmado por la comunidad; suma al autor y se integra en el mapa de calor.
- **Descartado:** incumple la regla de oro o es erróneo; puede reclasificarse a otra criatura antes de descartar.

---

## 6. Pantallas (arquitectura de la app)

Navegación por **barra inferior** de 5 destinos, con el botón central (Cazar) destacado:
`Mapa · Especies · [Cazar] · Ranking · Perfil`.

### 0 · Inicio (Press Start)
- **Qué hace:** pantalla de arranque con el emblema de La Chispera y botón "Empezar la misión".
- **Función técnica:** en móvil, ese toque activa la **pantalla completa**.

### 1 · Onboarding
- **Qué hace:** presenta la misión (locución de bienvenida), el guiño a las chisperas de 1808, la **regla de oro** y el sello de la asociación.
- **Comportamiento:** se muestra solo la **primera vez** (se recuerda en el dispositivo). Forzable con `?onboarding=1` o desde Tweaks.

### 2 · Mapa
- **Contenido:** cartografía real de La Latina (OpenStreetMap) con los **avistamientos anclados a calles reales**; leyenda de las 4 criaturas.
- **Interacciones:**
  - Toggle **Avistamientos / Mapa de calor**.
  - Tocar un pin → ficha rápida (criatura, calle, autor, estado); si está pendiente, botón **Verificar**.
  - Lista **"Cerca de ti · por verificar"** con scroll propio (el mapa queda fijo y se adapta a la altura disponible).
- **Mapa de calor:** densidad real — cada avistamiento es un foco que se intensifica (amarillo → naranja → rojo) donde se solapan.

### 3 · Especies (Pokédex)
- **Contenido:** listado de las 4 criaturas con número, nombre, descripción, rareza y progreso (capturadas / total).
- **Ficha de detalle:** sprite grande, qué es, hábitat, pista de rastreo, rareza y puntos que otorga.

### 4 · Cazar / Registrar (botón central)
Flujo de **4 pasos**:
1. **Captura** — visor de cámara + recordatorio de privacidad → disparar / repetir / usar foto.
2. **Identificar** — elegir la especie (Candadín / Turistox / Checkinchu / Keymon).
3. **Ubicación** — mapa con ubicación aproximada + toggle de privacidad ("solo guardamos ubicación aproximada").
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

### + Modo asociación (herramienta interna) (POST - VMP)
Panel para la organización, con dos pestañas:
- **Instagram** — feed simulado de @avlachispera (criatura de la semana, ranking del lunes, mapa de calor) donde el vecino participa **comentando la calle** (sin instalar nada).
- **Bandeja** — convierte esos comentarios en **avistamientos validados**, detecta criatura + calle, marca posibles datos privados y **da los puntos al @usuario**. Acciones: Validar (+10) · Reclasificar · Descartar.

---



---

*A.V. La Chispera · La Latina, Madrid — documento de reglas y especificación funcional del prototipo.*
