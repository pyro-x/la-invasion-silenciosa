window.ASSET = function(p, id){ return (window.__resources && window.__resources[id]) || p; };
// data.jsx — contenido del juego: criaturas, avistamientos, ranking, insignias, i18n
// Exporta a window: I18N, t-strings via SIL.t(), LEVELS, CREATURES, SIGHTINGS, RANKING, BADGES, PROFILE

// ---------- NIVELES ----------
const LEVELS = [
  { id: 1, key: 'explorador', min: 0,  max: 30 },
  { id: 2, key: 'rastreador', min: 31, max: 60 },
  { id: 3, key: 'cartografo', min: 61, max: 9999 },
];

function levelFor(points) {
  return LEVELS.find(l => points >= l.min && points <= l.max) || LEVELS[LEVELS.length - 1];
}

// ---------- CRIATURAS ----------
// sprite: nombre de grid en SPRITES (pixel.jsx). hue: color principal del sprite.
const CREATURES = [
  {
    id: 'candadin', sprite: 'candadin', dex: '001',
    name: 'CANDADÍN', rarity: 'común',
    es: { what: 'Candado o caja de llaves instalada en la vía pública.',
          habitat: 'Rejas, farolas, vallas y portales del barrio.',
          tip: 'Suelen aparecer en racimos cerca de pisos turísticos.' },
    en: { what: 'A padlock or key-box bolted onto public street furniture.',
          habitat: 'Railings, lampposts, fences and doorways.',
          tip: 'Often cluster near short-let flats.' },
    palette: { K: '#241a2e', B: '#f5b62e', D: '#c8881a', L: '#ffe39a' },
    found: 7, total: 12,
  },
  {
    id: 'turistox', sprite: 'turistox', dex: '002',
    name: 'TURISTOX', rarity: 'frecuente',
    es: { what: 'Edificio con actividad turística observable desde el espacio público.',
          habitat: 'Calles principales y plazas con mucho trasiego de maletas.',
          tip: 'Mira los balcones: cajas de luz, llaveros y carteles de bienvenida.' },
    en: { what: 'A building with tourist activity visible from public space.',
          habitat: 'Main streets and squares full of rolling suitcases.',
          tip: 'Check the balconies for lockboxes and welcome signs.' },
    palette: { K: '#241a2e', B: '#e23b3b', D: '#a01f1f', L: '#ffd6d6', W: '#fff7ea', P: '#241a2e', A: '#2ee6ff' },
    found: 5, total: 10,
  },
  {
    id: 'checkinchu', sprite: 'checkinchu', dex: '003',
    name: 'CHECKINCHU', rarity: 'raro',
    es: { what: 'Punto de acceso automatizado: pantalla o terminal de auto check-in.',
          habitat: 'Zaguanes, recepciones sin personal y locales reconvertidos.',
          tip: 'Brilla de noche. No fotografíes a quien lo esté usando.' },
    en: { what: 'An automated access point: a self check-in screen or terminal.',
          habitat: 'Hallways, staffless lobbies and converted shopfronts.',
          tip: 'It glows at night. Never photograph anyone using it.' },
    palette: { K: '#241a2e', B: '#29c5d6', D: '#1b8a96', L: '#bff4fa', W: '#fff7ea', P: '#241a2e', A: '#ff2e88' },
    found: 2, total: 8,
  },
  {
    id: 'keymon', sprite: 'keymon', dex: '004',
    name: 'KEYMON', rarity: 'legendario',
    es: { what: 'Vivienda turística completa operando en el barrio.',
          habitat: 'Plantas enteras de edificios antaño de vecinos.',
          tip: 'El hallazgo más valioso. Confirma con la caja de llaves cercana.' },
    en: { what: 'A whole dwelling running as a short-term tourist let.',
          habitat: 'Entire floors of once-residential buildings.',
          tip: 'The most valuable find. Confirm with a nearby key-box.' },
    palette: { K: '#241a2e', B: '#9b6cf0', D: '#6a3fc0', L: '#e0d2ff', W: '#fff7ea', P: '#241a2e' },
    found: 1, total: 6,
  },
];

const CREATURE_BY_ID = Object.fromEntries(CREATURES.map(c => [c.id, c]));

