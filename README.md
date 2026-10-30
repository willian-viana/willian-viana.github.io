# República da Brisinha

React + TypeScript + Vite, Tailwind, shadcn-style Radix components, pnpm. FSD layers: app composes pages; pages compose features and entities; shared contains UI primitives. No backend or payment processing is included.

The layout follows the reference's event sidebar and section tabs: Início, Presentes, Presença and Recados. Hash links support sharing a section and browser back/forward navigation. Below 1024px, navigation moves to the bottom, highlights scroll horizontally and the catalog uses two columns (three on tablets). Katibeh and Zalando Sans are served locally; their OFL licenses are in `public/fonts`.

## Development

Node 22 and pnpm 11.5.0: `pnpm install`, `pnpm dev`. Validate with `pnpm test` and `pnpm build`; inspect production with `pnpm preview`.

## Content

Edit `src/entities/gift/catalog.json`. Prices are integer BRL cents from the reference's stored base values, without its platform surcharge. Images live in `public/gifts`; source URLs are retained. Missing original descriptions remain null. Set each item's `paymentUrl` to an HTTPS payment-provider link payable directly to the hosts. Never enter credentials here. Contributions are symbolic and repeatable; stock and paid status are not tracked.

Imported from https://www.listapresentear.com.br/lista/republica-da-brisinha on 2026-10-29. Original welcome message and event details are preserved.

## GitHub Pages

Set repository Settings → Pages → Source to GitHub Actions. Push to `main` to deploy. This user-site repository uses Vite base `/`; a project-site repository would require updating the base and image paths. Build artifacts are ignored. No deployment has been triggered by this implementation.

Optional repository Actions variable `VITE_API_BASE_URL` supplies the public API URL at build time. Locally copy `.env.example` to `.env.local`. Without the URL, forms explicitly remain unavailable. Vite variables are public: never put secrets in them.

## Future API contract

Accept JSON POST requests:

- `/messages`: `{ "name": "Guest", "message": "Congratulations!" }`
- `/rsvps`: `{ "name": "Guest", "attending": true, "companions": ["Companion"] }`

Return HTTP 200 or 201 only after successful delivery/persistence; response body is optional. Return 400 for invalid input, 429 for throttling, and 5xx for service failures. The frontend retains values on failure. Declines send an empty companion array. No guest list or messages are publicly fetched.

The future server must validate trimmed nonempty names (max 120 characters), messages (max 3000), companion names and attendance boolean, bound request size, rate-limit abuse, allow CORS POST/OPTIONS only from the deployed origin (and explicitly allowed development origins), and keep RSVP storage private. Configure `RESEND_API_KEY`, `RESEND_FROM` (verified sender) and `HOST_EMAIL` solely on the server. Messages should be sent as plain text with a fixed subject, never interpolated into raw HTML. Persistence and email delivery are not implemented or simulated here.
