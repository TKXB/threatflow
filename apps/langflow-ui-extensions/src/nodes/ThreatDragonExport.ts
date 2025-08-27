export async function threatDragonExport(baseUrl: string, otm: any): Promise<any> {
  const res = await fetch(`${baseUrl}/components/ThreatDragonExport/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ otm, op: {} }),
  });
  if (!res.ok) throw new Error(`threatDragonExport failed: ${res.status} ${await res.text()}`);
  return await res.json();
}