// ---------- AVISTAMIENTOS (mapa + feed + verificación) ----------
// x,y en % sobre el lienzo del mapa estilizado. status: validado | pendiente
const SIGHTINGS = [
  { id: 'A-204', cr: 'candadin',  x: 660, y: 221, where: 'Cava Baja, 12',           user: 'lola_rastrea', when: 'hace 2 h',  status: 'validado',  votes: 4 },
  { id: 'A-209', cr: 'keymon',    x: 710, y: 116, where: 'Calle del Almendro',       user: 'el_vecino_z',  when: 'hace 4 h',  status: 'validado',  votes: 6 },
  { id: 'A-211', cr: 'turistox',  x: 560, y: 84,  where: 'Plaza de la Paja',         user: 'mapache_42',   when: 'hace 5 h',  status: 'validado',  votes: 3 },
  { id: 'A-215', cr: 'checkinchu',x: 850, y: 311, where: 'Calle de Toledo, 30',      user: 'pyroxine',     when: 'hace 1 d',  status: 'validado',  votes: 5 },
  { id: 'A-220', cr: 'candadin',  x: 570, y: 274, where: 'Plaza de los Carros',      user: 'rosa_lat',     when: 'hace 20 m', status: 'pendiente', votes: 1 },
  { id: 'A-221', cr: 'turistox',  x: 960, y: 321, where: 'Plaza de Cascorro',        user: 'curro88',      when: 'hace 35 m', status: 'pendiente', votes: 0 },
  { id: 'A-223', cr: 'keymon',    x: 660, y: 248, where: 'Cava Alta, 7',             user: 'marta_v',      when: 'hace 1 h',  status: 'pendiente', votes: 2 },
];

// ---------- RANKING SEMANAL ----------
const RANKING = [
  { rank: 1, user: 'el_vecino_z',  pts: 145, lvl: 3, color: '#ff2e88' },
  { rank: 2, user: 'lola_rastrea', pts: 132, lvl: 3, color: '#2ee6ff' },
  { rank: 3, user: 'mapache_42',   pts: 98,  lvl: 3, color: '#c6ff3d' },
  { rank: 4, user: 'curro88',      pts: 71,  lvl: 3, color: '#9b6cf0' },
  { rank: 5, user: 'rosa_lat',     pts: 60,  lvl: 2, color: '#f5b62e' },
  { rank: 6, user: 'pyroxine',     pts: 45,  lvl: 2, color: '#e23b3b', me: true },
  { rank: 7, user: 'marta_v',      pts: 38,  lvl: 2, color: '#29c5d6' },
  { rank: 8, user: 'paco_lat',     pts: 25,  lvl: 1, color: '#8b5cf6' },
  { rank: 9, user: 'antxon',       pts: 20,  lvl: 1, color: '#ff8a1e' },
  { rank: 10, user: 'sole_88',     pts: 15,  lvl: 1, color: '#18a558' },
];

// ---------- INSIGNIAS Y PREMIOS ----------
const BADGES = [
  { id: 'first',   icon: '★', es: 'Primer hallazgo', en: 'First find',        got: true },
  { id: 'lock10',  icon: '🔒', es: '10 Candadines',   en: '10 Candadíns',      got: true,  glyph: 'lock' },
  { id: 'verify',  icon: '✔', es: 'Verificador x5',  en: 'Verifier x5',       got: true },
  { id: 'video',   icon: '▶', es: 'Vídeo viral',     en: 'Viral video',       got: true },
  { id: 'keymon',  icon: '♛', es: 'Cazó un Keymon',  en: 'Caught a Keymon',   got: true },
  { id: 'dex',     icon: '◆', es: 'Dex al 50%',      en: 'Dex 50%',           got: false },
  { id: 'night',   icon: '☾', es: 'Ronda nocturna',  en: 'Night patrol',      got: false },
  { id: 'carto',   icon: '✦', es: 'Cartógrafo',      en: 'Cartographer',      got: false },
];

// ---------- PERFIL ----------
const PROFILE = {
  user: 'pyroxine',
  alias: 'pyroxine',
  points: 45,
  color: '#e23b3b',
  weekRank: 6,
  counts: { observaciones: 9, verificaciones: 3, videos: 1 },
  perCreature: { candadin: 7, turistox: 5, checkinchu: 2, keymon: 1 },
};

