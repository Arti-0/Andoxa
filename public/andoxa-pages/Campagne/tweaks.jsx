// Tweaks for Campagnes & Appels — three expressive controls that reshape the feel:
//
//  • Ambiance: swaps the entire blue-family across the page (KPI sparklines,
//    primary buttons, active tabs, chips, sidebar avatars, progress bars).
//  • Surface: the formal language of cards — Studio (default soft white),
//    Papier (flat editorial beige with hairline rules) or Bento (puffy tinted
//    background with deep rounded cards).
//  • Densité: vertical breathing room for the campaigns table and KPI strip.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "ambiance": "andoxa",
  "surface": "studio",
  "densite": "confort"
}/*EDITMODE-END*/;

const AMBIANCES = {
  andoxa: { label: 'Andoxa', sub: 'Bleu cobalt',  primary: '#0052D9', primaryRgb: '0, 82, 217',  hover: '#003EA3', dark: '#003076', tint: '#E8F0FD', tintHover: '#D6E4FB' },
  soleil: { label: 'Soleil', sub: 'Orange brûlé',  primary: '#D9480F', primaryRgb: '217, 72, 15', hover: '#B23800', dark: '#7A2600', tint: '#FFF1E5', tintHover: '#FFE2CC' },
  foret:  { label: 'Forêt',  sub: 'Vert profond',  primary: '#0E7A3A', primaryRgb: '14, 122, 58', hover: '#0A5C2C', dark: '#06401E', tint: '#E5F4EB', tintHover: '#CFE8D9' },
};

const SURFACES = {
  studio: {
    label: 'Studio', sub: 'Cartes blanches, ombres légères',
    pageBg: '#FAFAFB', cardBg: '#FFFFFF',
    cardBorder: '1px solid var(--border)', cardShadow: 'none',
    radius: 12, radiusSm: 8, radiusXs: 6,
  },
  papier: {
    label: 'Papier', sub: 'Plat, hairlines, beige éditorial',
    pageBg: '#F4EFE3', cardBg: '#FFFCF4',
    cardBorder: '1px solid #2826181F', cardShadow: 'none',
    radius: 2, radiusSm: 2, radiusXs: 2,
  },
  bento: {
    label: 'Bento', sub: 'Coins ronds, fond teinté, ombres douces',
    pageBg: '#EAEFF7', cardBg: '#FFFFFF',
    cardBorder: '1px solid transparent',
    cardShadow: '0 8px 24px -10px rgba(15, 23, 42, 0.10), 0 2px 6px -2px rgba(15, 23, 42, 0.04)',
    radius: 18, radiusSm: 12, radiusXs: 8,
  },
};

const DENSITES = {
  compacte: { label: 'Compacte' },
  confort:  { label: 'Confort'  },
  aere:     { label: 'Aéré'     },
};

function applyTweaks(t) {
  const root = document.documentElement;
  const A = AMBIANCES[t.ambiance] || AMBIANCES.andoxa;
  const S = SURFACES[t.surface] || SURFACES.studio;

  root.style.setProperty('--brand-blue',       A.primary);
  root.style.setProperty('--brand-blue-light', A.hover);
  root.style.setProperty('--brand-blue-dark',  A.dark);
  root.style.setProperty('--brand-blue-tint',  A.tint);

  root.style.setProperty('--twk-primary',       A.primary);
  root.style.setProperty('--twk-primary-rgb',   A.primaryRgb);
  root.style.setProperty('--twk-primary-hover', A.hover);
  root.style.setProperty('--twk-primary-dark',  A.dark);
  root.style.setProperty('--twk-primary-tint',  A.tint);
  root.style.setProperty('--twk-primary-tint-hover', A.tintHover);

  root.style.setProperty('--twk-page-bg',     S.pageBg);
  root.style.setProperty('--twk-card-bg',     S.cardBg);
  root.style.setProperty('--twk-card-border', S.cardBorder);
  root.style.setProperty('--twk-card-shadow', S.cardShadow);
  root.style.setProperty('--twk-radius',      S.radius + 'px');
  root.style.setProperty('--twk-radius-sm',   S.radiusSm + 'px');
  root.style.setProperty('--twk-radius-xs',   S.radiusXs + 'px');

  document.body.style.background = S.pageBg;

  root.dataset.surface  = t.surface;
  root.dataset.ambiance = t.ambiance;
  root.dataset.densite  = t.densite;
}

