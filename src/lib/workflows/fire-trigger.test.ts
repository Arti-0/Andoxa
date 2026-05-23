/**
 * Unit tests for the pure helpers in fire-trigger.ts.
 *
 * matchesConfig() and buildEnrollmentMetadata() carry the trigger-routing
 * logic — no I/O, no Supabase — so they're cheap to test exhaustively and
 * catch every regression early. Run with `bun test src/lib/workflows`.
 */

import { describe, expect, it } from "bun:test";
import {
  buildEnrollmentMetadata,
  matchesConfig,
  type WorkflowTriggerPayload,
} from "./fire-trigger";

describe("matchesConfig", () => {
  describe("on_status_change", () => {
    const payload: WorkflowTriggerPayload = {
      kind: "on_status_change",
      statusId: "status-A",
      fromStatusId: "status-B",
    };

    it("matches when no targetStatusId is set (any change)", () => {
      expect(matchesConfig(payload, {})).toBe(true);
      expect(matchesConfig(payload, { targetStatusId: null })).toBe(true);
      expect(matchesConfig(payload, { targetStatusId: "" })).toBe(true);
    });

    it("matches when targetStatusId equals the new status", () => {
      expect(matchesConfig(payload, { targetStatusId: "status-A" })).toBe(true);
    });

    it("rejects when targetStatusId is a different status", () => {
      expect(matchesConfig(payload, { targetStatusId: "status-C" })).toBe(false);
    });
  });

  describe("on_tag", () => {
    const payload: WorkflowTriggerPayload = { kind: "on_tag", tagId: "tag-A" };

    it("matches any tag when no target is set", () => {
      expect(matchesConfig(payload, {})).toBe(true);
    });

    it("matches when target equals tag", () => {
      expect(matchesConfig(payload, { targetTagId: "tag-A" })).toBe(true);
    });

    it("rejects when target differs", () => {
      expect(matchesConfig(payload, { targetTagId: "tag-X" })).toBe(false);
    });
  });

  describe("on_campaign_reply", () => {
    const payload: WorkflowTriggerPayload = {
      kind: "on_campaign_reply",
      messageId: "msg-1",
      campaignJobId: "job-A",
      channel: "linkedin",
    };

    it("matches any campaign when no campaignJobId is pinned", () => {
      expect(matchesConfig(payload, {})).toBe(true);
    });

    it("matches when pinned to the same campaign", () => {
      expect(matchesConfig(payload, { campaignJobId: "job-A" })).toBe(true);
    });

    it("rejects when pinned to a different campaign", () => {
      expect(matchesConfig(payload, { campaignJobId: "job-Z" })).toBe(false);
    });
  });

  describe("on_list_add", () => {
    const payload: WorkflowTriggerPayload = { kind: "on_list_add", listId: "list-A" };

    it("matches any list when no target is set", () => {
      expect(matchesConfig(payload, {})).toBe(true);
    });

    it("matches when target equals list", () => {
      expect(matchesConfig(payload, { targetListId: "list-A" })).toBe(true);
    });

    it("rejects when target differs", () => {
      expect(matchesConfig(payload, { targetListId: "list-X" })).toBe(false);
    });
  });

  describe("triggers that ignore config", () => {
    it("on_booking always matches", () => {
      expect(matchesConfig({ kind: "on_booking", eventId: "e1" }, {})).toBe(true);
      expect(
        matchesConfig({ kind: "on_booking", eventId: "e1" }, { anything: "ignored" })
      ).toBe(true);
    });

    it("on_no_show always matches", () => {
      expect(matchesConfig({ kind: "on_no_show", eventId: "e1" }, {})).toBe(true);
    });

    it("on_linkedin_reply always matches", () => {
      expect(
        matchesConfig(
          { kind: "on_linkedin_reply", messageId: "m1", occurredAt: "" },
          {}
        )
      ).toBe(true);
    });

    it("on_whatsapp_reply always matches", () => {
      expect(
        matchesConfig(
          { kind: "on_whatsapp_reply", messageId: "m1", occurredAt: "" },
          {}
        )
      ).toBe(true);
    });

    it("on_invite_accepted always matches", () => {
      expect(
        matchesConfig(
          {
            kind: "on_invite_accepted",
            providerId: "p1",
            accountId: "a1",
            campaignJobId: "job-A",
          },
          {}
        )
      ).toBe(true);
    });
  });

  it("manual never matches (handled by /api/workflows/[id]/runs)", () => {
    expect(matchesConfig({ kind: "manual" }, {})).toBe(false);
  });
});

