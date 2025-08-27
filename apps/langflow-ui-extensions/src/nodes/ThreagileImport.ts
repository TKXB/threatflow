export async function threagileImport(baseUrl: string, yaml: string): Promise<any> {
  const res = await fetch(`${baseUrl}/components/ThreagileImport/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ otm: {}, op: { yaml } }),
  });
  if (!res.ok) throw new Error(`threagileImport failed: ${res.status} ${await res.text()}`);
  return await res.json();
}

