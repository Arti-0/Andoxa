"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirect /call-sessions to /campaigns (campaigns and call-sessions are merged).
 */
export default function CallSessionsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/campaigns");
  }, [router]);
  return null;
}
