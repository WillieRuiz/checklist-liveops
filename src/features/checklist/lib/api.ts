import { supabase } from "@/integrations/supabase/client";
import type { CheckItem, RackEntity, GabEntity, TramEntity } from "./types";
import { parseNxM } from "./types";

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export async function saveEntity(
  dealId: string,
  entityType: string,
  entityId: string,
  config = "",
  nombre = "",
): Promise<void> {
  const { error } = await supabase
    .from("checklist_entidades")
    .upsert({ deal_id: dealId, entity_type: entityType, entity_id: entityId, config, nombre });
  if (error) throw error;
}

export async function loadEntities(dealId: string): Promise<{
  racks: RackEntity[];
  gabs: GabEntity[];
  cans: TramEntity[];
  hasZne: boolean;
  hasLamina: boolean;
}> {
  const { data, error } = await supabase
    .from("checklist_entidades")
    .select("*")
    .eq("deal_id", dealId)
    .order("created_at");
  if (error) throw error;

  const racks: RackEntity[] = [];
  const gabs: GabEntity[]   = [];
  const cans: TramEntity[]  = [];
  let hasZne    = false;
  let hasLamina = false;

  for (const r of data ?? []) {
    switch (r.entity_type) {
      case "rack": {
        const [filas, cols] = parseNxM(r.config ?? "");
        racks.push({ id: r.entity_id, config: r.config ?? "", filas, cols });
        break;
      }
      case "gabinete":
        gabs.push({ id: r.entity_id, nombre: r.nombre ?? "" });
        break;
      case "tramo":
        cans.push({ id: r.entity_id });
        break;
      case "zne":
        hasZne = true;
        break;
      case "lamina":
        hasLamina = true;
        break;
    }
  }

  return { racks, gabs, cans, hasZne, hasLamina };
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export async function saveReview(
  dealId: string,
  entityId: string,
  concepto: string,
  items: CheckItem[],
  checkStates: Record<string, boolean>,
  revisorId: string,
  revisorEmail: string,
): Promise<void> {
  const rows = items.map((item) => ({
    deal_id:       dealId,
    entity_id:     entityId,
    concepto,
    hito:          item.hito,
    check_item:    item.check,
    checked:       checkStates[item.check] ?? false,
    revisor_id:    revisorId || null,
    revisor_email: revisorEmail,
  }));
  const { error } = await supabase.from("checklist_revisiones").insert(rows);
  if (error) throw error;
}

export async function loadSavedReviews(dealId: string): Promise<Record<string, boolean>> {
  const { data, error } = await supabase
    .from("checklist_revisiones")
    .select("entity_id, concepto, check_item, checked")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  // Latest row wins (same lógica que el Google Sheets original)
  const state: Record<string, boolean> = {};
  for (const r of data ?? []) {
    state[`${r.entity_id}||${r.concepto}||${r.check_item}`] = r.checked;
  }
  return state;
}

// ---------------------------------------------------------------------------
// Checklist items — vía Edge Function (lee Google Sheets con service account)
// ---------------------------------------------------------------------------

export async function fetchChecklistItems(): Promise<CheckItem[]> {
  const { data, error } = await supabase.functions.invoke("get-checklist");
  if (error) throw new Error(error.message ?? "Error cargando checklist desde Google Sheets");
  return data as CheckItem[];
}
