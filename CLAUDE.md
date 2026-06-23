# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Streamlit checklist application for the Liveops/QA team to review solar photovoltaic installations. Items to review are loaded from a Google Spreadsheet ("Checklist Commissioning" sheet); completed reviews are saved back to the same spreadsheet.

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # then fill in values
# copy credentials.json (service account key) to project root
```

`.env` needs `SPREADSHEET_ID` and `GOOGLE_CREDENTIALS_PATH`. The service account is `ing-checklist@gen-lang-client-0206054621.iam.gserviceaccount.com` — the spreadsheet must be shared with it (editor).

## Running the App

```bash
streamlit run app.py
```

For Streamlit Cloud deployment, set `SPREADSHEET_ID` and `GOOGLE_CREDENTIALS_PATH` (or embed the JSON) as secrets.

## Data Model — 11 Entities, 4 Branches

**Root:** `INSTALACION` (id_instalacion, nombre, ubicación, fecha_inicio)

**Branch 1 — Racks (1:N from INSTALACION):**
- `RACK` → `PAQUETE_MODULOS` (1:1, modelo/cantidad/Wp)
- `RACK` → `RACKING` (1:1, sistema/tipo/elevación)

**Branch 2 — Inversores (1:1 from INSTALACION):**
- `PAQUETE_INVERSORES` (modelo/cantidad/kW)

**Branch 3 — Eléctrica (1:1 from INSTALACION):**
- `INSTALACION_ELECTRICA` → `SECCION_CANALIZACION` (1:N, longitud/calibre)
- `INSTALACION_ELECTRICA` → `GABINETE` (1:N, tipo CC/CA/combinador)
- `INSTALACION_ELECTRICA` → `MEDIDOR_ACOMETIDA` (1:1)

**Branch 4 — Commissioning (1:1 from INSTALACION):**
- `PUESTA_EN_MARCHA` → `MONITOREO` (1:1, plataforma/site ID)
- `PUESTA_EN_MARCHA` → `SISTEMA_ZNE` (0..1, límite de exportación en kW — opcional)

**Key constraint:** Every installation requires at minimum 1 rack, 1 paquete_modulos, 1 paquete_inversores, 1 seccion_canalizacion, 1 gabinete, 1 medidor_acometida, 1 puesta_en_marcha, and 1 monitoreo. SISTEMA_ZNE is the only optional entity.

## Google Sheets Architecture

- **Read:** `Checklist Commissioning` — cols: `Hito | Concepto | Check | Evidencia`. Hito and Concepto cells are sparse (forward-fill applied on load, cached 5 min via `@st.cache_data`).
- **Write:** single `Revisiones` sheet (auto-created on first save) — cols: `timestamp | deal_id | entity_id | concepto | hito | check_item | checked`. Long format: one row per checklist item per save event. Latest row wins when loading saved state.

## Application Architecture (`app.py` + `sheets.py`)

**State model (`st.session_state`):**
- `deal_id` — active installation identifier (typed by user)
- `racks / gabs / cans` — lists of entity instances added during the session; each has a generated `id` (`{deal}_R1`, `{deal}_GAB1`, `{deal}_CAN1`)
- `checks` — `{(entity_id, concepto, check_text): bool}` — canonical checkbox state; populated from `Revisiones` on deal load
- `saved` — `{(entity_id, concepto)}` — drives ✅ indicator in the nav tree
- `selected` — `(entity_id, concepto)` currently shown on the right panel

**Concepto → entity instance mapping (hardcoded in `app.py`):**
- `Anclajes`, `Racking`, `Montaje de Módulos` → per-rack (each rack gets its own review)
- `Gabinetes` → per-gabinete instance
- `Canalización`, `Cableado` → per-tramo instance (same entity, two separate conceptos)
- All others (`Puesta a Tierra`, `Inversores`, `Medidor / Acometida`, `Puesta en Marcha`, `Monitoreo`, `ZNE / Smart Meter`) → scoped to `deal_id` directly

**Checkbox widget keys** are built by `ck(entity_id, concepto, idx)` — a sanitized string that encodes entity+concepto+position. Widget state (`st.session_state[widget_key]`) takes precedence over `checks` dict for the progress bar so it stays accurate within the same render cycle.

**Deal change** clears all session state and reloads saved reviews from the sheet before rerunning.

## UI Layout

Sidebar: Deal ID input → entity navigation tree (rack expanders + add buttons for gabs/cans/racks, ZNE checkbox). Main area: progress bar → checklist grouped by `Hito` subheaders → "Guardar revisión" button.
