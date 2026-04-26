# WhatsApp / Workflows — Claude Design handoff

Source files for the redesigned `/whatsapp/[id]` and `/whatsapp/new` pages. Treat as reference, not as code to import.

- `Workflows.html` — list page reference (kept as inspiration; the live `/whatsapp/page.tsx` was not in scope for this round).
- `Create Workflow.html` — 3-step wizard reference (templates → trigger → metadata) implemented in `src/components/workflows/workflow-new-wizard.tsx`.
- `wf-components.jsx` — node-graph canvas reference. Implementation uses `@xyflow/react` (not this raw SVG) but shares node colors, sizes, and edge labels.
- `colors_and_type.css` — design tokens. Anything we needed has been merged into `src/app/globals.css`; do not import this file.
- `tweaks-panel.jsx` — auxiliary panel mock; informational only.
- `assets/` — logo and reference imagery.

Live entry points:
- Wizard: `src/components/workflows/workflow-new-wizard.tsx`
- Detail page: `src/components/workflows/workflow-detail-client.tsx`
- Canvas: `src/components/workflows/canvas/workflow-canvas.tsx`
