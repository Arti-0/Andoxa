import { describe, expect, it } from "bun:test";
import {
  rewriteDefinitionStatusKey,
  rewriteTriggerConfigStatusId,
} from "./status-usage";

describe("status-usage", () => {
  it("rewrites CRM step status keys in a definition", () => {
    const def = {
      schemaVersion: 1,
      steps: [
        { id: "a", type: "crm", config: { field: "status", value: "rdv" } },
      ],
    };
    const { definition, changed } = rewriteDefinitionStatusKey(
      def,
      "rdv",
      "rdv_realise",
    );
    expect(changed).toBe(true);
    expect(
      (definition as { steps: { config: { value: string } }[] }).steps[0]
        ?.config.value,
    ).toBe("rdv_realise");
  });

  it("rewrites on_status_change trigger targetStatusId", () => {
    const { config, changed } = rewriteTriggerConfigStatusId(
      "on_status_change",
      { targetStatusId: "old-id" },
      "old-id",
      "new-id",
    );
    expect(changed).toBe(true);
    expect((config as { targetStatusId: string }).targetStatusId).toBe("new-id");
  });
});
