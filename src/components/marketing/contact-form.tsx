"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CalendarCheck,
  Check,
  CircleDashed,
  Handshake,
  LifeBuoy,
  Newspaper,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/marketing/ui/button";
import { cn } from "@/lib/utils";

export type ContactTopic = "sales" | "demo" | "support" | "partnership" | "press" | "other";

const TOPICS: {
  value: ContactTopic;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { value: "sales", label: "Souscrire à Andoxa", icon: ShoppingBag },
  { value: "demo", label: "Réserver une démo", icon: CalendarCheck },
  { value: "support", label: "Support technique", icon: LifeBuoy },
  { value: "partnership", label: "Partenariat", icon: Handshake },
  { value: "press", label: "Presse", icon: Newspaper },
  { value: "other", label: "Autre", icon: CircleDashed },
];

export function ContactForm({
  defaultTopic = "sales",
  defaultMessage,
  submitLabel = "Envoyer le message",
  successText = "Message bien reçu, on vous recontacte sous 24 h ouvrées.",
}: {
  defaultTopic?: ContactTopic;
  defaultMessage?: string;
  submitLabel?: string;
  successText?: string;
}) {
  const [topic, setTopic] = React.useState<ContactTopic>(defaultTopic);
  const [submitted, setSubmitted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const body = {
        topic,
        firstName: String(fd.get("firstName") ?? ""),
        lastName: String(fd.get("lastName") ?? ""),
        email: String(fd.get("email") ?? ""),
        company: String(fd.get("company") ?? ""),
        message: String(fd.get("message") ?? ""),
      };
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? "Une erreur est survenue.");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="overflow-hidden rounded-2xl border border-[var(--border)] bg-card shadow-[0_4px_18px_-12px_rgba(0,82,217,0.18)]"
    >
      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="px-8 py-14 text-center sm:px-12"
          >
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700 ring-4 ring-emerald-500/10 dark:bg-emerald-500/20 dark:text-emerald-300">
              <Check size={22} strokeWidth={3} />
            </span>
            <p className="font-display mt-5 text-3xl text-foreground">C&apos;est parti.</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted-foreground">
              {successText}
            </p>
          </motion.div>
        ) : (
          <motion.div key="form" initial={false} exit={{ opacity: 0 }} className="divide-y divide-[var(--border)]">
            <FormGroup
              step="01"
              title="Quel est l'objet de votre message ?"
              hint="Sélectionnez la catégorie qui correspond le mieux."
            >
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TOPICS.map((t) => {
                  const active = topic === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTopic(t.value)}
                      aria-pressed={active}
                      className={cn(
                        "group inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        active
                          ? "border-[var(--brand-blue)] bg-[var(--brand-blue-tint)] text-[var(--brand-blue-dark)] shadow-[0_4px_14px_-8px_rgba(0,82,217,0.35)]"
                          : "border-[var(--border)] bg-card text-muted-foreground hover:-translate-y-px hover:border-[var(--brand-blue)]/40 hover:bg-[var(--neutral-50)]/60 hover:text-foreground",
                      )}
                    >
                      <t.icon
                        size={14}
                        className={
                          active
                            ? "text-[var(--brand-blue)]"
                            : "text-muted-foreground transition-colors group-hover:text-[var(--brand-blue)]"
                        }
                      />
                      <span className="truncate">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </FormGroup>

            <FormGroup step="02" title="Vos coordonnées" hint="Pour qu'on puisse vous recontacter.">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Prénom" htmlFor="firstName" required>
                    <Input id="firstName" name="firstName" required autoComplete="given-name" placeholder="Marie" />
                  </Field>
                  <Field label="Nom" htmlFor="lastName" required>
                    <Input id="lastName" name="lastName" required autoComplete="family-name" placeholder="Dupont" />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Email professionnel" htmlFor="email" required>
                    <Input id="email" type="email" name="email" required autoComplete="email" placeholder="marie@entreprise.fr" />
                  </Field>
                  <Field label="Entreprise" htmlFor="company">
                    <Input id="company" name="company" autoComplete="organization" placeholder="Nom de votre boîte" />
                  </Field>
                </div>
              </div>
            </FormGroup>

            <FormGroup
              step="03"
              title="Votre message"
              hint="Le contexte, votre stack, votre besoin — donnez-nous de quoi vous répondre utilement."
            >
              <textarea
                name="message"
                required
                rows={6}
                defaultValue={defaultMessage}
                className="block w-full resize-y rounded-lg border border-[var(--border)] bg-card px-3.5 py-3 text-sm leading-7 text-foreground transition-colors placeholder:text-muted-foreground focus:border-[var(--brand-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/20"
                placeholder="Parlez-nous de votre besoin, votre équipe, votre stack actuelle…"
              />
            </FormGroup>

            <div className="space-y-4 px-6 py-6 sm:px-8">
              <p className="text-xs leading-5 text-muted-foreground">
                En envoyant ce formulaire, vous acceptez que nous traitions vos données pour vous
                recontacter, conformément à notre{" "}
                <a
                  href="/privacy"
                  className="font-medium text-foreground underline underline-offset-2 hover:text-[var(--brand-blue)]"
                >
                  politique de confidentialité
                </a>
                .
              </p>
              {error && (
                <p className="text-xs font-medium text-[var(--color-destructive,#dc2626)]" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={submitting} size="lg" className="w-full justify-center rounded-full">
                {submitting ? "Envoi en cours…" : submitLabel}
                {!submitting && <ArrowRight size={16} />}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

function FormGroup({
  step,
  title,
  hint,
  children,
}: {
  step: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-6 py-7 sm:px-8 sm:py-8">
      <div className="mb-5 flex items-baseline gap-3">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-blue)]">
          {step}
        </span>
        <div className="min-w-0">
          <p className="text-base font-semibold text-foreground sm:text-lg">{title}</p>
          {hint && (
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground sm:text-[0.8rem]">{hint}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-1 text-[var(--brand-blue)]">
            *
          </span>
        )}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "block h-11 w-full rounded-lg border border-[var(--border)] bg-card px-3.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground/70 focus:border-[var(--brand-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/20",
        props.className,
      )}
    />
  );
}