// ---------- i18n ----------
const I18N = {
  es: {
    appname: 'La Invasión Silenciosa',
    tagline: 'Cazadores de turistificación · La Latina',
    brand_by: 'Una iniciativa vecinal',
    brand_org: 'A.V. La Chispera · Madrid',
    brand_spark: 'Como las chisperas que plantaron cara en 1808, hoy defendemos el barrio. Salta la chispa.',
    // nav
    nav_map: 'Mapa', nav_dex: 'Especies', nav_hunt: 'Cazar', nav_rank: 'Ranking', nav_me: 'Perfil',
    // onboarding
    ob_eyebrow: 'Misión de barrio',
    start_cta: 'Empezar la misión',
    start_fs_hint: 'se abrirá a pantalla completa',
    ob_line: 'Se está produciendo una invasión silenciosa en la ciudad. Los vecinos de La Latina necesitan ayuda para registrar los indicios visibles de la turistificación.',
    ob_line2: 'Tenemos una misión para ti, explorador urbano: encuentra a las criaturas, regístralas y suma puntos para conseguir premios.',
    ob_cta: 'Aceptar la misión',
    ob_rule: 'Regla de oro',
    ob_rule_txt: 'Documenta criaturas, nunca personas. Prohibido fotografiar huéspedes, porteros, trabajadores, información privada o matrículas.',
    // map
    map_title: 'Mapa del barrio', map_sub: 'Avistamientos en La Latina',
    heat: 'Mapa de calor', pins: 'Avistamientos',
    pending: 'Por verificar', validated: 'Validado',
    nearby: 'Cerca de ti', verify_cta: 'Verificar',
    // dex
    dex_title: 'Las especies', dex_sub: 'Guía de campo de la turistificación',
    dex_found: 'avistadas', what: '¿Qué es?', habitat: 'Hábitat', tip: 'Pista de rastreo',
    rarity_l: 'Rareza', points_l: 'Puntos',
    // hunt
    hunt_title: 'Nuevo avistamiento', hunt_step: 'Paso',
    hunt_capture: 'Captura la criatura', hunt_id: 'Identifica la especie',
    hunt_loc: 'Ubicación aproximada', hunt_confirm: 'Revisa y envía',
    take_photo: 'Disparar foto', retake: 'Repetir', use_photo: 'Usar foto',
    which: '¿Qué has encontrado?', approx: 'Ubicación aproximada',
    approx_note: 'Por privacidad, guardamos solo una ubicación aproximada.',
    submit: 'Enviar al registro', sending: 'Enviando…',
    sent_title: '¡Observación enviada!', sent_sub: 'Pendiente de validación por la comunidad.',
    plus: '+10 pts', back_map: 'Volver al mapa',
    privacy_short: 'Nada de personas, matrículas ni datos privados.',
    // rank
    rank_title: 'Ranking semanal', rank_sub: 'Top 10 cazadores · esta semana',
    you_are: 'Vas el', this_week: 'esta semana', pts: 'pts',
    // profile
    me_title: 'Tu cuaderno', lvl_label: 'Nivel',
    to_next: 'para el siguiente nivel', maxed: '¡Nivel máximo!',
    your_finds: 'Tus capturas', badges: 'Insignias', cert: 'Certificado',
    cert_title: 'EXPLORADOR DEL MES', cert_sub: 'por servicios distinguidos al barrio',
    cert_seal: 'Sellado por · A.V. La Chispera',
    assoc_open: 'Modo asociación',
    assoc_open_sub: 'Convierte comentarios de Instagram en avistamientos',
    assoc_title: 'Mesa de La Chispera',
    assoc_sub: 'Modo asociación',
    tab_ig: 'Instagram', tab_bandeja: 'Bandeja',
    ig_posts: 'posts', ig_followers: 'seg.', ig_following: 'siguiendo',
    ig_bio_1: 'Asociación Vecinal · La Latina, Madrid',
    ig_bio_2: 'Defendemos el barrio del avance turístico 🌹🔥',
    ig_bio_3: '#InvasiónSilenciosa',
    ig_follow: 'Siguiendo', ig_message: 'Mensaje',
    ig_likes: 'Me gusta',
    ig_hunt_cap: '🔍 CRIATURA DE LA SEMANA · Candadín. ¿Dónde lo has visto? Dinos la calle en comentarios 👇',
    ig_rank_cap: '🏆 RANKING DEL LUNES · Top 10 cazadores de la semana. ¿Estás en la lista?',
    ig_heat_cap: '🔥 MAPA DE CALOR · Las zonas más calientes del mes. La invasión avanza, el barrio responde.',
    ig_addcomment: 'Añade un comentario…',
    ig_send: 'Publicar',
    comment_hint: 'criatura + calle · ej: «candado en Cava Baja, 12»',
    view_comments: 'Ver los {n} comentarios',
    bandeja_title: 'Comentarios por procesar',
    bandeja_sub: 'Conviértelos en avistamientos y suma puntos a quien los reporta',
    bandeja_empty: '¡Bandeja vacía! No quedan comentarios por procesar.',
    bandeja_rule: 'Regla de oro: descarta cualquier comentario con personas, portales o matrículas.',
    detected: 'Detectado', street_l: 'Ubicación',
    validate: 'Validar', plus_to: '+10 a',
    reclassify: 'Reclasificar', discard: 'Descartar',
    privacy_flag: 'Posible dato privado · revísalo',
    pending_l: 'pendientes', validated_today: 'validados hoy',
    created_sight: 'avistamiento creado',
    cert_share: 'Compartir certificado',
    obs: 'observaciones', ver: 'verificaciones', vid: 'vídeos',
    how_points: '¿Cómo se suman puntos?',
    p_obs: 'Nueva observación validada', p_ver: 'Verificación de otro usuario', p_vid: 'Vídeo para redes',
    // verify modal
    v_title: 'Verificar avistamiento', v_q: '¿La criatura está bien clasificada?',
    v_yes: 'Confirmar (+5 pts)', v_no: 'Reclasificar', v_skip: 'Saltar',
    v_rule: 'Comprueba que no aparezcan personas ni datos privados.',
    reported_by: 'Reportado por', close: 'Cerrar',
    common: 'común', frecuente: 'frecuente', raro: 'raro', legendario: 'legendario',
    explorador: 'Explorador', rastreador: 'Rastreador', cartografo: 'Cartógrafo',
  },
  en: {
    appname: 'The Silent Invasion',
    tagline: 'Touristification hunters · La Latina',
    brand_by: 'A neighbourhood initiative',
    brand_org: 'La Chispera Residents’ Assoc. · Madrid',
    brand_spark: 'Like the chisperas who stood their ground in 1808, today we defend the barrio. Strike the spark.',
    nav_map: 'Map', nav_dex: 'Species', nav_hunt: 'Hunt', nav_rank: 'Ranking', nav_me: 'Profile',
    ob_eyebrow: 'Neighbourhood mission',
    start_cta: 'Start the mission',
    start_fs_hint: 'opens in fullscreen',
    ob_line: 'A silent invasion is taking over the city. The neighbours of La Latina need help logging the visible signs of touristification.',
    ob_line2: 'We have a mission for you, urban explorer: find the creatures, log them and earn points to win rewards.',
    ob_cta: 'Accept the mission',
    ob_rule: 'Golden rule',
    ob_rule_txt: 'Document creatures, never people. No photos of guests, doormen, workers, private info or licence plates.',
    map_title: 'Neighbourhood map', map_sub: 'Sightings across La Latina',
    heat: 'Heat map', pins: 'Sightings',
    pending: 'To verify', validated: 'Validated',
    nearby: 'Near you', verify_cta: 'Verify',
    dex_title: 'The species', dex_sub: 'A field guide to touristification',
    dex_found: 'spotted', what: 'What is it?', habitat: 'Habitat', tip: 'Tracking tip',
    rarity_l: 'Rarity', points_l: 'Points',
    hunt_title: 'New sighting', hunt_step: 'Step',
    hunt_capture: 'Capture the creature', hunt_id: 'Identify the species',
    hunt_loc: 'Approximate location', hunt_confirm: 'Review & send',
    take_photo: 'Take photo', retake: 'Retake', use_photo: 'Use photo',
    which: 'What did you find?', approx: 'Approximate location',
    approx_note: 'For privacy, we only store an approximate location.',
    submit: 'Send to registry', sending: 'Sending…',
    sent_title: 'Sighting sent!', sent_sub: 'Pending validation by the community.',
    plus: '+10 pts', back_map: 'Back to map',
    privacy_short: 'No people, plates or private data.',
    rank_title: 'Weekly ranking', rank_sub: 'Top 10 hunters · this week',
    you_are: "You're", this_week: 'this week', pts: 'pts',
    me_title: 'Your notebook', lvl_label: 'Level',
    to_next: 'to the next level', maxed: 'Max level!',
    your_finds: 'Your catches', badges: 'Badges', cert: 'Certificate',
    cert_title: 'EXPLORER OF THE MONTH', cert_sub: 'for distinguished service to the neighbourhood',
    cert_seal: 'Sealed by · La Chispera Assoc.',
    assoc_open: 'Association mode',
    assoc_open_sub: 'Turn Instagram comments into sightings',
    assoc_title: 'La Chispera desk',
    assoc_sub: 'Association mode',
    tab_ig: 'Instagram', tab_bandeja: 'Inbox',
    ig_posts: 'posts', ig_followers: 'foll.', ig_following: 'following',
    ig_bio_1: 'Residents’ Association · La Latina, Madrid',
    ig_bio_2: 'Defending the barrio from touristification 🌹🔥',
    ig_bio_3: '#TheSilentInvasion',
    ig_follow: 'Following', ig_message: 'Message',
    ig_likes: 'likes',
    ig_hunt_cap: '🔍 CREATURE OF THE WEEK · Candadín. Where did you spot it? Tell us the street in the comments 👇',
    ig_rank_cap: '🏆 MONDAY RANKING · Top 10 hunters of the week. Are you on the list?',
    ig_heat_cap: '🔥 HEAT MAP · The hottest zones this month. The invasion advances, the barrio responds.',
    ig_addcomment: 'Add a comment…',
    ig_send: 'Post',
    comment_hint: 'creature + street · e.g. “padlock on Cava Baja, 12”',
    view_comments: 'View all {n} comments',
    bandeja_title: 'Comments to process',
    bandeja_sub: 'Turn them into sightings and credit the reporter',
    bandeja_empty: 'Inbox empty! No comments left to process.',
    bandeja_rule: 'Golden rule: discard any comment with people, doorways or licence plates.',
    detected: 'Detected', street_l: 'Location',
    validate: 'Validate', plus_to: '+10 to',
    reclassify: 'Reclassify', discard: 'Discard',
    privacy_flag: 'Possible private data · review',
    pending_l: 'pending', validated_today: 'validated today',
    created_sight: 'sighting created',
    cert_share: 'Share certificate',
    obs: 'sightings', ver: 'verifications', vid: 'videos',
    how_points: 'How do points work?',
    p_obs: 'New validated sighting', p_ver: 'Verifying another user', p_vid: 'Video for social',
    v_title: 'Verify sighting', v_q: 'Is the creature correctly classified?',
    v_yes: 'Confirm (+5 pts)', v_no: 'Reclassify', v_skip: 'Skip',
    v_rule: 'Check there are no people or private data in the photo.',
    reported_by: 'Reported by', close: 'Close',
    common: 'common', frecuente: 'frequent', raro: 'rare', legendario: 'legendary',
    explorador: 'Explorer', rastreador: 'Tracker', cartografo: 'Cartographer',
  },
};

