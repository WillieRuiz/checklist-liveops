import re
from collections import defaultdict
from datetime import datetime

import streamlit as st

from sheets import (
    load_checklist, load_entities, load_saved_reviews,
    save_entity, save_review,
)

# Conceptos reviewed once per rack instance
PER_RACK = ["Anclajes", "Racking", "Montaje de Módulos"]
# Concepto reviewed once per gabinete instance
PER_GAB = ["Gabinetes"]
# Conceptos reviewed once per tramo de canalización instance
PER_CAN = ["Canalización", "Cableado"]
# Concepto for the optional ZNE system
ZNE = "ZNE / Smart Meter"
# Concepto for metal-sheet roof (conditional per rack)
LAMINA = "Anclajes para lamina"

# Global conceptos for Hito 1 — Evaluación de Techo
HITO1_CONCEPTOS = [
    "Preparacion CFE / Instalacion electrica actual",
    "Estado de la Cubierta",
    "Riesgos de Filtración y Compatibilidad",
    "Factibilidad Estructural",
]

# Global conceptos for Hito 2 — Preparación y Seguridad
HITO2_CONCEPTOS = [
    "Seguridad y Delimitación",
    "Logística y Materiales en Techo",
]


# ---------------------------------------------------------------------------
# Session state helpers
# ---------------------------------------------------------------------------

def _state_defaults():
    return {
        "deal_id": "",
        "revisor": "",
        "racks": [],          # [{"id": str, "config": str, "filas": int, "cols": int}]
        "gabs": [],           # [{"id": str, "nombre": str}]
        "cans": [],           # [{"id": str}]
        "has_zne": False,
        "has_lamina": False,
        "selected": None,     # (entity_id, concepto) currently shown on the right
        "checks": {},         # {(entity_id, concepto, check_text): bool}
        "saved": set(),       # {(entity_id, concepto)} — has a saved review
        "persisted_ids": set(), # entity_ids already written to Instalaciones sheet
    }


def init_state():
    for k, v in _state_defaults().items():
        if k not in st.session_state:
            st.session_state[k] = v


# ---------------------------------------------------------------------------
# ID generators
# ---------------------------------------------------------------------------

def rack_id(deal, n): return f"{deal}_R{n}"
def gab_id(deal, n):  return f"{deal}_GAB{n}"
def can_id(deal, n):  return f"{deal}_CAN{n}"


def parse_nxm(s):
    m = re.fullmatch(r"(\d+)[xX](\d+)", s.strip())
    return (int(m.group(1)), int(m.group(2))) if m else (None, None)


# ---------------------------------------------------------------------------
# Checkbox key builder
# ---------------------------------------------------------------------------

def ck(entity_id, concepto, idx):
    """Stable, unique Streamlit widget key for a checklist checkbox."""
    return "cb_" + re.sub(r"\W+", "_", f"{entity_id}__{concepto}__{idx}")


# ---------------------------------------------------------------------------
# Deal loading / reset
# ---------------------------------------------------------------------------

def on_deal_change(new_deal):
    defaults = _state_defaults()
    for k in ("racks", "gabs", "cans", "has_zne", "has_lamina",
              "selected", "checks", "saved", "persisted_ids"):
        st.session_state[k] = defaults[k]
    st.session_state.deal_id = new_deal

    if new_deal:
        try:
            entities = load_entities(new_deal)
        except Exception as e:
            st.session_state._load_error = f"load_entities: {e}"
            entities = {"racks": [], "gabs": [], "cans": [],
                        "has_zne": False, "has_lamina": False}

        for rack in entities["racks"]:
            filas, cols = parse_nxm(rack["config"])
            st.session_state.racks.append(
                {"id": rack["id"], "config": rack["config"], "filas": filas, "cols": cols}
            )
        st.session_state.gabs = entities["gabs"]
        st.session_state.cans = entities["cans"]
        st.session_state.has_zne = entities["has_zne"]
        st.session_state.has_lamina = entities["has_lamina"]

        all_ids = (
            [r["id"] for r in entities["racks"]]
            + [g["id"] for g in entities["gabs"]]
            + [c["id"] for c in entities["cans"]]
        )
        if entities["has_zne"]:
            all_ids.append(f"{new_deal}_ZNE")
        if entities["has_lamina"]:
            all_ids.append(f"{new_deal}_LAMINA")
        st.session_state.persisted_ids = set(all_ids)

        try:
            saved = load_saved_reviews(new_deal)
        except Exception as e:
            st.session_state._load_error = f"load_saved_reviews: {e}"
            saved = {}

        st.session_state.checks = saved
        st.session_state.saved = {(eid, c) for eid, c, _ in saved}
    st.rerun()


# ---------------------------------------------------------------------------
# Sidebar navigation button
# ---------------------------------------------------------------------------

