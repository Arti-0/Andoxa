"use client";

import { usePathname } from "next/navigation";
import { NotificationLogo } from "./NotificationLogo";

/**
 * Wrapper pour NotificationLogo
 * Pour l'instant, le bouton n'apparaît que dans le header (via SiteHeader)
 * Exception : afficher sur /andoxa pour les tests de toasts
 * Le drag et l'affichage sur les autres pages seront ajoutés plus tard (Andoxa 2.1 ou 2.2)
 */
export function NotificationLogoWrapper() {
  const pathname = usePathname();
  
  // Afficher uniquement sur /andoxa pour les tests
  if (pathname === "/andoxa") {
    return <NotificationLogo />;
  }
  
  // Ne rien afficher ailleurs - le bouton est uniquement dans le header
  return null;
}

