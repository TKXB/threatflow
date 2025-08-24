export type IOType = "otm" | "json";

export interface NodeMeta {
  id: string;
  name: string;
  category: string;
  inputs: IOType[];
  outputs: IOType[];
  configSchema: Record<string, any>;
}

export interface ExtensionManifest {
  name: string;
  version: string;
  nodes: NodeMeta[];
}

export const manifest: ExtensionManifest = {
  name: "threatflow-ui-extensions",
  version: "0.1.0",
  nodes: [
    {
      id: "DataflowEditor",
      name: "Dataflow Editor",
      category: "OTM",
      inputs: ["otm"],
      outputs: ["otm"],
      configSchema: {
        type: "object",
        properties: {
          baseUrl: { type: "string", default: "http://127.0.0.1:8889" },
          action: { enum: ["add", "remove"], default: "add" },
          dataflow: {
            type: "object",
            properties: {
              id: { type: "string" },
              source: { type: "string" },
              destination: { type: "string" },
              protocol: { type: "string" },
            },
          },
          id: { type: "string" },
        },
        required: ["baseUrl", "action"],
      },
    },
    {
      id: "TrustZoneManager",
      name: "Trust Zone Manager",
      category: "OTM",
      inputs: ["otm"],
      outputs: ["otm"],
      configSchema: {
        type: "object",
        properties: {
          baseUrl: { type: "string", default: "http://127.0.0.1:8889" },
          action: { enum: ["add", "assign"], default: "add" },
          trustZone: {
            type: "object",
            properties: { id: { type: "string" }, name: { type: "string" } },
          },
          componentId: { type: "string" },
          trustZoneId: { type: "string" },
        },
        required: ["baseUrl", "action"],
      },
    },
    {
      id: "LayoutWriter",
      name: "Layout Writer",
      category: "OTM",
      inputs: ["otm"],
      outputs: ["otm"],
      configSchema: {
        type: "object",
        properties: {
          baseUrl: { type: "string", default: "http://127.0.0.1:8889" },
          action: { enum: ["set", "merge"], default: "set" },
          layout: { type: "object", default: {} },
        },
        required: ["baseUrl", "action"],
      },
    },
  ],
};

