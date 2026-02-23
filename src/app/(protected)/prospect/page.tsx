"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Page Prospect - Redirige vers le CRM (gestion des prospects)
 */
export default function ProspectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/crm");
  }, [router]);

  return null;
}
