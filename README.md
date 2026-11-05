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

The production Worker is at `https://republica-da-brisinha-api.republica-da-brisinha.workers.dev`. Its D1 binding and the frontend API URL are configured. The API allows both `https://willian-viana.github.io` and the live frontend origin `https://republicadabrisinha.com.br`. Turnstile's allowed hostnames must also include each frontend hostname. Both migrations are applied and the deployed Worker stores RSVPs and messages in their respective tables.

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

`GET /api/locale` returns `{ "locale": "pt" | "en" }` using Cloudflare IP-country metadata. It requires an allowed `Origin`, accepts GET/OPTIONS, returns `Cache-Control: no-store`, and needs no Turnstile token, secrets, database access or third-party geolocation request. It does not store or return the visitor IP or country. Deploy the Worker before the frontend; an older/unavailable Worker makes the frontend safely default to Portuguese. Local requests without country metadata default to Portuguese. VPN/proxy exit locations may determine the detected country. See [Cloudflare request metadata](https://developers.cloudflare.com/workers/runtime-apis/request/#incomingrequestcfproperties).

Both submission endpoints require an allowed `Origin`, `Content-Type: application/json` and a valid single-use `turnstileToken` (max 2048 characters). CORS permits POST/OPTIONS and Content-Type without cookies. Turnstile verification checks the action and frontend hostname before writing.

- `POST /api/rsvp`: `{ name, attending, companions: string[], turnstileToken }`. Names must be nonempty strings of at most 120 characters; attendance is a boolean; up to 10 companions are allowed, or none when declining.
- `POST /api/message`: `{ name, message, turnstileToken }`. Name must be nonempty text of at most 120 characters; message must be nonempty text of at most 3000 characters.

Text is trimmed. Both routes return HTTP **201** with `{ "ok": true, "id": "uuid" }` only after D1 confirms the insert. Each table stores a generated ID and UTC creation timestamp.

Errors use `{ "error": { "code": "INVALID_INPUT", "message": "Readable message" } }`: 400 invalid JSON/fields, 403 origin/token/context failure, 404 unknown path, 405 unsupported method, 413 payload over 16 KiB, 415 wrong content type, and 503 configuration/Turnstile/D1 failure. Private upstream details are not returned.

The frontend locks the form during submission, preserves fields on failure, displays success only after storage succeeds and refreshes the Turnstile token after each API attempt. Siteverify times out after 10 seconds; the frontend times out after 30 seconds.

Storage is append-only. There is no identity-based deduplication or editing. Retrying an ambiguous network failure can create a duplicate. Turnstile reduces spam; monitor Cloudflare's free-tier quotas.

## Static content

Edit `src/entities/gift/catalog.json`; images live in `public/gifts`. Prices are integer BRL cents from the reference's base values, without its platform surcharge. Set each `paymentUrl` to that product’s dedicated HTTPS payment link payable directly to the hosts. The two scissors entries intentionally share one payment link. In Portuguese, “Presentear” and the product image open the gift details with Mercado Pago and Wise options. Mercado Pago actions open `/pt/pagamento/?presente=<gift-id>` on this site in a new tab. The guest then taps “Continuar no Mercado Pago” to navigate to the product’s dedicated checkout in the same tab. “Copiar e abrir link” copies the original Mercado Pago URL and opens this local payment page during the click. The page also has a copy-only button and a link back to the catalog. Unknown gift IDs cannot initiate checkout; arbitrary destination URLs are not accepted. PayPal email and Wisetag copy buttons only copy their details. The mobile disclaimer explains how to paste the link directly into a browser if the payment app interrupts navigation. No payment credentials are handled here.

The catalog and welcome message were imported from https://www.listapresentear.com.br/lista/republica-da-brisinha on 2026-10-29. Katibeh and Zalando Sans are served locally with OFL licenses in `public/fonts`.

Official references: [Turnstile validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/), [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/), [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/).

## Portuguese and English experiences

The 11 catalog additions from November 2, 2026 use the current full purchase totals on their linked retailer pages, before cash/PIX discounts, excluding shipping and coupons (not crossed-out former prices). English prices are set using **US$1 = R$4.80 (BRL ÷ 4.80)**, rounded to USD cents; both catalogs remain independently editable with no runtime conversion. Titles, factual descriptions and local images come from each product's `externalUrl` and `sourceImageUrl`. The existing EAF85 air fryer was retained unchanged rather than duplicated. Brazilian checkout links are configured per product in `paymentUrl`; English gift dialogs offer shared PayPal and Wise contribution options.

- `/pt/` preserves the original Portuguese content, RSVP, event information and BRL prices. Set Brazilian PIX/InfinitePay checkout links in each item's `paymentUrl` in `src/entities/gift/catalog.json`.
- `/en/` is a separate gift-focused experience without RSVP, attendance controls, countdown or event logistics. Edit `src/entities/event/content.en.json` for the English welcome, description, subtitle and whether highlights/messages are shown. Its welcome remains an explicit placeholder until supplied.
- English catalog entries live in `src/entities/gift/catalog.en.json`. Names, descriptions and **USD cents** are independent of Portuguese values. The initial USD conversions are static; later Brazilian price edits do not recalculate USD prices. Keep IDs matched to the original catalog to reuse images; the English list can be reordered or shortened independently. Null prices display placeholders. International contributions are handled by the shared PayPal/Wise options, not by the Brazilian checkout links. No runtime currency conversion takes place.
- UI labels are in `src/shared/i18n/copy.ts`. The shared layout and features accept the locale, rather than maintaining two applications. English messages still use the same protected D1 message endpoint; errors and Turnstile controls are localized.

At `/`, language selection uses an IP-country lookup through `GET /api/locale` on `VITE_API_BASE_URL`. The Worker reads trusted Cloudflare `request.cf.country`: Brazil selects Portuguese/BRL, confirmed countries outside Brazil select English/USD, and missing/unknown country data selects Portuguese/BRL. Browser/OS language is not used. Network errors, invalid responses, missing API configuration or a 3-second lookup timeout also default to Portuguese. No language preference is read from or written to browser storage; old saved preferences are ignored. Explicit `/pt` or `/en` URLs always win. There are no language-switching controls. Change language using the URL; `/en/#presenca` cannot display the RSVP form.

`pnpm build` creates actual `dist/pt/index.html` and `dist/en/index.html` files with root-relative assets and the appropriate HTML language. GitHub Pages redirects the slashless directory URLs to their trailing-slash form, so direct links and refreshes work without server rewrites. Localized rendering and static entrypoints are checked by `pnpm test:build`; locale selection is checked by `pnpm test`.

## Family pictures

Both languages include the family gallery at `/pt/#fotos` and `/en/#fotos`. Original PNGs are kept in `public/pictures`; the gallery uses WebP previews in `public/pictures/previews` to avoid loading the large originals on mobile. `src/entities/family-photo/photos.json` lists every picture, its dimensions, previews and Portuguese/English alt text. When adding pictures, add matching previews and a manifest entry; `pnpm test` checks that every PNG is included. The larger preview loads only when its popup opens. Tap a picture to open a centered, borderless popup. Close it by tapping the picture, tapping outside it, or pressing Escape.

The masonry layout uses `display: grid-lanes` when supported and CSS columns otherwise, with two columns on phones and three on wider screens. The popup reuses the existing Radix dialog for keyboard focus and modal behavior.


## Contribution options

English gift dialogs offer PayPal and Wise with an amount chosen by the guest. Portuguese dialogs offer the product’s Mercado Pago checkout and Wise. `src/features/give-gift/GiftPayments.tsx` shares the layout, clipboard handling and supplied public PayPal/Wise details across both languages. Each option opens the external service in a new tab and allows copying its recipient details. If clipboard access fails, the details remain visible for manual copying. Brazilian Mercado Pago actions continue to use each product’s dedicated link from the catalog; prices and payment URLs are unchanged.


### Mobile Mercado Pago handoff

The local payment page intentionally waits for a second user click before navigating to Mercado Pago. It does not auto-redirect or use the proposed 250 ms blank-tab delay. [Chromium's external-navigation implementation](https://chromium.googlesource.com/chromium/src/+/main/components/external_intents/android/java/src/org/chromium/components/external_intents/InterceptNavigationDelegateImpl.java) can close tabs during an app handoff on their initial navigation chain; its comments specifically note that JavaScript redirects can stay on that chain. A committed local page followed by an explicit user navigation is intended to avoid that case. This is a workaround, not a guarantee that Mercado Pago or the device will keep checkout in the browser.

The supplied short checkout link returned HTTP 403 to read-only inspection. The reported Chrome mobile app handoff has not been reproduced on the affected device. Automated tests check catalog routing, secure new-tab creation, same-tab continuation and invalid IDs; they do not simulate app launch or prove that the checkout tab survives it. On the affected phone, test both accepting and declining the app prompt, use Back to return to the local payment page, test its copy-only button, and check that the original catalog tab remains available. No payment is required for these checks.
