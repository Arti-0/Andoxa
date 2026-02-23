"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <Button 
      variant="ghost"
      size="sm"
      onClick={logout}
      className="h-10 px-4 text-sm font-semibold text-slate-700 dark:text-slate-200 btn-neumorphism glassmorphism rounded-full border-0"
    >
      Se déconnecter
    </Button>
  );
}
