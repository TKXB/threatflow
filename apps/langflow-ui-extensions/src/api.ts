export async function executeNode(baseUrl: string, compId: string, otm: any, op: any) {
  const res = await fetch(`${baseUrl}/components/${compId}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ otm, op }),
  });
  if (!res.ok) {
    throw new Error(`execute ${compId} failed: ${res.status} ${await res.text()}`);
  }
  return await res.json();
}

