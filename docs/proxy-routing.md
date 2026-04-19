# Proxy Routing: Vite (Dev) & Nginx (Prod)

When adding new backend API endpoints, the frontend must route through a proxy in both environments. Both proxies strip the `/api` prefix before forwarding to the backend.

## How It Works

```
Frontend calls:   /api/diagrams
                      │
         ┌────────────┴────────────┐
         │ Dev (Vite)              │ Prod (Nginx)
         │                         │
         │ proxy /api/* →          │ location /api/ {
         │   target: :8890         │   proxy_pass http://127.0.0.1:8890/;
         │   rewrite: strip /api   │   # trailing / strips /api prefix
         │                         │ }
         └────────────┬────────────┘
                      │
Backend receives: /diagrams
```

## Dev — Vite (`apps/nextgen-tm-frontend/vite.config.ts`)

```ts
proxy: {
  '/api': {
    target: 'http://localhost:8890',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, '')
  },
  '/analysis': {
    target: 'http://localhost:8890',
    changeOrigin: true
  }
}
```

- `/api/*` → strips `/api` → forwards to `localhost:8890/*`
- `/analysis/*` → no rewrite → forwards to `localhost:8890/analysis/*`

## Prod — Nginx (`/etc/nginx/sites-available/attackpathapp.conf`)

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8890/;   # trailing / strips /api prefix
    ...
}

location /analysis/ {
    proxy_pass http://127.0.0.1:8890/analysis/;
    ...
}

location / {
    proxy_pass http://127.0.0.1:5173;    # frontend (vite preview)
    ...
}
```

- `/api/*` → trailing `/` in `proxy_pass` strips `/api` → forwards to `localhost:8890/*`
- `/analysis/*` → forwards as-is to `localhost:8890/analysis/*`
- Everything else → frontend at `localhost:5173`

## Rules for Adding New Endpoints

1. **Backend endpoints should NOT have `/api` prefix** — define them as `/diagrams`, `/llm-settings`, etc. in FastAPI.

2. **Frontend calls MUST use `/api` prefix** — call `/api/diagrams`, `/api/llm-settings`, etc. Both Vite and Nginx strip `/api` before forwarding.

3. **Exception: `/analysis/*` routes** — these are proxied without rewrite in both environments, so frontend calls `/analysis/paths` directly (no `/api` prefix).

4. **No nginx changes needed** for new `/api/*` routes — the wildcard `location /api/` block handles all of them automatically.

## Examples

| Frontend URL             | Backend URL (after proxy) |
|--------------------------|---------------------------|
| `/api/llm-settings`     | `/llm-settings`           |
| `/api/diagrams`         | `/diagrams`               |
| `/api/diagrams/{id}`    | `/diagrams/{id}`          |
| `/analysis/paths`       | `/analysis/paths`         |
| `/analysis/llm/methods` | `/analysis/llm/methods`   |
