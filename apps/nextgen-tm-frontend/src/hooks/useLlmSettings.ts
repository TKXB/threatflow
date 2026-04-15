import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";

const STORAGE_KEYS = {
  llmBase: "tf_llm_base_url",
  llmKey: "tf_llm_api_key",
  llmModel: "tf_llm_model",
  llmUpdatedAt: "tf_llm_updated_at",
} as const;

const DEFAULTS = {
  baseUrl: "http://127.0.0.1:4000/v1",
  apiKey: "",
  model: "gpt-4o-mini",
};

const API = (import.meta as any).env?.VITE_NEXTGEN_API || "";

function safeParse<T>(text: string | null, fallback: T): T {
  if (!text) return fallback;
  try { return JSON.parse(text) as T; } catch { return fallback; }
}

export function useLlmSettings() {
  const { getToken } = useAuth();
  const [llmBaseUrl, setLlmBaseUrl] = useState(DEFAULTS.baseUrl);
  const [llmApiKey, setLlmApiKey] = useState(DEFAULTS.apiKey);
  const [llmModel, setLlmModel] = useState(DEFAULTS.model);
  const [showLlmSettings, setShowLlmSettings] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Step 1: hydrate from localStorage immediately
  useEffect(() => {
    const base = safeParse(localStorage.getItem(STORAGE_KEYS.llmBase), null);
    const key = safeParse(localStorage.getItem(STORAGE_KEYS.llmKey), null);
    const model = safeParse(localStorage.getItem(STORAGE_KEYS.llmModel), null);
    if (base) setLlmBaseUrl(base);
    if (key) setLlmApiKey(key);
    if (model) setLlmModel(model);
    setHydrated(true);

    // Step 2: fetch from backend (Supabase) in background
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch(`${API}/api/llm-settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const localTs = safeParse<number>(localStorage.getItem(STORAGE_KEYS.llmUpdatedAt), 0);
        // Step 3: if server is newer, update state + localStorage
        if (data.updatedAt && data.updatedAt > localTs) {
          setLlmBaseUrl(data.baseUrl ?? DEFAULTS.baseUrl);
          setLlmApiKey(data.apiKey ?? DEFAULTS.apiKey);
          setLlmModel(data.model ?? DEFAULTS.model);
          localStorage.setItem(STORAGE_KEYS.llmBase, JSON.stringify(data.baseUrl ?? DEFAULTS.baseUrl));
          localStorage.setItem(STORAGE_KEYS.llmKey, JSON.stringify(data.apiKey ?? DEFAULTS.apiKey));
          localStorage.setItem(STORAGE_KEYS.llmModel, JSON.stringify(data.model ?? DEFAULTS.model));
          localStorage.setItem(STORAGE_KEYS.llmUpdatedAt, JSON.stringify(data.updatedAt));
        }
      } catch {
        // Step 4: network fails -> silently stay with localStorage values
      }
    })();
  }, []);

  // Persist to localStorage on every change (after initial hydration)
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEYS.llmBase, JSON.stringify(llmBaseUrl));
    localStorage.setItem(STORAGE_KEYS.llmKey, JSON.stringify(llmApiKey));
    localStorage.setItem(STORAGE_KEYS.llmModel, JSON.stringify(llmModel));
  }, [hydrated, llmBaseUrl, llmApiKey, llmModel]);

  // Save: write localStorage + push to backend
  const saveLlmSettings = useCallback(async () => {
    const now = Math.floor(Date.now() / 1000);
    localStorage.setItem(STORAGE_KEYS.llmBase, JSON.stringify(llmBaseUrl));
    localStorage.setItem(STORAGE_KEYS.llmKey, JSON.stringify(llmApiKey));
    localStorage.setItem(STORAGE_KEYS.llmModel, JSON.stringify(llmModel));
    localStorage.setItem(STORAGE_KEYS.llmUpdatedAt, JSON.stringify(now));
    setShowLlmSettings(false);

    try {
      const token = await getToken();
      if (!token) return;
      await fetch(`${API}/api/llm-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ baseUrl: llmBaseUrl, apiKey: llmApiKey, model: llmModel }),
      });
    } catch {
      // Network fails -> settings still persisted locally
    }
  }, [llmBaseUrl, llmApiKey, llmModel, getToken]);

  return {
    llmBaseUrl, llmApiKey, llmModel,
    setLlmBaseUrl, setLlmApiKey, setLlmModel,
    showLlmSettings, setShowLlmSettings,
    saveLlmSettings, hydrated,
  };
}
