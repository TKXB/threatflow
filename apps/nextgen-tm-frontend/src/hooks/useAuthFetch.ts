import { useAuth } from "@clerk/react";
import { useCallback } from "react";

/**
 * Returns an `authFetch` function that behaves like `fetch` but automatically
 * attaches the Clerk Bearer token to every request.
 */
export function useAuthFetch() {
  const { getToken } = useAuth();

  const authFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const token = await getToken();
      const headers = new Headers(init?.headers);
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return fetch(input, { ...init, headers });
    },
    [getToken],
  );

  return authFetch;
}
