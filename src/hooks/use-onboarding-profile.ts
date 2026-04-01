"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { linkedinDisplayFromUser } from "@/lib/utils/onboarding-helpers";

export function useOnboardingProfile(initialFullName: string) {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [fullName, setFullName] = useState(initialFullName);
  const [orgName, setOrgName] = useState("");
  const [orgLogoRemoteUrl, setOrgLogoRemoteUrl] = useState<string | null>(
    null
  );
  const [linkedinLinked, setLinkedinLinked] = useState(false);
  const [liProfile, setLiProfile] = useState<{
    name: string;
    picture: string | null;
  } | null>(null);
  const [whatsappConnected, setWhatsappConnected] = useState(false);

  const nameHydrated = useRef(false);
  const orgFieldsHydrated = useRef(false);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const linked =
      user.identities?.some((i) => i.provider === "linkedin_oidc") ?? false;
    setLinkedinLinked(linked);
    if (linked) setLiProfile(linkedinDisplayFromUser(user));

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, active_organization_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.active_organization_id) {
      setOrgId(profile.active_organization_id);
      if (!orgFieldsHydrated.current) {
        const { data: orgRow } = await supabase
          .from("organizations")
          .select("name, logo_url")
          .eq("id", profile.active_organization_id)
          .maybeSingle();
        if (orgRow?.name) {
          setOrgName(orgRow.name);
        }
        if (orgRow?.logo_url && typeof orgRow.logo_url === "string") {
          setOrgLogoRemoteUrl(orgRow.logo_url);
        }
        orgFieldsHydrated.current = true;
      }
    } else {
      setOrgId(null);
    }
    if (profile?.full_name && !nameHydrated.current) {
      nameHydrated.current = true;
      setFullName(profile.full_name);
    }
  }, []);

  const fetchUnipile = useCallback(async () => {
    try {
      const res = await fetch("/api/unipile/me", {
        credentials: "include",
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { whatsapp_connected?: boolean };
        whatsapp_connected?: boolean;
      };
      const data = json.data ?? json;
      setWhatsappConnected(!!data.whatsapp_connected);
    } catch {
      setWhatsappConnected(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setFullName((prev) => (initialFullName && !prev ? initialFullName : prev));
  }, [initialFullName]);

  return {
    orgId,
    setOrgId,
    fullName,
    setFullName,
    orgName,
    setOrgName,
    orgLogoRemoteUrl,
    setOrgLogoRemoteUrl,
    linkedinLinked,
    liProfile,
    whatsappConnected,
    setWhatsappConnected,
    refresh,
    fetchUnipile,
    nameHydrated,
    orgFieldsHydrated,
  };
}
