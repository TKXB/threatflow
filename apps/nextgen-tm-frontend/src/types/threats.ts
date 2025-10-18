// Threat-related shared types used by LLM Risks accept flow

export type ThreatStatus = "NA" | "Open" | "Mitigated";
export type ThreatPriority = "TBD" | "Low" | "Medium" | "High" | "Critical";

export type ThreatInput = {
  title: string;
  type: string;
  status: ThreatStatus;
  score?: number;
  priority: ThreatPriority;
  description?: string;
  mitigations?: string;
  nodeIds: string[];
  sourceRiskId?: string;
};


