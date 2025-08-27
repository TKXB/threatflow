export type OTMDocument = any;

export type RuleEngineOp = {
  rules_dir?: string;
};

export async function ruleEngineEvaluate(
  baseUrl: string,
  otm: OTMDocument,
  op: RuleEngineOp = {}
): Promise<any> {
  const res = await fetch(`${baseUrl}/components/RuleEngineEvaluate/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ otm, op }),
  });
  if (!res.ok) throw new Error(`ruleEngineEvaluate failed: ${res.status} ${await res.text()}`);
  return await res.json();
}

