// Andoxa Calendrier — Main left sidebar (Andoxa app nav)
// Delegates to the canonical AndoxaSidebar (window.AndoxaSidebar).

function CalSidebar() {
  return <AndoxaSidebar active="calendar" logoBase="assets/" />;
}

Object.assign(window, { CalSidebar });
