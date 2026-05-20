// Session topbar — replaces the standard app shell during a call session.
// Shows: exit, campaign name, session goal/progress, timer, agent, settings.

function SessionTopbar({
  campaignName, goal, completed, sessionDurationSec,
  agent, onExit, onShortcuts, onConfigureScript,
}) {
  const pct = goal ? Math.min(100, (completed / goal) * 100) : 0;
  const mm = String(Math.floor(sessionDurationSec / 60)).padStart(2, '0');
  const ss = String(sessionDurationSec % 60).padStart(2, '0');

  return (
    <header style={{
      flexShrink: 0,
      height: 60,
      background: 'white',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 20px', gap: 16,
      zIndex: 5,
    }}>
      {/* Exit */}
      <button onClick={onExit} style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '6px 10px 6px 8px', borderRadius: 7,
        border: '1px solid var(--border)', background: 'white',
        fontSize: 13, fontWeight: 500, color: 'var(--foreground)',
        cursor: 'pointer',
      }}>
        {Icon.arrowLeft({ size: 14 })}
        <span>Quitter la session</span>
      </button>

      {/* Live indicator + campaign */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 6, borderLeft: '1px solid var(--border)', height: 32, marginLeft: 4 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '3px 9px 3px 7px', borderRadius: 9999,
          background: '#FDECEC', color: '#A8221C',
          fontSize: 11.5, fontWeight: 600, letterSpacing: '-0.005em',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: '#DC2626',
            boxShadow: '0 0 0 3px rgba(220,38,38,0.18)',
            animation: 'pulse 1.4s ease-in-out infinite',
          }}/>
          EN SESSION
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em' }}>{campaignName}</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)' }}>Session du 6 mai · 14:00</div>
        </div>
      </div>

      <div style={{ flex: 1 }}/>

      {/* Goal progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)', fontWeight: 500 }}>
            Objectif de session
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>
            <span style={{ color: 'var(--foreground)' }}>{completed}</span>
            <span style={{ color: 'var(--muted-foreground)' }}> / {goal} appels</span>
          </div>
        </div>
        <div style={{ width: 140 }}>
          <ProgressBar value={completed} max={goal} color="#0052D9" height={6}/>
        </div>
      </div>

      <div style={{ width: 1, height: 28, background: 'var(--border)' }}/>

      {/* Session timer */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '6px 12px', borderRadius: 7,
        background: 'var(--neutral-100)',
        fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500,
        color: 'var(--foreground)', letterSpacing: '0.01em',
      }}>
        <span style={{ color: 'var(--muted-foreground)', display: 'flex' }}>{Icon.clock({ size: 13 })}</span>
        {mm}:{ss}
      </div>

      <div style={{ width: 1, height: 28, background: 'var(--border)' }}/>

      {/* Configure script */}
      <button onClick={onConfigureScript} title="Configurer le script de session" style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '7px 11px', borderRadius: 7,
        border: '1px solid var(--border)', background: 'white',
        fontSize: 12.5, fontWeight: 500, color: 'var(--foreground)',
        cursor: 'pointer',
      }}>
        {Icon.edit({ size: 13 })}
        <span>Script</span>
      </button>

      {/* Shortcuts */}
      <button onClick={onShortcuts} title="Raccourcis clavier" style={{
        width: 34, height: 34, borderRadius: 7, border: '1px solid var(--border)',
        background: 'white', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--muted-foreground)',
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600 }}>?</span>
      </button>

      {/* Agent */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, paddingLeft: 4 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: '#0052D9', color: 'white',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700,
        }}>{agent.initials}</div>
      </div>
    </header>
  );
}

window.SessionTopbar = SessionTopbar;
