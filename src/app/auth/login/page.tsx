import { redirect } from "next/navigation";
import { EmailPasswordLoginForm } from "@/lib/auth/components/email-password-login-form";
import { AuthShell } from "@/components/marketing/auth-shell";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  // Already-authed visitors get bounced straight to the app. Lets the public
  // "Se connecter" button do the right thing for both flows without any
  // client-side double-take.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <AuthShell title="Connexion" subtitle="Accédez à votre espace Andoxa.">
      <EmailPasswordLoginForm />
    </AuthShell>
  );
}
