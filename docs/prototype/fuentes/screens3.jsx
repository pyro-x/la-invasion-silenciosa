// screens3.jsx — Modo Asociación: Instagram simulado (@avlachispera), flujo del vecino y mesa de validación
// Exporta a window: AsociacionMode

const { useState: uS3, useRef: uR3 } = React;

// ---------- iconos UI simples (no son marcas) ----------
function IGIcon({ name, size = 24, fill = 'none' }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill, stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    heart: 'M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21l8.8-8.3a5 5 0 0 0 0-7.1z',
    comment: 'M21 11.5a8.4 8.4 0 0 1-11.9 7.6L3 21l1.9-6.1A8.4 8.4 0 1 1 21 11.5z',
    share: 'M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z',
    bookmark: 'M6 3h12v18l-6-4-6 4z',
  };
  return <svg {...common}><path d={paths[name]} /></svg>;
}

// ---------- parser de comentarios ----------
function parseComment(text) {
  const l = text.toLowerCase();
  let cr = 'candadin';
  if (/turist|edificio|hotel|maleta/.test(l)) cr = 'turistox';
  else if (/check|acceso|terminal|recepci|c[oó]digo/.test(l)) cr = 'checkinchu';
  else if (/vivienda|piso|apartament|keymon|airbnb|bloque|alquiler/.test(l)) cr = 'keymon';
  else if (/candad|llave|caja|cerrojo/.test(l)) cr = 'candadin';
  const m = text.match(/en\s+(.+)/i);
  let street = m ? m[1] : text;
  street = street.replace(/[\s,.;:!¡¿?👀🔒🔥🌹👇]+$/u, '').trim();
  if (street.length > 40) street = street.slice(0, 40) + '…';
  return { cr, street: street || '—' };
}

// ============================================================
// ARTE DE LOS POSTS (estilo de marca La Chispera)
// ============================================================
function SparkDots() {
  const dots = [[14,22,10],[86,18,8],[90,60,7],[8,68,8],[78,82,9]];
  return (
    <React.Fragment>
      {dots.map((d,i)=>(
        <span key={i} style={{ position:'absolute', left:d[0]+'%', top:d[1]+'%', width:d[2], height:d[2]*0.5, borderRadius:99, background:'var(--accent3)', transform:'rotate(35deg)', opacity:0.9 }} />
      ))}
    </React.Fragment>
  );
}

