"use client";

import { WizardClient } from "../_components/wizard";
import { Whatsapp2Styles } from "../_components/styles";

export default function Whatsapp2NewPage() {
  return (
    <div className="ws2-root flex h-full min-h-0 flex-col bg-background font-sans text-foreground">
      <Whatsapp2Styles />
      <WizardClient />
    </div>
  );
}
