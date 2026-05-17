import { EmailPasswordLoginForm } from "@/lib/auth/components/email-password-login-form";
import { AuthShell } from "@/components/marketing/auth-shell";

export default function Page() {
  return (
    <AuthShell title="Connexion" subtitle="Accédez à votre espace Andoxa.">
      <EmailPasswordLoginForm />
    </AuthShell>
  );
}