function HuntArt({ t }) {
  return (
    <div style={{ position:'relative', width:'100%', aspectRatio:'1', background:'var(--accent)', color:'var(--on-accent)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, padding:20, overflow:'hidden' }}>
      <SparkDots />
      <span className="mono" style={{ fontSize:11, letterSpacing:'0.14em', opacity:0.85, zIndex:1 }}>CRIATURA DE LA SEMANA</span>
      <div className="floaty" style={{ background:'var(--on-accent)', borderRadius:16, padding:'14px 18px', boxShadow:'0 6px 0 rgba(0,0,0,0.18)', zIndex:1 }}>
        <CreatureSprite id="candadin" scale={6} />
      </div>
      <div className="display" style={{ fontSize:30, lineHeight:1.04, textAlign:'center', zIndex:1 }}>¿DÓNDE LO<br/>HAS VISTO?</div>
      <span className="mono" style={{ fontSize:12.5, zIndex:1 }}>comenta la calle 👇</span>
    </div>
  );
}

function RankArt({ t, lang }) {
  const top = window.RANKING.slice(0, 5);
  return (
    <div style={{ position:'relative', width:'100%', aspectRatio:'1', background:'var(--card2)', color:'var(--ink)', display:'flex', flexDirection:'column', justifyContent:'center', gap:10, padding:'20px 22px', overflow:'hidden' }}>
      <SparkDots />
      <div className="display" style={{ fontSize:22, color:'var(--accent)', zIndex:1 }}>🏆 RANKING<br/>DEL LUNES</div>
      <div className="stack" style={{ gap:7, zIndex:1, marginTop:4 }}>
        {top.map(p=>(
          <div key={p.user} className="row" style={{ gap:10 }}>
            <span className="display" style={{ fontSize:13, width:18, color:p.rank<=3?'var(--accent)':'var(--ink-dim)' }}>{p.rank}</span>
            <span style={{ width:18, height:18, borderRadius:'50%', background:p.color, border:'2px solid var(--line)' }} />
            <span className="grow" style={{ fontSize:13, fontWeight:600 }}>@{p.user}</span>
            <span className="display" style={{ fontSize:12, color:'var(--accent3)' }}>{p.pts}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeatArt({ t }) {
  return (
    <div style={{ position:'relative', width:'100%', background:'var(--bg2)', color:'var(--ink)', padding:18, overflow:'hidden' }}>
      <div className="display" style={{ fontSize:22, color:'var(--accent)', marginBottom:12 }}>🔥 MAPA DE CALOR</div>
      <div style={{ position: 'relative', width: '100%', aspectRatio: '3 / 2' }}>
        <StreetMap heat={true} sightings={window.SIGHTINGS} onPick={()=>{}} selected={null} />
      </div>
      <div className="mono" style={{ fontSize:11, color:'var(--ink-dim)', marginTop:10, textAlign:'center' }}>La Latina · esta semana</div>
    </div>
  );
}

// ============================================================
// COMPOSER (flujo del vecino)
// ============================================================
function Composer({ t, onSend }) {
  const [val, setVal] = uS3('');
  function send() { const v = val.trim(); if (!v) return; onSend(v); setVal(''); }
  return (
    <div className="stack" style={{ gap: 6, padding: '10px 12px 12px', borderTop: 'var(--bw) solid var(--line)' }}>
      <div className="row" style={{ gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--card2)', border: '2px solid var(--line)', flexShrink: 0 }} />
        <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={t('ig_addcomment')}
          style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none' }} />
        <button onClick={send} className="display" style={{ border: 'none', background: 'none', color: val.trim() ? 'var(--accent)' : 'var(--ink-dim)', fontSize: 11, cursor: 'pointer' }}>{t('ig_send')}</button>
      </div>
      <span className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)', paddingLeft: 40 }}>{t('comment_hint')}</span>
    </div>
  );
}

// ============================================================
// POST CARD (chrome estilo Instagram)
// ============================================================
function PostCard({ t, profile, art, caption, likes, when, comments, onSend, featured }) {
  const [liked, setLiked] = uS3(false);
  return (
    <div className="panel" style={{ padding: 0, overflow: 'hidden', marginBottom: 16, boxShadow: 'var(--shadow)' }}>
      {/* header */}
      <div className="row" style={{ gap: 10, padding: '10px 12px' }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--accent)', flexShrink: 0, background: 'var(--card)' }}>
          <img src={ASSET('assets/logo-chispera.png','logoChispera')} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div className="grow" style={{ lineHeight: 1.1 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>{profile.handle}</div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-dim)' }}>La Latina · Madrid</div>
        </div>
        <span style={{ color: 'var(--ink-dim)', fontSize: 20, letterSpacing: 1 }}>···</span>
      </div>
      {/* imagen */}
      {art}
      {/* acciones */}
      <div className="row" style={{ gap: 16, padding: '10px 12px 4px', color: 'var(--ink)' }}>
        <button onClick={() => setLiked(l => !l)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: liked ? 'var(--accent)' : 'var(--ink)', display: 'flex' }}>
          <IGIcon name="heart" fill={liked ? 'var(--accent)' : 'none'} />
        </button>
        <span style={{ display: 'flex' }}><IGIcon name="comment" /></span>
        <span style={{ display: 'flex' }}><IGIcon name="share" /></span>
        <span className="grow" />
        <span style={{ display: 'flex' }}><IGIcon name="bookmark" /></span>
      </div>
      <div style={{ padding: '0 12px 8px' }}>
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{(likes + (liked ? 1 : 0)).toLocaleString('es')} {t('ig_likes')}</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.4, marginTop: 4 }}>
          <span style={{ fontWeight: 700 }}>{profile.handle}</span> {caption}
        </div>
        {featured && comments && comments.length > 0 && (
          <div className="mono" style={{ fontSize: 12, color: 'var(--ink-dim)', marginTop: 6 }}>
            {t('view_comments').replace('{n}', comments.length)}
          </div>
        )}
        {/* comentarios visibles (flujo del vecino) */}
        {featured && (
          <div className="stack" style={{ gap: 6, marginTop: 8 }}>
            {comments.slice(-4).map((c, i) => (
              <div key={i} style={{ fontSize: 13.5, lineHeight: 1.35 }}>
                <span style={{ fontWeight: 700 }}>{c.user}</span> <span>{c.text}</span>
              </div>
            ))}
          </div>
        )}
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)', marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{when}</div>
      </div>
      {featured && <Composer t={t} onSend={onSend} />}
    </div>
  );
}

// ============================================================
// VISTA INSTAGRAM
// ============================================================
function InstagramView({ t, lang, comments, onSend }) {
  const p = window.IG_PROFILE;
  return (
    <div className="stack" style={{ gap: 0 }}>
      {/* cabecera de perfil */}
      <div className="pad stack" style={{ gap: 14, paddingBottom: 6 }}>
        <div className="row" style={{ gap: 18 }}>
          <div style={{ width: 78, height: 78, borderRadius: '50%', padding: 3, background: 'linear-gradient(45deg, var(--accent3), var(--accent))', flexShrink: 0 }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--card)', border: '2px solid var(--card)', overflow: 'hidden' }}>
              <img src={ASSET('assets/logo-chispera.png','logoChispera')} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          </div>
          <div className="grow row" style={{ justifyContent: 'space-around', textAlign: 'center' }}>
            {[[p.posts, t('ig_posts')], [p.followers, t('ig_followers')], [p.following, t('ig_following')]].map(([n, l], i) => (
              <div key={i}><div className="display" style={{ fontSize: 16 }}>{n}</div><div className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>{l}</div></div>
            ))}
          </div>
        </div>
        <div style={{ lineHeight: 1.4 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-dim)' }}>{t('ig_bio_1')}</div>
          <div style={{ fontSize: 13 }}>{t('ig_bio_2')}</div>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>{t('ig_bio_3')}</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="chip chip-accent" style={{ flex: 1, justifyContent: 'center', padding: '8px' }}>{t('ig_follow')}</button>
          <button className="chip" style={{ flex: 1, justifyContent: 'center', padding: '8px' }}>{t('ig_message')}</button>
        </div>
      </div>

      <hr className="divline" style={{ margin: '6px 0 12px' }} />

      {/* feed */}
      <div className="pad" style={{ paddingTop: 0 }}>
        <PostCard t={t} profile={p} art={<HuntArt t={t} />} caption={t('ig_hunt_cap')} likes={142} when={'hace 3 horas'} comments={comments} onSend={onSend} featured />
        <PostCard t={t} profile={p} art={<RankArt t={t} lang={lang} />} caption={t('ig_rank_cap')} likes={98} when={'hace 2 días'} />
        <PostCard t={t} profile={p} art={<HeatArt t={t} />} caption={t('ig_heat_cap')} likes={76} when={'hace 4 días'} />
      </div>
    </div>
  );
}

// ============================================================
// MESA / BANDEJA
// ============================================================
function BandejaCard({ t, item, onValidate, onDiscard, onReclass }) {
  const [pick, setPick] = uS3(false);
  const cr = window.CREATURE_BY_ID[item.cr];
  return (
    <div className="panel pad" style={{ padding: 14, borderColor: item.flag ? 'var(--warn)' : 'var(--line)' }}>
      <div className="row" style={{ gap: 10, marginBottom: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--card2)', border: '2px solid var(--line)', flexShrink: 0 }} />
        <div className="grow">
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>@{item.user}</div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>desde Instagram · {item.when}</div>
        </div>
        {item.flag && <span className="chip chip-warn" style={{ fontSize: 9 }}>⚠ {t('privacy_flag')}</span>}
      </div>

      <div style={{ fontSize: 14, lineHeight: 1.45, fontStyle: 'italic', color: 'var(--ink)', padding: '6px 10px', background: 'var(--bg2)', borderRadius: 10, marginBottom: 10 }}>
        «{item.text}»
      </div>

      <div className="row" style={{ gap: 8, marginBottom: pick ? 10 : 12, flexWrap: 'wrap' }}>
        <span className="chip chip-accent" style={{ gap: 7 }}><CreatureSprite id={item.cr} scale={2} /> {cr.name}</span>
        <span className="chip"><span style={{ marginRight: 4 }}>📍</span>{item.street}</span>
      </div>

      {pick && (
        <div className="row" style={{ gap: 8, marginBottom: 12 }}>
          {window.CREATURES.map(c => (
            <button key={c.id} onClick={() => { onReclass(item, c.id); setPick(false); }} className="panel center" style={{ flex: 1, padding: 8, cursor: 'pointer', borderColor: c.id === item.cr ? 'var(--accent)' : 'var(--line)', background: c.id === item.cr ? 'var(--card2)' : 'var(--card)' }}>
              <CreatureSprite id={c.id} scale={2.4} />
            </button>
          ))}
        </div>
      )}

      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn-accent" style={{ flex: 1.4, padding: '11px' }} onClick={() => onValidate(item)}>✔ {t('validate')} · +10</button>
        <button className="btn" style={{ flex: 0, padding: '11px 12px', whiteSpace: 'nowrap' }} onClick={() => setPick(p => !p)}>↺</button>
        <button className="btn" style={{ flex: 0, padding: '11px 12px' }} onClick={() => onDiscard(item)}>✕</button>
      </div>
    </div>
  );
}

function BandejaView({ t, queue, validated, onValidate, onDiscard, onReclass }) {
  return (
    <div className="pad stack" style={{ gap: 14 }}>
      <div>
        <div className="eyebrow">{t('bandeja_title')}</div>
        <div className="scr-title" style={{ fontSize: 18 }}>{t('bandeja_sub')}</div>
      </div>

      <div className="row" style={{ gap: 8 }}>
        <div className="panel pad grow center" style={{ flexDirection: 'column', gap: 2, padding: 12 }}>
          <span className="display" style={{ fontSize: 20, color: 'var(--accent)' }}>{queue.length}</span>
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>{t('pending_l')}</span>
        </div>
        <div className="panel pad grow center" style={{ flexDirection: 'column', gap: 2, padding: 12 }}>
          <span className="display" style={{ fontSize: 20, color: 'var(--good)' }}>{validated}</span>
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>{t('validated_today')}</span>
        </div>
      </div>

      <div className="panel panel-2 pad" style={{ padding: 12, display: 'flex', gap: 8, alignItems: 'center', borderStyle: 'dashed' }}>
        <span style={{ fontSize: 16 }}>🛡️</span>
        <span style={{ fontSize: 12, color: 'var(--ink-dim)' }}>{t('bandeja_rule')}</span>
      </div>

      {queue.length === 0
        ? <div className="panel pad center" style={{ flexDirection: 'column', gap: 12, padding: 30, textAlign: 'center' }}>
            <div className="floaty"><CreatureSprite id="keymon" scale={4} /></div>
            <span className="muted" style={{ fontSize: 14 }}>{t('bandeja_empty')}</span>
          </div>
        : queue.map(item => <BandejaCard key={item.id} t={t} item={item} onValidate={onValidate} onDiscard={onDiscard} onReclass={onReclass} />)
      }
    </div>
  );
}

// ============================================================
// MODO ASOCIACIÓN (contenedor)
// ============================================================
function AsociacionMode({ t, lang, onClose, onToast }) {
  const [tab, setTab] = uS3('ig');
  const seed = window.BANDEJA_SEED;
  const [queue, setQueue] = uS3(seed);
  const [comments, setComments] = uS3(seed.map(s => ({ user: '@' + s.user, text: s.text })));
  const [validated, setValidated] = uS3(0);
  const nid = uR3(900);

  function onSend(text) {
    const p = parseComment(text);
    const id = 'u' + (nid.current++);
    const handle = 'vecino_lat';
    setComments(c => [...c, { user: '@' + handle, text }]);
    setQueue(q => [{ id, user: handle, text, cr: p.cr, street: p.street, when: 'ahora' }, ...q]);
    onToast((lang === 'es' ? 'comentario recibido · a la bandeja' : 'comment received · sent to inbox'));
    setTimeout(() => setTab('bandeja'), 350);
  }
  function onValidate(item) {
    setQueue(q => q.filter(x => x.id !== item.id));
    setValidated(v => v + 1);
    onToast(t('plus_to') + ' @' + item.user + ' · ' + t('created_sight'));
  }
  function onDiscard(item) { setQueue(q => q.filter(x => x.id !== item.id)); }
  function onReclass(item, cr) { setQueue(q => q.map(x => x.id === item.id ? { ...x, cr } : x)); }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 76, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* barra superior */}
      <div style={{ flexShrink: 0, background: 'var(--bg2)', borderBottom: 'var(--bw) solid var(--line)' }}>
        <div className="row" style={{ gap: 12, padding: '14px 14px 10px' }}>
          <button className="chip chip-ghost" onClick={onClose} style={{ padding: '6px 10px' }}>←</button>
          <div className="center" style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--accent)', flexShrink: 0 }}>
            <img src={ASSET('assets/logo-chispera.png','logoChispera')} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div className="grow">
            <div className="display" style={{ fontSize: 13 }}>{t('assoc_title')}</div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>{t('assoc_sub')} · @{window.IG_PROFILE.handle}</div>
          </div>
        </div>
        {/* sub-nav */}
        <div className="row" style={{ padding: '0 14px' }}>
          {[['ig', t('tab_ig')], ['bandeja', t('tab_bandeja')]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              flex: 1, padding: '10px 0 12px', border: 'none', background: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontSize: 11, color: tab === id ? 'var(--accent)' : 'var(--ink-dim)',
              borderBottom: '3px solid ' + (tab === id ? 'var(--accent)' : 'transparent'),
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {label}
              {id === 'bandeja' && queue.length > 0 && (
                <span style={{ background: 'var(--accent)', color: 'var(--on-accent)', borderRadius: 999, fontSize: 10, padding: '1px 7px', fontFamily: 'var(--font-mono)' }}>{queue.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* contenido */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {tab === 'ig'
          ? <InstagramView t={t} lang={lang} comments={comments} onSend={onSend} />
          : <BandejaView t={t} queue={queue} validated={validated} onValidate={onValidate} onDiscard={onDiscard} onReclass={onReclass} />}
      </div>
    </div>
  );
}

Object.assign(window, { AsociacionMode });
