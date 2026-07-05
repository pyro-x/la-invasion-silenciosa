// screens1.jsx — Onboarding, Mapa (+ mapa de calor) y flujo de Cazar/Registrar
// Exporta a window: Onboarding, MapScreen, HuntFlow

const { useState } = React;

// ============================================================
// PANTALLA DE INICIO (PRESS START) — gesto fiable para fullscreen
// ============================================================
function StartScreen({ t, onStart, mobile }) {
  return (
    <div className="screen scanlines" style={{ bottom: 0, zIndex: 88, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 28, gap: 18 }}>
      <span className="chip chip-accent" style={{ position: 'absolute', top: 22 }}>{t('ob_eyebrow')}</span>
      <div className="floaty center" style={{ width: 132, height: 132, borderRadius: '50%', overflow: 'hidden', border: 'var(--bw) solid var(--line)', background: 'var(--card)', boxShadow: 'var(--shadow)' }}>
        <img src={ASSET('assets/logo-chispera.png', 'logoChispera')} alt="" style={{ width: '88%', height: '88%', objectFit: 'contain' }} />
      </div>
      <div>
        <h1 className="display" style={{ fontSize: 27, lineHeight: 1.18, margin: '6px 0 8px' }}>{t('appname')}</h1>
        <p className="mono" style={{ fontSize: 11.5, letterSpacing: '0.04em', color: 'var(--accent2)', margin: 0 }}>{t('tagline')}</p>
      </div>
      <button className="btn btn-cta" style={{ maxWidth: 300, marginTop: 6, fontSize: 14 }} onClick={onStart}>▶ {t('start_cta')}</button>
      {mobile && <span className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>{t('start_fs_hint')}</span>}
      <span className="mono" style={{ position: 'absolute', bottom: 18, fontSize: 10, color: 'var(--ink-dim)' }}>{t('brand_org')}</span>
    </div>
  );
}

// ============================================================
// ONBOARDING
// ============================================================
function Onboarding({ t, onAccept }) {
  return (
    <div className="screen scanlines" style={{ bottom: 0, zIndex: 70, display: 'flex', flexDirection: 'column' }}>
      <div className="pad stack" style={{ gap: 16, paddingTop: 24, minHeight: '100%', justifyContent: 'space-between' }}>
        <div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="chip chip-accent">{t('ob_eyebrow')}</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>LA LATINA · MAD</span>
          </div>

          <div className="center" style={{ gap: 16, margin: '20px 0 6px', justifyContent: 'space-around' }}>
            <CreatureSprite id="candadin" scale={5} glow style={{ animationDelay: '0s' }} />
            <div className="floaty"><CreatureSprite id="keymon" scale={6} glow /></div>
            <CreatureSprite id="turistox" scale={5} glow />
          </div>

          <h1 className="display" style={{ fontSize: 26, lineHeight: 1.25, margin: '12px 0 6px', color: 'var(--ink)' }}>
            {t('appname')}
          </h1>
          <p className="mono" style={{ fontSize: 11.5, letterSpacing: '0.04em', color: 'var(--accent2)', margin: 0 }}>
            {t('tagline')}
          </p>
          <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.45, fontStyle: 'italic', color: 'var(--accent)' }}>
            {t('brand_spark')}
          </p>
        </div>

        <div className="panel pad slidein" style={{ padding: 16 }}>
          <p style={{ margin: '0 0 12px', fontSize: 15, lineHeight: 1.5 }}>{t('ob_line')}</p>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: 'var(--ink-dim)' }}>{t('ob_line2')}</p>
        </div>

        <div className="panel panel-2 pad" style={{ padding: 14, borderStyle: 'dashed' }}>
          <div className="row" style={{ gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 16 }}>🛡️</span>
            <span className="display" style={{ fontSize: 11, color: 'var(--accent)' }}>{t('ob_rule')}</span>
          </div>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.45, color: 'var(--ink-dim)' }}>{t('ob_rule_txt')}</p>
        </div>

        {/* sello de la asociación */}
        <div className="row" style={{ gap: 12, alignItems: 'center', padding: '2px 4px' }}>
          <div className="center" style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--card)', border: 'var(--bw) solid var(--line)', flexShrink: 0, overflow: 'hidden' }}>
            <img src={ASSET('assets/logo-chispera.png','logoChispera')} alt="A.V. La Chispera" style={{ width: 44, height: 44, objectFit: 'contain' }} />
          </div>
          <div className="grow">
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{t('brand_by')}</div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{t('brand_org')}</div>
          </div>
        </div>

        <button className="btn btn-cta" onClick={onAccept} style={{ marginTop: 2 }}>
          ▸ {t('ob_cta')}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// MAPA
