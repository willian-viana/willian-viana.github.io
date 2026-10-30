# República da Brisinha

React + TypeScript + Vite frontend on GitHub Pages, with a Cloudflare Worker, D1 storage and Turnstile spam protection. pnpm is the only package manager. The Worker uses native `fetch` and prepared SQL without an HTTP framework or ORM.

Frontend FSD layers: `app` composes `pages`; pages compose `features` and `entities`; `shared` contains UI and API contracts. The backend lives in `worker/`. Gifts remain static and payments happen through external links.

## Development and checks

Use Node **22.18+** and pnpm **11.5.0**. API tests use Node's built-in SQLite support; its experimental warning on Node 22 is expected.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
cp worker/.dev.vars.example worker/.dev.vars.local
pnpm db:migrate:local
pnpm worker:dev
```

In another terminal run `pnpm dev`. Open `http://localhost:5173` or `http://127.0.0.1:5173`. The Worker listens on port 8787; the local D1 database persists under `worker/.wrangler`. Local migrations and `worker:dev` use `--env local` and do not access production D1.

The example files contain Cloudflare's **public test keys**, which always pass. Local verification still calls Siteverify, so an internet connection is needed. Dummy keys are permitted only in the Worker's `local` environment for localhost/127.0.0.1 origins. Production rejects them. Restart Wrangler after changing its secret file.

```sh
pnpm test          # Critical API behavior with real SQLite migrations
pnpm typecheck    # Frontend and Worker types
pnpm worker:check # Bundle Worker with Wrangler --dry-run; does not deploy
pnpm build
pnpm test:build    # Ensure the Pages artifact uses compiled JS, never raw TSX
pnpm preview
```

## Configuration

| Location | Name | Value |
| --- | --- | --- |
| Frontend / GitHub Actions repository variable | `VITE_API_BASE_URL` | Worker origin without `/api` |
| Frontend / GitHub Actions repository variable | `VITE_TURNSTILE_SITE_KEY` | Public Turnstile sitekey |
| Worker vars | `ALLOWED_ORIGINS` | Comma-separated exact frontend origins, no paths or trailing slash |
| Worker vars | `ENVIRONMENT` | `production` or `local` |
| Worker secret | `TURNSTILE_SECRET_KEY` | Private Turnstile verification key |
| Worker D1 binding | `DB` | Existing database `brisinha-rsvps` |

All `VITE_*` values are public build-time configuration. Never put secrets in them. `.env.local`, `.dev.vars*`, `.wrangler`, `dist` and `.worker-build` are ignored; only sanitized examples are committed.

The production Worker is at `https://republica-da-brisinha-api.republica-da-brisinha.workers.dev`. Its D1 binding and the frontend API URL are configured. Turnstile is configured for the current GitHub Pages hostname. Both migrations are applied and the deployed Worker stores RSVPs and messages in their respective tables.

For an initial setup on another account, create a D1 database with `pnpm exec wrangler d1 create brisinha-rsvps --config worker/wrangler.toml`, then update the production database ID in that file. Keep the local binding separate.

Create a Managed Turnstile widget allowing the frontend hostname, then configure its private key:

```sh
pnpm exec wrangler secret put TURNSTILE_SECRET_KEY --config worker/wrangler.toml --env ""
```

Set its public sitekey as the repository variable above and rebuild the frontend. Do not use production keys on localhost. When switching the frontend to a custom domain, update both Turnstile's allowed hostnames and `ALLOWED_ORIGINS`.

## Deployment

Production changes require approval. Apply migrations before deploying the updated Worker:

```sh
pnpm db:migrate:remote
pnpm worker:deploy
```

Migration `0001_create_rsvps.sql` creates RSVPs; `0002_create_messages.sql` adds messages without changing existing RSVP data. There is no automatic Worker production deploy workflow.

GitHub Pages uses **GitHub Actions**, publishing only the compiled `dist` artifact. Publishing `master → /` directly previously caused a blank page because the browser cannot execute the raw TSX entrypoint. The Vite base is `/` for this user-site repository.

The Pages workflow installs pnpm, tests and checks both apps, builds Vite and validates the artifact. Pushes to `main` or `master` deploy; pull requests only validate/build. Manual dispatch is also available. Configure required reviewers on the `github-pages` environment if each deployment must require approval. Keep generated build artifacts uncommitted.

## Viewing guests and messages

In Cloudflare, open **D1 → brisinha-rsvps → Explore Data**, then choose:

- `rsvps`: guest name, attendance (`1` attending, `0` declining), companion names and UTC submission time.
- `messages`: guest name, message text and UTC submission time.

The Console can query either table:

```sql
SELECT guest_name, attending, companions_json, created_at
FROM rsvps ORDER BY created_at DESC;

SELECT guest_name, message, created_at
FROM messages ORDER BY created_at DESC;
```

These records stay private in D1. There is no public read endpoint, guestbook feed or admin page. Guest text is stored as text and must not be rendered as raw HTML. Export privately when needed and delete records when they are no longer required.

## API contract

Both endpoints require an allowed `Origin`, `Content-Type: application/json` and a valid single-use `turnstileToken` (max 2048 characters). CORS permits POST/OPTIONS and Content-Type without cookies. Turnstile verification checks the action and frontend hostname before writing.

- `POST /api/rsvp`: `{ name, attending, companions: string[], turnstileToken }`. Names must be nonempty strings of at most 120 characters; attendance is a boolean; up to 10 companions are allowed, or none when declining.
- `POST /api/message`: `{ name, message, turnstileToken }`. Name must be nonempty text of at most 120 characters; message must be nonempty text of at most 3000 characters.

Text is trimmed. Both routes return HTTP **201** with `{ "ok": true, "id": "uuid" }` only after D1 confirms the insert. Each table stores a generated ID and UTC creation timestamp.

Errors use `{ "error": { "code": "INVALID_INPUT", "message": "Readable message" } }`: 400 invalid JSON/fields, 403 origin/token/context failure, 404 unknown path, 405 unsupported method, 413 payload over 16 KiB, 415 wrong content type, and 503 configuration/Turnstile/D1 failure. Private upstream details are not returned.

The frontend locks the form during submission, preserves fields on failure, displays success only after storage succeeds and refreshes the Turnstile token after each API attempt. Siteverify times out after 10 seconds; the frontend times out after 30 seconds.

Storage is append-only. There is no identity-based deduplication or editing. Retrying an ambiguous network failure can create a duplicate. Turnstile reduces spam; monitor Cloudflare's free-tier quotas.

## Static content

Edit `src/entities/gift/catalog.json`; images live in `public/gifts`. Prices are integer BRL cents from the reference's base values, without its platform surcharge. Set each `paymentUrl` to an HTTPS payment link payable directly to the hosts. No payment credentials are handled here.

The catalog and welcome message were imported from https://www.listapresentear.com.br/lista/republica-da-brisinha on 2026-10-29. Katibeh and Zalando Sans are served locally with OFL licenses in `public/fonts`.

Official references: [Turnstile validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/), [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/), [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/).
