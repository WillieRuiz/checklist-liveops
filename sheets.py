import os

import gspread
import streamlit as st
from dotenv import load_dotenv
from google.oauth2.service_account import Credentials

load_dotenv()

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

REVISIONES_COLS = [
    "timestamp", "deal_id", "entity_id", "concepto", "hito", "check_item", "checked", "revisor"
]

INSTALACIONES_COLS = [
    "deal_id", "entity_type", "entity_id", "config", "nombre"
]


def _get_credentials():
    # Streamlit Cloud: credentials stored in st.secrets["gcp_service_account"]
    try:
        return Credentials.from_service_account_info(
            dict(st.secrets["gcp_service_account"]), scopes=SCOPES
        )
    except (KeyError, FileNotFoundError):
        pass
    # Local development: credentials from file
    return Credentials.from_service_account_file(
        os.getenv("GOOGLE_CREDENTIALS_PATH", "credentials.JSON"), scopes=SCOPES
    )


def _get_spreadsheet_id():
    try:
        return st.secrets["SPREADSHEET_ID"]
    except KeyError:
        return os.getenv("SPREADSHEET_ID")


def _get_spreadsheet():
    client = gspread.authorize(_get_credentials())
    return client.open_by_key(_get_spreadsheet_id())


@st.cache_data(ttl=300)
def load_checklist():
    """Load checklist items from 'Checklist Commissioning' sheet, forward-filling Hito and Concepto."""
    ws = _get_spreadsheet().worksheet("Checklist Commissioning")
    rows = ws.get_all_values()

    data = []
    last_hito, last_concepto = "", ""

    for row in rows[1:]:  # skip header
        hito = row[0].strip() if row[0].strip() else last_hito
        concepto = row[1].strip() if len(row) > 1 and row[1].strip() else last_concepto
        check = row[2].strip() if len(row) > 2 else ""

        if check:
            data.append({"hito": hito, "concepto": concepto, "check": check})

        if row[0].strip():
            last_hito = row[0].strip()
        if len(row) > 1 and row[1].strip():
            last_concepto = row[1].strip()

    return data


# ---------------------------------------------------------------------------
# Revisiones sheet
# ---------------------------------------------------------------------------

def _ensure_revisiones(spreadsheet):
    try:
        return spreadsheet.worksheet("Revisiones")
    except gspread.WorksheetNotFound:
        ws = spreadsheet.add_worksheet("Revisiones", rows=5000, cols=len(REVISIONES_COLS))
        ws.append_row(REVISIONES_COLS)
        return ws


def save_review(deal_id, entity_id, concepto, items, check_states, timestamp, revisor=""):
    """Append one row per checklist item to the Revisiones sheet."""
    spreadsheet = _get_spreadsheet()
    ws = _ensure_revisiones(spreadsheet)
    rows = [
        [
            timestamp, deal_id, entity_id, concepto,
            item["hito"], item["check"],
            str(check_states.get(item["check"], False)),
            revisor,
        ]
        for item in items
    ]
    if rows:
        ws.append_rows(rows)


def load_saved_reviews(deal_id):
    """Return {(entity_id, concepto, check_item): bool} for a given deal_id (latest value wins)."""
    try:
        ws = _get_spreadsheet().worksheet("Revisiones")
    except gspread.WorksheetNotFound:
        return {}

    records = ws.get_all_records()
    state = {}
    for r in records:
        if str(r.get("deal_id")) == deal_id:
            key = (str(r["entity_id"]), r["concepto"], r["check_item"])
            state[key] = r["checked"] == "True"
    return state


# ---------------------------------------------------------------------------
# Instalaciones sheet  (persists entity structure per deal)
# ---------------------------------------------------------------------------

def _ensure_instalaciones(spreadsheet):
    try:
        return spreadsheet.worksheet("Instalaciones")
    except gspread.WorksheetNotFound:
        ws = spreadsheet.add_worksheet("Instalaciones", rows=1000, cols=len(INSTALACIONES_COLS))
        ws.append_row(INSTALACIONES_COLS)
        return ws


def save_entity(deal_id, entity_type, entity_id, config="", nombre=""):
    """Persist a single entity (rack/gabinete/tramo/zne) to the Instalaciones sheet."""
    spreadsheet = _get_spreadsheet()
    ws = _ensure_instalaciones(spreadsheet)
    ws.append_row([deal_id, entity_type, entity_id, config, nombre])


def load_entities(deal_id):
    """Return the entity structure saved for a deal_id.

    Returns a dict:
        {
            "racks": [{"id", "config", "nombre"}, ...],
            "gabs":  [{"id", "nombre"}, ...],
            "cans":  [{"id"}, ...],
            "has_zne": bool,
        }
    Only the first occurrence of each entity_id is kept (dedup in insertion order).
    """
    try:
        ws = _get_spreadsheet().worksheet("Instalaciones")
    except gspread.WorksheetNotFound:
        return {"racks": [], "gabs": [], "cans": [], "has_zne": False}

    records = ws.get_all_records()
    seen = set()
    racks, gabs, cans, has_zne = [], [], [], False

    for r in records:
        if str(r.get("deal_id")) != deal_id or r["entity_id"] in seen:
            continue
        seen.add(r["entity_id"])
        etype = r["entity_type"]
        if etype == "rack":
            racks.append({"id": str(r["entity_id"]), "config": r["config"]})
        elif etype == "gabinete":
            gabs.append({"id": str(r["entity_id"]), "nombre": r["nombre"]})
        elif etype == "tramo":
            cans.append({"id": str(r["entity_id"])})
        elif etype == "zne":
            has_zne = True

    return {"racks": racks, "gabs": gabs, "cans": cans, "has_zne": has_zne}