def nav_btn(label, entity_id, concepto):
    icon = "✅" if (entity_id, concepto) in st.session_state.saved else "○"
    key = "nav_" + re.sub(r"\W+", "_", f"{entity_id}__{concepto}")
    if st.button(f"{icon} {label}", key=key, use_container_width=True):
        st.session_state.selected = (entity_id, concepto)
        st.rerun()


# ---------------------------------------------------------------------------
# Sidebar
# ---------------------------------------------------------------------------

def render_sidebar(by_concepto):
    with st.sidebar:
        st.title("☀️ Checklist Liveops")

        raw = st.text_input("Deal ID", placeholder="ej. DEAL-123", key="_deal_input")
        new_deal = raw.strip()

        if new_deal != st.session_state.deal_id:
            on_deal_change(new_deal)

        if not new_deal:
            st.info("Ingresa un Deal ID para comenzar.")
            return

        st.text_input("Tu nombre", placeholder="ej. Ana García", key="_revisor_input")
        st.session_state.revisor = st.session_state.get("_revisor_input", "").strip()

        if st.session_state.get("_load_error"):
            st.error(st.session_state._load_error)

        deal = st.session_state.deal_id
        st.divider()

        # ---- Hito 1: Evaluación de Techo ----
        st.markdown("#### Evaluación de Techo")
        for c in HITO1_CONCEPTOS:
            if c in by_concepto:
                nav_btn(c, deal, c)

        st.divider()

        # ---- Hito 2: Preparación y Seguridad ----
        st.markdown("#### Preparación y Seguridad")
        for c in HITO2_CONCEPTOS:
            if c in by_concepto:
                nav_btn(c, deal, c)

        st.divider()

        # ---- Racks ----
        st.markdown("#### Racks")

        lamina_on = st.checkbox(
            "¿Techo de lámina?",
            value=st.session_state.has_lamina,
            key="_lamina_tog",
        )
        if lamina_on != st.session_state.has_lamina:
            st.session_state.has_lamina = lamina_on
            if lamina_on:
                lamina_eid = f"{deal}_LAMINA"
                if lamina_eid not in st.session_state.persisted_ids:
                    save_entity(deal, "lamina", lamina_eid)
                    st.session_state.persisted_ids.add(lamina_eid)
            st.rerun()

        for i, rack in enumerate(st.session_state.racks):
            with st.expander(f"Rack {i + 1}  ·  {rack['config']}", expanded=True):
                for c in PER_RACK:
                    if c in by_concepto:
                        nav_btn(c, rack["id"], c)
                if st.session_state.has_lamina and LAMINA in by_concepto:
                    nav_btn("Anclajes para lámina", rack["id"], LAMINA)

        with st.expander("➕ Agregar Rack"):
            cfg = st.text_input("Config  (ej. 2x4)", key="_rack_cfg")
            if st.button("Agregar Rack", key="_add_rack"):
                filas, cols = parse_nxm(cfg)
                if filas:
                    n = len(st.session_state.racks) + 1
                    rid = rack_id(deal, n)
                    st.session_state.racks.append(
                        {"id": rid, "config": cfg.strip(), "filas": filas, "cols": cols}
                    )
                    if rid not in st.session_state.persisted_ids:
                        save_entity(deal, "rack", rid, config=cfg.strip())
                        st.session_state.persisted_ids.add(rid)
                    st.rerun()
                else:
                    st.error("Formato inválido. Usa nXm — ej. 2x4")

        st.divider()

        # ---- Instalación Eléctrica ----
        st.markdown("#### Instalación Eléctrica")

        for c in ["Puesta a Tierra", "Inversores"]:
            if c in by_concepto:
                nav_btn(c, deal, c)

        st.markdown("**Gabinetes**")
        for g in st.session_state.gabs:
            if "Gabinetes" in by_concepto:
                nav_btn(g.get("nombre") or g["id"], g["id"], "Gabinetes")

        with st.expander("➕ Agregar Gabinete"):
            gab_nombre = st.text_input("Nombre del gabinete (ej. Gabinete CC)", key="_gab_nombre")
            if st.button("Agregar Gabinete", key="_add_gab"):
                nombre = gab_nombre.strip()
                if nombre:
                    n = len(st.session_state.gabs) + 1
                    gid = gab_id(deal, n)
                    st.session_state.gabs.append({"id": gid, "nombre": nombre})
                    if gid not in st.session_state.persisted_ids:
                        save_entity(deal, "gabinete", gid, nombre=nombre)
                        st.session_state.persisted_ids.add(gid)
                    st.rerun()
                else:
                    st.error("Escribe el nombre del gabinete")

        st.markdown("**Canalización y Cableado**")
        for i, can in enumerate(st.session_state.cans):
            for c in ["Canalización", "Cableado"]:
                if c in by_concepto:
                    nav_btn(f"Tramo {i + 1} · {c}", can["id"], c)

        if st.button("➕ Agregar Tramo", key="_add_can"):
            n = len(st.session_state.cans) + 1
            cid = can_id(deal, n)
            st.session_state.cans.append({"id": cid})
            if cid not in st.session_state.persisted_ids:
                save_entity(deal, "tramo", cid)
                st.session_state.persisted_ids.add(cid)
            st.rerun()

        if "Medidor / Acometida" in by_concepto:
            nav_btn("Medidor / Acometida", deal, "Medidor / Acometida")

        st.divider()

        # ---- Puesta en Marcha ----
        st.markdown("#### Puesta en Marcha")
        for c in ["Prueba de generacion", "Monitoreo"]:
            if c in by_concepto:
                nav_btn(c, deal, c)

        zne_on = st.checkbox(
            "¿Incluye ZNE / Smart Meter?",
            value=st.session_state.has_zne,
            key="_zne_tog",
        )
        if zne_on != st.session_state.has_zne:
            st.session_state.has_zne = zne_on
            if zne_on:
                zne_eid = f"{deal}_ZNE"
                if zne_eid not in st.session_state.persisted_ids:
                    save_entity(deal, "zne", zne_eid)
                    st.session_state.persisted_ids.add(zne_eid)
            st.rerun()

        if st.session_state.has_zne and ZNE in by_concepto:
            nav_btn("ZNE / Smart Meter", deal, ZNE)


