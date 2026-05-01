// Inline keyframes / scrollbar tweaks for the design.
// Scoped via .ws2-root so they don't leak into the rest of the app.

export function Whatsapp2Styles() {
  return (
    <style>{`
      @keyframes andoxa-fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      .andoxa-fade-up { animation: andoxa-fadeUp 0.3s ease forwards; }
      @keyframes andoxa-pulse { 0%,100% { opacity:1; } 50% { opacity:.5; } }
      .ws2-root *::-webkit-scrollbar { width: 6px; height: 6px; }
      .ws2-root *::-webkit-scrollbar-track { background: transparent; }
      .ws2-root *::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
      .ws2-root input:focus, .ws2-root textarea:focus, .ws2-root select:focus {
        outline: none !important;
        border-color: #0052D9 !important;
        box-shadow: 0 0 0 3px rgba(0,82,217,0.1) !important;
      }
    `}</style>
  );
}
