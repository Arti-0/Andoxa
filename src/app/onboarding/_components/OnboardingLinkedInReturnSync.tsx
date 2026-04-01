"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function OnboardingLinkedInReturnSync({
  refresh,
}: {
  refresh: () => Promise<void>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const linkedHandled = useRef(false);

  useEffect(() => {
    if (linkedHandled.current) return;
    if (searchParams.get("linked") !== "1") return;
    linkedHandled.current = true;
    void refresh().then(() => {
      const path = pathname;
      const sp = searchParams.toString();
      setTimeout(() => {
        const params = new URLSearchParams(sp);
        params.delete("linked");
        const q = params.toString();
        router.replace(q ? `${path}?${q}` : path, { scroll: false });
        toast.success("LinkedIn connecté");
      }, 0);
    });
  }, [pathname, refresh, router, searchParams]);

  return null;
}
