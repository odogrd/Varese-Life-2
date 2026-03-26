# Varese Life — Admin Newsletter App

## Panoramica del progetto

**Varese Life** è un'applicazione full-stack per la gestione amministrativa della newsletter locale di Varese. Tutta l'interfaccia utente è in italiano.

### Funzionalità principali
- **Scraping eventi**: Pipeline con BrowserAct (primario) + Claude fetch+crawl (fallback automatico)
- **AI rewrite**: Riscrittura automatica degli eventi con Claude (claude-opus-4-5)
- **Composizione newsletter**: Editor con 4 sezioni HTML per Beehiiv
- **Template manager**: Template email-safe con variabili inline style
- **Gestione utenti**: Ruoli superadmin / admin / editor
- **Prompt manager**: Prompt AI configurabili con storico versioni
- **Impostazioni**: Cron job, categorie, giorno di pubblicazione, BrowserAct workflow ID
- **Log errori**: Tracciamento eventi non importabili (date non parsabili, duplicati)

## Stack

- **Monorepo**: pnpm workspaces
- **Node.js**: 24, **TypeScript**: 5.9
- **Backend**: Express 5 + express-session + connect-pg-simple (sessioni 30 giorni rolling)
- **Database**: PostgreSQL + Drizzle ORM
- **AI**: @anthropic-ai/sdk — modello `claude-opus-4-5`
- **Scraper primario**: BrowserAct API (`BROWSERACT_API_KEY`)
- **Codegen**: Orval (OpenAPI → React Query hooks + Zod schemas)
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui + wouter + TanStack Query
- **Build**: esbuild (backend), Vite (frontend)

## Struttura

```text
├── artifacts/
│   ├── api-server/          # Express API server (porta $PORT)
│   └── varese-life/         # React frontend (porta $PORT)
├── lib/
│   ├── api-spec/            # OpenAPI spec + Orval config
│   ├── api-client-react/    # React Query hooks generati
│   ├── api-zod/             # Zod schemas generati
│   └── db/                  # Drizzle schema + connessione DB
└── scripts/
    └── src/seed.ts          # Seed: admin user, 6 prompt, settings, template default
```

## Schema DB (tabelle principali)

- `users` — superadmin/admin/editor, bcrypt password
- `sources` — fonti notizie (siti web)
- `source_urls` — URL individuali per fonte
- `events` — eventi estratti con status: pending/approved/rejected
- `prompts` — prompt AI con versioning
- `newsletters` — newsletter componibili
- `newsletter_events` — join table newsletter ↔ eventi
- `templates` — template HTML email-safe
- `settings` — configurazioni app (JSON value)
- `error_logs` — log errori scraping/parsing
- `session` — sessioni express (connect-pg-simple)

## Route API (`/api/...`)

| Gruppo | Prefix |
|--------|--------|
| Auth | `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` |
| Fonti | `/api/sources` (CRUD + scrape) |
| BrowserAct webhook | `/api/browseract/webhook` |
| Eventi | `/api/events` (CRUD + bulk update + rewrite + extract) |
| Prompt | `/api/prompts` (CRUD + reset) |
| Newsletter | `/api/newsletters` (CRUD + events + export + generate-intro) |
| Template | `/api/templates` (CRUD) |
| Utenti | `/api/users` (CRUD, solo superadmin) |
| Impostazioni | `/api/settings` (GET/PUT) |
| Dashboard | `/api/dashboard/stats` |
| Error logs | `/api/error-logs` (GET + resolve) |

## Workflow di esecuzione

- **API server**: `pnpm --filter @workspace/api-server run dev` (build + start)
- **Frontend**: `pnpm --filter @workspace/varese-life run dev`
- **Seed DB**: `pnpm --filter @workspace/scripts run seed`
- **Push schema**: `pnpm --filter @workspace/db run push`
- **Codegen**: `pnpm --filter @workspace/api-spec run codegen`

## Variabili d'ambiente richieste

- `DATABASE_URL` — PostgreSQL connection string (Replit fornisce automaticamente)
- `SESSION_SECRET` — secret per express-session
- `ANTHROPIC_API_KEY` — chiave API Anthropic Claude
- `BROWSERACT_API_KEY` — chiave API BrowserAct
- `ADMIN_EMAIL` — email admin per seed
- `ADMIN_PASSWORD` — password admin per seed

## Note importanti

- Encoding **UTF-8** ovunque; caratteri accentati italiani come literal UTF-8
- Date con formato italiano esteso (es. "sabato 15 marzo 2026, ore 21:00")
- Export HTML: email-safe, inline styles, max-width 600px, no immagini
- BrowserAct è primario; Claude fetch+crawl è fallback automatico
- Sessione cookie: 30 giorni rolling, `httpOnly: true`, `sameSite: lax`
- `re-export` di `useToast` in `src/components/ui/use-toast.ts` per compatibilità import
