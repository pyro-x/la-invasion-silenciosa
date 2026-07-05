// app.jsx — App principal: marco del móvil, navegación, Tweaks y feedback de puntos
const { useState: uS, useEffect: uE, useRef: uR } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "La Chispera",
  "lang": "Español",
  "tone": "Activista",
  "displayFont": "Auto (tema)",
  "accent": "Auto (tema)"
}/*EDITMODE-END*/;

const THEME_MAP = { 'La Chispera': 'chispera', 'Cuaderno de Campo': 'campo', 'Neón Arcade': 'neon', 'Verbena 8-bit': 'verbena', 'Cartucho Pop': 'pop' };
const LANG_MAP  = { 'Español': 'es', 'English': 'en' };
const TONE_MAP  = { 'Activista': 'activista', 'Humor': 'humor' };
const FONT_MAP  = { 'Auto (tema)': null, 'Pixel 8-bit': "'Press Start 2P', monospace", 'Rótulo Bungee': "'Bungee', sans-serif", 'Redonda pop': "'Lilita One', sans-serif" };
const ACCENT_MAP= { 'Auto (tema)': null, 'Magenta': '#ff2e88', 'Cian': '#2ee6ff', 'Lima': '#c6ff3d', 'Naranja': '#ff8a1e' };

// variantes de tono (solo cambian un par de cadenas)
const TONE = {
  es: {
    humor: { tagline: 'Pokédex de la turistificación · La Latina',
             ob_line2: 'Tenemos una misión para ti, crack del barrio: caza los bichos urbanos, hazte la foto y forra tu perfil de insignias.',
             ob_cta: '¡Vamos a cazar!' },
  },
  en: {
    humor: { tagline: 'A touristification Pokédex · La Latina',
             ob_line2: "We've got a mission for you, neighbourhood legend: catch the urban critters, snap them and stack up badges.",
             ob_cta: "Let's hunt!" },
  },
};

