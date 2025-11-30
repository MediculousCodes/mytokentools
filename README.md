# myTokenTools

Modern token-analytics platform that pairs a polished Next.js 15 frontend with a Flask+tiktoken backend. Upload `.txt`, `.md`, or `.zip` files, track queue progress, visualize counts, compare encodings, simulate chunking, estimate GPT pricing, and document your architecture—all from one workspace.

## Highlights

- Drag-and-drop upload queue with validation, progress bar, cancellation, and toast feedback.
- Analysis dashboard: total tokens, estimated GPT-4 costs, per-file table, Recharts visualization.
- Toolbox tabs: tokenizer comparison, batch tokenization, pricing estimator, API playground, chunking simulator, run history.
- Global AppShell with persistent navigation, dark mode, skeleton loaders, and documentation/About/Settings pages.
- Next.js API routes proxy every request to Flask so browsers never hit `localhost:5000` directly—avoids CORS headaches and lets us harden URLs centrally.

## Stack Overview

- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS 4, Radix UI, Recharts, pnpm.
- **Backend:** Flask 3 + tiktoken + Flask-CORS for token counts, zip extraction, and batch endpoints.
- **Infra:** Docker (frontend, backend, Caddy proxy), docker-compose, optional pnpm/Python dev workflow.

## Environment Variables

Create a `.env.local` at the repo root (Next.js loads this automatically). Recommended template:

```
BACKEND_URL=http://localhost:5000
# Leave empty to force requests through Next.js proxy routes.
NEXT_PUBLIC_API_BASE_URL=
```

- `BACKEND_URL` is read on the server (route handlers, Node runtime). Set it to the reachable Flask host.
- `NEXT_PUBLIC_API_BASE_URL` is optional. Only set it when a browser must call Flask directly (e.g., bypassing the proxy); otherwise leave it blank to avoid mixed-content/CORS issues.

> Running inside Docker Compose? The frontend container already exports `BACKEND_URL=http://token-counter-backend:5000` and leaves `NEXT_PUBLIC_API_BASE_URL` empty, so no extra config required.

## Local Development (non-Docker)

1. **Backend**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   python app.py  # listens on http://localhost:5000
   ```

2. **Frontend**
   ```bash
   pnpm install
   pnpm dev  # http://localhost:3000
   ```

3. Visit `/core` to upload files. All requests are proxied through `/api/*` so no additional CORS setup is needed.

## Docker / Compose

We ship a three-service stack (`frontend`, `backend`, `caddy`) in `docker-compose.yml`. URLs are hardened as follows:

- Frontend container environment:
  - `BACKEND_URL=http://token-counter-backend:5000`
  - `NEXT_PUBLIC_API_BASE_URL=` (blank → always proxy)
- Backend container environment:
  - `FLASK_ENV=development`
  - `FLASK_RUN_HOST=0.0.0.0` (ensures Flask binds to the container IP)

Launch with:

```bash
docker-compose up --build
```

Caddy listens on ports 80/443 and proxies to the internal Next.js server; the frontend proxies to the backend. No browser request ever needs to reference container IPs directly.

## Key Routes

- **Frontend pages:** `/` (dashboard), `/core`, `/settings`, `/docs`, `/about`.
- **Proxy APIs:** `/api/count-tokens`, `/api/analyze`, `/api/batch_tokenize`, `/api/compare_tokenizers`.
- **Backend APIs:** `/health`, `/analyze`, `/batch_tokenize`, `/compare_tokenizers`, `/api/count-tokens`.

## Troubleshooting

- **“Process” button shows network/CORS errors:** ensure the backend is running and `BACKEND_URL` matches. Leave `NEXT_PUBLIC_API_BASE_URL` empty so Next.js proxy handles the call.
- **Using HTTPS frontends:** set `BACKEND_URL` to an HTTPS endpoint (or rely on internal Docker DNS) so server-side calls stay encrypted.
- **Need direct browser access?** Only then set `NEXT_PUBLIC_API_BASE_URL=https://your-backend-host`. Otherwise, keep it blank.

## License

MIT — feel free to extend for coursework, research, or production deployments. Contributions welcome.

