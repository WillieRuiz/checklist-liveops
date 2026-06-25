export type CheckItem = {
  hito: string;
  concepto: string;
  check: string;
};

export type RackEntity = { id: string; config: string; filas: number | null; cols: number | null };
export type GabEntity  = { id: string; nombre: string };
export type TramEntity = { id: string };

// Conceptos que se revisan por instancia de rack
export const PER_RACK = ["Anclajes", "Racking", "Montaje de Módulos"] as const;
// Concepto revisado por instancia de gabinete
export const PER_GAB  = ["Gabinetes"] as const;
// Conceptos revisados por tramo de canalización
export const PER_CAN  = ["Canalización", "Cableado"] as const;

export const ZNE_CONCEPTO    = "ZNE / Smart Meter";
export const LAMINA_CONCEPTO = "Anclajes para lamina";

// Conceptos globales del Hito 1 — Evaluación de Techo
export const HITO1_CONCEPTOS = [
  "Preparacion CFE / Instalacion electrica actual",
  "Estado de la Cubierta",
  "Riesgos de Filtración y Compatibilidad",
  "Factibilidad Estructural",
] as const;

// Conceptos globales del Hito 2 — Preparación y Seguridad
export const HITO2_CONCEPTOS = [
  "Seguridad y Delimitación",
  "Logística y Materiales en Techo",
] as const;

// Conceptos globales de instalación eléctrica
export const ELECTRICA_CONCEPTOS = [
  "Puesta a Tierra",
  "Inversores",
  "Medidor / Acometida",
] as const;

// Conceptos globales de puesta en marcha
export const MARCHA_CONCEPTOS = [
  "Prueba de generacion",
  "Monitoreo",
] as const;

/** Clave única para un checkbox: entityId + concepto + checkItem */
export function makeCheckKey(entityId: string, concepto: string, checkItem: string): string {
  return `${entityId}||${concepto}||${checkItem}`;
}

/** Clave única para saber si una sección ya fue guardada */
export function makeSavedKey(entityId: string, concepto: string): string {
  return `${entityId}||${concepto}`;
}

/** Extrae filas y columnas de un config "NxM" */
export function parseNxM(s: string): [number | null, number | null] {
  const m = s?.trim().match(/^(\d+)[xX](\d+)$/);
  return m ? [parseInt(m[1]), parseInt(m[2])] : [null, null];
}
