import { useMemo } from "react";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import type { TaraRow } from "../types/tara";
import { useState, useCallback, useRef } from "react";
import ContextMenu from "./ContextMenu";
import { Maximize2, X } from "lucide-react";
import * as XLSX from "xlsx";

type Props = {
  rows: TaraRow[] | null;
  onOpenFullscreen: () => void;
  onReanalyzeRow?: (rowIndex: number) => void;
  onClose?: () => void;
  loading?: boolean;
};

export default function TaraTable({ rows, onOpenFullscreen, onReanalyzeRow, onClose, loading }: Props) {
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; rowIndex: number } | null>(null);
  const [hoverRow, setHoverRow] = useState<number | null>(null);
  const closeCtx = useCallback(() => setCtxMenu(null), []);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [heightPx, setHeightPx] = useState<number | null>(null);
  const isResizingRef = useRef(false);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);
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
  const { taraRowSpanMeta, groupTopIndexByRow } = useMemo(() => {
    if (!taraRowModels.length) return { taraRowSpanMeta: [] as Array<Record<string, { rowSpan: number; hidden: boolean }>>, groupTopIndexByRow: [] as number[] };
    type CellMeta = { rowSpan: number; hidden: boolean };
    const meta: Array<Record<string, CellMeta>> = taraRowModels.map(() => ({}));
    const groupTopIdx: number[] = new Array(taraRowModels.length).fill(0);
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
        groupTopIdx[i] = i;
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
        groupTopIdx[i] = groupTopIndex;
      }
    }
    return { taraRowSpanMeta: meta, groupTopIndexByRow: groupTopIdx };
  }, [taraRowModels, taraGroupKeyColumnIds]);

  if (!rows || rows.length === 0) return null;

  const onResizeMouseDownTop = useCallback((e) => {
    e.preventDefault();
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    isResizingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = rect.height;
    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = startYRef.current - ev.clientY; // 向上拖增高
      const next = Math.max(160, Math.round(startHeightRef.current + delta));
      setHeightPx(next);
    };
    const onMouseUp = () => {
      isResizingRef.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  const onResizeDoubleClickTop = useCallback(() => setHeightPx(null), []);

  const onExportExcel = useCallback(() => {
    try {
      const cols = (taraColumns as Array<any>).map((c) => {
        const headerText = typeof c.header === "function" ? c.header() : (c.header ?? c.id ?? "");
        return { id: String(c.id ?? c.accessorKey ?? ""), headerText: String(headerText) };
      });
      const data = (rows ?? []).map((r) => {
        const rowObj: Record<string, any> = {};
        for (const col of cols) {
          let value: any = "";
          if (col.id === "C" || col.id === "I" || col.id === "A") {
            const key = col.id as "C" | "I" | "A";
            value = Boolean((r as any)?.cybersecurityProperty?.[key] ?? false);
          } else {
            value = (r as any)?.[col.id] ?? "";
          }
          rowObj[col.headerText] = value;
        }
        return rowObj;
      });
      const headers = cols.map((c) => c.headerText);
      const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "TARA");
      XLSX.writeFile(workbook, "tara.xlsx");
    } catch (err) {
      console.error("Export Excel failed", err);
    }
  }, [rows, taraColumns]);

  return (
    <div
      ref={wrapperRef}
      style={{ position: "relative", flex: heightPx === null ? 1 : undefined, height: heightPx === null ? undefined : heightPx, minHeight: 160, background: "#fff", borderTop: "1px solid #e5e7eb", overflow: "hidden" }}
    >
      <div
        aria-label="Resize TARA table"
        title="Drag top border to resize (double-click to reset)"
        onMouseDown={onResizeMouseDownTop}
        onDoubleClick={onResizeDoubleClickTop}
        style={{ position: "absolute", left: 0, right: 0, top: 0, height: 8, cursor: "row-resize", background: "transparent", zIndex: 2 }}
      />
      <div ref={containerRef} style={{ position: "relative", height: "100%", overflow: "auto" }}>
      <div style={{ padding: 8, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>LLM TARA Table</div>
        <span style={{ flex: 1 }} />
        <button onClick={onExportExcel} title="Export Excel" aria-label="Export Excel" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#111827", background: "transparent", border: 0, cursor: "pointer" }}>
          Export Excel
        </button>
        <button onClick={onOpenFullscreen} title="Open full screen" aria-label="Open full screen" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#2563eb", background: "transparent", border: 0, cursor: "pointer" }}>
          <Maximize2 size={13} />
        </button>
        <button onClick={() => onClose && onClose()} title="Close" aria-label="Close" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280", background: "transparent", border: 0, cursor: "pointer" }}>
          <X size={18} />
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
              <tr key={row.id}
                onMouseEnter={() => setHoverRow(Number(row.id))}
                onMouseLeave={() => setHoverRow((prev) => (prev === Number(row.id) ? null : prev))}
                onContextMenu={(e) => {
                e.preventDefault();
                  const containerRect = containerRef.current?.getBoundingClientRect();
                  const x = containerRect ? e.clientX - containerRect.left : e.clientX;
                  const y = containerRect ? e.clientY - containerRect.top : e.clientY;
                  setCtxMenu({ x, y, rowIndex: Number(row.id) });
                }}>
                {row.getVisibleCells().map((cell) => {
                  const idx = taraRowIndexById.get(row.id) ?? 0;
                  const colId = cell.column.id;
                  const meta = (taraRowSpanMeta[idx] || {})[colId];
                  if (meta && meta.hidden) return null;
                  const hoveredGroupTop = hoverRow !== null ? groupTopIndexByRow[hoverRow] : null;
                  const isHoveredRow = hoverRow === Number(row.id);
                  const isGroupTopForHovered = hoveredGroupTop !== null && Number(row.id) === hoveredGroupTop;
                  const groupColsForHover = new Set(["logic", "attackPathNo", ...taraGroupKeyColumnIds]);
                  const shouldHighlight = isHoveredRow || (isGroupTopForHovered && groupColsForHover.has(colId));
                  const rs = meta ? meta.rowSpan : undefined;
                  return (
                    <td key={cell.id} rowSpan={rs} style={{ padding: "8px", borderBottom: "1px solid #f3f4f6", verticalAlign: "top", fontSize: 12, background: shouldHighlight ? "#f9fafb" : undefined }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading && (
        <div aria-live="polite" role="status" style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" aria-label="Loading">
              <circle cx="12" cy="12" r="10" stroke="#e5e7eb" strokeWidth="4" fill="none" />
              <path d="M12 2 a10 10 0 0 1 10 10" stroke="#2563eb" strokeWidth="4" fill="none">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
              </path>
            </svg>
            <div style={{ fontSize: 13, color: "#374151" }}>Generating TARA...</div>
          </div>
        </div>
      )}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={closeCtx}
          items={[
            { key: "reanalyze", label: "Reanalyze (LLM)", onClick: () => { onReanalyzeRow && onReanalyzeRow(ctxMenu.rowIndex); closeCtx(); } },
          ]}
        />
      )}
      </div>
    </div>
  );
}


