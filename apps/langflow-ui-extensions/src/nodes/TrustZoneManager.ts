export type OTMDocument = any;

export type TrustZoneOp =
  | { action: "add"; trustZone: { id: string; name: string } }
  | { action: "assign"; componentId: string; trustZoneId: string };

import { executeNode } from "../api";

export async function trustZoneManager(
  baseUrl: string,
  otm: OTMDocument,
  op: TrustZoneOp
): Promise<OTMDocument> {
  const resp = await executeNode(baseUrl, "TrustZoneManager", otm, op);
  return resp as OTMDocument;
}

