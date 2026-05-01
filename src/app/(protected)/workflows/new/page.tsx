"use client";

import { WizardClient } from "../_components/wizard";
import { Whatsapp2Styles } from "../_components/styles";

export default function Whatsapp2NewPage() {
  return (
    <div
      className="ws2-root"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "white",
        fontFamily:
          "'Geist', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <Whatsapp2Styles />
      <WizardClient />
    </div>
  );
}
