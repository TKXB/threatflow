import type { Edge, Node } from "@xyflow/react";
import { analyzeSimplePaths, type SimplePath } from "../utils/pathAnalysis";

export type AttackMethod = {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  confidence: number; // 0..1
  references?: { title: string; url: string }[];
  matchedPath?: { nodeIds: string[]; labels: string[] };
};

function textIncludes(s: unknown, kw: string): boolean {
  const t = (s ?? "").toString().toLowerCase();
  return t.includes(kw.toLowerCase());
}

function isEntryNode(n: Node): boolean {
  const v = (n as any).data?.isEntry;
  if (v === "yes" || v === true) return true;
  return n.type === "actor"; // heuristic fallback
}

function isTargetNode(n: Node): boolean {
  const v = (n as any).data?.isTarget;
  if (v === "yes" || v === true) return true;
  const tech = (n as any).data?.technology;
  const label = (n as any).data?.label;
  if (n.type === "store" && (textIncludes(tech, "target") || textIncludes(label, "target") || textIncludes(label, "goal"))) return true;
  return false;
}

function nodeTech(n: Node | undefined): string {
  return ((n as any)?.data?.technology || (n as any)?.data?.label || "").toString().toLowerCase();
}

function nodeLabel(n: Node | undefined): string {
  return ((n as any)?.data?.label || (n as any)?.id || "").toString();
}

// Minimal demo rules. Later can be replaced/extended by AI agent-backed provider.
function evaluateRules(path: SimplePath, idToNode: Map<string, Node>): AttackMethod[] {
  const firstNode = idToNode.get(path.nodeIds[0]);
  const lastNode = idToNode.get(path.nodeIds[path.nodeIds.length - 1]);
  const firstTech = nodeTech(firstNode);
  const lastTech = nodeTech(lastNode);
  const lastLabel = nodeLabel(lastNode).toLowerCase();

  const methods: AttackMethod[] = [];

  // UART → Linux target examples
  const isUart = firstTech.includes("uart") || nodeLabel(firstNode).toLowerCase().includes("uart");
  const isLinuxTarget = lastTech.includes("linux") || lastLabel.includes("linux");
  const isSpiTarget = lastTech.includes("spi") || lastLabel.includes("spi");
  if (isUart && isLinuxTarget) {
    methods.push({
      id: "uart-linux-bruteforce",
      title: "Crack UART console password",
      description: "Attempt password brute-force or default credentials on the UART login to obtain shell access.",
      severity: "high",
      confidence: 0.7,
      references: [
        { title: "Common IoT UART Attacks", url: "https://owasp.org/www-project-iot/" },
      ],
      matchedPath: { nodeIds: path.nodeIds, labels: path.labels },
    });
    methods.push({
      id: "uart-bootloader-interrupt",
      title: "Interrupt bootloader via UART and spawn root shell",
      description: "Interrupt U-Boot/bootloader over UART, modify bootargs/init to obtain a privileged shell.",
      severity: "high",
      confidence: 0.6,
      references: [
        { title: "U-Boot Bootargs Tricks", url: "https://u-boot.readthedocs.io/" },
      ],
      matchedPath: { nodeIds: path.nodeIds, labels: path.labels },
    });
  }

  // UART → Linux → SPI device
  if (isUart && isSpiTarget) {
    methods.push({
      id: "uart-linux-spi-dump",
      title: "Pivot from UART shell to dump SPI device",
      description: "Use UART-obtained shell on Linux to access SPI device nodes (e.g., /dev/spidev*), dump firmware/config or issue malicious writes.",
      severity: "high",
      confidence: 0.65,
      references: [
        { title: "spidev Userspace", url: "https://www.kernel.org/doc/Documentation/spi/spidev" },
      ],
      matchedPath: { nodeIds: path.nodeIds, labels: path.labels },
    });
  }

  // BLE → Linux (generic) example
  const isBle = firstTech.includes("ble") || nodeLabel(firstNode).toLowerCase().includes("ble");
  if (isBle && isLinuxTarget) {
    methods.push({
      id: "ble-mitm-keys",
      title: "BLE pairing MITM to derive keys",
      description: "Perform BLE MITM during pairing to capture/derive long-term keys, then access services on the Linux device.",
      severity: "medium",
      confidence: 0.5,
      matchedPath: { nodeIds: path.nodeIds, labels: path.labels },
    });
  }

  // Generic: public-network + HTTP segment → credential stuffing/web exploit
  // If any edge suggests public network or plain http, raise web-based method
  if (path.labels.join(" ").toLowerCase().includes("http")) {
    methods.push({
      id: "web-credential-stuffing",
      title: "Credential stuffing via exposed HTTP endpoint",
      description: "Leverage reused credentials against exposed HTTP services en route to the target.",
      severity: "medium",
      confidence: 0.4,
      matchedPath: { nodeIds: path.nodeIds, labels: path.labels },
    });
  }

  return methods;
}

export function suggestAttackMethods(
  nodes: Node[],
  edges: Edge[],
  options: { k?: number; maxDepth?: number } = {}
): AttackMethod[] {
  const k = Math.max(1, options.k ?? 10);
  const paths = analyzeSimplePaths(nodes, edges, { k, maxDepth: options.maxDepth ?? 20 });
  const idToNode = new Map<string, Node>(nodes.map((n) => [n.id, n]));

  // Prefer paths从入口开始；不过不再强制终点必须为 Target，
  // 以便匹配如 UART→Linux→SPI 的场景（SPI 未显式标为 Target 也可被建议规则识别）。
  const filtered = paths.filter((p) => {
    const start = idToNode.get(p.nodeIds[0]);
    return !!start && isEntryNode(start);
  });

  const all: AttackMethod[] = [];
  for (const p of filtered) {
    all.push(...evaluateRules(p, idToNode));
  }

  // Deduplicate by id + path end
  const seen = new Set<string>();
  const dedup: AttackMethod[] = [];
  for (const m of all) {
    const key = `${m.id}::${m.matchedPath?.nodeIds.slice(-1)[0] || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(m);
  }
  return dedup;
}

