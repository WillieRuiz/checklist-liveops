import { useCallback, useEffect, useReducer } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchChecklistItems, loadEntities, loadSavedReviews, saveEntity, saveReview } from "../lib/api";
import {
  makeCheckKey,
  makeSavedKey,
  parseNxM,
  ZNE_CONCEPTO,
  LAMINA_CONCEPTO,
  type CheckItem,
  type GabEntity,
  type RackEntity,
  type TramEntity,
} from "../lib/types";

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

type State = {
  racks: RackEntity[];
  gabs: GabEntity[];
  cans: TramEntity[];
  hasZne: boolean;
  hasLamina: boolean;
  selected: [string, string] | null;         // [entityId, concepto]
  checks: Record<string, boolean>;           // makeCheckKey → bool
  saved: Set<string>;                        // makeSavedKey → already saved
  persistedIds: Set<string>;                 // entityIds written to Supabase
  loading: boolean;
  loadError: string | null;
};

type Action =
  | { type: "LOAD_START" }
  | { type: "LOAD_OK"; entities: Omit<State, "checks" | "saved" | "persistedIds" | "loading" | "loadError" | "selected">; reviews: Record<string, boolean> }
  | { type: "LOAD_ERROR"; error: string }
  | { type: "SELECT"; entityId: string; concepto: string }
  | { type: "SET_CHECK"; key: string; value: boolean }
  | { type: "MARK_SAVED"; entityId: string; concepto: string }
  | { type: "ADD_RACK"; rack: RackEntity }
  | { type: "ADD_GAB"; gab: GabEntity }
  | { type: "ADD_CAN"; can: TramEntity }
  | { type: "ADD_PERSISTED"; id: string }
  | { type: "SET_ZNE"; value: boolean }
  | { type: "SET_LAMINA"; value: boolean };

