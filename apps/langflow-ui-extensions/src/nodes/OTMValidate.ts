export type OTMDocument = any;

export type OTMValidateOp = {
  schema?: string;
};

export async function otmValidate(
  baseUrl: string,
  otm: OTMDocument,
  op: OTMValidateOp = {}
): Promise<any> {
  const res = await fetch(`${baseUrl}/components/OTMValidate/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ otm, op }),
  });
  if (!res.ok) throw new Error(`otmValidate failed: ${res.status} ${await res.text()}`);
  return await res.json();
}

