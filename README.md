# República da Brisinha

React + TypeScript + Vite frontend on GitHub Pages, with a Cloudflare Worker, D1 RSVP storage, Resend email and Turnstile spam protection. pnpm is the only package manager. The Worker uses native `fetch` and prepared SQL, without an HTTP framework, ORM or Resend SDK.

Frontend FSD layers: `app` composes `pages`; pages compose `features` and `entities`; `shared` contains UI and API contracts. The backend lives separately in `worker/`. Gifts and payments remain static and external.

## Development and checks

Use Node **22.18+** and pnpm **11.5.0**. API tests use Node's built-in SQLite support; its experimental warning on Node 22 is expected.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
cp worker/.dev.vars.example worker/.dev.vars.local
pnpm db:migrate:local
pnpm worker:dev
```

In another terminal run `pnpm dev`. Open `http://localhost:5173` or `http://127.0.0.1:5173`. The Worker listens on port 8787 and persists its **local** D1 database under `worker/.wrangler`. Local migrations and `worker:dev` use `--env local`; they do not contact production D1.

The example files contain Cloudflare's **public test keys**, which always pass. Local verification still calls Siteverify, so an internet connection is needed. The Worker permits dummy keys only in its `local` environment and for a localhost/127.0.0.1 frontend origin. Production rejects them. To test rejection, use Cloudflare's documented failing sitekey/secret pair in your ignored local files.

RSVP works locally without a Cloudflare account. Local **email** testing requires a Resend API key and sender/recipient in `worker/.dev.vars.local`; there is no fake success mode. For safe email testing use Resend's test recipient `delivered@resend.dev` with your account's authorized sender, rather than a real guest/host inbox. Restart Wrangler after changing secrets.

```sh
pnpm test          # Critical API behavior; providers mocked, real SQLite migration
pnpm typecheck    # Frontend and Worker types
pnpm worker:check # Bundle Worker with Wrangler --dry-run; does not deploy
pnpm build
pnpm test:build    # Assert dist/index.html references built JS, never raw TSX
pnpm preview      # Inspect the production frontend
```

## Configuration

| Location | Name | Value |
| --- | --- | --- |
| Frontend `.env.local` / GitHub Actions repository variable | `VITE_API_BASE_URL` | Worker origin, e.g. `https://republica-da-brisinha-api.YOUR-SUBDOMAIN.workers.dev`, **without `/api`** |
| Frontend `.env.local` / GitHub Actions repository variable | `VITE_TURNSTILE_SITE_KEY` | Public Turnstile widget sitekey |
| Worker `wrangler.toml` vars | `ALLOWED_ORIGINS` | Comma-separated **exact origins**, no paths or trailing slash |
| Worker `wrangler.toml` vars | `ENVIRONMENT` | `production` (or `local` for local development) |
| Worker secret | `TURNSTILE_SECRET_KEY` | Private Turnstile verification secret |
| Worker secret | `RESEND_API_KEY` | Resend sending API key |
| Worker secret | `RESEND_FROM` | Verified sender, e.g. `República da Brisinha <convite@your-domain.com>` |
| Worker secret | `HOST_EMAIL` | One destination email or a comma-separated list, e.g. `host@example.com,cohost@example.com` |
| Worker D1 binding | `DB` | Database configured by its public ID in `worker/wrangler.toml` |

All `VITE_*` values are public build-time configuration. Never put secrets in them. `.env.local`, `.dev.vars*`, `.wrangler`, `dist` and `.worker-build` are ignored. Only sanitized example files are committed. Do not paste actual credentials into documentation, code or chat.

## Cloudflare and Resend setup — manual

**No production resources were created, migrated or deployed by this implementation. Run remote commands only after approving production setup.**

1. Create a Cloudflare account using Workers Free and D1 Free. Authenticate locally with `pnpm exec wrangler login`. Do not enable paid plans just to follow this guide.
2. Create the database:

   ```sh
   pnpm exec wrangler d1 create brisinha-rsvps --config worker/wrangler.toml
   ```

   Replace the **top-level** `database_id` placeholder in `worker/wrangler.toml` with the returned ID. Keep `binding = "DB"`, `database_name = "brisinha-rsvps"` and `migrations_dir = "migrations"`. Leave the separate local binding unchanged. Database IDs are not credentials.
3. Create a **Managed Turnstile widget**, allowing `willian-viana.github.io` (and your custom frontend domain if applicable). Do not allow localhost on the production widget. Put its sitekey into the frontend/GitHub variable and its matching secret into the Worker. The widget sets the action to `rsvp` or `message`; the server checks both action and frontend hostname.
4. In Resend, create a sending API key and verify a sender domain you control through its DNS records. A GitHub-owned `github.io` domain cannot be verified as your sender domain. Resend's onboarding sender is for restricted account testing, not arbitrary production recipients. Until verification completes, configure only your Resend account email as the recipient. After verification, `HOST_EMAIL` can include both hosts separated by a comma. Guest input never controls the recipients, sender or subject.
5. Set secrets using Wrangler's interactive prompts (no secret values in command history):

   ```sh
   pnpm exec wrangler secret put TURNSTILE_SECRET_KEY --config worker/wrangler.toml
   pnpm exec wrangler secret put RESEND_API_KEY --config worker/wrangler.toml
   pnpm exec wrangler secret put RESEND_FROM --config worker/wrangler.toml
   pnpm exec wrangler secret put HOST_EMAIL --config worker/wrangler.toml
   ```

