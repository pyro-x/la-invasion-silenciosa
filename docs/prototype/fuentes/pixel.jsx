// pixel.jsx — motor de pixel-art + sprites de las criaturas + iconos de nav + átomos UI
// Exporta a window: PixelSprite, MiniPix, CreatureSprite, NavIcon, PixelBurst, Rarity

// ---------- GRIDS DE LAS CRIATURAS (12 px de ancho) ----------
const SPRITES = {
  candadin: [
    "....KKKK....",
    "...K....K...",
    "..K......K..",
    "..K......K..",
    "KKKKKKKKKKKK",
    "KBBBBBBBBBBK",
    "KBLLBBBBLLBK",
    "KBLKBBBBLKBK",
    "KBBBBBBBBBBK",
    "KBBBBKKBBBBK",
    "KBBBKDDKBBBK",
    "KBBBBKKBBBBK",
    "KKKKKKKKKKKK",
  ],
  turistox: [
    ".....AA.....",
    ".....KA.....",
    "..KKKKKKKK..",
    ".KBBBBBBBBK.",
    "KBWWBBBBWWBK",
    "KBWPBBBBWPBK",
    "KBBBBBBBBBBK",
    "KBKKBKKBKKBK",
    "KBBBBBBBBBBK",
    "KBKKBKKBKKBK",
    "KBBBBBBBBBBK",
    "KBKKBKKBKKBK",
    "KKKKKKKKKKKK",
  ],
  checkinchu: [
    "..KKKKKKKK..",
    ".KBBBBBBBBK.",
    "KBWWBBBBWWBK",
    "KBWPBBBBWPBK",
    "KBBBBBBBBBBK",
    "KBBLLLLLLBBK",
    ".KBBBBBBBBK.",
    "..KKKKKKKK..",
    "....KAAK....",
    "....KAAK....",
    ".....KK.....",
    "...KKKKKK...",
    "..KKKKKKKK..",
  ],
  keymon: [
    "...KKKK.....",
    "..KBBBBK....",
    ".KBWWBWWBK..",
    ".KBWPBWPBK..",
    ".KBBBBBBBK..",
    "..KBBBBK....",
    "...KBBK.....",
    "...KBBK.....",
    "...KBBK.....",
    "...KBBKK....",
    "...KBBKKK...",
    "...KBBKK....",
    "...KKKK.....",
  ],
};

// ---------- ICONOS DE NAV (7px, monocolor 'X') ----------
const NAV_ICONS = {
  map: [
    "..XXX..",
    ".XXXXX.",
    ".XX.XX.",
    ".XXXXX.",
    "..XXX..",
    "...X...",
    "...X...",
  ],
  dex: [
    "XXX.XXX",
    "XXX.XXX",
    "XXX.XXX",
    ".......",
    "XXX.XXX",
    "XXX.XXX",
    "XXX.XXX",
  ],
  hunt: [
    ".XX.XX.",
    "XXXXXXX",
    "XX...XX",
    "X.XXX.X",
    "XX...XX",
    "XXXXXXX",
    ".......",
  ],
  rank: [
    "XXXXXXX",
    ".XXXXX.",
    ".XXXXX.",
    "..XXX..",
    "...X...",
    "..XXX..",
    ".XXXXX.",
  ],
  me: [
    "..XXX..",
    "..XXX..",
    ".......",
    ".XXXXX.",
    "XXXXXXX",
    "XXXXXXX",
    "XXXXXXX",
  ],
};

// ---------- renderer base (box-shadow) ----------
function shadowsFor(grid, scale, resolve) {
  const out = [];
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const col = resolve(ch);
      if (!col) continue;
      out.push(`${x * scale}px ${y * scale}px 0 0 ${col}`);
    }
  }
  return out.join(',');
}

