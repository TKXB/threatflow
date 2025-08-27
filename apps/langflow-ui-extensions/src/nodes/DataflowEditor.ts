export type OTMDocument = any;

export type DataflowOp = {
  action: "add" | "remove";
  dataflow?: { id: string; source: string; destination: string; protocol?: string };
  id?: string;
};

import { executeNode } from "../api";

export async function dataflowEditor(
  baseUrl: string,
  otm: OTMDocument,
  op: DataflowOp
): Promise<OTMDocument> {
  const resp = await executeNode(baseUrl, "DataflowEditor", otm, op);
  return resp as OTMDocument;
}

