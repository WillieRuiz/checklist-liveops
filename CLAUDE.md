# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Unified React + TypeScript web app for the NIKO Liveops/QA team. Combines two previously separate tools:

- **Workflow de Hitos** (built by Luisen): tracks 9 installation milestones (H0–H8), HubSpot deal integration, Slack notifications, escalation protocols.
- **Checklist de calidad** (built by Guillermo): detailed QA checklist per installation entity (racks, gabinetes, tramos, etc.), items loaded from Google Sheets.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Shadcn UI (Radix primitives)
- **Backend**: Supabase (PostgreSQL + Auth + Deno Edge Functions)
- **Auth**: Google OAuth via Supabase
- **State**: `useReducer` in `useChecklist.ts`; server cache via React Query (TanStack Query v5)
- **Integrations**: HubSpot (deal data), Slack (notifications), Google Sheets (checklist items, read-only)
- **Deployment**: Lovable hosting (production) / Vite dev server on port 8080 (local)

## Commands

```bash
npm install --legacy-peer-deps   # always use --legacy-peer-deps
npm run dev                      # http://localhost:8080
npm run build                    # production build
npm run lint                     # ESLint
npm run test                     # Vitest (single run)
npm run test:watch               # Vitest (watch mode)
npx vitest run src/test/example.test.ts   # run a single test file
```

## Running Locally

> **Auth note**: Before testing locally, set Supabase → Authentication → URL Configuration → Site URL to `http://localhost:8080`. Restore to `https://nikohitos.lovable.app` before pushing to production.

## TypeScript Config

`tsconfig.json` has lenient settings: `noImplicitAny: false`, `strictNullChecks: false`, `noUnusedLocals: false`. Don't tighten these without coordinating both codebases.

Import alias: `@` → `./src` (configured in both `vite.config.ts` and `tsconfig.json`).

## Project Structure & Ownership

```
src/
  features/checklist/     ← GUILLERMO'S TERRITORY
    lib/types.ts           — constants (PER_RACK, HITO1_CONCEPTOS, etc.) and type definitions
    lib/api.ts             — Supabase calls: load/save entities and reviews
    hooks/useChecklist.ts  — all state management (useReducer; equivalent to Streamlit session_state)
    components/ChecklistSidebar.tsx  — entity tree navigation
    components/ChecklistPanel.tsx    — checklist items, progress bar, save button
    ChecklistPage.tsx      — page entry point, route /deal/:dealId/checklist
    index.ts

  components/hitos/        ← LUISEN'S TERRITORY
  pages/                   ← LUISEN'S TERRITORY
  lib/                     ← LUISEN'S TERRITORY
  contexts/                ← LUISEN'S TERRITORY
  integrations/            ← SHARED (do not modify supabase/types.ts without coordinating both)

supabase/
  functions/get-checklist/   ← GUILLERMO'S TERRITORY
  functions/hubspot-*/       ← LUISEN'S TERRITORY
  functions/notify-*/        ← LUISEN'S TERRITORY
  migrations/
    20260623*  — Luisen's tables (instalaciones)
    20260625*  — Guillermo's tables (checklist_entidades, checklist_revisiones)

legacy/                    — archived Streamlit/Python code (reference only)
```

## Supabase Project

**Project ref**: `vcueafntdgwkcoocaedf`  
**URL**: `https://vcueafntdgwkcoocaedf.supabase.co`

### Tables (Guillermo's)
- `checklist_entidades` — entity structure per deal (racks, gabinetes, tramos, zne, lamina)
- `checklist_revisiones` — **append-only**: `saveReview()` always INSERTs, never UPDATEs. On load, all rows for the deal are fetched and the latest row per `(entity_id, concepto, check_item)` (ordered by `created_at DESC`) wins. This is the source of truth for restored state.

### Tables (Luisen's)
- `instalaciones` — hito workflow progress per deal

### Edge Functions
- `get-checklist` — reads "Checklist Commissioning" sheet from Google Sheets using service account JWT auth. Requires secrets: `SPREADSHEET_ID` and `GOOGLE_CREDENTIALS_JSON`.
- `hubspot-deal` — fetches deal info from HubSpot API
- `notify-slack`, `send-notification` — Slack notifications

## Google Sheets (Checklist Items)

**Spreadsheet ID**: `1xiNLLqqwyaM2ooDYctzQ4tZikqmjL74WrO5cBJG-sgs`  
**Sheet**: `Checklist Commissioning` — cols: `Hito | Concepto | Check | Evidencia`  
**Service account**: `ing-checklist@gen-lang-client-0206054621.iam.gserviceaccount.com`  
**Credentials file**: `credentials.JSON` (gitignored — never commit)

To add new checklist items: edit the Google Sheet directly. The Edge Function reads it fresh on every call (React Query caches it 5 min client-side).

## Checklist Feature Logic

**Concepto → entity mapping** (hardcoded in `types.ts`):
- `PER_RACK` = ["Anclajes", "Racking", "Montaje de Módulos"] → one review per rack instance
- `PER_GAB`  = ["Gabinetes"] → one review per gabinete instance
- `PER_CAN`  = ["Canalización", "Cableado"] → one review per tramo instance
- `LAMINA_CONCEPTO` = "Anclajes para lamina" → per rack, only when `hasLamina = true`
- `ZNE_CONCEPTO` = "ZNE / Smart Meter" → single review, only when `hasZne = true`
- All others → scoped to `deal_id` directly (global sections like Hito 1/2, Inversores, etc.)

**Entity IDs**: `{dealId}_R1`, `{dealId}_GAB1`, `{dealId}_CAN1`, `{dealId}_ZNE`, `{dealId}_LAMINA`

**Check key format**: `${entityId}||${concepto}||${checkItem}` (see `makeCheckKey()` in `types.ts`)

**State**: managed by `useChecklist` hook (useReducer). Entities and reviews loaded from Supabase on mount. Reviewer = authenticated Google user (no manual name input).

## Routing

- `/` → Hitos (Luisen's pipeline overview)
- `/deal/:dealId` → DealWorkflow (Luisen's hito workflow)
- `/deal/:dealId/checklist` → ChecklistPage (Guillermo's QA checklist)

The "Abrir checklist de calidad" button in `HitoWorkflow.tsx` links to `/deal/:dealId/checklist` (internal React Router `<Link>`).
