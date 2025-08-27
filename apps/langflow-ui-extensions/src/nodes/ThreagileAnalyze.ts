export async function threagileAnalyze(baseUrl: string, yaml: string): Promise<any> {
  const res = await fetch(`${baseUrl}/components/ThreagileAnalyze/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ otm: {}, op: { yaml } }),
  });
  if (!res.ok) throw new Error(`threagileAnalyze failed: ${res.status} ${await res.text()}`);
  return await res.json();
}