// PixelSprite — grid + palette por carácter
function PixelSprite({ grid, palette, scale = 7, glow = false, className = '', style = {} }) {
  const w = grid[0].length * scale;
  const h = grid.length * scale;
  const sh = React.useMemo(
    () => shadowsFor(grid, scale, (ch) => (ch === '.' ? null : palette[ch])),
    [grid, palette, scale]
  );
  return (
    <div className={'sprite ' + (glow ? 'sprite-glow ' : '') + className}
         style={{ width: w, height: h, position: 'relative', ...style }}>
      <div style={{
        width: scale, height: scale, background: 'transparent',
        boxShadow: sh, position: 'absolute', top: 0, left: 0,
      }} />
    </div>
  );
}

// MiniPix — grid monocolor (usa currentColor por defecto)
function MiniPix({ grid, scale = 4, color, style = {} }) {
  const w = grid[0].length * scale;
  const h = grid.length * scale;
  const ref = React.useRef(null);
  const [c, setC] = React.useState(color || '#fff');
  React.useEffect(() => {
    if (color) { setC(color); return; }
    if (ref.current) setC(getComputedStyle(ref.current).color);
  });
  const sh = shadowsFor(grid, scale, (ch) => (ch === 'X' ? c : null));
  return (
    <div ref={ref} style={{ width: w, height: h, position: 'relative', color: 'inherit', ...style }}>
      <div style={{ width: scale, height: scale, background: 'transparent', boxShadow: sh, position: 'absolute', top: 0, left: 0 }} />
    </div>
  );
}

// CreatureSprite — atajo por id de criatura
function CreatureSprite({ id, scale = 7, glow = false, style = {} }) {
  const cr = window.CREATURE_BY_ID[id];
  if (!cr) return null;
  return <PixelSprite grid={SPRITES[cr.sprite]} palette={cr.palette} scale={scale} glow={glow} style={style} />;
}

// NavIcon — icono de barra inferior, hereda color del texto
function NavIcon({ name, scale = 3.4 }) {
  return <MiniPix grid={NAV_ICONS[name]} scale={scale} />;
}

// Rarity — puntos de rareza
function Rarity({ level }) {
  const map = { 'común': 1, frecuente: 2, raro: 3, legendario: 4 };
  const n = map[level] || 1;
  return (
    <span style={{ display: 'inline-flex', gap: 3 }}>
      {[0,1,2,3].map(i => (
        <span key={i} style={{
          width: 9, height: 9, borderRadius: 2,
          border: '2px solid var(--line)',
          background: i < n ? 'var(--accent3)' : 'transparent',
        }} />
      ))}
    </span>
  );
}

// PixelBurst — pequeña explosión de píxeles para la pantalla de éxito
function PixelBurst() {
  const bits = React.useMemo(() => {
    const cols = ['var(--accent)', 'var(--accent2)', 'var(--accent3)', 'var(--warn)'];
    return Array.from({ length: 18 }).map((_, i) => {
      const ang = (Math.PI * 2 * i) / 18 + Math.random();
      const dist = 60 + Math.random() * 70;
      return {
        dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist,
        c: cols[i % cols.length], d: Math.random() * 0.15, s: 8 + Math.random() * 6,
      };
    });
  }, []);
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {bits.map((b, i) => (
        <span key={i} style={{
          position: 'absolute', left: '50%', top: '38%', width: b.s, height: b.s,
          background: b.c, borderRadius: 2,
          animation: `burst${i % 3} 0.9s ease-out ${b.d}s both`,
          ['--dx']: b.dx + 'px', ['--dy']: b.dy + 'px',
        }} />
      ))}
      <style>{`
        @keyframes burst0 { 0%{transform:translate(-50%,-50%) scale(1);opacity:1;} 100%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(0.3) rotate(180deg);opacity:0;} }
        @keyframes burst1 { 0%{transform:translate(-50%,-50%) scale(0.6);opacity:1;} 100%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(0.2) rotate(-120deg);opacity:0;} }
        @keyframes burst2 { 0%{transform:translate(-50%,-50%) scale(1.2);opacity:1;} 100%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(0.4) rotate(90deg);opacity:0;} }
      `}</style>
    </div>
  );
}

Object.assign(window, { SPRITES, NAV_ICONS, PixelSprite, MiniPix, CreatureSprite, NavIcon, Rarity, PixelBurst });
