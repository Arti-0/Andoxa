// Andoxa Calendrier — App root

function App() {
  const [selectedEvent, setSelectedEvent] = React.useState(null);
  const [creating, setCreating] = React.useState(null); // { day, start, end } or {} or null
  const [toast, setToast] = React.useState(null);
  const [visible, setVisible] = React.useState({
    me: true,
    gcal: true,
    andreas: true,
    lucile: true,
    malik: true,
    sarah: true,
    holidays: true,
    vacances: false,
  });
  const toggle = (id) => setVisible(v => ({ ...v, [id]: !v[id] }));

  const handleCreate = () => {
    setCreating(null);
    setToast("Événement créé · Discovery avec Andréas BODIN demain à 10:00");
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F5F7FA' }}>
      <CalSidebar/>
      <CalendarsSidebar visible={visible} onToggle={toggle}/>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <CalHeader onCreate={() => setCreating({})}/>
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px 18px' }}>
          <BookingLink/>
          <KpiCards/>
          <CalendarGrid
            visible={visible}
            onSelectEvent={setSelectedEvent}
            onCreate={(slot) => setCreating(slot)}
          />
        </div>
      </main>

      {selectedEvent && <EventPanel event={selectedEvent} onClose={() => setSelectedEvent(null)}/>}
      <CreateEventModal open={creating !== null} prefill={creating} onClose={() => setCreating(null)} onCreate={handleCreate}/>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)',
          background: '#0F172A', color: '#fff', padding: '10px 16px',
          borderRadius: 9, fontSize: 12.5, zIndex: 300,
          boxShadow: '0 6px 20px rgba(15,23,42,0.25)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          {toast}
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
