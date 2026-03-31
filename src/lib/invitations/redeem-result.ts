import type { Json } from "@/lib/types/supabase";

export interface RedeemInviteResult {
  success: boolean;
  reason?: string;
  organization_id?: string;
  already_member?: boolean;
}

export function parseRedeemInviteResult(data: Json | null): RedeemInviteResult {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { success: false, reason: "invalid_response" };
  }
  const o = data as Record<string, unknown>;
  return {
    success: o.success === true,
    reason: typeof o.reason === "string" ? o.reason : undefined,
    organization_id:
      typeof o.organization_id === "string" ? o.organization_id : undefined,
    already_member: o.already_member === true,
  };
}