// React inline styles render hex as rgb() on the DOM, so attribute selectors
// against the rgb form catch every place a literal #0052D9 was used as
// background or border-color.
const TWEAKS_CSS = `
  /* ─── Page surface ─────────────────────────────────────────── */
  /* App shell wrappers hardcode #FAFAFB → catch them via the rgb form */
  div[style*="rgb(250, 250, 251)"] { background: var(--twk-page-bg) !important; }

  /* ─── Ambiance: primary blue swaps ─────────────────────────── */
  /* Solid #0052D9 BACKGROUNDS only (primary buttons, checkboxes, sidebar avatar).
     Match must include "background" before the color literal — otherwise the
     selector fires on color:/border: declarations too and paints icons solid blue. */
  *[style*="background: rgb(0, 82, 217)"],
  *[style*="background-color: rgb(0, 82, 217)"],
  *[style*="background:rgb(0, 82, 217)"],
  *[style*="background-color:rgb(0, 82, 217)"] {
    background-color: var(--twk-primary) !important;
  }
  /* Border-color uses the same color literal — handled by combined selector below */
  *[style*="border: 1.5px solid rgb(0, 82, 217)"],
  *[style*="border-left: 3px solid rgb(0, 82, 217)"],
  *[style*="border-left: 4px solid rgb(0, 82, 217)"] {
    border-color: var(--twk-primary) !important;
  }
  /* Light tint chips/backgrounds (#E8F0FD) — same precision rule */
  *[style*="background: rgb(232, 240, 253)"],
  *[style*="background-color: rgb(232, 240, 253)"] {
    background-color: var(--twk-primary-tint) !important;
  }

  /* SVG fills/strokes (sparklines, progress bars use color="#0052D9" passed as fill/stroke) */
  svg path[stroke="#0052D9"], svg circle[fill="#0052D9"] {
    stroke: var(--twk-primary) !important;
  }
  svg circle[fill="#0052D9"] { fill: var(--twk-primary) !important; }
  svg path[fill="#0052D9"]   { fill: var(--twk-primary) !important; }
  /* The sparkline area path renders with fill via CSS-attribute, opacity .12 */
  svg path[fill][opacity="0.12"][d^="M0"] { fill: var(--twk-primary) !important; }

  /* Progress bar fill — inline style background hits the wildcard above. */

  /* ─── Surface: card bodies ────────────────────────────────── */
  /* Bento + Papier both retint white cards. Studio = default no-op. */
  [data-surface="bento"]  div[style*="background: white"],
  [data-surface="bento"]  div[style*="background: rgb(255, 255, 255)"],
  [data-surface="papier"] div[style*="background: white"],
  [data-surface="papier"] div[style*="background: rgb(255, 255, 255)"] {
    background-color: var(--twk-card-bg) !important;
  }

  /* Round/square the cards. The page hardcodes borderRadius 12/14/8/6 — we
     override every radius>=6 to scale into the chosen surface. */
  [data-surface="papier"] *[style*="border-radius: 14px"],
  [data-surface="papier"] *[style*="border-radius: 12px"],
  [data-surface="papier"] *[style*="border-radius: 10px"],
  [data-surface="papier"] *[style*="border-radius: 8px"]  { border-radius: 2px !important; }
  [data-surface="papier"] *[style*="borderRadius: 14px"],
  [data-surface="papier"] *[style*="borderRadius: 12px"]  { border-radius: 2px !important; }

  [data-surface="bento"] *[style*="border-radius: 12px"]  { border-radius: 18px !important; }
  [data-surface="bento"] *[style*="border-radius: 14px"]  { border-radius: 20px !important; }
  [data-surface="bento"] *[style*="border-radius: 8px"]   { border-radius: 12px !important; }
  [data-surface="bento"] *[style*="border-radius: 10px"]  { border-radius: 14px !important; }

  /* Bento adds a soft shadow to anything that looks like a card (white bg + border) */
  [data-surface="bento"] div[style*="background: white"][style*="border-radius"],
  [data-surface="bento"] div[style*="background: rgb(255, 255, 255)"][style*="border-radius"] {
    box-shadow: 0 8px 24px -10px rgba(15, 23, 42, 0.10), 0 2px 6px -2px rgba(15, 23, 42, 0.04) !important;
    border-color: transparent !important;
  }
  [data-surface="papier"] div[style*="background: white"][style*="border-radius"],
  [data-surface="papier"] div[style*="background: rgb(255, 255, 255)"][style*="border-radius"] {
    box-shadow: none !important;
  }

  /* Papier injects a subtle tint to the page-level main */
  [data-surface="papier"] body { font-feature-settings: 'cv11', 'ss01', 'ss06'; }

  /* ─── Densité: compactness of the table + KPI cards ──────── */
  /* Campaign-table cells render with padding: 14px (and a couple variants) */
  [data-densite="compacte"] td[style*="padding: 14px"]               { padding: 7px !important; }
  [data-densite="compacte"] td[style*="padding: 14px 0 14px 14px"]   { padding: 7px 0 7px 14px !important; }
  [data-densite="compacte"] td[style*="padding: 14px 14px 14px 0"]   { padding: 7px 14px 7px 0 !important; }
  [data-densite="aere"]     td[style*="padding: 14px"]               { padding: 22px 14px !important; }
  [data-densite="aere"]     td[style*="padding: 14px 0 14px 14px"]   { padding: 22px 0 22px 14px !important; }
  [data-densite="aere"]     td[style*="padding: 14px 14px 14px 0"]   { padding: 22px 14px 22px 0 !important; }

  /* KPI cards padding (rendered as inline padding: 16px) */
  [data-densite="compacte"] div[style*="padding: 16px"][style*="border-radius"] { padding: 10px 12px !important; }
  [data-densite="aere"]     div[style*="padding: 16px"][style*="border-radius"] { padding: 24px !important; }

  /* Make sure the panel itself stays readable on every surface */
  .twk-panel { color: #1a1a1a !important; }
`;