const POINTS = { obs: 10, ver: 5, vid: 10 };

// ---------- INSTAGRAM / MESA DE LA ASOCIACIÓN ----------
const IG_PROFILE = { handle: 'avlachispera', name: 'A.V. La Chispera', posts: 184, followers: '3.412', following: 312 };

const BANDEJA_SEED = [
  { id:'c1', user:'rosa_lat',    text:'candado nuevo en Cava Baja, 12 🔒', cr:'candadin',   street:'Cava Baja, 12',     when:'hace 8 min' },
  { id:'c2', user:'manolita_38', text:'una caja de llaves en la calle del Nuncio, al lado de la panadería', cr:'candadin', street:'Calle del Nuncio', when:'hace 21 min' },
  { id:'c3', user:'curro88',     text:'un edificio entero de turistas en la Plaza de Cascorro', cr:'turistox', street:'Plaza de Cascorro', when:'hace 35 min' },
  { id:'c4', user:'anon_vecino', text:'el portero del nº7 no para de subir maletas a los pisos', cr:'turistox', street:'—', flag:true, when:'hace 40 min' },
  { id:'c5', user:'marta_v',     text:'pantalla de check-in automático en Calle Toledo 30', cr:'checkinchu', street:'Calle Toledo, 30', when:'hace 52 min' },
  { id:'c6', user:'pepa_latina', text:'keymon en la calle del Almendro, todo el bloque son pisos turísticos', cr:'keymon', street:'Calle del Almendro', when:'hace 1 h' },
];

Object.assign(window, {
  LEVELS, levelFor, CREATURES, CREATURE_BY_ID, SIGHTINGS, RANKING, BADGES, PROFILE, I18N, POINTS,
  IG_PROFILE, BANDEJA_SEED,
});
