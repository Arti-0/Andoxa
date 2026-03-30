"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { logger } from "@/lib/utils/logger";
import { translateAuthError } from "@/lib/utils/translate-auth-error";
import { toast } from "sonner";

const MIN_PASSWORD_LEN = 8;

function isInvalidCredentialsMessage(message: string, code?: string): boolean {
  const m = message.toLowerCase();
  if (code === "invalid_credentials") return true;
  return (
    m.includes("invalid login credentials") ||
    m.includes("invalid credentials") ||
    m.includes("wrong password")
  );
}

function isEmailNotConfirmedError(message: string, code?: string): boolean {
  const m = message.toLowerCase();
  if (code === "email_not_confirmed") return true;
  return m.includes("email not confirmed") || m.includes("not confirmed");
}

function isDuplicateSignupError(message: string, code?: string): boolean {
  const m = message.toLowerCase();
  if (
    code === "user_already_exists" ||
    code === "signup_disabled" ||
    code === "identity_already_exists"
  ) {
    return true;
  }
  return (
    m.includes("already registered") ||
    m.includes("already exists") ||
    m.includes("user already") ||
    m.includes("duplicate") ||
    m.includes("email address is already")
  );
}

function EmailPasswordLoginFormInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const safeNext =
    nextParam?.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const urlErrorHandled = useRef(false);

  const urlError = searchParams.get("error");

  useEffect(() => {
    if (!urlError || urlErrorHandled.current) return;
    urlErrorHandled.current = true;
    const decoded = decodeURIComponent(urlError);
    toast.error(translateAuthError(decoded));
    const params = new URLSearchParams(searchParams.toString());
    params.delete("error");
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [urlError, pathname, router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error("Veuillez saisir votre adresse e-mail.");
      return;
    }
    if (password.length < MIN_PASSWORD_LEN) {
      toast.error(
        `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LEN} caractères.`
      );
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (!signInErr) {
        router.push(safeNext);
        router.refresh();
        return;
      }

      const signInMsg = signInErr.message ?? "";
      const signInCode =
        "code" in signInErr
          ? (signInErr as { code?: string }).code
          : undefined;

      if (isEmailNotConfirmedError(signInMsg, signInCode)) {
        toast.error(translateAuthError(signInErr));
        return;
      }

      if (!isInvalidCredentialsMessage(signInMsg, signInCode)) {
        toast.error(translateAuthError(signInErr));
        return;
      }

      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const emailRedirectTo = origin
        ? `${origin}/api/auth/confirm?next=${encodeURIComponent("/dashboard")}`
        : undefined;

      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp(
        {
          email: trimmedEmail,
          password,
          options: emailRedirectTo ? { emailRedirectTo } : undefined,
        }
      );

      if (signUpErr) {
        if (isDuplicateSignupError(signUpErr.message ?? "", signUpErr.code)) {
          toast.error("Mot de passe incorrect.");
        } else {
          toast.error(translateAuthError(signUpErr));
        }
        return;
      }

      if (signUpData.session) {
        router.push(safeNext);
        router.refresh();
        return;
      }

      toast.success("Un e-mail de confirmation vient de vous être envoyé.");
      setPassword("");
      return;
    } catch (err: unknown) {
      logger.error("Email auth error:", err);
      toast.error(translateAuthError(err instanceof Error ? err : String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border-white/20 dark:border-white/10 shadow-xl rounded-2xl">
      <CardContent className="p-8 sm:p-10">
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
              E-mail et mot de passe
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="auth-email">E-mail</Label>
              <Input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-password">Mot de passe</Label>
              <Input
                id="auth-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={MIN_PASSWORD_LEN}
              />
            </div>
            <Button
              type="submit"
              variant="secondary"
              className="w-full h-11"
              disabled={loading}
            >
              {loading ? "Patientez…" : "Continuer"}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

export function EmailPasswordLoginForm() {
  return (
    <Suspense
      fallback={<div className="h-48 animate-pulse rounded-2xl bg-white/5" />}
    >
      <EmailPasswordLoginFormInner />
    </Suspense>
  );
}