function TweakBundle() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Inject overrides once.
  React.useEffect(() => {
    const id = '__twk_overrides';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = TWEAKS_CSS;
    document.head.appendChild(style);
  }, []);

  React.useEffect(() => {
    applyTweaks(t);
  }, [t.ambiance, t.surface, t.densite]);

  const ambianceColor = AMBIANCES[t.ambiance].primary;

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Ambiance"/>
      <div style={{ fontSize: 11.5, color: 'rgba(41,38,27,.6)', padding: '0 4px 6px' }}>
        Palette de marque — bleu, orange ou vert.
      </div>
      <TweakColor
        label=""
        value={ambianceColor}
        options={[AMBIANCES.andoxa.primary, AMBIANCES.soleil.primary, AMBIANCES.foret.primary]}
        onChange={(v) => {
          const key = v === AMBIANCES.andoxa.primary ? 'andoxa'
                    : v === AMBIANCES.soleil.primary ? 'soleil' : 'foret';
          setTweak('ambiance', key);
        }}
      />
      <div style={{ fontSize: 10.5, color: 'rgba(41,38,27,.45)', padding: '0 4px', marginTop: -4, fontVariantNumeric: 'tabular-nums' }}>
        {AMBIANCES[t.ambiance].label} · {AMBIANCES[t.ambiance].sub}
      </div>

      <TweakSection label="Surface"/>
      <div style={{ fontSize: 11.5, color: 'rgba(41,38,27,.6)', padding: '0 4px 6px' }}>
        Langage formel des cartes — souple, plat ou rebondi.
      </div>
      <TweakRadio
        label=""
        value={t.surface}
        options={[
          { value: 'studio', label: 'Studio' },
          { value: 'papier', label: 'Papier' },
          { value: 'bento',  label: 'Bento'  },
        ]}
        onChange={(v) => setTweak('surface', v)}
      />
      <div style={{ fontSize: 10.5, color: 'rgba(41,38,27,.45)', padding: '0 4px', marginTop: -4 }}>
        {SURFACES[t.surface].sub}
      </div>

      <TweakSection label="Densité"/>
      <div style={{ fontSize: 11.5, color: 'rgba(41,38,27,.6)', padding: '0 4px 6px' }}>
        Espace vertical des lignes et cartes.
      </div>
      <TweakRadio
        label=""
        value={t.densite}
        options={[
          { value: 'compacte', label: 'Compact' },
          { value: 'confort',  label: 'Confort' },
          { value: 'aere',     label: 'Aéré'    },
        ]}
        onChange={(v) => setTweak('densite', v)}
      />
    </TweaksPanel>
  );
}

window.TweakBundle = TweakBundle;
