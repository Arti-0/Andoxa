"use client";

import { LinkedInLoginForm } from "@/lib/auth/components/linkedin-login-form";
import { UnifiedHeader } from "@/components/v3/homepage/UnifiedHeader";
import Balancer from "react-wrap-balancer";

export default function Page() {
  return (
    <div className="min-h-svh bg-slate-50 dark:bg-slate-900 relative overflow-hidden">
      {/* Header unifié */}
      <UnifiedHeader showMobileMenu={false} enableScrollEffect={false} />

      {/* Conteneur principal avec background animé */}
      <div className="relative w-full min-h-screen overflow-hidden">
        {/* 3 carrés floutés animés */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="auth-background-shape auth-shape-1" />
          <div className="auth-background-shape auth-shape-2" />
          <div className="auth-background-shape auth-shape-3" />
        </div>

        {/* Contenu centré */}
        <div className="relative z-10 flex min-h-screen items-center justify-center p-6 pt-32">
          <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Titre et sous-titre */}
            <div className="text-center mb-12">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                <Balancer>Bienvenue sur Andoxa</Balancer>
              </h1>
            </div>

            {/* Formulaire LinkedIn */}
            <div className="animate-in fade-in duration-500">
              <LinkedInLoginForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
