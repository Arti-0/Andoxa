"use client";

import { useRef, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getMaxCharsForMode } from "@/lib/linkedin/limits";
import {
  CAMPAIGN_VARIABLE_KEYS,
  CAMPAIGN_VARIABLE_META,
} from "@/lib/campaigns/variable-gaps";

const INVITE_PLACEHOLDER = `Bonjour {{firstName}},

Je souhaite échanger avec vous sur {{company}}.
Cordialement`;

const CONTACT_PLACEHOLDER = `Bonjour {{firstName}},

J'ai vu votre profil chez {{company}} et souhaiterais vous contacter au sujet de votre poste {{jobTitle}}.
Pouvez-vous me recontacter ?

Cordialement`;

const WHATSAPP_PLACEHOLDER = `Bonjour {{firstName}},

…`;

const VARIABLE_BUTTONS = CAMPAIGN_VARIABLE_KEYS.map((key) => ({
  key,
  label: CAMPAIGN_VARIABLE_META[key].label,
  crmColumn: CAMPAIGN_VARIABLE_META[key].crmColumn,
}));

interface MessageTemplate {
  id: string;
  name: string;
  channel: "linkedin" | "whatsapp" | "email";
  content: string;
}

export interface MessageComposeFormProps {
  message: string;
  onMessageChange: (value: string) => void;
  channel: "linkedin" | "whatsapp";
  linkedinMode?: "invite" | "contact";
  /** Contenu optionnel sous les templates */
  footerExtra?: ReactNode;
  /** Texte d’aide sous les boutons de variables (ex. colonnes d’import) */
  variablesFooterNote?: ReactNode;
  /** When false, compose UI is disabled visually */
  disabled?: boolean;
  /** Surcharge de la limite de caractères (calculée depuis isPremium si absent) */
  maxLength?: number;
  /** Statut Premium LinkedIn de l'utilisateur connecté */
  isPremium?: boolean;
}

/**
 * Shared message body + variables + templates list (same patterns as CampaignModal).
 */
export function MessageComposeForm({
  message,
  onMessageChange,
  channel,
  linkedinMode = "contact",
  footerExtra,
  variablesFooterNote,
  disabled = false,
  maxLength,
  isPremium,
}: MessageComposeFormProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const effectiveMaxLength =
    maxLength ??
    (channel === "linkedin"
      ? getMaxCharsForMode(linkedinMode ?? "contact", isPremium ?? false)
      : 2000);

  const placeholder =
    channel === "whatsapp"
      ? WHATSAPP_PLACEHOLDER
      : linkedinMode === "invite"
        ? INVITE_PLACEHOLDER
        : CONTACT_PLACEHOLDER;

  /** Tous les canaux : un template LinkedIn peut servir pour WhatsApp (et inversement). */
  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ["message-templates", "all", "compose-form"],
    queryFn: async () => {
      const res = await fetch(`/api/message-templates?pageSize=100`, {
        credentials: "include",
      });
      if (!res.ok) return [] as MessageTemplate[];
      const json = await res.json();
      return (json?.data?.items ?? []) as MessageTemplate[];
    },
    staleTime: 60_000,
  });

  const templates = templatesData ?? [];

  const insertVariable = (varKey: string) => {
    const token = `{{${varKey}}}`;
    const el = textareaRef.current;
    if (!el) {
      onMessageChange((message + token).slice(0, effectiveMaxLength));
      return;
    }
    const start = el.selectionStart ?? message.length;
    const end = el.selectionEnd ?? message.length;
    const next = (message.slice(0, start) + token + message.slice(end)).slice(
      0,
      effectiveMaxLength
    );
    onMessageChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-2">
      <div className="flex flex-wrap gap-1">
        {VARIABLE_BUTTONS.map((v) => (
          <button
            key={v.key}
            type="button"
            title={`CRM : ${v.crmColumn}`}
            disabled={disabled}
            onClick={() => insertVariable(v.key)}
            className="rounded bg-muted px-2 py-0.5 font-mono text-xs hover:bg-accent disabled:opacity-50"
          >
            {`{{${v.key}}}`}
          </button>
        ))}
      </div>
      {variablesFooterNote ? (
        <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
          {variablesFooterNote}
        </div>
      ) : null}

      <div>
        <Textarea
          ref={textareaRef}
          id="message-compose-form"
          placeholder={placeholder}
          value={message}
          onChange={(e) =>
            onMessageChange(e.target.value.slice(0, effectiveMaxLength))
          }
          rows={6}
          disabled={disabled}
          className="font-mono text-sm"
          maxLength={effectiveMaxLength}
          aria-label="Message"
        />
        <p
          className={cn(
            "mt-1 text-right text-xs tabular-nums",
            message.length > effectiveMaxLength * 0.9
              ? "text-amber-600 dark:text-amber-400"
              : "text-muted-foreground"
          )}
        >
          {message.length}/{effectiveMaxLength}
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Templates</Label>
        <div className="max-h-40 overflow-y-auto rounded-md border bg-muted/20 p-2">
          {templatesLoading ? (
            <div className="flex min-h-9 items-center justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="min-h-9" aria-hidden />
          ) : (
            <div className="flex flex-col gap-1.5">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  disabled={disabled}
                  className="rounded-md border border-transparent bg-background px-3 py-2 text-left text-sm transition-colors hover:border-border hover:bg-accent/50 disabled:opacity-50"
                  onClick={() =>
                    onMessageChange(tpl.content.slice(0, effectiveMaxLength))
                  }
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{tpl.name}</span>
                    <span className="rounded bg-muted px-1.5 py-0 text-[10px] font-medium uppercase text-muted-foreground">
                      {tpl.channel}
                    </span>
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                    {tpl.content}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {footerExtra}
    </div>
  );
}
