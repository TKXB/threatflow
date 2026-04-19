# Supabase-backed Diagram Persistence for Attack Path & Threat Model

## Goal

Enable users to save, load, list, and delete their canvas diagrams (both Attack Path and Threat Model) to Supabase, replacing localStorage as the primary persistence layer. Follow the same architecture pattern established in `d1-llm-settings-plan.md`.

---

## Architecture Overview

```
Browser (React + @xyflow/react)
  |
  +-- Clerk auth token in Authorization header
  |
  +-- Python FastAPI backend (port 8890)
  |     POST   /diagrams              (create new diagram)
  |     GET    /diagrams              (list user's diagrams)
  |     GET    /diagrams/{id}         (load a single diagram)
  |     PUT    /diagrams/{id}         (update existing diagram)
  |     DELETE /diagrams/{id}         (delete a diagram)
  |     Verifies Clerk JWT -> extracts user_id
  |     Uses supabase-py to talk to Supabase Postgres
  |
  +-- Fallback: localStorage (if backend/network unavailable)
```

---

## Current State

- **Diagrams are localStorage-only**: nodes, edges, idSeq, findings, palette stored under `tf_tm_*` / `tf_attack_*` keys
- **File export/import exists**: OTM JSON, Threagile YAML download; OTM JSON import
- **No backend persistence**: Supabase only has `llm_settings` table
- **Auth is wired**: Clerk JWT verification + `get_current_user_id()` already in place
- **Two diagram apps**: `ThreatModelingApp.tsx` and `AttackPathApp.tsx` with independent localStorage logic

---

## Phase 1: Database Schema

Run in both **iotsploit-dev** and **iotsploit-prod** Supabase SQL Editor:

```sql
-- Stores one row per saved diagram (attack path or threat model)
CREATE TABLE diagrams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  name        TEXT NOT NULL DEFAULT 'Untitled',
  diagram_type TEXT NOT NULL CHECK (diagram_type IN ('attack_path', 'threat_model')),
  nodes       JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges       JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  BIGINT NOT NULL DEFAULT (extract(epoch from now())::bigint),
  updated_at  BIGINT NOT NULL DEFAULT (extract(epoch from now())::bigint)
);

-- Index for fast listing by user
CREATE INDEX idx_diagrams_user_id ON diagrams (user_id, updated_at DESC);

-- Index for fast lookup by user + type
CREATE INDEX idx_diagrams_user_type ON diagrams (user_id, diagram_type, updated_at DESC);
```

**`metadata` JSONB field stores diagram-type-specific data:**

| Diagram Type    | metadata Contents                                              |
|-----------------|----------------------------------------------------------------|
| `threat_model`  | `{ "idSeq": 5, "findings": [...], "paletteJson": "..." }`     |
| `attack_path`   | `{ "idSeq": 8, "paletteJson": "...", "taraRows": [...] }`     |

This avoids needing separate tables or columns per diagram type.

---

## Phase 2: Backend API Endpoints

Add to `apps/nextgen-tm-server/src/nextgen_tm_server/app.py`:

### 2.1 Pydantic Models

```python
import uuid

class DiagramBody(BaseModel):
    name: str = "Untitled"
    diagramType: str  # "attack_path" or "threat_model"
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    metadata: Dict[str, Any] = {}
```

### 2.2 Endpoints

