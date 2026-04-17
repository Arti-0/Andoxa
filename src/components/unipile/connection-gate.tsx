"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useLinkedInAccount,
  type LinkedInAccountData,
} from "@/hooks/use-linkedin-account";

/** Canal LinkedIn / WhatsApp considéré comme connecté (aligné sur Paramètres). */
function isChannelConnected(
  data: LinkedInAccountData | undefined,
  provider: "linkedin" | "whatsapp"
): boolean {
  if (!data) return false;
  const status =
    provider === "linkedin" ? data.linkedin_status : data.whatsapp_status;
  return status === "connected";
}

/** Messagerie, campagnes et workflows : au moins LinkedIn ou WhatsApp est connecté. */
export function isAnyUnipileMessagingConnected(
  data: LinkedInAccountData | undefined
): boolean {
  return (
    isChannelConnected(data, "linkedin") ||
    isChannelConnected(data, "whatsapp")
  );
}

export type ConnectionGateProps = {
  pageName: string;
  children: React.ReactNode;
} & (
  | {
      acceptEitherLinkedInOrWhatsApp: true;
      provider?: never;
    }
  | {
      acceptEitherLinkedInOrWhatsApp?: false;
      provider: "linkedin" | "whatsapp";
    }
);

/**
 * Affiche les enfants uniquement si le canal demandé (ou LinkedIn/WhatsApp) est connecté.
 * Utilise le même cache React Query que `useLinkedInAccount`.
 */
export function ConnectionGate(props: ConnectionGateProps) {
  const { pageName, children } = props;
  const acceptEither =
    "acceptEitherLinkedInOrWhatsApp" in props &&
    props.acceptEitherLinkedInOrWhatsApp === true;
  const provider: "linkedin" | "whatsapp" | undefined = acceptEither
    ? undefined
    : props.provider;

  const { data, isPending, isError } = useLinkedInAccount();

  const ready = acceptEither
    ? isAnyUnipileMessagingConnected(data)
    : isChannelConnected(data, provider as "linkedin" | "whatsapp");

  if (isPending && !data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-16">
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="mx-auto h-12 w-12 rounded-full" />
          <Skeleton className="mx-auto h-6 max-w-[280px] w-full" />
          <Skeleton className="h-4 w-full max-w-md mx-auto" />
          <Skeleton className="mx-auto h-4 w-full max-w-sm" />
          <Skeleton className="mx-auto mt-6 h-10 w-48 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!ready || isError) {
    const channelLabel = acceptEither
      ? "LinkedIn ou WhatsApp"
      : provider === "linkedin"
        ? "LinkedIn"
        : "WhatsApp";
    const subtitle = acceptEither
      ? "Cette page nécessite une connexion LinkedIn ou WhatsApp active pour fonctionner."
      : `Cette page nécessite une connexion ${channelLabel} active pour fonctionner.`;

    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-[400px] space-y-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Lock className="h-7 w-7 text-muted-foreground" aria-hidden />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Connecte ton compte {channelLabel}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {subtitle}
            </p>
            <p className="text-xs text-muted-foreground">
              Page : <span className="font-medium text-foreground">{pageName}</span>
            </p>
          </div>
          <Button asChild className="rounded-lg">
            <Link href="/settings">Ouvrir les paramètres</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
