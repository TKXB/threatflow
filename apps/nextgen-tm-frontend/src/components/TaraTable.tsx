import { useMemo } from "react";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import type { TaraRow } from "../types/tara";

type Props = {
  rows: TaraRow[] | null;
  onOpenFullscreen: () => void;
};

export default function TaraTable({ rows, onOpenFullscreen }: Props) {
  const taraColumns = useMemo<ColumnDef<TaraRow>[]>(() => [
    { id: "damageScenarioNo", header: () => "Damage Scenario No.", accessorKey: "damageScenarioNo", size: 120 },
    { id: "damageScenario", header: () => "Damage Scenario", accessorKey: "damageScenario", size: 240 },
    { id: "C", header: () => "C", cell: ({ row }) => String(row.original.cybersecurityProperty?.C ?? false), size: 40 },
    { id: "I", header: () => "I", cell: ({ row }) => String(row.original.cybersecurityProperty?.I ?? false), size: 40 },
    { id: "A", header: () => "A", cell: ({ row }) => String(row.original.cybersecurityProperty?.A ?? false), size: 40 },
    { id: "threatScenarioNo", header: () => "Threat scenario No.", accessorKey: "threatScenarioNo", size: 140 },
    { id: "threatScenario", header: () => "Threat scenario", accessorKey: "threatScenario", size: 260 },
    { id: "impactCategory", header: () => "Impact category", accessorKey: "impactCategory", size: 120 },
    { id: "impactRating", header: () => "Impact Rating", accessorKey: "impactRating", size: 120 },
    { id: "impact", header: () => "Impact", accessorKey: "impact", size: 260 },
    { id: "attackPathNo", header: () => "Attack path No.", accessorKey: "attackPathNo", size: 120 },
    { id: "entryPoint", header: () => "Entry Point", accessorKey: "entryPoint", size: 120 },
    { id: "logic", header: () => "Logic", accessorKey: "logic", size: 80 },
    { id: "attackPath", header: () => "Attack path", accessorKey: "attackPath", size: 240 },
    { id: "unR155CsmsAnnex5PartA", header: () => "UN-R155 CSMS Annex 5 PartA", accessorKey: "unR155CsmsAnnex5PartA", size: 240 },
    { id: "attackVectorBasedApproach", header: () => "Attack vector-based approach", accessorKey: "attackVectorBasedApproach", size: 200 },
    { id: "attackFeasibilityRating", header: () => "Attack feasibility rating", accessorKey: "attackFeasibilityRating", size: 180 },
    { id: "riskImpact", header: () => "Risk Impact", accessorKey: "riskImpact", size: 120 },
    { id: "riskValue", header: () => "Risk value", accessorKey: "riskValue", size: 100 },
    { id: "attackVectorParameters", header: () => "Attack vector parameters", accessorKey: "attackVectorParameters", size: 200 },
    { id: "riskImpactFinal", header: () => "Risk Impact (final)", accessorKey: "riskImpactFinal", size: 140 },
  ], []);

  const taraTable = useReactTable({ data: rows ?? [], columns: taraColumns, getCoreRowModel: getCoreRowModel(), getRowId: (_row, index) => String(index) });

  // Precompute rowSpan meta to keep visual grouping identical
  const taraRowModels = useMemo(() => (rows || []).map((r, idx) => ({ original: r as TaraRow, id: String(idx) })), [rows]);
  const taraRowIndexById = useMemo(() => { const map = new Map<string, number>(); taraRowModels.forEach((r, idx) => map.set(r.id, idx)); return map; }, [taraRowModels]);
  const taraGroupKeyColumnIds = useMemo<string[]>(() => ["damageScenarioNo","damageScenario","C","I","A","threatScenarioNo","threatScenario","impactCategory","impactRating","impact","entryPoint"], []);
  function getMergeValueForId(row: TaraRow, id: string): string | number | boolean {
    if (id === "C") return Boolean(row.cybersecurityProperty?.C ?? false);
    if (id === "I") return Boolean(row.cybersecurityProperty?.I ?? false);
    if (id === "A") return Boolean(row.cybersecurityProperty?.A ?? false);
    return (row as any)?.[id] ?? "";
  }
  const taraRowSpanMeta = useMemo(() => {
    if (!taraRowModels.length) return [] as Array<Record<string, { rowSpan: number; hidden: boolean }>>;
    type CellMeta = { rowSpan: number; hidden: boolean };
    const meta: Array<Record<string, CellMeta>> = taraRowModels.map(() => ({}));
    let currentKey: string | null = null;
    let groupTopIndex = 0;
    let apTopValue: any = null;
    let apTopIndex = 0;
    for (let i = 0; i < taraRowModels.length; i++) {
      const original = taraRowModels[i].original as TaraRow;
      const key = JSON.stringify(taraGroupKeyColumnIds.map((id) => getMergeValueForId(original, id)));
      const apVal = (original as any)?.["attackPathNo"] ?? "";
      if (currentKey === null || key !== currentKey) {
        for (const id of taraGroupKeyColumnIds) meta[i][id] = { rowSpan: 1, hidden: false };
        meta[i]["logic"] = { rowSpan: 1, hidden: false };
        currentKey = key;
        groupTopIndex = i;
        apTopValue = apVal;
        meta[i]["attackPathNo"] = { rowSpan: 1, hidden: false };
        apTopIndex = i;
      } else {
        for (const id of taraGroupKeyColumnIds) {
          meta[groupTopIndex][id].rowSpan += 1;
          meta[i][id] = { rowSpan: 0, hidden: true };
        }
        if (meta[groupTopIndex]["logic"]) meta[groupTopIndex]["logic"].rowSpan += 1; else meta[groupTopIndex]["logic"] = { rowSpan: 2, hidden: false };
        meta[i]["logic"] = { rowSpan: 0, hidden: true };
        if (apVal === apTopValue) {
          meta[apTopIndex]["attackPathNo"].rowSpan += 1;
          meta[i]["attackPathNo"] = { rowSpan: 0, hidden: true };
        } else {
          apTopValue = apVal;
          meta[i]["attackPathNo"] = { rowSpan: 1, hidden: false };
          apTopIndex = i;
        }
      }
    }
    return meta;
  }, [taraRowModels, taraGroupKeyColumnIds]);

  if (!rows || rows.length === 0) return null;

  return (
    <div style={{ flex: 1, overflow: "auto", borderTop: "1px solid #e5e7eb", background: "#fff" }}>
      <div style={{ padding: 8, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>LLM TARA Table</div>
        <span style={{ flex: 1 }} />
        <button onClick={onOpenFullscreen} title="Open full screen" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#2563eb", background: "transparent", border: 0, cursor: "pointer" }}>
          {/* Icon is passed by parent or not required here to avoid extra deps */}
          ⤢
        </button>
      </div>
      <div style={{ padding: "0 8px 8px 8px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            {taraTable.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id} style={{ textAlign: "left", fontSize: 12, color: "#6b7280", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {taraTable.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => {
                  const idx = taraRowIndexById.get(row.id) ?? 0;
                  const colId = cell.column.id;
                  const meta = (taraRowSpanMeta[idx] || {})[colId];
                  if (meta && meta.hidden) return null;
                  const rs = meta ? meta.rowSpan : undefined;
                  return (
                    <td key={cell.id} rowSpan={rs} style={{ padding: "8px", borderBottom: "1px solid #f3f4f6", verticalAlign: "top", fontSize: 12 }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