describe("buildEnrollmentMetadata", () => {
  it("booking carries event_id + dedupe_key", () => {
    const meta = buildEnrollmentMetadata({ kind: "on_booking", eventId: "evt-42" });
    expect(meta).toMatchObject({
      source: "booking",
      event_id: "evt-42",
      dedupe_key: "booking:evt-42",
    });
  });

  it("no_show dedupes on event id", () => {
    const meta = buildEnrollmentMetadata({ kind: "on_no_show", eventId: "evt-7" });
    expect(meta).toMatchObject({
      source: "no_show",
      event_id: "evt-7",
      dedupe_key: "noshow:evt-7",
    });
  });

  it("status_change dedupe is time-scoped (re-cycle allowed)", () => {
    const meta = buildEnrollmentMetadata({
      kind: "on_status_change",
      statusId: "won",
      fromStatusId: "rdv",
    });
    expect(meta.source).toBe("status_change");
    expect(meta.status_id).toBe("won");
    expect(meta.from_status_id).toBe("rdv");
    expect(meta.dedupe_key).toMatch(/^status_change:won:\d+$/);
  });

  it("linkedin_reply dedupe is the messageId", () => {
    const meta = buildEnrollmentMetadata({
      kind: "on_linkedin_reply",
      messageId: "linkedin-msg-1",
      occurredAt: "2026-05-20T10:00:00Z",
    });
    expect(meta.dedupe_key).toBe("linkedin_reply:linkedin-msg-1");
  });

  it("whatsapp_reply dedupe is the messageId", () => {
    const meta = buildEnrollmentMetadata({
      kind: "on_whatsapp_reply",
      messageId: "wa-msg-1",
      occurredAt: "2026-05-20T10:00:00Z",
    });
    expect(meta.dedupe_key).toBe("whatsapp_reply:wa-msg-1");
  });

  it("campaign_reply dedupe is the messageId (not job) — same msg can fire only once", () => {
    const meta = buildEnrollmentMetadata({
      kind: "on_campaign_reply",
      messageId: "msg-9",
      campaignJobId: "job-A",
      channel: "linkedin",
    });
    expect(meta).toMatchObject({
      source: "campaign_reply",
      message_id: "msg-9",
      campaign_job_id: "job-A",
      channel: "linkedin",
      dedupe_key: "campaign_reply:msg-9",
    });
  });

  it("list_add dedupe is the listId — re-adding to same list is a no-op", () => {
    const meta = buildEnrollmentMetadata({ kind: "on_list_add", listId: "list-1" });
    expect(meta.dedupe_key).toBe("list_add:list-1");
  });

  it("tag dedupe is the tagId — re-applying same tag is a no-op", () => {
    const meta = buildEnrollmentMetadata({ kind: "on_tag", tagId: "tag-1" });
    expect(meta.dedupe_key).toBe("tag_added:tag-1");
  });

  it("invite_accepted dedupe is account:provider — same prospect can't re-fire", () => {
    const meta = buildEnrollmentMetadata({
      kind: "on_invite_accepted",
      providerId: "prov-1",
      accountId: "acc-7",
      campaignJobId: "job-9",
    });
    expect(meta).toMatchObject({
      source: "invite_accepted",
      provider_id: "prov-1",
      account_id: "acc-7",
      campaign_job_id: "job-9",
      dedupe_key: "invite_accepted:acc-7:prov-1",
    });
  });

  it("invite_accepted carries null campaign_job_id for direct sends", () => {
    const meta = buildEnrollmentMetadata({
      kind: "on_invite_accepted",
      providerId: "prov-2",
      accountId: "acc-2",
      campaignJobId: null,
    });
    expect(meta.campaign_job_id).toBeNull();
  });

  it("linkedin_reply and campaign_reply on the same message have distinct dedupe namespaces", () => {
    // Both fire for the same inbound; they must NOT collide on dedupe_key
    // (different trigger kinds → different per-workflow uniqueness scope).
    const a = buildEnrollmentMetadata({
      kind: "on_linkedin_reply",
      messageId: "shared",
      occurredAt: "",
    });
    const b = buildEnrollmentMetadata({
      kind: "on_campaign_reply",
      messageId: "shared",
      campaignJobId: "job-X",
      channel: "linkedin",
    });
    expect(a.dedupe_key).not.toBe(b.dedupe_key);
  });
});
