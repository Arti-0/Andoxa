// Main page — Campagnes & Appels
const { useState, useMemo, useEffect } = React;

function ConfirmModal({ open, title, message, confirmLabel, onConfirm, onCancel, destructive }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 150, animation: 'fadeIn 150ms ease',
    }} onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'white', borderRadius: 14, padding: 24,
        maxWidth: 440, width: 'calc(100% - 40px)',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        animation: 'modalIn 180ms ease',
      }}>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6, letterSpacing: '-0.015em' }}>{title}</div>
        <div style={{ fontSize: 13.5, color: 'var(--muted-foreground)', lineHeight: 1.55, marginBottom: 20 }}>{message}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" onClick={onCancel}>Annuler</Button>
          <Button variant={destructive ? 'destructive' : 'primary'} onClick={onConfirm}
            style={destructive ? { background: '#DC2626', color: 'white', borderColor: '#DC2626' } : {}}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function BulkActionBar({ count, onAction, onClear }) {
  if (count === 0) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--neutral-950)', color: 'white',
      padding: '10px 14px 10px 18px', borderRadius: 12,
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 20px 35px -10px rgba(0,0,0,0.3)',
      zIndex: 90, animation: 'slideUp 200ms ease',
    }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>
        <strong style={{ fontWeight: 700 }}>{count}</strong> sélectionné{count > 1 ? 's' : ''}
      </span>
      <span style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.15)' }}/>
      {[
        { id: 'pause', label: 'Mettre en pause', icon: 'pause' },
        { id: 'duplicate', label: 'Dupliquer', icon: 'copy' },
        { id: 'export', label: 'Exporter', icon: 'download' },
        { id: 'delete', label: 'Supprimer', icon: 'trash', destructive: true },
      ].map(a => (
        <button key={a.id} onClick={() => onAction(a.id)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'transparent', border: 'none',
          color: a.destructive ? '#FCA5A5' : 'white',
          fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
          padding: '6px 10px', borderRadius: 6,
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = a.destructive ? 'rgba(220,38,38,0.2)' : 'rgba(255,255,255,0.1)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          {Icon[a.icon]({ size: 13 })}
          {a.label}
        </button>
      ))}
      <span style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.15)' }}/>
      <button onClick={onClear} style={{
        background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 4,
      }} onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}>
        {Icon.x({ size: 14 })}
      </button>
    </div>
  );
}

function EmptyState({ filtered, onCreateCampaign, onNewSession, onReset }) {
  if (filtered) {
    return (
      <div style={{
        background: 'white', border: '1px solid var(--border)', borderRadius: 12,
        padding: '60px 24px', textAlign: 'center',
      }}>
        <div style={{
          width: 56, height: 56, margin: '0 auto 16px',
          borderRadius: 12, background: 'var(--neutral-100)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--muted-foreground)',
        }}>{Icon.search({ size: 24 })}</div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Aucun résultat pour ces filtres</div>
        <div style={{ fontSize: 13.5, color: 'var(--muted-foreground)', marginBottom: 20 }}>
          Essayez d'élargir vos critères ou réinitialisez tous les filtres.
        </div>
        <Button variant="secondary" onClick={onReset} leftIcon={Icon.rotate({ size: 14 })}>Réinitialiser les filtres</Button>
      </div>
    );
  }
  return (
    <div style={{
      background: 'white', border: '1px solid var(--border)', borderRadius: 12,
      padding: '80px 24px', textAlign: 'center',
    }}>
      <div style={{
        width: 64, height: 64, margin: '0 auto 18px',
        borderRadius: 14, background: 'var(--brand-blue-tint)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--brand-blue)',
      }}>{Icon.target({ size: 28 })}</div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, letterSpacing: '-0.015em' }}>
        Aucune campagne pour l'instant
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--muted-foreground)', marginBottom: 24, maxWidth: 380, margin: '0 auto 24px' }}>
        Lancez votre première séquence d'outreach LinkedIn ou WhatsApp, ou démarrez une session d'appels téléphoniques.
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <Button variant="primary" onClick={onCreateCampaign} leftIcon={Icon.plus({ size: 14 })}>Créer une campagne</Button>
        <Button variant="secondary" onClick={onNewSession} leftIcon={Icon.phone({ size: 14 })}>Lancer une session d'appels</Button>
      </div>
    </div>
  );
}