function App() {
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const theme  = THEME_MAP[tw.theme] || 'chispera';
  const lang   = LANG_MAP[tw.lang] || 'es';
  const tone   = TONE_MAP[tw.tone] || 'activista';
  const fontOv = FONT_MAP[tw.displayFont];
  const accOv  = ACCENT_MAP[tw.accent];

  const T = (k) => (TONE[lang]?.[tone]?.[k]) ?? (window.I18N[lang]?.[k]) ?? k;

  // Boot por parámetros de URL (para el documento brief / deep-links)
  const boot = (() => { try { return new URLSearchParams(location.search); } catch (e) { return new URLSearchParams(); } })();
  const forceOnb = (() => {
    const v = boot.get('onboarding') ?? boot.get('intro');
    return v !== null && v !== '0' && v !== 'false';
  })();
  const bootScreen = boot.get('screen');
  const VALID_TABS = ['map', 'dex', 'rank', 'me'];
  const [onb, setOnb] = uS(() => {
    if (boot.get('ob') === '0' || (bootScreen && !forceOnb)) return false;
    try { return forceOnb || localStorage.getItem('sil_onb_v1') !== '1'; } catch (e) { return true; }
  });
  const [tab, setTab] = uS(VALID_TABS.includes(bootScreen) ? bootScreen : 'map');
  const [hunt, setHunt] = uS(boot.get('hunt') === '1');
  const [verify, setVerify] = uS(null);
  const [assoc, setAssoc] = uS(boot.get('assoc') === '1');
  const [points, setPoints] = uS(window.PROFILE.points);
  const [toast, setToast] = uS(null);
  const [started, setStarted] = uS(boot.get('start') === '1' || !!bootScreen || boot.get('hunt') === '1' || boot.get('assoc') === '1');

  const showToast = (msg) => { setToast(msg); clearTimeout(window.__toastT); window.__toastT = setTimeout(() => setToast(null), 2200); };

  function acceptOb() { try { localStorage.setItem('sil_onb_v1', '1'); } catch (e) {} setOnb(false); }
  function handleStart() {
    if (fullBleed) {
      var el = document.documentElement;
      var req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen;
      if (req) { try { var p = req.call(el); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
    }
    setStarted(true);
  }
  function huntDone() { setHunt(false); setTab('map'); setPoints(p => p + 10); showToast('+10 · ' + (lang==='es'?'observación enviada':'sighting sent')); }
  function doVerify() { const s = verify; setVerify(null); setPoints(p => p + 5); showToast('+5 · ' + (lang==='es'?'verificación':'verified')); }

  // ----- responsive: pantalla completa en móvil, marco Android en escritorio -----
  const W = 412, H = 892;
  const [scale, setScale] = uS(1);
  const [fullBleed, setFullBleed] = uS(() => (typeof window !== 'undefined' && window.innerWidth <= 540));
  uE(() => {
    function fit() {
      const fb = window.innerWidth <= 540;
      setFullBleed(fb);
      if (!fb) { const m = 24; setScale(Math.min((window.innerWidth - m) / W, (window.innerHeight - m) / H, 1.15)); }
    }
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const styleOv = {};
  if (fontOv) styleOv['--font-display'] = fontOv;
  if (accOv) styleOv['--accent'] = accOv;

  const statusDark = theme === 'neon';

  const TABS = [
    { id: 'map',  icon: 'map',  label: T('nav_map') },
    { id: 'dex',  icon: 'dex',  label: T('nav_dex') },
    { id: 'hunt', icon: 'hunt', label: T('nav_hunt'), cta: true },
    { id: 'rank', icon: 'rank', label: T('nav_rank') },
    { id: 'me',   icon: 'me',   label: T('nav_me') },
  ];

  const body = (
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--bg)' }}>
            {tab === 'map'  && <MapScreen t={T} lang={lang} onVerify={setVerify} initHeat={boot.get('heat') === '1'} />}
            {tab === 'dex'  && <PokedexScreen t={T} lang={lang} />}
            {tab === 'rank' && <RankingScreen t={T} lang={lang} />}
            {tab === 'me'   && <ProfileScreen t={T} lang={lang} points={points} onAssoc={() => setAssoc(true)} />}

            {/* barra de navegación */}
            <div className="tabbar">
              {TABS.map(tb => (
                tb.cta ? (
                  <button key={tb.id} className="tab cta" onClick={() => setHunt(true)}>
                    <div className="fab"><NavIcon name="hunt" scale={4} /></div>
                  </button>
                ) : (
                  <button key={tb.id} className={'tab' + (tab === tb.id ? ' active' : '')} onClick={() => setTab(tb.id)}>
                    <span className="glyph"><NavIcon name={tb.icon} scale={3.2} /></span>
                    <span>{tb.label}</span>
                  </button>
                )
              ))}
            </div>

            {/* overlays */}
            {hunt && <HuntFlow t={T} lang={lang} onClose={() => setHunt(false)} onComplete={huntDone} />}
            {started && onb && <Onboarding t={T} onAccept={acceptOb} />}
            {!started && <StartScreen t={T} onStart={handleStart} mobile={fullBleed} />}
            {verify && <VerifyModal t={T} lang={lang} sighting={verify} onClose={() => setVerify(null)} onConfirm={doVerify} />}
            {assoc && <AsociacionMode t={T} lang={lang} onClose={() => setAssoc(false)} onToast={showToast} />}

            {/* toast */}
            {toast && (
              <div className="popin" style={{
                position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 90,
                background: 'var(--good)', color: '#06281a', border: 'var(--bw) solid var(--line)',
                borderRadius: 999, padding: '8px 18px', fontFamily: 'var(--font-display)', fontSize: 11,
                boxShadow: 'var(--shadow)', whiteSpace: 'nowrap',
              }}>{toast}</div>
            )}
          </div>
  );

  return (
    <React.Fragment>
      {fullBleed ? (
        <div className="app-root" data-theme={theme} style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', ...styleOv }}>
          {body}
        </div>
      ) : (
        <div style={{ width: W * scale, height: H * scale, position: 'relative' }}>
          <div className="app-root" data-theme={theme} style={{
            width: W, height: H, transform: `scale(${scale})`, transformOrigin: 'top left',
            position: 'absolute', top: 0, left: 0, borderRadius: 30, overflow: 'hidden',
            border: '9px solid #0b0b10', boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.04)',
            display: 'flex', flexDirection: 'column', ...styleOv,
          }}>
            <div style={{ background: 'var(--status-bg)', flexShrink: 0 }}><AndroidStatusBar dark={statusDark} /></div>
            {body}
            <div style={{ background: 'var(--bg2)', flexShrink: 0 }}><AndroidNavBar dark={statusDark} /></div>
          </div>
        </div>
      )}

      {/* PANEL DE TWEAKS */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Dirección estética" />
        <TweakSelect label="Tema" value={tw.theme}
          options={['La Chispera', 'Cuaderno de Campo', 'Neón Arcade', 'Verbena 8-bit', 'Cartucho Pop']}
          onChange={(v) => setTweak('theme', v)} />
        <TweakSelect label="Tipografía display" value={tw.displayFont}
          options={['Auto (tema)', 'Pixel 8-bit', 'Rótulo Bungee', 'Redonda pop']}
          onChange={(v) => setTweak('displayFont', v)} />
        <TweakSelect label="Color de acento" value={tw.accent}
          options={['Auto (tema)', 'Magenta', 'Cian', 'Lima', 'Naranja']}
          onChange={(v) => setTweak('accent', v)} />

        <TweakSection label="Contenido" />
        <TweakRadio label="Idioma" value={tw.lang}
          options={['Español', 'English']}
          onChange={(v) => setTweak('lang', v)} />
        <TweakRadio label="Tono del texto" value={tw.tone}
          options={['Activista', 'Humor']}
          onChange={(v) => setTweak('tone', v)} />

        <TweakSection label="Demo" />
        <TweakButton label="Ver onboarding" onClick={() => { localStorage.removeItem('sil_onb_v1'); setOnb(true); }} />
      </TweaksPanel>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('stage')).render(<App />);
