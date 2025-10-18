export type TaraRow = {
  damageScenarioNo?: string;
  damageScenario?: string;
  cybersecurityProperty?: { C: boolean; I: boolean; A: boolean };
  threatScenarioNo?: string;
  threatScenario?: string;
  impactCategory?: "Safety" | "Financial" | "Operational" | "Privacy";
  impactRating?: "Severe" | "Major" | "Moderate" | "Negligible";
  impact?: string;
  attackPathNo?: string;
  entryPoint?: string;
  logic?: "AND" | "OR";
  attackPath?: string;
  unR155CsmsAnnex5PartA?: string;
  attackVectorBasedApproach?: string;
  attackFeasibilityRating?: "Very Low" | "Low" | "Medium" | "High";
  riskImpact?: string;
  riskValue?: number;
  attackVectorParameters?: string;
  riskImpactFinal?: string;
  cal?: string;
};


