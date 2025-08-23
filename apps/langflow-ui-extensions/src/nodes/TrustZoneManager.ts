export type OTMDocument = any;

export type TrustZoneOp =
  | { action: "add"; trustZone: { id: string; name: string } }
  | { action: "assign"; componentId: string; trustZoneId: string };

export async function trustZoneManager(
  baseUrl: string,
  otm: OTMDocument,
  op: TrustZoneOp
): Promise<OTMDocument> {
  const res = await fetch(`${baseUrl}/otm/trustzone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ otm, op }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`trustZoneManager failed: ${res.status} ${text}`);
  }
  return (await res.json()) as OTMDocument;
}

