# Product documentation

Short, non-technical notes for decisions, ownership, and what we tell the team. Technical detail stays in `docs/AUDIT/` and migrations.

| File | Purpose |
|------|---------|
| [decisions.md](./decisions.md) | What we decided and why (living document) |
| [session-log.md](./session-log.md) | End-of-session deltas (when we changed direction, schema, or behaviour) |
| [announcements.md](./announcements.md) | How in-app banners are authored today |
| [notifications.md](./notifications.md) | How duplicate alerts are avoided (fingerprints) |
| [testing.md](./testing.md) | How we’ll validate before and after large releases |

**When to update:** After meaningful product direction, visible behaviour, database shape, or legal posture changes. Prefer appending a dated entry to `session-log.md` at the end of a working session.

**In Cursor:** With the workspace opened at repo root (`new-andoxa`), open **Composer** in **Agent** mode, type **`/session-docs`**, and send—the agent refreshes this folder per `.cursor/commands/session-docs.md`.