function Tabs({ tab, setTab, counts }) {
  const tabs = [
    { id: 'campaigns', label: 'Campagnes', count: counts.campaigns },
    { id: 'sessions',  label: "Sessions d'appels", count: counts.sessions },
    { id: 'all',       label: 'Tous', count: counts.all },
  ];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 2,
      borderBottom: '1px solid var(--border)',
      paddingTop: 4,
    }}>
      {tabs.map(t => {
        const active = tab === t.id;
        return (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 13.5, fontWeight: active ? 600 : 500,
              color: active ? 'var(--foreground)' : 'var(--muted-foreground)',
              letterSpacing: '-0.005em',
              transition: 'color 100ms',
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'var(--foreground)'; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = 'var(--muted-foreground)'; }}>
            {t.label}
            <span style={{
              fontSize: 11.5, fontWeight: 600,
              background: active ? 'var(--brand-blue-tint)' : 'var(--neutral-100)',
              color: active ? 'var(--brand-blue-dark)' : 'var(--muted-foreground)',
              padding: '1px 6px', borderRadius: 9999,
              fontVariantNumeric: 'tabular-nums',
            }}>{t.count}</span>
            {active && <span style={{
              position: 'absolute', bottom: -1, left: 0, right: 0, height: 2,
              background: 'var(--foreground)', borderRadius: 2,
            }}/>}
          </button>
        );
      })}
    </div>
  );
}

function SearchInput({ value, onChange }) {
  return (
    <div style={{ position: 'relative', minWidth: 280 }}>
      <span style={{
        position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
        color: 'var(--muted-foreground)', display: 'flex', pointerEvents: 'none',
      }}>{Icon.search({ size: 14 })}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Rechercher une campagne..."
        style={{
          width: '100%', height: 34, padding: '0 12px 0 32px',
          border: '1px solid var(--border)', borderRadius: 8,
          background: 'white', fontSize: 13, fontFamily: 'var(--font-sans)',
          outline: 'none', transition: 'border-color 120ms',
        }}
        onFocus={(e) => e.target.style.borderColor = 'var(--brand-blue)'}
        onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
      />
      {value && (
        <button onClick={() => onChange('')} style={{
          position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--muted-foreground)', padding: 4, display: 'flex',
          borderRadius: 4,
        }}>{Icon.x({ size: 14 })}</button>
      )}
    </div>
  );
}

