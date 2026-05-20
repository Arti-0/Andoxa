// Andoxa global sidebar (left nav).
// Delegates to the canonical AndoxaSidebar (window.AndoxaSidebar).
function Sidebar() {
  return <AndoxaSidebar active="inbox" logoBase="assets/" />;
}

window.Sidebar = Sidebar;
