"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type WorkspaceMeResponse = {
  user: {
    id: string;
    user_metadata?: Record<string, unknown>;
  } | null;
  profile: {
    full_name?: string | null;
    active_organization_id?: string | null;
  } | null;
  workspace: {
    id: string;
    name: string;
    logo_url?: string | null;
  } | null;
};

export function useOnboardingProfile(initialFullName: string) {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [fullName, setFullName] = useState(initialFullName);
  const [orgName, setOrgName] = useState("");
  const [orgLogoRemoteUrl, setOrgLogoRemoteUrl] = useState<string | null>(
    null
  );
  const [whatsappConnected, setWhatsappConnected] = useState(false);

  const nameHydrated = useRef(false);
  const orgFieldsHydrated = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/workspace/me", {
        credentials: "include",
      });
      if (!res.ok) return;

      const data = (await res.json()) as WorkspaceMeResponse;

      if (!data.user) return;

      if (data.profile?.active_organization_id) {
        setOrgId(data.profile.active_organization_id);
        if (!orgFieldsHydrated.current) {
          if (data.workspace?.name) setOrgName(data.workspace.name);
          if (data.workspace?.logo_url)
            setOrgLogoRemoteUrl(data.workspace.logo_url);
          orgFieldsHydrated.current = true;
        }
      } else {
        setOrgId(null);
      }

      if (data.profile?.full_name && !nameHydrated.current) {
        nameHydrated.current = true;
        setFullName(data.profile.full_name);
      }
    } catch {
      // silencieux — l'onboarding reste fonctionnel sans refresh
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
    whatsappConnected,
    setWhatsappConnected,
    refresh,
    fetchUnipile,
    nameHydrated,
    orgFieldsHydrated,
  };
}