function CampagnesPage() {
  const { push } = React.useContext(ToastContext);
  const [campaigns, setCampaigns] = useState(INITIAL_CAMPAIGNS);
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);
  const [tab, setTab] = useState('campaigns');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ channels: [], statuses: [], period: '7', creators: [] });
  const [selected, setSelected] = useState([]);
  const [sortBy, setSortBy] = useState({ field: 'launchedAt', dir: 'desc' });
  const [confirm, setConfirm] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [flashedId, setFlashedId] = useState(null);

  // Apply filters
  const periodMs = { '7': 7*86400000, '30': 30*86400000, '90': 90*86400000 };
  const now = new Date('2026-05-06T12:00:00').getTime();

  const filterFn = (item) => {
    // Search
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    // Channel
    if (filters.channels.length > 0 && !filters.channels.includes(item.channel)) return false;
    // Status
    if (filters.statuses.length > 0 && !filters.statuses.includes(item.status)) return false;
    // Creator
    if (filters.creators.length > 0 && !filters.creators.includes(item.creator)) return false;
    // Period
    if (filters.period !== 'all') {
      const d = item.launchedAt || item.date;
      if (!d) return false;
      if (now - new Date(d).getTime() > periodMs[filters.period]) return false;
    }
    return true;
  };

  const filteredCampaigns = useMemo(() => {
    let out = campaigns.filter(filterFn);
    out = [...out].sort((a, b) => {
      const f = sortBy.field;
      let av = a[f], bv = b[f];
      if (f === 'progress') { av = a.processed/(a.total||1); bv = b.processed/(b.total||1); }
      if (f === 'performance') {
        const pa = TYPE_PERF[a.type]?.(a); const pb = TYPE_PERF[b.type]?.(b);
        av = pa ? parseFloat(pa.rate) : -1; bv = pb ? parseFloat(pb.rate) : -1;
      }
      if (av == null) return 1; if (bv == null) return -1;
      if (av < bv) return sortBy.dir === 'asc' ? -1 : 1;
      if (av > bv) return sortBy.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return out;
  }, [campaigns, search, filters, sortBy]);

  const filteredSessions = useMemo(() => sessions.filter(filterFn).sort((a, b) => {
    const av = new Date(a.date).getTime(), bv = new Date(b.date).getTime();
    return bv - av;
  }), [sessions, search, filters]);

  const allItems = useMemo(() => {
    const combined = [...filteredCampaigns, ...filteredSessions];
    return combined.sort((a, b) => {
      const av = new Date(a.launchedAt || a.date || 0).getTime();
      const bv = new Date(b.launchedAt || b.date || 0).getTime();
      return bv - av;
    });
  }, [filteredCampaigns, filteredSessions]);

  const counts = {
    campaigns: campaigns.filter(filterFn).length,
    sessions: sessions.filter(filterFn).length,
    all: campaigns.filter(filterFn).length + sessions.filter(filterFn).length,
  };
  const totalCount = campaigns.length + sessions.length;
  const filteredCount = counts.all;

  const handleAction = (action, item) => {
    if (action === 'pause') {
      setCampaigns(cs => cs.map(c => c.id === item.id ? { ...c, status: 'paused' } : c));
      push({ message: `« ${item.name} » mise en pause`, kind: 'success' });
    } else if (action === 'resume') {
      setCampaigns(cs => cs.map(c => c.id === item.id ? { ...c, status: 'running' } : c));
      push({ message: `« ${item.name} » reprise`, kind: 'success' });
    } else if (action === 'launch') {
      setCampaigns(cs => cs.map(c => c.id === item.id ? { ...c, status: 'running', launchedAt: new Date().toISOString() } : c));
      push({ message: `« ${item.name} » lancée`, kind: 'success' });
    } else if (action === 'duplicate') {
      const isCampaign = item.kind === 'campaign';
      const copy = { ...item, id: Math.random().toString(36).slice(2), name: `${item.name} (copie)`, status: 'draft', processed: 0, accepted: 0, replied: 0, meetings: 0, launchedAt: null };
      if (isCampaign) setCampaigns(cs => [copy, ...cs]);
      else setSessions(ss => [{ ...copy, status: 'ready', date: new Date().toISOString() }, ...ss]);
      push({ message: `« ${item.name} » dupliquée`, kind: 'success' });
    } else if (action === 'delete') {
      setConfirm({
        title: 'Supprimer cette campagne ?',
        message: `« ${item.name} » sera définitivement supprimée. Cette action est irréversible.`,
        confirmLabel: 'Supprimer',
        destructive: true,
        onConfirm: () => {
          if (item.kind === 'session') setSessions(ss => ss.filter(s => s.id !== item.id));
          else setCampaigns(cs => cs.filter(c => c.id !== item.id));
          push({ message: `« ${item.name} » supprimée`, kind: 'destructive' });
          setConfirm(null);
        },
      });
    } else if (action === 'view') {
      push({ message: `Ouverture de « ${item.name} »`, kind: 'success' });
    } else if (action === 'start') {
      setSessions(ss => ss.map(s => s.id === item.id ? { ...s, status: 'running' } : s));
      push({ message: `Session démarrée`, kind: 'success' });
    }
  };

  const handleBulk = (action) => {
    const names = campaigns.filter(c => selected.includes(c.id)).map(c => c.name);
    if (action === 'delete') {
      setConfirm({
        title: `Supprimer ${selected.length} campagne${selected.length > 1 ? 's' : ''} ?`,
        message: `Cette action est irréversible.`,
        confirmLabel: 'Supprimer',
        destructive: true,
        onConfirm: () => {
          setCampaigns(cs => cs.filter(c => !selected.includes(c.id)));
          push({ message: `${selected.length} campagne${selected.length > 1 ? 's supprimées' : ' supprimée'}`, kind: 'destructive' });
          setSelected([]);
          setConfirm(null);
        },
      });
    } else if (action === 'pause') {
      setCampaigns(cs => cs.map(c => selected.includes(c.id) && c.status === 'running' ? { ...c, status: 'paused' } : c));
      push({ message: `${selected.length} campagne${selected.length > 1 ? 's mises' : ' mise'} en pause`, kind: 'success' });
      setSelected([]);
    } else if (action === 'duplicate') {
      const dups = campaigns.filter(c => selected.includes(c.id)).map(c => ({ ...c, id: Math.random().toString(36).slice(2), name: `${c.name} (copie)`, status: 'draft', processed: 0, launchedAt: null }));
      setCampaigns(cs => [...dups, ...cs]);
      push({ message: `${dups.length} campagne${dups.length > 1 ? 's dupliquées' : ' dupliquée'}`, kind: 'success' });
      setSelected([]);
    } else if (action === 'export') {
      push({ message: `Export en cours...`, kind: 'success' });
      setSelected([]);
    }
  };

  const isEmpty = totalCount === 0;
  const isFilteredEmpty = !isEmpty && filteredCount === 0;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#FAFAFB' }}>
      {/* Page header */}
      <div style={{
        padding: '20px 32px 0', display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
      }}>
        <div>
          <h1 style={{
            fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em',
            color: 'var(--foreground)', marginBottom: 2,
          }}>Campagnes & Appels</h1>
          <div style={{ fontSize: 13.5, color: 'var(--muted-foreground)' }}>
            Pilotez votre prospection LinkedIn, WhatsApp et téléphone depuis un seul hub.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" leftIcon={Icon.phone({ size: 14 })} onClick={() => setBookingOpen(true)}>
            Nouvelle session d'appels
          </Button>
          <Button variant="primary" leftIcon={Icon.plus({ size: 14 })} onClick={() => setCreateOpen(true)}>
            Créer une campagne
          </Button>
        </div>
      </div>

      <div style={{ padding: '20px 32px 0' }}>
        <KpiBar period={filters.period} creators={filters.creators}/>
      </div>

      {/* Tabs + search */}
      <div style={{ padding: '24px 32px 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <Tabs tab={tab} setTab={setTab} counts={counts}/>
        <div style={{ paddingBottom: 8 }}>
          <SearchInput value={search} onChange={setSearch}/>
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '0 32px' }}>
        <FiltersBar filters={filters} setFilters={setFilters} totalCount={totalCount} filteredCount={filteredCount}/>
      </div>

      {/* Content */}
      <div style={{ padding: '4px 32px 80px', flex: 1 }}>
        {isEmpty ? (
          <EmptyState onCreateCampaign={() => {}} onNewSession={() => {}}/>
        ) : isFilteredEmpty ? (
          <EmptyState filtered onReset={() => { setFilters({ channels: [], statuses: [], period: 'all', creators: [] }); setSearch(''); }}/>
        ) : tab === 'campaigns' ? (
          filteredCampaigns.length > 0 ? (
            <CampaignsTable items={filteredCampaigns} selected={selected} setSelected={setSelected}
              onAction={handleAction} sortBy={sortBy} setSortBy={setSortBy} flashedId={flashedId}/>
          ) : <EmptyState filtered onReset={() => { setFilters({ channels: [], statuses: [], period: 'all', creators: [] }); setSearch(''); }}/>
        ) : tab === 'sessions' ? (
          filteredSessions.length > 0 ? (
            <SessionsGrid sessions={filteredSessions} onAction={handleAction}/>
          ) : <EmptyState filtered onReset={() => { setFilters({ channels: [], statuses: [], period: 'all', creators: [] }); setSearch(''); }}/>
        ) : (
          <Timeline items={allItems} onAction={handleAction}/>
        )}
      </div>

      <BulkActionBar count={tab === 'campaigns' ? selected.length : 0} onAction={handleBulk} onClear={() => setSelected([])}/>

      <CreateCampaignModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(data) => {
          const TYPE_TO_KIND = { invitation_only: 'linkedin_invitation', message_only: 'linkedin_message', invitation_message: 'linkedin_invitation_message' };
          const newC = {
            id: 'new-' + Math.random().toString(36).slice(2),
            kind: 'campaign', name: data.name, channel: 'linkedin',
            type: TYPE_TO_KIND[data.type] || 'linkedin_message',
            status: 'running', processed: 0, total: 3, accepted: 0, replied: 0, meetings: 0,
            launchedAt: new Date().toISOString(), creator: 'sebastian',
          };
          setCampaigns(cs => [newC, ...cs]);
          setCreateOpen(false);
          setTab('campaigns');
          setFlashedId(newC.id);
          push({ message: `« ${data.name} » lancée`, kind: 'success' });
          setTimeout(() => setFlashedId(null), 2000);
        }}
        onDraft={(data) => {
          const TYPE_TO_KIND = { invitation_only: 'linkedin_invitation', message_only: 'linkedin_message', invitation_message: 'linkedin_invitation_message' };
          const newC = {
            id: 'new-' + Math.random().toString(36).slice(2),
            kind: 'campaign', name: data.name || 'Brouillon sans titre', channel: 'linkedin',
            type: TYPE_TO_KIND[data.type] || 'linkedin_message',
            status: 'draft', processed: 0, total: 3,
            launchedAt: null, creator: 'sebastian',
          };
          setCampaigns(cs => [newC, ...cs]);
          setCreateOpen(false);
          setTab('campaigns');
          setFlashedId(newC.id);
          push({ message: `Brouillon enregistré`, kind: 'success' });
          setTimeout(() => setFlashedId(null), 2000);
        }}
      />

      <ConfirmModal
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        destructive={confirm?.destructive}
        onConfirm={confirm?.onConfirm}
        onCancel={() => setConfirm(null)}
      />

      <CallSessionModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        onCreate={(data) => {
          const newS = {
            id: 'sess-' + Math.random().toString(36).slice(2),
            kind: 'session',
            name: data.name,
            channel: 'phone',
            status: data.startsNow ? 'running' : 'ready',
            processed: 0,
            total: data.prospectCount,
            meetings: 0,
            qualifications: 0,
            pickupRate: 0,
            scheduledAt: data.scheduleMode === 'later' && data.scheduleDate
              ? new Date(`${data.scheduleDate}T${data.scheduleTime || '09:00'}`).toISOString()
              : new Date().toISOString(),
            creator: 'sebastian',
          };
          setSessions(ss => [newS, ...ss]);
          setBookingOpen(false);
          setTab('sessions');
          setFlashedId(newS.id);
          push({
            message: data.startsNow ? `Session « ${data.name} » démarrée` : `Session « ${data.name} » planifiée`,
            sub: `${data.prospectCount} prospect${data.prospectCount > 1 ? 's' : ''} · ${data.assignee?.name}`,
            kind: 'success',
          });
          setTimeout(() => setFlashedId(null), 2000);
        }}
        onDraft={(data) => {
          const newS = {
            id: 'sess-' + Math.random().toString(36).slice(2),
            kind: 'session',
            name: data.name || 'Brouillon de session',
            channel: 'phone',
            status: 'draft',
            processed: 0,
            total: data.prospectCount,
            meetings: 0, qualifications: 0, pickupRate: 0,
            scheduledAt: null,
            creator: 'sebastian',
          };
          setSessions(ss => [newS, ...ss]);
          setBookingOpen(false);
          setTab('sessions');
          setFlashedId(newS.id);
          push({ message: 'Brouillon enregistré', kind: 'success' });
          setTimeout(() => setFlashedId(null), 2000);
        }}
      />
    </div>
  );
}

window.CampagnesPage = CampagnesPage;
