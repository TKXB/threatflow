# Next-Gen Threat Modeler Frontend (MVP)

A minimal React + TypeScript + XYFlow canvas with Threat-Dragon-like basic components (Actor, Process, Store) and a draggable palette.

## Run

```bash
cd apps/nextgen-tm-frontend
npm i   # or pnpm i / yarn
npm run dev
```

Open http://localhost:5173

### Backend (Nextgen TM Server)

For server-side analysis (Top‑K paths, attack method suggestions), start the FastAPI backend:

```bash
# In project root
source .venv/bin/activate  # if you use a venv
pip install -e apps/nextgen-tm-server

# run server
uvicorn nextgen_tm_server.app:app --reload --port 8890
```

Then configure frontend to call the backend via an env variable:

```bash
# apps/nextgen-tm-frontend/.env.local
VITE_NEXTGEN_API=http://127.0.0.1:8890
```

Now the following UI actions will call the backend APIs:
- Analyze & Highlight → POST `/analysis/paths`
- Show Top‑K (Scores) → POST `/analysis/paths`
- Analyze Methods → POST `/analysis/methods`
- Export Report → uses `/analysis/paths` to build a JSON report

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