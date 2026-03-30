"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { UnifiedHeader } from "@/components/v3/homepage/UnifiedHeader";
import Balancer from "react-wrap-balancer";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        router.replace("/auth/login?next=/auth/update-password");
        return;
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: upd } = await supabase.auth.updateUser({ password });
      if (upd) throw upd;
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Impossible de mettre à jour le mot de passe."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-svh bg-slate-50 dark:bg-slate-900">
        <UnifiedHeader showMobileMenu={false} enableScrollEffect={false} />
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-slate-50 dark:bg-slate-900 relative overflow-hidden">
      <UnifiedHeader showMobileMenu={false} enableScrollEffect={false} />
      <div className="relative z-10 flex min-h-screen items-center justify-center p-6 pt-32">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              <Balancer>Définir votre mot de passe</Balancer>
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Choisissez un mot de passe pour accéder à votre compte.
            </p>
          </div>
          <Card className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border-white/20 dark:border-white/10 shadow-xl rounded-2xl">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirmer</Label>
                  <Input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
                {error ? (
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                ) : null}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Enregistrement…" : "Continuer vers le tableau de bord"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
