# Next-Gen Threat Modeler Frontend (MVP)

A minimal React + TypeScript + XYFlow canvas with Threat-Dragon-like basic components (Actor, Process, Store) and a draggable palette.

## Run

```bash
cd apps/nextgen-tm-frontend
npm i   # or pnpm i / yarn
npm run dev
```

Open http://localhost:5173

## Features
- Drag nodes (Actor/Process/Store) from the left palette onto the canvas
- Connect nodes with edges
- Grid background, minimap, controls
- Clear nodes/edges toolbar

## Next Steps
- Node property panel
- OTM model integration & layout persistence
- Threats panel & rule engine hooks
- Custom edges (orthogonal), snapping & alignment helpers