import type { TaraRow } from "../types/tara";

// 规范化枚举文本，宽松匹配空格/大小写
function norm(text: unknown): string {
  return String(text || "").trim().replace(/\s+/g, " ").toLowerCase();
}

export type ImpactLevel = "Negligible" | "Moderate" | "Major" | "Severe";
export type FeasibilityLevel = "Very Low" | "Low" | "Medium" | "High";
export type VectorParam = "Physical" | "Local" | "Adjacent" | "Network";

export function normalizeImpactRating(v: unknown): ImpactLevel | "" {
  const s = norm(v);
  if (s === "negligible") return "Negligible";
  if (s === "moderate") return "Moderate";
  if (s === "major") return "Major";
  if (s === "severe") return "Severe";
  // 兼容数字 1..5 的快捷映射（若需要）：1=Negligible, 2=Moderate, 3=Major, 4/5=Severe
  const n = Number.isFinite(Number(s)) ? Number(s) : NaN;
  if (!Number.isNaN(n)) {
    if (n <= 1) return "Negligible";
    if (n === 2) return "Moderate";
    if (n === 3) return "Major";
    if (n >= 4) return "Severe";
  }
  return "";
}

export function normalizeFeasibility(v: unknown): FeasibilityLevel | "" {
  const s = norm(v);
  if (s === "very low" || s === "verylow" || s === "vlow" || s === "v-low") return "Very Low";
  if (s === "low") return "Low";
  if (s === "medium" || s === "med") return "Medium";
  if (s === "high") return "High";
  return "";
}

// 风险矩阵（Impact × Feasibility ⇒ 数值）
const riskMatrix: Record<ImpactLevel, Record<FeasibilityLevel, number>> = {
  "Negligible": { "Very Low": 1, "Low": 1, "Medium": 1, "High": 1 },
  "Moderate":   { "Very Low": 1, "Low": 2, "Medium": 2, "High": 3 },
  "Major":      { "Very Low": 1, "Low": 2, "Medium": 3, "High": 4 },
  "Severe":     { "Very Low": 1, "Low": 3, "Medium": 4, "High": 5 },
};

// Attack vector parameters 映射
const vectorParamByFeasibility: Record<FeasibilityLevel, VectorParam> = {
  "Very Low": "Physical",
  "Low": "Local",
  "Medium": "Adjacent",
  "High": "Network",
};

// CAL 矩阵（ImpactFinal × VectorParam ⇒ label）
const calMatrix: Record<ImpactLevel, Record<VectorParam, string>> = {
  "Negligible": { Physical: "N/A", Local: "N/A", Adjacent: "N/A", Network: "N/A" },
  "Moderate":   { Physical: "CAL1", Local: "CAL1", Adjacent: "CAL2", Network: "CAL3" },
  "Major":      { Physical: "CAL1", Local: "CAL2", Adjacent: "CAL3", Network: "CAL4" },
  "Severe":     { Physical: "CAL2", Local: "CAL3", Adjacent: "CAL4", Network: "CAL4" },
};

export type DerivedFields = {
  attackFeasibilityRating?: FeasibilityLevel | "";
  riskImpact?: ImpactLevel | "";
  riskValue?: number | undefined;
  attackVectorParameters?: VectorParam | "";
  riskImpactFinal?: ImpactLevel | "";
  cal?: string | undefined;
};

export function deriveTaraFields(row: TaraRow): TaraRow & { cal?: string } {
  // S5 → T5
  const feasibilityRaw = row.attackVectorBasedApproach ?? row.attackFeasibilityRating;
  const feasibility = normalizeFeasibility(feasibilityRaw);

  // L5 → U5/X5
  const impactRaw = row.impactRating;
  const impact = normalizeImpactRating(impactRaw);

  // V5: 矩阵查找
  const riskValue = feasibility && impact ? riskMatrix[impact]?.[feasibility] : undefined;

  // W5: 参数映射
  const attackVectorParameters = feasibility ? vectorParamByFeasibility[feasibility] : "";

  // X5 = U5（最终 Risk Impact 与 Impact Rating 一致）
  const riskImpactFinal: ImpactLevel | "" = impact || "";

  // Y5: CAL 矩阵查找
  const cal = attackVectorParameters && riskImpactFinal ? calMatrix[riskImpactFinal]?.[attackVectorParameters as VectorParam] : undefined;

  return {
    ...row,
    attackFeasibilityRating: feasibility || undefined,
    riskImpact: impact || undefined,
    riskValue,
    attackVectorParameters: attackVectorParameters || undefined,
    riskImpactFinal: riskImpactFinal || undefined,
    cal,
  } as TaraRow & { cal?: string };
}

export function applyTaraDerivations(rows: TaraRow[] | null | undefined): (TaraRow & { cal?: string })[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => deriveTaraFields(r));
}


