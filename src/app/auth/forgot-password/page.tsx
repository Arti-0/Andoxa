import { redirect } from "next/navigation";
import { AuthShell } from "@/components/marketing/auth-shell";
import { ForgotPasswordForm } from "@/lib/auth/components/forgot-password-form";
import { createClient } from "@/lib/supabase/server";

export default async function ForgotPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <AuthShell
      title="Mot de passe oublié"
      subtitle="Indiquez votre adresse e-mail et nous vous enverrons un lien pour en choisir un nouveau."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
