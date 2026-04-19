import { useState, useCallback } from "react";
import { useAuthFetch } from "./useAuthFetch";

const API = (import.meta as any).env?.VITE_NEXTGEN_API || "";

export type DiagramType = "attack_path" | "threat_model";

export interface SavedDiagram {
  id: string;
  name: string;
  diagram_type: DiagramType;
  created_at: number;
  updated_at: number;
}

export interface DiagramPayload {
  nodes: any[];
  edges: any[];
  metadata: Record<string, any>;
}

export function useDiagramStorage(diagramType: DiagramType) {
  const authFetch = useAuthFetch();
  const [diagrams, setDiagrams] = useState<SavedDiagram[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDiagramId, setCurrentDiagramId] = useState<string | null>(null);
  const [currentDiagramName, setCurrentDiagramName] = useState<string | null>(null);

  const refreshList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API}/api/diagrams?type=${diagramType}`);
      if (!res.ok) return;
      const data = await res.json();
      setDiagrams(data.diagrams || []);
    } catch {
      // network error — keep existing list
    } finally {
      setLoading(false);
    }
  }, [authFetch, diagramType]);

  const saveDiagram = useCallback(
    async (name: string, payload: DiagramPayload): Promise<string | null> => {
      try {
        const res = await authFetch(`${API}/api/diagrams`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            diagramType,
            nodes: payload.nodes,
            edges: payload.edges,
            metadata: payload.metadata,
          }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        const id = data.id as string;
        setCurrentDiagramId(id);
        setCurrentDiagramName(name);
        return id;
      } catch {
        return null;
      }
    },
    [authFetch, diagramType],
  );

  const updateDiagram = useCallback(
    async (id: string, name: string, payload: DiagramPayload): Promise<boolean> => {
      try {
        const res = await authFetch(`${API}/api/diagrams/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            diagramType,
            nodes: payload.nodes,
            edges: payload.edges,
            metadata: payload.metadata,
          }),
        });
        if (!res.ok) return false;
        setCurrentDiagramName(name);
        return true;
      } catch {
        return false;
      }
    },
    [authFetch, diagramType],
  );

  const loadDiagram = useCallback(
    async (id: string): Promise<DiagramPayload | null> => {
      try {
        const res = await authFetch(`${API}/api/diagrams/${id}`);
        if (!res.ok) return null;
        const data = await res.json();
        setCurrentDiagramId(id);
        setCurrentDiagramName(data.name);
        return {
          nodes: data.nodes || [],
          edges: data.edges || [],
          metadata: data.metadata || {},
        };
      } catch {
        return null;
      }
    },
    [authFetch],
  );

  const deleteDiagram = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const res = await authFetch(`${API}/api/diagrams/${id}`, { method: "DELETE" });
        if (!res.ok) return false;
        if (currentDiagramId === id) {
          setCurrentDiagramId(null);
          setCurrentDiagramName(null);
        }
        return true;
      } catch {
        return false;
      }
    },
    [authFetch, currentDiagramId],
  );

  const clearCurrent = useCallback(() => {
    setCurrentDiagramId(null);
    setCurrentDiagramName(null);
  }, []);

  return {
    diagrams,
    loading,
    refreshList,
    saveDiagram,
    updateDiagram,
    loadDiagram,
    deleteDiagram,
    currentDiagramId,
    currentDiagramName,
    setCurrentDiagramId,
    setCurrentDiagramName,
    clearCurrent,
  };
}