```python
@app.post("/diagrams")
async def create_diagram(request: Request, body: DiagramBody):
    user_id = await get_current_user_id(request)
    now = int(time.time())
    diagram_id = str(uuid.uuid4())
    sb = _get_supabase()
    sb.table("diagrams").insert({
        "id": diagram_id,
        "user_id": user_id,
        "name": body.name,
        "diagram_type": body.diagramType,
        "nodes": body.nodes,
        "edges": body.edges,
        "metadata": body.metadata,
        "created_at": now,
        "updated_at": now,
    }).execute()
    return {"ok": True, "id": diagram_id, "createdAt": now}


@app.get("/diagrams")
async def list_diagrams(request: Request, type: str | None = None):
    user_id = await get_current_user_id(request)
    sb = _get_supabase()
    q = sb.table("diagrams").select(
        "id, name, diagram_type, created_at, updated_at"
    ).eq("user_id", user_id)
    if type:
        q = q.eq("diagram_type", type)
    q = q.order("updated_at", desc=True).limit(100)
    result = q.execute()
    return {"ok": True, "diagrams": result.data or []}


@app.get("/diagrams/{diagram_id}")
async def get_diagram(request: Request, diagram_id: str):
    user_id = await get_current_user_id(request)
    sb = _get_supabase()
    result = sb.table("diagrams").select("*").eq("id", diagram_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Diagram not found")
    row = result.data[0]
    return {
        "ok": True,
        "id": row["id"],
        "name": row["name"],
        "diagramType": row["diagram_type"],
        "nodes": row["nodes"],
        "edges": row["edges"],
        "metadata": row["metadata"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


@app.put("/diagrams/{diagram_id}")
async def update_diagram(request: Request, diagram_id: str, body: DiagramBody):
    user_id = await get_current_user_id(request)
    now = int(time.time())
    sb = _get_supabase()
    # Verify ownership
    existing = sb.table("diagrams").select("id").eq("id", diagram_id).eq("user_id", user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Diagram not found")
    sb.table("diagrams").update({
        "name": body.name,
        "nodes": body.nodes,
        "edges": body.edges,
        "metadata": body.metadata,
        "updated_at": now,
    }).eq("id", diagram_id).eq("user_id", user_id).execute()
    return {"ok": True, "updatedAt": now}


@app.delete("/diagrams/{diagram_id}")
async def delete_diagram(request: Request, diagram_id: str):
    user_id = await get_current_user_id(request)
    sb = _get_supabase()
    existing = sb.table("diagrams").select("id").eq("id", diagram_id).eq("user_id", user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Diagram not found")
    sb.table("diagrams").delete().eq("id", diagram_id).eq("user_id", user_id).execute()
    return {"ok": True}
```

**Key design decisions:**
- Every query includes `.eq("user_id", user_id)` to enforce row-level ownership
- `GET /diagrams` returns only metadata (no nodes/edges) for fast listing
- `metadata` JSONB holds idSeq, findings, paletteJson, taraRows -- avoids schema changes per feature

---

## Phase 3: Frontend Hook — `useDiagramStorage.ts`

New file: `apps/nextgen-tm-frontend/src/hooks/useDiagramStorage.ts`

Follows the same pattern as `useLlmSettings.ts` (localStorage-first, backend sync).

### 3.1 Hook API

```ts
interface SavedDiagram {
  id: string;
  name: string;
  diagramType: "attack_path" | "threat_model";
  createdAt: number;
  updatedAt: number;
}

interface DiagramData {
  nodes: Node[];
  edges: Edge[];
  metadata: Record<string, any>;  // idSeq, findings, paletteJson, etc.
}

interface UseDiagramStorage {
  // List
  diagrams: SavedDiagram[];
  loading: boolean;
  refreshList: () => Promise<void>;

  // CRUD
  saveDiagram: (name: string, data: DiagramData) => Promise<string>;      // returns id
  loadDiagram: (id: string) => Promise<DiagramData>;
  updateDiagram: (id: string, name: string, data: DiagramData) => Promise<void>;
  deleteDiagram: (id: string) => Promise<void>;

  // Current diagram tracking
  currentDiagramId: string | null;
  currentDiagramName: string | null;
  setCurrentDiagram: (id: string | null, name: string | null) => void;
}
```

### 3.2 Behavior

**Save flow:**
1. Serialize current nodes, edges, idSeq, findings into `DiagramBody`
2. `POST /diagrams` (or `PUT /diagrams/{id}` if updating existing)
3. Also write to localStorage as fallback cache
4. Update `currentDiagramId` state

**Load flow:**
1. `GET /diagrams/{id}` from backend
2. Deserialize nodes/edges/metadata into canvas state
3. Update localStorage cache

**Auto-save (optional, Phase 4):**
- Debounced (5s) auto-save to backend when `currentDiagramId` is set
- Immediate localStorage write on every change (existing behavior)

---

## Phase 4: Frontend UI Changes

### 4.1 Save/Load Dialog Component

New file: `apps/nextgen-tm-frontend/src/components/DiagramManager.tsx`

