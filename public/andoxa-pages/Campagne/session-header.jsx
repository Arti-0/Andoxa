// Session header — two rows. Sober tool chrome.

function SessionHeader({
  campaignName, startLabel, durationSec, paused,
  goal, completed, scriptDefined,
  onExit, onPauseToggle, onConfigureScript, onShowShortcuts,
}) {
  const mm = String(Math.floor(durationSec / 60)).padStart(2, '0');
  const ss = String(durationSec % 60).padStart(2, '0');
  const pct = goal ? Math.min(100, (completed / goal) * 100) : 0;

  return (
    <header style={{
      flexShrink: 0,
      background: 'white',
      borderBottom: '1px solid var(--border)',
      padding: '12px 22px 12px',
      display: 'flex', flexDirection: 'column', gap: 10,
      zIndex: 5,
    }}>
      {/* Row 1 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onExit} style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '6px 11px 6px 9px', borderRadius: 7,
          border: '1px solid var(--border)', background: 'white',
          fontSize: 13, fontWeight: 500, color: 'var(--foreground)', cursor: 'pointer',
        }}>
          {Icon.arrowLeft({ size: 14 })} Quitter la session
        </button>

        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '3px 9px 3px 7px', borderRadius: 9999,
          background: paused ? 'var(--neutral-100)' : '#FDECEC',
          color: paused ? 'var(--muted-foreground)' : '#A8221C',
          fontSize: 11, fontWeight: 600, letterSpacing: '0.02em',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: paused ? 'var(--muted-foreground)' : '#DC2626',
            boxShadow: paused ? 'none' : '0 0 0 3px rgba(220,38,38,0.18)',
            animation: paused ? 'none' : 'pulse 1.4s ease-in-out infinite',
          }}/>
          {paused ? 'EN PAUSE' : 'EN SESSION'}
        </span>

        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {campaignName}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)' }}>{startLabel}</div>
        </div>

        <div style={{ flex: 1 }}/>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '6px 12px', borderRadius: 7,
          background: 'var(--neutral-100)',
          fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500,
          color: 'var(--foreground)', letterSpacing: '0.01em',
          fontVariantNumeric: 'tabular-nums',
        }}>
          <span style={{ color: 'var(--muted-foreground)', display: 'flex' }}>{Icon.clock({ size: 13 })}</span>
          {mm}:{ss}
        </div>

        <button onClick={onPauseToggle} title={paused ? 'Reprendre' : 'Mettre en pause'} style={{
          width: 34, height: 34, borderRadius: 7, border: '1px solid var(--border)',
          background: 'white', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--foreground)',
        }}>
          {paused ? Icon.play({ size: 12 }) : Icon.pause({ size: 12 })}
        </button>

        <button onClick={onShowShortcuts} title="Raccourcis clavier" style={{
          width: 34, height: 34, borderRadius: 7, border: '1px solid var(--border)',
          background: 'white', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--muted-foreground)',
          fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600,
        }}>?</button>
      </div>

      {/* Row 2 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, maxWidth: 460 }}>
          <span style={{ fontSize: 12, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
            <strong style={{ color: 'var(--foreground)', fontWeight: 600 }}>{completed}</strong>
            <span> / {goal} appels</span>
          </span>
          <div style={{ flex: 1, height: 4, background: 'var(--neutral-100)', borderRadius: 9999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: '#0052D9', borderRadius: 9999, transition: 'width 300ms' }}/>
          </div>
        </div>
        <div style={{ flex: 1 }}/>
        <button onClick={onConfigureScript} style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '7px 12px', borderRadius: 7,
          border: '1px solid var(--border)', background: 'white',
          fontSize: 13, fontWeight: 500, color: 'var(--foreground)', cursor: 'pointer',
        }}>
          {scriptDefined ? Icon.edit({ size: 13 }) : Icon.plus({ size: 13 })}
          {scriptDefined ? 'Modifier le script' : 'Configurer le script de session'}
        </button>
      </div>
    </header>
  );
}

window.SessionHeader = SessionHeader;
