export async function threatDragonImport(baseUrl: string, td: any): Promise<any> {
  const res = await fetch(`${baseUrl}/components/ThreatDragonImport/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ otm: {}, op: { td } }),
  });
  if (!res.ok) throw new Error(`threatDragonImport failed: ${res.status} ${await res.text()}`);
  return await res.json();
}

