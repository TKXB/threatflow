export async function threagileExport(baseUrl: string, otm: any): Promise<string> {
  const res = await fetch(`${baseUrl}/components/ThreagileExport/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ otm, op: {} }),
  });
  if (!res.ok) throw new Error(`threagileExport failed: ${res.status} ${await res.text()}`);
  return await res.text();
}

