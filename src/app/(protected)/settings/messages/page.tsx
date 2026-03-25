import { redirect } from "next/navigation";

/** Ancienne URL : les modèles sont dans /messagerie (onglet Templates). */
export default function SettingsMessagesRedirectPage() {
  redirect("/messagerie?view=templates");
}