function init(): State {
  return {
    racks: [], gabs: [], cans: [],
    hasZne: false, hasLamina: false,
    selected: null,
    checks: {}, saved: new Set(), persistedIds: new Set(),
    loading: false, loadError: null,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "LOAD_START":
      return { ...init(), loading: true };

    case "LOAD_OK": {
      const persistedIds = new Set([
        ...action.entities.racks.map((r) => r.id),
        ...action.entities.gabs.map((g) => g.id),
        ...action.entities.cans.map((c) => c.id),
        ...(action.entities.hasZne ? [] : []),
        ...(action.entities.hasLamina ? [] : []),
      ]);
      // Also add zne/lamina virtual IDs if present — handled by the deal id prefix at call site
      const saved = new Set(
        Object.keys(action.reviews).map((k) => {
          const [eid, concepto] = k.split("||");
          return makeSavedKey(eid, concepto);
        }),
      );
      return {
        ...state,
        ...action.entities,
        checks: action.reviews,
        saved,
        persistedIds,
        loading: false,
        loadError: null,
      };
    }

    case "LOAD_ERROR":
      return { ...init(), loadError: action.error };

    case "SELECT":
      return { ...state, selected: [action.entityId, action.concepto] };

    case "SET_CHECK":
      return { ...state, checks: { ...state.checks, [action.key]: action.value } };

    case "MARK_SAVED":
      return {
        ...state,
        saved: new Set([...state.saved, makeSavedKey(action.entityId, action.concepto)]),
      };

    case "ADD_RACK":
      return { ...state, racks: [...state.racks, action.rack] };

    case "ADD_GAB":
      return { ...state, gabs: [...state.gabs, action.gab] };

    case "ADD_CAN":
      return { ...state, cans: [...state.cans, action.can] };

    case "ADD_PERSISTED":
      return { ...state, persistedIds: new Set([...state.persistedIds, action.id]) };

    case "SET_ZNE":
      return { ...state, hasZne: action.value };

    case "SET_LAMINA":
      return { ...state, hasLamina: action.value };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useChecklist(dealId: string) {
  const [state, dispatch] = useReducer(reducer, undefined, init);

  // Checklist items from Google Sheets (cached 5 min via React Query)
  const { data: checklistItems = [], isError: itemsError } = useQuery<CheckItem[]>({
    queryKey: ["checklist-items"],
    queryFn: fetchChecklistItems,
    staleTime: 5 * 60 * 1000,
  });

  // By-concepto map for quick lookup
  const byConcepto: Record<string, CheckItem[]> = {};
  for (const item of checklistItems) {
    (byConcepto[item.concepto] ??= []).push(item);
  }

  // Load entities + reviews when dealId changes
  useEffect(() => {
    if (!dealId) return;
    let cancelled = false;

    dispatch({ type: "LOAD_START" });
    (async () => {
      try {
        const [entities, reviews] = await Promise.all([
          loadEntities(dealId),
          loadSavedReviews(dealId),
        ]);
        if (!cancelled) dispatch({ type: "LOAD_OK", entities, reviews });
      } catch (e: any) {
        if (!cancelled) dispatch({ type: "LOAD_ERROR", error: String(e?.message ?? e) });
      }
    })();

    return () => { cancelled = true; };
  }, [dealId]);

  // --- Entity actions ---

  const addRack = useCallback(
    async (config: string) => {
      const [filas, cols] = parseNxM(config);
      if (!filas) throw new Error("Formato inválido. Usa NxM — ej. 2x4");
      const n   = state.racks.length + 1;
      const rid = `${dealId}_R${n}`;
      dispatch({ type: "ADD_RACK", rack: { id: rid, config, filas, cols } });
      if (!state.persistedIds.has(rid)) {
        await saveEntity(dealId, "rack", rid, config);
        dispatch({ type: "ADD_PERSISTED", id: rid });
      }
    },
    [dealId, state.racks.length, state.persistedIds],
  );

  const addGab = useCallback(
    async (nombre: string) => {
      if (!nombre.trim()) throw new Error("Escribe el nombre del gabinete");
      const n   = state.gabs.length + 1;
      const gid = `${dealId}_GAB${n}`;
      dispatch({ type: "ADD_GAB", gab: { id: gid, nombre } });
      if (!state.persistedIds.has(gid)) {
        await saveEntity(dealId, "gabinete", gid, "", nombre);
        dispatch({ type: "ADD_PERSISTED", id: gid });
      }
    },
    [dealId, state.gabs.length, state.persistedIds],
  );

  const addCan = useCallback(async () => {
    const n   = state.cans.length + 1;
    const cid = `${dealId}_CAN${n}`;
    dispatch({ type: "ADD_CAN", can: { id: cid } });
    if (!state.persistedIds.has(cid)) {
      await saveEntity(dealId, "tramo", cid);
      dispatch({ type: "ADD_PERSISTED", id: cid });
    }
  }, [dealId, state.cans.length, state.persistedIds]);

  const toggleZne = useCallback(
    async (value: boolean) => {
      dispatch({ type: "SET_ZNE", value });
      if (value) {
        const eid = `${dealId}_ZNE`;
        if (!state.persistedIds.has(eid)) {
          await saveEntity(dealId, "zne", eid);
          dispatch({ type: "ADD_PERSISTED", id: eid });
        }
      }
    },
    [dealId, state.persistedIds],
  );

  const toggleLamina = useCallback(
    async (value: boolean) => {
      dispatch({ type: "SET_LAMINA", value });
      if (value) {
        const eid = `${dealId}_LAMINA`;
        if (!state.persistedIds.has(eid)) {
          await saveEntity(dealId, "lamina", eid);
          dispatch({ type: "ADD_PERSISTED", id: eid });
        }
      }
    },
    [dealId, state.persistedIds],
  );

  // --- Check state ---

  const setCheck = useCallback((entityId: string, concepto: string, checkItem: string, value: boolean) => {
    dispatch({ type: "SET_CHECK", key: makeCheckKey(entityId, concepto, checkItem), value });
  }, []);

  const getCheck = useCallback(
    (entityId: string, concepto: string, checkItem: string): boolean =>
      state.checks[makeCheckKey(entityId, concepto, checkItem)] ?? false,
    [state.checks],
  );

  const select = useCallback((entityId: string, concepto: string) => {
    dispatch({ type: "SELECT", entityId, concepto });
  }, []);

  // --- Save ---

  const saveSection = useCallback(
    async (entityId: string, concepto: string, revisorId: string, revisorEmail: string) => {
      const items = byConcepto[concepto] ?? [];
      if (!items.length) throw new Error(`No hay items para ${concepto}`);

      const checkStates: Record<string, boolean> = {};
      for (const item of items) {
        checkStates[item.check] = state.checks[makeCheckKey(entityId, concepto, item.check)] ?? false;
      }

      await saveReview(dealId, entityId, concepto, items, checkStates, revisorId, revisorEmail);
      dispatch({ type: "MARK_SAVED", entityId, concepto });
    },
    [dealId, byConcepto, state.checks],
  );

  return {
    ...state,
    checklistItems,
    byConcepto,
    itemsError,
    addRack,
    addGab,
    addCan,
    toggleZne,
    toggleLamina,
    setCheck,
    getCheck,
    select,
    saveSection,
  };
}
