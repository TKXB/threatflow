export type OTMDocument = any;

export type DataflowOp = {
  action: "add" | "remove";
  dataflow?: { id: string; source: string; destination: string; protocol?: string };
  id?: string;
};

export async function dataflowEditor(
  baseUrl: string,
  otm: OTMDocument,
  op: DataflowOp
): Promise<OTMDocument> {
  const res = await fetch(`${baseUrl}/otm/dataflow`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ otm, op }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`dataflowEditor failed: ${res.status} ${text}`);
  }
  return (await res.json()) as OTMDocument;
}

