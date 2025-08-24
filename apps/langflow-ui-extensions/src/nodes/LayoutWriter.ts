export type OTMDocument = any;

export type LayoutOp =
  | { action: "set"; layout: Record<string, any> }
  | { action: "merge"; layout: Record<string, any> };

export async function layoutWriter(baseUrl: string, otm: OTMDocument, op: LayoutOp): Promise<OTMDocument> {
  const res = await fetch(`${baseUrl}/components/LayoutWriter/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ otm, op }),
  });
  if (!res.ok) throw new Error(`layoutWriter failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as OTMDocument;
}