# ---------------------------------------------------------------------------
# Checklist panel (right side)
# ---------------------------------------------------------------------------

def _entity_label(entity_id):
    """Return a human-readable label for a non-deal entity_id."""
    for i, rack in enumerate(st.session_state.racks):
        if rack["id"] == entity_id:
            return f"Rack {i + 1} · {rack['config']}"
    for g in st.session_state.gabs:
        if g["id"] == entity_id:
            return g.get("nombre") or g["id"]
    for i, can in enumerate(st.session_state.cans):
        if can["id"] == entity_id:
            return f"Tramo {i + 1}"
    return entity_id


def get_check_val(entity_id, concepto, idx, check_text):
    """Widget state takes precedence over checks dict (keeps progress bar current)."""
    widget_key = ck(entity_id, concepto, idx)
    if widget_key in st.session_state:
        return st.session_state[widget_key]
    return st.session_state.checks.get((entity_id, concepto, check_text), False)


def render_checklist(by_concepto):
    if not st.session_state.selected:
        st.markdown("## ☀️ Checklist Liveops")
        st.info("Selecciona una sección del panel izquierdo para comenzar la revisión.")
        return

    entity_id, concepto = st.session_state.selected
    items = by_concepto.get(concepto, [])
    deal = st.session_state.deal_id

    if not items:
        st.warning(f"No se encontraron ítems para '{concepto}' en el spreadsheet.")
        return

    st.markdown(f"## {concepto}")
    caption = f"Deal: **{deal}**"
    if entity_id != deal:
        caption += f"  ·  {_entity_label(entity_id)}"
    st.caption(caption)

    # Progress bar
    done = sum(get_check_val(entity_id, concepto, i, it["check"]) for i, it in enumerate(items))
    total = len(items)
    st.progress(done / total if total else 0, text=f"{done} / {total} puntos revisados")
    st.divider()

    # Group items by hito, preserving order
    hito_groups = defaultdict(list)
    hito_order = []
    for idx, item in enumerate(items):
        h = item["hito"]
        if h not in hito_groups:
            hito_order.append(h)
        hito_groups[h].append((idx, item))

    for h in hito_order:
        if h:
            st.subheader(h)
        for idx, item in hito_groups[h]:
            widget_key = ck(entity_id, concepto, idx)
            initial = st.session_state.checks.get((entity_id, concepto, item["check"]), False)
            if widget_key not in st.session_state:
                st.session_state[widget_key] = initial
            checked = st.checkbox(item["check"], key=widget_key)
            st.session_state.checks[(entity_id, concepto, item["check"])] = checked

    st.divider()

    if st.button("💾 Guardar revisión", type="primary", use_container_width=True):
        if not st.session_state.revisor:
            st.error("Escribe tu nombre antes de guardar.")
            return
        check_states = {
            item["check"]: st.session_state.checks.get((entity_id, concepto, item["check"]), False)
            for item in items
        }
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with st.spinner("Guardando en Google Sheets…"):
            save_review(deal, entity_id, concepto, items, check_states, ts,
                        revisor=st.session_state.revisor)
        st.session_state.saved.add((entity_id, concepto))
        st.success(f"✅ Guardado · {ts}")
        st.rerun()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    st.set_page_config(page_title="Checklist Liveops", layout="wide", page_icon="☀️")
    init_state()

    try:
        checklist = load_checklist()
    except Exception as e:
        st.error(f"No se pudo cargar el checklist desde Google Sheets: {e}")
        st.stop()

    by_concepto = defaultdict(list)
    for item in checklist:
        by_concepto[item["concepto"]].append(item)

    render_sidebar(by_concepto)
    if st.session_state.deal_id:
        render_checklist(by_concepto)


if __name__ == "__main__":
    main()
