# Plan: Require Login Before App Access

## Current State

- **Clerk** is already integrated (frontend `@clerk/react`, backend JWT verification via `auth.py`)
- The `AppHeader` shows a `SignInButton` when signed out and `UserButton` when signed in
- **Problem:** The app content (Threat Modeling / Attack Path canvas) is fully accessible without signing in
- Only 2 backend endpoints (`GET/PUT /llm-settings`) require authentication; all analysis endpoints are public

## Goal

Users must sign in before they can access any app functionality. Unauthenticated visitors see a login/landing page instead of the app.

---

## Implementation Plan

### Phase 1: Frontend — Gate App Behind Authentication

**File: `apps/nextgen-tm-frontend/src/App.tsx`**

1. Import `useUser` (or `SignedIn` / `SignedOut`) from `@clerk/react`
2. Wrap the main app content with Clerk's `<SignedIn>` component
3. Show a dedicated login page/screen via `<SignedOut>` component

```tsx
import { SignedIn, SignedOut, SignInButton } from "@clerk/react";

export default function App() {
  return (
    <SignedIn>
      {/* existing app content: AppHeader + ThreatModelingApp / AttackPathApp */}
    </SignedIn>
    <SignedOut>
      <LoginPage />
    </SignedOut>
  );
}
```

### Phase 2: Frontend — Create Login Page Component

**New file: `apps/nextgen-tm-frontend/src/components/LoginPage.tsx`**

A simple, branded landing page with:
- App logo / name ("ThreatFlow")
- Brief description of the app
- Clerk `<SignInButton mode="modal">` or `<SignIn />` embedded component
- Clean, centered layout matching the app's dark theme

Keep it minimal — Clerk handles all the auth UI (email, OAuth, etc.).

### Phase 3: Backend — Protect All API Endpoints

**File: `apps/nextgen-tm-server/src/nextgen_tm_server/app.py`**

Currently only `/llm-settings` calls `get_current_user_id()`. Protect the remaining endpoints:

| Endpoint | Current | Change |
|----------|---------|--------|
| `POST /analysis/paths` | Public | Add auth |
| `POST /analysis/llm/methods` | Public | Add auth |
| `POST /analysis/llm/tara` | Public | Add auth |
| `POST /analysis/tm/llm/risks` | Public | Add auth |
| `GET /palette/plugins` | Public | Add auth |
| `GET /llm-settings` | Protected | No change |
| `PUT /llm-settings` | Protected | No change |

Two approaches (pick one):
- **A) Per-route:** Add `user_id = await get_current_user_id(request)` to each endpoint
- **B) Middleware (recommended):** Add a FastAPI middleware that runs `get_current_user_id()` on all `/analysis/*` and `/llm-settings` routes, skipping health-check endpoints

### Phase 4: Frontend — Send Auth Token on All API Calls

**Files:** Any file making `fetch()` or API calls (check `ThreatModelingApp.tsx`, `AttackPathApp.tsx`, utility files)

1. Create a shared `useAuthFetch()` hook or utility that:
   - Calls `useAuth().getToken()` from Clerk
   - Attaches `Authorization: Bearer {token}` header to every request
2. Replace all direct `fetch("/api/...")` calls with the authenticated version

**Reference:** `hooks/useLlmSettings.ts` already does this pattern — extract and reuse it.

### Phase 5: Handle Loading & Edge Cases

1. **Loading state:** While Clerk is initializing, show a spinner (use `useUser().isLoaded` or `<ClerkLoaded>`)
2. **Token expiry:** If a backend call returns 401, redirect to login (Clerk handles token refresh automatically, but add a fallback)
3. **Sign-out redirect:** Already configured (`afterSignOutUrl="/"`) — will now show the login page

---

## Files to Modify

| File | Change |
|------|--------|
| `apps/nextgen-tm-frontend/src/App.tsx` | Gate content with `SignedIn`/`SignedOut` |
| `apps/nextgen-tm-frontend/src/components/LoginPage.tsx` | **New** — login landing page |
| `apps/nextgen-tm-frontend/src/components/AppHeader.tsx` | Remove `SignInButton` from header (moved to login page) |
| `apps/nextgen-tm-frontend/src/hooks/useAuthFetch.ts` | **New** — shared authenticated fetch hook |
| `apps/nextgen-tm-frontend/src/ThreatModelingApp.tsx` | Use authenticated fetch |
| `apps/nextgen-tm-frontend/src/AttackPathApp.tsx` | Use authenticated fetch |
| `apps/nextgen-tm-server/src/nextgen_tm_server/app.py` | Add auth middleware or per-route auth |

## Estimated Scope

- ~5-7 files changed/created
- No new dependencies needed (Clerk is already installed)
- No database changes required

## Testing Checklist

- [ ] Unauthenticated user sees login page, cannot access app
- [ ] After sign-in, user sees the full app
- [ ] Sign-out returns to login page
- [ ] All backend endpoints return 401 without valid token
- [ ] All frontend API calls include auth token
- [ ] Page refresh while signed in stays signed in (Clerk session persistence)
- [ ] Loading spinner shows while Clerk initializes
