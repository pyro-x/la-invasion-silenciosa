// screens2.jsx — Especies (Pokédex) + ficha, Ranking, Perfil/premios, modal de Verificación
// Exporta a window: PokedexScreen, RankingScreen, ProfileScreen, VerifyModal

const { useState: useState2 } = React;

// ============================================================
// ESPECIES (POKÉDEX) + FICHA
// ============================================================
function PokedexScreen({ t, lang }) {
  const [open, setOpen] = useState2(null);
  if (open) return <CreatureDetail t={t} lang={lang} cr={window.CREATURE_BY_ID[open]} onBack={() => setOpen(null)} />;

  const totalFound = window.CREATURES.reduce((a, c) => a + c.found, 0);
  const totalAll = window.CREATURES.reduce((a, c) => a + c.total, 0);

  return (
    <div className="screen scanlines">
      <div className="pad stack" style={{ gap: 14 }}>
        <div className="scr-head">
          <div>
            <div className="eyebrow">{t('dex_title')}</div>
            <div className="scr-title" style={{ fontSize: 20 }}>{t('dex_sub')}</div>
          </div>
          <span className="chip chip-accent display" style={{ fontSize: 10 }}>{totalFound}/{totalAll}</span>
        </div>

        <div className="stack" style={{ gap: 10 }}>
          {window.CREATURES.map(c => (
            <button key={c.id} className="panel pad" onClick={() => setOpen(c.id)} style={{
              padding: 12, display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', cursor: 'pointer', width: '100%',
            }}>
              <div className="panel-2 center" style={{ width: 62, height: 62, borderRadius: 8, border: 'var(--bw) solid var(--line)', flexShrink: 0 }}>
                <CreatureSprite id={c.id} scale={3.4} />
              </div>
              <div className="grow">
                <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>#{c.dex}</span>
                  <span className="display" style={{ fontSize: 12 }}>{c.name}</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-dim)', lineHeight: 1.35 }}>{c[lang].what}</div>
              </div>
              <div className="stack" style={{ alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                <Rarity level={c.rarity} />
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-dim)' }}>{c.found}/{c.total}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CreatureDetail({ t, lang, cr, onBack }) {
  const pct = Math.round((cr.found / cr.total) * 100);
  return (
    <div className="screen scanlines">
      <div className="pad stack" style={{ gap: 16 }}>
        <button className="chip chip-ghost" onClick={onBack} style={{ alignSelf: 'flex-start' }}>← {t('dex_title')}</button>

        <div className="panel pad center" style={{ flexDirection: 'column', gap: 12, padding: '26px 16px', background: 'var(--bg2)' }}>
          <div className="floaty"><CreatureSprite id={cr.id} scale={9} glow /></div>
          <div className="row" style={{ gap: 10 }}>
            <span className="mono" style={{ fontSize: 13, color: 'var(--ink-dim)' }}>#{cr.dex}</span>
            <span className="display" style={{ fontSize: 18 }}>{cr.name}</span>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>{t('rarity_l').toUpperCase()}</span>
            <Rarity level={cr.rarity} />
            <span className="chip" style={{ marginLeft: 4 }}>{t(cr.rarity)}</span>
          </div>
        </div>

        <div className="row" style={{ gap: 10 }}>
          <div className="panel pad grow center" style={{ flexDirection: 'column', gap: 4, padding: 14 }}>
            <span className="display" style={{ fontSize: 18, color: 'var(--accent3)' }}>+10</span>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>{t('points_l').toUpperCase()}</span>
          </div>
          <div className="panel pad grow" style={{ padding: 14 }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>{t('dex_found').toUpperCase()}</span>
              <span className="display" style={{ fontSize: 11 }}>{cr.found}/{cr.total}</span>
            </div>
            <div className="bar"><i style={{ width: pct + '%' }} /></div>
          </div>
        </div>

        {[['what', cr[lang].what], ['habitat', cr[lang].habitat], ['tip', cr[lang].tip]].map(([k, v]) => (
          <div key={k} className="panel pad" style={{ padding: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 6, color: 'var(--accent)' }}>{t(k)}</div>
            <div style={{ fontSize: 14, lineHeight: 1.5 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// RANKING
// ============================================================
function RankingScreen({ t, lang }) {
  const R = window.RANKING;
  const top3 = R.slice(0, 3);
  const order = [top3[1], top3[0], top3[2]]; // 2-1-3 para el podio
  const heights = { 1: 92, 2: 68, 3: 54 };

  return (
    <div className="screen scanlines">
      <div className="pad stack" style={{ gap: 16 }}>
        <div>
          <div className="eyebrow">{t('rank_title')}</div>
          <div className="scr-title" style={{ fontSize: 20 }}>{t('rank_sub')}</div>
        </div>

        {/* podio */}
        <div className="row" style={{ alignItems: 'flex-end', justifyContent: 'center', gap: 10, padding: '4px 0' }}>
          {order.map(p => (
            <div key={p.user} className="stack center" style={{ gap: 6, flex: 1, maxWidth: 100 }}>
              <div className="center" style={{ width: 46, height: 46, borderRadius: '50%', background: p.color, border: 'var(--bw) solid var(--line)', boxShadow: 'var(--shadow)' }}>
                <span className="display" style={{ fontSize: 14, color: '#fff', textShadow: '0 1px 0 rgba(0,0,0,.4)' }}>{p.rank}</span>
              </div>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink)', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{p.user}</span>
              <div className="panel center" style={{ width: '100%', height: heights[p.rank], borderRadius: 'var(--radius) var(--radius) 0 0', background: 'var(--card2)', alignItems: 'flex-start', paddingTop: 8 }}>
                <span className="display" style={{ fontSize: 11, color: 'var(--accent)' }}>{p.pts}</span>
              </div>
            </div>
          ))}
        </div>

        {/* lista 4-10 */}
        <div className="stack" style={{ gap: 8 }}>
          {R.slice(3).map(p => (
            <div key={p.user} className="panel pad" style={{
              padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12,
              borderColor: p.me ? 'var(--accent)' : 'var(--line)',
              background: p.me ? 'var(--card2)' : 'var(--card)',
            }}>
              <span className="display" style={{ fontSize: 12, width: 24, color: p.me ? 'var(--accent)' : 'var(--ink-dim)' }}>{p.rank}</span>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: p.color, border: '2px solid var(--line)', flexShrink: 0 }} />
              <div className="grow">
                <span style={{ fontWeight: 600, fontSize: 14 }}>@{p.user}{p.me && ' ·'}{p.me && <span className="mono" style={{ color: 'var(--accent)', fontSize: 11 }}> {lang==='es'?'tú':'you'}</span>}</span>
              </div>
              <span className="chip chip-ghost" style={{ fontSize: 10 }}>{t(window.LEVELS[p.lvl-1].key)}</span>
              <span className="display nowrap" style={{ fontSize: 12, color: 'var(--accent3)' }}>{p.pts}</span>
            </div>
          ))}
        </div>

        <div className="panel panel-2 pad center" style={{ padding: 12, gap: 8, borderStyle: 'dashed' }}>
          <span style={{ fontSize: 16 }}>📣</span>
          <span style={{ fontSize: 12.5, color: 'var(--ink-dim)' }}>{lang==='es' ? 'El top 10 se publica cada lunes en redes. ¡Sube vídeos de tus hallazgos!' : 'The top 10 is posted on socials every Monday. Upload videos of your finds!'}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PERFIL / PREMIOS
// ============================================================
function ProfileScreen({ t, lang, points, onAssoc }) {
  const P = { ...window.PROFILE, points: points ?? window.PROFILE.points };
  const lvl = window.levelFor(P.points);
  const band = lvl.max === 9999 ? null : lvl.max - lvl.min + 1;
  const inBand = P.points - lvl.min;
  const pct = band ? Math.min(100, Math.round((inBand / band) * 100)) : 100;
  const toNext = lvl.max === 9999 ? 0 : (lvl.max + 1) - P.points;
  const nextKey = lvl.id < 3 ? window.LEVELS[lvl.id].key : null;

  return (
    <div className="screen scanlines">
      <div className="pad stack" style={{ gap: 14 }}>
        <div className="eyebrow">{t('me_title')}</div>

        {/* cabecera de perfil */}
        <div className="panel pad" style={{ padding: 16 }}>
          <div className="row" style={{ gap: 14 }}>
            <div className="center" style={{ width: 58, height: 58, borderRadius: '50%', background: P.color, border: 'var(--bw) solid var(--line)', flexShrink: 0 }}>
              <MiniPix grid={window.NAV_ICONS.me} scale={3.6} color="#fff" />
            </div>
            <div className="grow">
              <div style={{ fontWeight: 700, fontSize: 17 }}>@{P.alias}</div>
              <div className="row" style={{ gap: 8, marginTop: 4 }}>
                <span className="chip chip-accent display" style={{ fontSize: 9 }}>N{lvl.id} · {t(lvl.key)}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>{lang==='es'?'vas el':'rank'} #{P.weekRank}</span>
              </div>
            </div>
            <div className="stack center" style={{ flexShrink: 0 }}>
              <span className="display" style={{ fontSize: 22, color: 'var(--accent3)' }}>{P.points}</span>
              <span className="mono" style={{ fontSize: 9, color: 'var(--ink-dim)' }}>{t('pts').toUpperCase()}</span>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-dim)' }}>{t(lvl.key).toUpperCase()}</span>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-dim)' }}>
                {nextKey ? `${toNext} ${t('pts')} → ${t(nextKey)}` : t('maxed')}
              </span>
            </div>
            <div className="bar"><i style={{ width: pct + '%' }} /></div>
          </div>
        </div>

        {/* modo asociación */}
        <button className="panel pad" onClick={onAssoc} style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer', width: '100%', borderColor: 'var(--accent)' }}>
          <div className="center" style={{ width: 42, height: 42, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--accent)', flexShrink: 0 }}>
            <img src={ASSET('assets/logo-chispera.png','logoChispera')} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div className="grow">
            <div className="display" style={{ fontSize: 11, color: 'var(--accent)' }}>{t('assoc_open')}</div>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-dim)', marginTop: 3 }}>{t('assoc_open_sub')}</div>
          </div>
          <span className="display" style={{ fontSize: 14, color: 'var(--accent)' }}>→</span>
        </button>

        {/* stats puntos */}
        <div className="row" style={{ gap: 8 }}>
          {[['obs', P.counts.observaciones, '+10'], ['ver', P.counts.verificaciones, '+5'], ['vid', P.counts.videos, '+10']].map(([k, n, pv]) => (
            <div key={k} className="panel pad grow center" style={{ flexDirection: 'column', gap: 2, padding: 12 }}>
              <span className="display" style={{ fontSize: 18 }}>{n}</span>
              <span className="mono" style={{ fontSize: 9.5, color: 'var(--ink-dim)', textAlign: 'center' }}>{t(k)}</span>
              <span className="chip chip-good" style={{ fontSize: 9, marginTop: 4, padding: '2px 7px' }}>{pv}</span>
            </div>
          ))}
        </div>

        {/* capturas por especie */}
        <div className="panel pad" style={{ padding: 14 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>{t('your_finds')}</div>
          <div className="stack" style={{ gap: 10 }}>
            {window.CREATURES.map(c => (
              <div key={c.id} className="row" style={{ gap: 10 }}>
                <CreatureSprite id={c.id} scale={2.6} />
                <span className="grow" style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                <div className="bar" style={{ width: 90, height: 12 }}><i style={{ width: (P.perCreature[c.id]/c.total*100) + '%' }} /></div>
                <span className="mono nowrap" style={{ fontSize: 11, color: 'var(--ink-dim)', width: 36, textAlign: 'right' }}>{P.perCreature[c.id]}/{c.total}</span>
              </div>
            ))}
          </div>
        </div>

        {/* insignias */}
        <div className="panel pad" style={{ padding: 14 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>{t('badges')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {window.BADGES.map(b => (
              <div key={b.id} className="stack center" style={{ gap: 5, opacity: b.got ? 1 : 0.4 }}>
                <div className="center" style={{
                  width: '100%', aspectRatio: '1', borderRadius: 'var(--radius)',
                  border: 'var(--bw) solid var(--line)',
                  background: b.got ? 'var(--card2)' : 'var(--bg2)',
                  boxShadow: b.got ? 'var(--shadow)' : 'none', fontSize: 20,
                }}>
                  <span style={{ filter: b.got ? 'none' : 'grayscale(1)' }}>{b.icon}</span>
                </div>
                <span className="mono" style={{ fontSize: 8.5, color: 'var(--ink-dim)', textAlign: 'center', lineHeight: 1.2 }}>{b[lang]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* certificado */}
        <div className="panel pad" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 16px', textAlign: 'center', background: 'var(--card2)', borderBottom: 'var(--bw) solid var(--line)' }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--ink-dim)' }}>★ {t('cert')} ★</div>
            <div className="display" style={{ fontSize: 15, margin: '10px 0 4px', color: 'var(--accent)' }}>{t('cert_title')}</div>
            <div className="floaty center" style={{ margin: '8px 0' }}><CreatureSprite id="keymon" scale={4} glow /></div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>@{P.alias}</div>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-dim)', marginTop: 2 }}>{t('cert_sub')}</div>
            <div className="row center" style={{ gap: 9, marginTop: 14 }}>
              <img src={ASSET('assets/chispera-emblem.png','certEmblem')} alt="" style={{ height: 34, width: 'auto' }} />
              <span className="mono" style={{ fontSize: 9.5, color: 'var(--ink-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{t('cert_seal')}</span>
            </div>
          </div>
          <div style={{ padding: 12 }}>
            <button className="btn btn-cta">▣ {t('cert_share')}</button>
          </div>
        </div>

        {/* cómo se suman puntos */}
        <div className="panel panel-2 pad" style={{ padding: 14 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>{t('how_points')}</div>
          {[['p_obs','+10'],['p_ver','+5'],['p_vid','+10']].map(([k,v],i)=>(
            <div key={k} className="row" style={{ justifyContent: 'space-between', padding: '7px 0', borderTop: i? '1px solid var(--line)':'none' }}>
              <span style={{ fontSize: 13 }}>{t(k)}</span>
              <span className="chip chip-good" style={{ fontSize: 10 }}>{v} {t('pts')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODAL DE VERIFICACIÓN
// ============================================================
function VerifyModal({ t, lang, sighting, onClose, onConfirm }) {
  const cr = window.CREATURE_BY_ID[sighting.cr];
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 80, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.55)' }} onClick={onClose}>
      <div className="panel slidein" onClick={e => e.stopPropagation()} style={{
        width: '100%', borderRadius: 'var(--radius) var(--radius) 0 0', padding: 18, boxShadow: 'none',
        borderBottom: 'none',
      }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
          <span className="display" style={{ fontSize: 13 }}>{t('v_title')}</span>
          <button className="chip chip-ghost" onClick={onClose}>✕</button>
        </div>

        <div className="photo-ph center" style={{ height: 150, marginBottom: 12 }}>
          <CreatureSprite id={sighting.cr} scale={6} />
          <span style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center' }}>foto del avistamiento {sighting.id}</span>
        </div>

        <div className="row" style={{ gap: 10, marginBottom: 12 }}>
          <CreatureSprite id={sighting.cr} scale={3} />
          <div className="grow">
            <div className="display" style={{ fontSize: 12 }}>{cr.name}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>{sighting.where}</div>
          </div>
          <div className="stack" style={{ alignItems: 'flex-end' }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>{t('reported_by')}</span>
            <span className="mono" style={{ fontSize: 11 }}>@{sighting.user}</span>
          </div>
        </div>

        <div className="panel panel-2 pad" style={{ padding: 10, display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, borderStyle: 'dashed' }}>
          <span style={{ fontSize: 14 }}>🛡️</span>
          <span style={{ fontSize: 11.5, color: 'var(--ink-dim)' }}>{t('v_rule')}</span>
        </div>

        <div className="stack" style={{ gap: 8 }}>
          <p className="muted" style={{ margin: '0 0 4px', fontSize: 13, textAlign: 'center' }}>{t('v_q')}</p>
          <button className="btn btn-accent" onClick={onConfirm}>✔ {t('v_yes')}</button>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" onClick={onClose}>{t('v_no')}</button>
            <button className="btn" onClick={onClose}>{t('v_skip')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PokedexScreen, CreatureDetail, RankingScreen, ProfileScreen, VerifyModal });
