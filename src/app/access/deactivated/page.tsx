"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Mail } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/workspace";

interface OwnerInfo {
  email: string | null;
  name: string | null;
}

interface OrgInfo {
  id: string;
  name: string;
  exists: boolean;
}

interface ActiveOrgSummary {
  id: string;
  name: string;
  logo_url: string | null;
  role: "owner" | "admin" | "member";
}

/**
 * Screen 4 — Account deactivated gate. Lives at /access/deactivated and is
 * the destination the router-level guard sends users to when their seat in
 * the active org has been flipped to `active=false` (downgrade prune).
 *
 * The user keeps access to every other org they're an active member of —
 * see the org switcher below. The page never says "your account is
 * suspended" because the user themselves is fine; only this single org has
 * suspended them.
 */
export default function DeactivatedAccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
          Chargement…
        </div>
      }
    >
      <DeactivatedAccessContent />
    </Suspense>
  );
}

function DeactivatedAccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orgIdParam = searchParams?.get("org") ?? null;
  const { user, switchWorkspace, refresh } = useWorkspace();

  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);
  const [owner, setOwner] = useState<OwnerInfo>({ email: null, name: null });
  const [otherOrgs, setOtherOrgs] = useState<ActiveOrgSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Resolve the org name + owner email so the gate can show "Votre accès à
  // <Org> est suspendu" and a useful mailto. RLS doesn't let a deactivated
  // user read most of the org, but `id, name, owner_id` is widely allowed.
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      if (!orgIdParam) {
        setOrgInfo(null);
        setLoading(false);
        return;
      }
      const { data: org } = await supabase
        .from("organizations")
        .select("id, name, owner_id, deleted_at")
        .eq("id", orgIdParam)
        .maybeSingle();
      if (cancelled) return;
      if (!org || org.deleted_at) {
        setOrgInfo({ id: orgIdParam, name: "Organisation introuvable", exists: false });
      } else {
        setOrgInfo({ id: org.id, name: org.name, exists: true });
        // Best-effort owner lookup — fail-soft if RLS blocks the read.
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", org.owner_id)
          .maybeSingle();
        setOwner({
          email: profile?.email ?? null,
          name: profile?.full_name ?? null,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgIdParam]);

  // List of orgs this user is still active in — used for the switcher.
  // Filter on `active=true` directly in the query: deactivated memberships
  // must NOT appear here (otherwise the user can switch into another
  // suspended org and bounce back to this gate).
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      if (!user?.id) {
        setOtherOrgs([]);
        setLoading(false);
        return;
      }
      try {
        const { data } = await supabase
          .from("organization_members")
          .select(
            "role, organization_id, organizations:organization_id(id, name, logo_url, deleted_at)"
          )
          .eq("user_id", user.id)
          .eq("active", true);
        if (cancelled) return;
        const items: ActiveOrgSummary[] = (data ?? [])
          .map((row) => {
            const org = Array.isArray(row.organizations)
              ? row.organizations[0]
              : row.organizations;
            if (!org || org.deleted_at) return null;
            return {
              id: org.id,
              name: org.name,
              logo_url: org.logo_url,
              role: (row.role as "owner" | "admin" | "member") ?? "member",
            };
          })
          .filter((o): o is ActiveOrgSummary => o !== null)
          .filter((o) => o.id !== orgIdParam);
        setOtherOrgs(items);
      } catch {
        if (!cancelled) setOtherOrgs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, orgIdParam]);

  const handleSwitch = useCallback(
    async (id: string) => {
      try {
        await switchWorkspace(id);
        refresh?.();
        router.push("/dashboard");
      } catch {
        // No-op: switching to a deactivated org would just bring the user
        // back here. We rely on the guard to gate that.
      }
    },
    [switchWorkspace, refresh, router]
  );

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    try {
      await supabase.auth.signOut();
    } finally {
      router.push("/auth/login");
    }
  }, [router]);

  const mailtoHref =
    owner.email && orgInfo?.exists
      ? `mailto:${owner.email}?subject=${encodeURIComponent(
          `Demande de réactivation — ${orgInfo.name}`
        )}`
      : null;

  return (
    <div className="dw-gate-shell">
      <div className="dw-gate-card">
        <div className="dw-gate-eyebrow">ACCÈS SUSPENDU</div>

        {orgInfo?.exists ? (
          <h1 className="dw-gate-title font-display">
            Votre accès à{" "}
            <span style={{ color: "var(--foreground)" }}>{orgInfo.name}</span>{" "}
            est suspendu.
          </h1>
        ) : (
          <h1 className="dw-gate-title font-display">
            Cette organisation n&apos;existe plus.
          </h1>
        )}

        {orgInfo?.exists ? (
          <p className="dw-gate-body">
            Cette organisation a réduit son nombre de sièges. Vos données
            restent en sécurité — elles sont conservées en lecture seule.
          </p>
        ) : (
          <p className="dw-gate-body">
            L&apos;organisation a été supprimée par son propriétaire. Vous
            pouvez continuer dans une autre organisation ou en créer une
            nouvelle.
          </p>
        )}

        {orgInfo?.exists && mailtoHref ? (
          <a className="dw-gate-primary" href={mailtoHref}>
            <Mail size={16} /> Contacter l&apos;administrateur
          </a>
        ) : null}

        <div className="dw-gate-divider">ou</div>

        <div className="dw-gate-section-label">
          Continuer dans une autre organisation
        </div>
        {loading ? (
          <div
            style={{
              padding: 16,
              fontSize: 13,
              color: "var(--muted-foreground)",
              textAlign: "center",
            }}
          >
            Chargement…
          </div>
        ) : otherOrgs.length === 0 ? (
          <div
            style={{
              padding: 12,
              border: "1px dashed var(--border)",
              borderRadius: 10,
              fontSize: 13,
              color: "var(--muted-foreground)",
              textAlign: "center",
            }}
          >
            Vous n&apos;avez pas d&apos;autre organisation active.{" "}
            <button
              type="button"
              className="dw-link-action"
              onClick={() => router.push("/onboarding/plan")}
              style={{ fontSize: 13 }}
            >
              Ajouter une organisation
            </button>
          </div>
        ) : (
          <div className="dw-gate-orgs-list">
            {otherOrgs.map((org) => (
              <button
                key={org.id}
                type="button"
                className="dw-gate-org-row"
                onClick={() => void handleSwitch(org.id)}
              >
                <span className="dw-gate-org-avatar">
                  {org.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={org.logo_url} alt="" />
                  ) : (
                    (org.name || "?").trim().charAt(0).toUpperCase()
                  )}
                </span>
                <span className="dw-gate-org-name">{org.name}</span>
                <span className="dw-gate-org-role">
                  {org.role === "owner"
                    ? "Propriétaire"
                    : org.role === "admin"
                    ? "Admin"
                    : "Membre"}
                </span>
                <ChevronRight className="dw-gate-org-chevron" />
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          className="dw-gate-tertiary"
          onClick={() => void handleSignOut()}
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