6. Confirm the production `ALLOWED_ORIGINS` is correct. Then, **after approval**, migrate and deploy:

   ```sh
   pnpm db:migrate:remote
   pnpm worker:deploy
   ```

   Record the URL printed by Wrangler as `VITE_API_BASE_URL`. There is no automatic Worker production deploy workflow.
7. Build/deploy the frontend with both public variables configured. Verify RSVP, then inspect D1 in the Cloudflare dashboard; verify a recado in Resend's dashboard and the host inbox. Successful API submission means Resend accepted the email, not guaranteed inbox delivery.

To inspect RSVPs privately, use the D1 dashboard or, after approval for production access:

```sh
pnpm exec wrangler d1 execute DB --remote --config worker/wrangler.toml --command 'SELECT guest_name, attending, companions_json, created_at FROM rsvps ORDER BY created_at DESC'
```

No public read/list endpoint exposes guests. Export the data privately if needed and delete it when the event no longer requires it. Avoid sharing D1 exports or logging guest contents.

## GitHub Pages and the current blank page

The live site was confirmed to use **Deploy from a branch → master → /**. That publishes the source `index.html`, including `/src/app/main.tsx`. Browsers cannot execute raw TSX; GitHub serves it with a non-JavaScript MIME type. Changing MIME types or committing `dist` is not the fix.

**After production approval**, change repository **Settings → Pages → Build and deployment → Source → GitHub Actions**. Set the repository Actions variables above and run **Deploy Pages** on the branch containing these changes. The workflow installs pnpm, checks/tests both apps, builds Vite, verifies the artifact, and uploads **only `dist`**. It deploys on pushes to `main` and the repository's current `master` branch; pull requests only validate/build. A manual dispatch is available. Configure required reviewers on the `github-pages` GitHub environment if each deployment must require explicit approval.

The Vite base is `/` for this user-site repository. Keep build artifacts uncommitted. The site can render before backend credentials are supplied; forms clearly remain disabled until both public configuration values are available.

## API contract

Both endpoints require `Origin` matching `ALLOWED_ORIGINS`, `Content-Type: application/json` and a valid single-use `turnstileToken` (max 2048 characters). CORS permits only POST/OPTIONS and Content-Type; no cookies or credentialed requests are used. CORS is a browser policy, not authentication: Turnstile is always verified server-side.

```json
POST /api/rsvp
{
  "name": "Ana",
  "attending": true,
  "companions": ["Bruno"],
  "turnstileToken": "token-from-widget"
}
```

Names must be nonempty text, max 120 characters; whitespace is trimmed. `attending` must be a boolean. `companions` must be an array of up to 10 valid names and must be empty for a decline. Success: HTTP 201 `{ "ok": true, "id": "uuid" }` only after D1 confirms the insert. Schema: UUID ID, guest name, attendance integer, companion names as a JSON array and UTC creation timestamp.

```json
POST /api/message
{
  "name": "Ana",
  "message": "Felicidades!",
  "turnstileToken": "token-from-widget"
}
```

Message text must be nonempty, max 3000 characters. Success: HTTP 200 `{ "ok": true }` only after Resend accepts the request and returns an email ID. Only plain text is sent; guest HTML is never rendered. Guest messages are not stored in D1.

Errors use `{ "error": { "code": "INVALID_INPUT", "message": "Readable message" } }`: 400 invalid JSON/fields, 403 origin/token/context failure, 404 unknown path, 405 unsupported method, 413 payload over 16 KiB (including streamed requests), 415 wrong content type, 502 Resend failure, 503 missing configuration/provider/D1 failure. Upstream details and secrets are never returned. Outbound provider calls time out after 10 seconds; the frontend times out after 30 seconds, retains values on failure and obtains a new Turnstile token after every API attempt. Loading locks the form and prevents simultaneous submissions.

RSVP storage is append-only. There is no guest identity, editing, deduplication by name, public guestbook or admin UI. A retry after an ambiguous network failure may create a duplicate or send another message; check the dashboard before manually retrying important submissions. Turnstile reduces spam but does not guarantee abuse prevention or unlimited free usage. Monitor provider dashboards/quotas.

## Static content

Edit `src/entities/gift/catalog.json`; images are in `public/gifts`. Prices are integer BRL cents from the reference's base values, without its platform surcharge. Set each `paymentUrl` to an HTTPS payment link payable directly to the hosts. No payment processing or payment credentials are handled here.

Imported from https://www.listapresentear.com.br/lista/republica-da-brisinha on 2026-10-29. The original welcome message and event details are preserved. Katibeh and Zalando Sans are served locally, with OFL licenses in `public/fonts`.

Official setup references: [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/), [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/), [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/), [Resend send API](https://resend.com/docs/api-reference/emails/send-email).