// ============================================================
// Mapa de calor de densidad real (canvas aditivo + rampa de color)
function HeatCanvas({ sightings, crop }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const cv = ref.current; if (!cv) return;
    let raf;
    function draw() {
      const host = cv.parentElement; if (!host) return;
      const W = host.clientWidth, H = host.clientHeight;
      if (!W || !H) { raf = requestAnimationFrame(draw); return; }
      const S = 1.4; // sobremuestreo para nitidez
      cv.width = Math.round(W * S); cv.height = Math.round(H * S);
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      // 1) acumular intensidad (blobs blancos, composición aditiva)
      ctx.globalCompositeOperation = 'lighter';
      const R = Math.min(cv.width, cv.height) * 0.30;
      sightings.forEach(s => {
        const px = ((s.x - crop.x0) / crop.vw) * cv.width, py = ((s.y - crop.y0) / crop.vh) * cv.height;
        const wgt = Math.min(0.7, 0.32 + (s.votes || 0) * 0.05);
        const g = ctx.createRadialGradient(px, py, 0, px, py, R);
        g.addColorStop(0, `rgba(255,255,255,${wgt})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px, py, R, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
      // 2) colorear la densidad acumulada con una rampa cálida
      const img = ctx.getImageData(0, 0, cv.width, cv.height); const d = img.data;
      const stops = [[0,[255,214,46,0]],[0.22,[255,214,46,140]],[0.45,[255,150,12,195]],[0.7,[232,52,22,224]],[1,[150,12,8,240]]];
      const ramp = (t) => {
        for (let i = 1; i < stops.length; i++) {
          if (t <= stops[i][0]) { const a = stops[i-1], b = stops[i]; const k = (t - a[0]) / (b[0] - a[0] || 1); return a[1].map((v, j) => v + (b[1][j] - v) * k); }
        }
        return stops[stops.length - 1][1];
      };
      for (let i = 0; i < d.length; i += 4) {
        const inten = d[i + 3] / 255;
        if (inten <= 0.02) { d[i + 3] = 0; continue; }
        const c = ramp(Math.min(1, inten));
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = c[3];
      }
      ctx.putImageData(img, 0, 0);
    }
    draw();
    window.addEventListener('resize', draw);
    return () => { window.removeEventListener('resize', draw); cancelAnimationFrame(raf); };
  }, [sightings, crop.x0, crop.y0, crop.vw, crop.vh]);
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
}

// Mapa real de La Latina — geometría vectorial de OpenStreetMap (window.LALATINA)
function StreetMap({ heat, sightings, onPick, selected }) {
  const G = window.LALATINA || { W: 1000, H: 527, streets: [], buildings: [], greens: [], plazas: [] };
  const W = G.W, H = G.H;
  const ref = React.useRef(null);
  const [box, setBox] = React.useState({ w: W, h: H });
  React.useEffect(() => {
    const el = ref.current; if (!el) return;
    const upd = () => { const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0) setBox({ w: r.width, h: r.height }); };
    upd();
    let ro; if (window.ResizeObserver) { ro = new ResizeObserver(upd); ro.observe(el); }
    window.addEventListener('resize', upd);
    return () => { if (ro) ro.disconnect(); window.removeEventListener('resize', upd); };
  }, []);
  // recorte con la MISMA proporción que el contenedor (sin deformar), centrado en el núcleo
  const aspect = box.w / box.h;
  let vh = H, vw = vh * aspect;
  if (vw > W) { vw = W; vh = vw / aspect; }
  const cx = 710, cy = 225;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const x0 = clamp(cx - vw / 2, 0, Math.max(0, W - vw));
  const y0 = clamp(cy - vh / 2, 0, Math.max(0, H - vh));
  const crop = { x0, y0, vw, vh };
  const toScreen = (s) => ({ left: ((s.x - x0) / vw) * 100, top: ((s.y - y0) / vh) * 100 });
  return (
    <div ref={ref} style={{
      position: 'relative', width: '100%', height: '100%',
      borderRadius: 'var(--radius)', overflow: 'hidden',
      border: 'var(--bw) solid var(--line)', background: 'var(--bg2)',
    }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <svg viewBox={`${x0} ${y0} ${vw} ${vh}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <rect x="0" y="0" width={W} height={H} style={{ fill: 'var(--bg2)' }} />
          {G.greens.map((p, i) => (<polygon key={'g' + i} points={p} style={{ fill: '#b7cd97', opacity: 0.75 }} />))}
          {G.buildings.map((p, i) => (<polygon key={'b' + i} points={p} style={{ fill: 'var(--card2)', stroke: 'var(--line)', strokeWidth: 0.6, strokeLinejoin: 'round' }} />))}
          {G.plazas.map((p, i) => (<polygon key={'z' + i} points={p} style={{ fill: 'var(--card)', opacity: 0.7 }} />))}
          {G.streets.map((s, i) => (<path key={'s' + i} d={s.d} style={{ fill: 'none', stroke: 'var(--card)', strokeWidth: s.w * 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }} />))}
        </svg>

        {heat && <HeatCanvas sightings={sightings} crop={crop} />}

        {!heat && sightings.map((s) => {
          const p = toScreen(s);
          if (p.left < -6 || p.left > 106 || p.top < -6 || p.top > 106) return null;
          return (
            <button key={s.id} onClick={() => onPick(s)} style={{
              position: 'absolute', left: p.left + '%', top: p.top + '%', transform: 'translate(-50%,-100%)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0, zIndex: selected === s.id ? 5 : 2,
            }}>
              <div style={{
                padding: 4, borderRadius: 8, background: 'var(--card)',
                border: `var(--bw) solid ${s.status === 'pendiente' ? 'var(--warn)' : 'var(--line)'}`,
                boxShadow: '0 3px 0 rgba(0,0,0,0.35)',
                transform: selected === s.id ? 'scale(1.18)' : 'scale(1)', transition: 'transform .1s',
                animation: s.status === 'pendiente' ? 'blinkdot 1.4s infinite' : 'none',
              }}>
                <CreatureSprite id={s.cr} scale={2.6} />
              </div>
              <div style={{ width: 0, height: 0, margin: '0 auto', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '7px solid var(--line)' }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function heatColor(cr) {
  return { candadin: '#f5b62e', turistox: '#e23b3b', checkinchu: '#29c5d6', keymon: '#9b6cf0' }[cr] || '#fff';
}

function MapScreen({ t, lang, onVerify, initHeat }) {
  const [heat, setHeat] = useState(!!initHeat);
  const [sel, setSel] = useState(null);
  const sightings = window.SIGHTINGS;
  const pending = sightings.filter(s => s.status === 'pendiente');
  const selS = sightings.find(s => s.id === sel);

  return (
    <div className="screen scanlines" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="pad" style={{ display: 'flex', flexDirection: 'column', gap: 11, flex: '1 1 auto', minHeight: 0, paddingBottom: 8 }}>
        <div>
          <div className="eyebrow">{t('map_title')}</div>
          <div className="scr-title" style={{ fontSize: 20 }}>{t('map_sub')}</div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className={'chip ' + (!heat ? 'chip-accent' : 'chip-ghost')} style={{ flex: 1, justifyContent: 'center' }} onClick={() => setHeat(false)}>{t('pins')}</button>
          <button className={'chip ' + (heat ? 'chip-accent' : 'chip-ghost')} style={{ flex: 1, justifyContent: 'center' }} onClick={() => setHeat(true)}>{t('heat')}</button>
        </div>

        <div style={{ flex: '1 1 0', minHeight: 120, position: 'relative' }}>
          <StreetMap heat={heat} sightings={sightings} onPick={(s)=>setSel(s.id)} selected={sel} />
        </div>

        {/* leyenda (4 en una fila) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, flexShrink: 0 }}>
          {window.CREATURES.map(c => (
            <div key={c.id} className="stack center" style={{ gap: 3 }}>
              <CreatureSprite id={c.id} scale={2} />
              <span className="mono" style={{ fontSize: 8.5, color: 'var(--ink-dim)', textAlign: 'center', lineHeight: 1 }}>{c.name}</span>
            </div>
          ))}
        </div>

        {/* popover del pin */}
        {selS && (
          <div className="panel pad slidein" style={{ padding: 14 }}>
            <div className="row" style={{ gap: 12 }}>
              <div className="panel-2 center" style={{ width: 54, height: 54, borderRadius: 8, border: 'var(--bw) solid var(--line)' }}>
                <CreatureSprite id={selS.cr} scale={3} />
              </div>
              <div className="grow">
                <div className="display" style={{ fontSize: 12 }}>{window.CREATURE_BY_ID[selS.cr].name}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>{selS.where} · {selS.when}</div>
              </div>
              <span className={'chip ' + (selS.status==='pendiente'?'chip-warn':'chip-good')}>
                {selS.status==='pendiente'? t('pending') : t('validated')}
              </span>
            </div>
            {selS.status === 'pendiente' && (
              <button className="btn btn-accent" style={{ marginTop: 12 }} onClick={() => onVerify(selS)}>✔ {t('verify_cta')}</button>
            )}
          </div>
        )}
      </div>

      {/* por verificar (única zona con scroll) */}
      <div className="pad stack" style={{ gap: 8, flex: '0 0 auto', maxHeight: '46%', minHeight: 168, overflowY: 'auto', paddingTop: 4 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="eyebrow">{t('nearby')}</span>
            <span className="chip chip-warn">{pending.length} {t('pending')}</span>
          </div>
          {pending.map(s => (
            <button key={s.id} className="panel pad" onClick={() => onVerify(s)} style={{
              padding: 12, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer', width: '100%',
            }}>
              <CreatureSprite id={s.cr} scale={2.8} />
              <div className="grow">
                <div style={{ fontWeight: 600, fontSize: 14 }}>{window.CREATURE_BY_ID[s.cr].name}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>{s.where} · @{s.user}</div>
              </div>
              <span className="chip chip-accent">{t('verify_cta')}</span>
            </button>
          ))}
        </div>
      </div>
  );
}

// ============================================================
// CAZAR / REGISTRAR
// ============================================================
function HuntFlow({ t, lang, onClose, onComplete }) {
  const [step, setStep] = useState(0);
  const [shot, setShot] = useState(false);
  const [cr, setCr] = useState(null);
  const [approx, setApprox] = useState(true);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const titles = [t('hunt_capture'), t('hunt_id'), t('hunt_loc'), t('hunt_confirm')];

  function submit() {
    setSending(true);
    setTimeout(() => { setSending(false); setDone(true); }, 1100);
  }

  if (done) {
    return (
      <div className="screen scanlines" style={{ bottom: 0, zIndex: 65, background: 'var(--bg)' }}>
        <div className="pad center" style={{ flexDirection: 'column', minHeight: '100%', textAlign: 'center', position: 'relative', gap: 16 }}>
          <PixelBurst />
          <div className="popin" style={{ zIndex: 2 }}><CreatureSprite id={cr} scale={8} glow /></div>
          <div className="chip chip-good display" style={{ fontSize: 14, padding: '8px 16px', zIndex: 2 }}>{t('plus')}</div>
          <h2 className="display" style={{ fontSize: 18, margin: 0, zIndex: 2 }}>{t('sent_title')}</h2>
          <p className="muted" style={{ margin: 0, maxWidth: 260, zIndex: 2 }}>{t('sent_sub')}</p>
          <button className="btn btn-cta" style={{ maxWidth: 280, zIndex: 2 }} onClick={() => onComplete()}>{t('back_map')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen scanlines" style={{ bottom: 0, zIndex: 65, background: 'var(--bg)' }}>
      <div className="pad stack" style={{ gap: 16 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="eyebrow">{t('hunt_title')}</div>
            <div className="scr-title" style={{ fontSize: 18 }}>{titles[step]}</div>
          </div>
          <button className="chip chip-ghost" onClick={onClose}>✕</button>
        </div>

        {/* indicador de pasos */}
        <div className="row" style={{ gap: 6 }}>
          {[0,1,2,3].map(i => (
            <div key={i} className="grow" style={{ height: 6, borderRadius: 3, background: i <= step ? 'var(--accent)' : 'var(--line)' }} />
          ))}
        </div>

        {/* paso 0: captura */}
        {step === 0 && (
          <div className="stack" style={{ gap: 12 }}>
            <div className="photo-ph" style={{ paddingTop: '92%', position: 'relative' }}>
              {!shot ? (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                  {/* marco de visor */}
                  {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map((c,i)=>(
                    <div key={i} style={{ position:'absolute', [c[0]]:14, [c[1]]:14, width:26, height:26,
                      [`border${c[0][0].toUpperCase()+c[0].slice(1)}`]:'3px solid var(--accent2)',
                      [`border${c[1][0].toUpperCase()+c[1].slice(1)}`]:'3px solid var(--accent2)' }} />
                  ))}
                  <span style={{ fontSize: 28 }}>📷</span>
                  <span>visor · enfoca la criatura</span>
                </div>
              ) : (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreatureSprite id="candadin" scale={6} />
                  <span style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center' }}>foto · candado en vía pública</span>
                </div>
              )}
            </div>

            <div className="panel panel-2 pad" style={{ padding: 12, display: 'flex', gap: 8, alignItems: 'center', borderStyle: 'dashed' }}>
              <span style={{ fontSize: 16 }}>🛡️</span>
              <span style={{ fontSize: 12, color: 'var(--ink-dim)' }}>{t('privacy_short')}</span>
            </div>

            {!shot
              ? <button className="btn btn-accent" onClick={() => setShot(true)}>◉ {t('take_photo')}</button>
              : (
                <div className="row" style={{ gap: 10 }}>
                  <button className="btn" onClick={() => setShot(false)}>↺ {t('retake')}</button>
                  <button className="btn btn-cta" onClick={() => setStep(1)}>✓ {t('use_photo')}</button>
                </div>
              )}
          </div>
        )}

        {/* paso 1: identificar */}
        {step === 1 && (
          <div className="stack" style={{ gap: 12 }}>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>{t('which')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {window.CREATURES.map(c => (
                <button key={c.id} className="panel pad" onClick={() => setCr(c.id)} style={{
                  padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer',
                  borderColor: cr === c.id ? 'var(--accent)' : 'var(--line)',
                  background: cr === c.id ? 'var(--card2)' : 'var(--card)',
                }}>
                  <CreatureSprite id={c.id} scale={4} glow={cr===c.id} />
                  <span className="display" style={{ fontSize: 9 }}>{c.name}</span>
                </button>
              ))}
            </div>
            <button className="btn btn-cta" disabled={!cr} style={{ opacity: cr ? 1 : 0.45 }} onClick={() => cr && setStep(2)}>▸ {t('hunt_loc')}</button>
          </div>
        )}

        {/* paso 2: ubicación */}
        {step === 2 && (
          <div className="stack" style={{ gap: 12 }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3' }}>
              <StreetMap heat={false} sightings={[{ id:'new', cr: cr, x: 710, y: 225, status:'pendiente' }]} onPick={()=>{}} selected={null} />
            </div>
            <div className="panel pad" style={{ padding: 14 }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', marginBottom: 4 }}>{t('approx').toUpperCase()}</div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Calle de la Cava Baja · La Latina</div>
            </div>
            <button className="panel pad" onClick={() => setApprox(a => !a)} style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
              <div style={{ width: 44, height: 26, borderRadius: 999, background: approx ? 'var(--good)' : 'var(--line)', border: 'var(--bw) solid var(--line)', position: 'relative', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 1, left: approx ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
              </div>
              <span style={{ fontSize: 12.5, color: 'var(--ink-dim)' }}>{t('approx_note')}</span>
            </button>
            <button className="btn btn-cta" onClick={() => setStep(3)}>▸ {t('hunt_confirm')}</button>
          </div>
        )}

        {/* paso 3: confirmar */}
        {step === 3 && (
          <div className="stack" style={{ gap: 12 }}>
            <div className="panel pad" style={{ padding: 14, display: 'flex', gap: 14 }}>
              <div className="photo-ph center" style={{ width: 84, height: 84, flexShrink: 0 }}>
                <CreatureSprite id={cr} scale={4} />
              </div>
              <div className="grow stack" style={{ gap: 6, justifyContent: 'center' }}>
                <span className="display" style={{ fontSize: 12 }}>{window.CREATURE_BY_ID[cr].name}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>Cava Baja · {t('approx')}</span>
                <span className="chip chip-warn" style={{ alignSelf: 'flex-start' }}>{t('pending')}</span>
              </div>
            </div>
            <div className="panel panel-2 pad" style={{ padding: 12, display: 'flex', gap: 8, alignItems: 'center', borderStyle: 'dashed' }}>
              <span style={{ fontSize: 16 }}>🛡️</span>
              <span style={{ fontSize: 12, color: 'var(--ink-dim)' }}>{t('privacy_short')}</span>
            </div>
            <button className="btn btn-accent" onClick={submit} disabled={sending}>
              {sending ? t('sending') : '▲ ' + t('submit')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { StartScreen, Onboarding, MapScreen, HuntFlow, StreetMap, HeatCanvas });
