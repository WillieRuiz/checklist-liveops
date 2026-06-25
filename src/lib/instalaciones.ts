import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type Evento = {
  hito: number;
  accion: "completado" | "reabierto" | "finalizado" | "escalacion_planeacion" | "notificacion_slack";
  email: string;
  timestamp: string;
  blocker?: string;
  blocker_kind?: "warning" | "stop";
};

export type Instalacion = {
  id: string;
  deal_id: string;
  cliente_nombre: string | null;
  hito_actual: number;
  hitos_completados: number[];
  eventos: Evento[];
};

function normalize(row: {
  id: string;
  deal_id: string;
  cliente_nombre: string | null;
  hito_actual: number;
  hitos_completados: number[] | null;
  eventos: Json;
}): Instalacion {
  return {
    id: row.id,
    deal_id: row.deal_id,
    cliente_nombre: row.cliente_nombre,
    hito_actual: row.hito_actual ?? 0,
    hitos_completados: row.hitos_completados ?? [],
    eventos: Array.isArray(row.eventos) ? (row.eventos as unknown as Evento[]) : [],
  };
}

export async function findOrCreate(dealId: string): Promise<Instalacion> {
  const id = dealId.trim();
  if (!id) throw new Error("Deal ID requerido");

  const { data: existing, error: selErr } = await supabase
    .from("instalaciones")
    .select("*")
    .eq("deal_id", id)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return normalize(existing);

  const { data: userData } = await supabase.auth.getUser();
  const { data: inserted, error: insErr } = await supabase
    .from("instalaciones")
    .insert({ deal_id: id, created_by: userData.user?.id ?? null })
    .select("*")
    .single();
  if (insErr) throw insErr;
  return normalize(inserted);
}

export async function findByDealId(dealId: string): Promise<Instalacion | null> {
  const id = dealId.trim();
  if (!id) return null;
  const { data, error } = await supabase
    .from("instalaciones")
    .select("*")
    .eq("deal_id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? normalize(data) : null;
}


export async function getInstalacion(dealId: string): Promise<Instalacion | null> {
  const { data, error } = await supabase
    .from("instalaciones")
    .select("*")
    .eq("deal_id", dealId)
    .maybeSingle();
  if (error) throw error;
  return data ? normalize(data) : null;
}

async function currentEmail(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? "desconocido";
}

export async function persistProgreso(
  dealId: string,
  patch: { hito_actual: number; hitos_completados: number[] },
  evento: { hito: number; accion: Evento["accion"]; blocker?: string; blocker_kind?: Evento["blocker_kind"] },
): Promise<Instalacion> {
  const email = await currentEmail();
  const newEvento: Evento = {
    hito: evento.hito,
    accion: evento.accion,
    email,
    timestamp: new Date().toISOString(),
    ...(evento.blocker ? { blocker: evento.blocker } : {}),
    ...(evento.blocker_kind ? { blocker_kind: evento.blocker_kind } : {}),
  };

  const current = await getInstalacion(dealId);
  const eventos = [...(current?.eventos ?? []), newEvento];

  const { data, error } = await supabase
    .from("instalaciones")
    .update({
      hito_actual: patch.hito_actual,
      hitos_completados: patch.hitos_completados,
      eventos: eventos as unknown as Json,
    })
    .eq("deal_id", dealId)
    .select("*")
    .single();
  if (error) throw error;
  return normalize(data);
}

export async function registrarNotificacionSlack(
  dealId: string,
  evento: { hito: number; blocker: string; blocker_kind: "warning" | "stop" },
): Promise<Instalacion> {
  const current = await getInstalacion(dealId);
  if (!current) throw new Error("Instalación no encontrada");
  return persistProgreso(
    dealId,
    { hito_actual: current.hito_actual, hitos_completados: current.hitos_completados },
    { hito: evento.hito, accion: "notificacion_slack", blocker: evento.blocker, blocker_kind: evento.blocker_kind },
  );
}

export async function registrarEscalacion(
  dealId: string,
  evento: { hito: number; blocker: string },
): Promise<Instalacion> {
  const current = await getInstalacion(dealId);
  if (!current) throw new Error("Instalación no encontrada");
  return persistProgreso(
    dealId,
    { hito_actual: current.hito_actual, hitos_completados: current.hitos_completados },
    { hito: evento.hito, accion: "escalacion_planeacion", blocker: evento.blocker },
  );
}