**Save dialog:**
- Text input for diagram name
- "Save as New" button (POST) and "Update" button (PUT, if editing existing)
- Shows current diagram name if already saved

**Load dialog:**
- List of user's saved diagrams (from `GET /diagrams?type=...`)
- Each row: name, last updated timestamp, delete button
- Click to load into canvas

### 4.2 Integration into App Components

Both `AttackPathApp.tsx` and `ThreatModelingApp.tsx`:

1. Import `useDiagramStorage` hook
2. Add toolbar buttons:
   - **Save** (floppy disk icon) -- opens save dialog or quick-saves if already named
   - **Open** (folder icon) -- opens load dialog
3. Wire save to collect current `{ nodes, edges, metadata: { idSeq, findings, ... } }`
4. Wire load to call `setNodes()`, `setEdges()`, restore idSeq/findings from metadata
5. Keep existing localStorage auto-save as-is (fallback for unsaved work)
6. Keep existing OTM/Threagile export buttons unchanged

### 4.3 Footer Bar Update

Add to the existing footer button row (next to OTM export):

```
[Save] [Open] | [OTM Export] [Threagile Export] [Report]
```

---

## Phase 5: Migration of Existing localStorage Data (Optional)

On first load after deploy:
1. Check if `tf_tm_nodes` / `tf_attack_nodes` exist in localStorage
2. If yes, and no `currentDiagramId` is set, prompt user: "You have an unsaved diagram. Save to cloud?"
3. If user confirms, POST to backend and clear the "migrate" flag

This is a nice-to-have and can be deferred.

---

## Implementation Order

| Step | What                                          | Files Changed                           |
|------|-----------------------------------------------|-----------------------------------------|
| 1    | Run SQL migration in Supabase                 | (Supabase SQL Editor)                   |
| 2    | Add backend CRUD endpoints                    | `app.py`                                |
| 3    | Test endpoints with curl/httpie               | --                                      |
| 4    | Create `useDiagramStorage` hook               | `hooks/useDiagramStorage.ts` (new)      |
| 5    | Create `DiagramManager` component             | `components/DiagramManager.tsx` (new)   |
| 6    | Wire into `AttackPathApp.tsx`                 | `AttackPathApp.tsx`                     |
| 7    | Wire into `ThreatModelingApp.tsx`             | `ThreatModelingApp.tsx`                 |
| 8    | Test end-to-end (save, load, list, delete)    | --                                      |
| 9    | Add auto-save debounce (optional)             | `useDiagramStorage.ts`                  |
| 10   | Add localStorage migration prompt (optional)  | App components                          |

---

## File Changes Summary

| Action   | File                                                             |
|----------|------------------------------------------------------------------|
| **SQL**  | Supabase: `CREATE TABLE diagrams` + indexes                     |
| **Edit** | `apps/nextgen-tm-server/src/nextgen_tm_server/app.py` -- 5 endpoints |
| **New**  | `apps/nextgen-tm-frontend/src/hooks/useDiagramStorage.ts`        |
| **New**  | `apps/nextgen-tm-frontend/src/components/DiagramManager.tsx`     |
| **Edit** | `apps/nextgen-tm-frontend/src/AttackPathApp.tsx` -- add save/load UI |
| **Edit** | `apps/nextgen-tm-frontend/src/ThreatModelingApp.tsx` -- add save/load UI |

---

## Security Notes

- All endpoints enforce `user_id` matching via Clerk JWT -- users can only access their own diagrams
- UUID primary keys prevent enumeration attacks
- Service role key stays server-side only
- No RLS needed -- access control is in application code (same as `llm_settings`)
- Node/edge data is stored as JSONB -- no SQL injection risk from diagram content
- `diagram_type` has a CHECK constraint to prevent invalid values

---

## No Changes Required

- **No new env vars** -- reuses existing `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `CLERK_JWKS_URL`
- **No new dependencies** -- `supabase-py` and `python-jose` already installed
- **No deploy config changes** -- backend already has Supabase credentials via PM2
- **Existing export/import unchanged** -- OTM/Threagile/Report downloads stay as-is
- **Existing localStorage auto-save unchanged** -- continues as instant local cache
