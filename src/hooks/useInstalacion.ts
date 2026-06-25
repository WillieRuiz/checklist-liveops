import { useCallback, useEffect, useState } from "react";
import { getInstalacion, persistProgreso, registrarEscalacion as registrarEscalacionApi, type Instalacion } from "@/lib/instalaciones";
import { fetchHubspotDeal, type HubspotDeal } from "@/lib/hubspot";
import { HITOS } from "@/lib/hitos";
import { toast } from "sonner";

export function useInstalacion(dealId: string | undefined, initialHubspot?: HubspotDeal | null) {
  const [instalacion, setInstalacion] = useState<Instalacion | null>(null);
  const [hubspot, setHubspot] = useState<HubspotDeal | null>(initialHubspot ?? null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!dealId) return;
    setLoading(true);
    setNotFound(false);
    getInstalacion(dealId)
      .then((i) => {
        if (!alive) return;
        if (!i) setNotFound(true);
        else setInstalacion(i);
      })
      .catch((e) => {
        if (!alive) return;
        toast.error(e.message ?? "Error cargando instalación");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [dealId]);

  useEffect(() => {
    let alive = true;
    if (!dealId || initialHubspot) return;
    fetchHubspotDeal(dealId)
      .then((h) => alive && setHubspot(h))
      .catch(() => {
        /* silently ignore; card will show skeleton/dashes */
      });
    return () => {
      alive = false;
    };
  }, [dealId, initialHubspot]);

  const markDone = useCallback(
    async (hitoIndex: number) => {
      if (!instalacion) return;
      const completados = instalacion.hitos_completados.includes(hitoIndex)
        ? instalacion.hitos_completados
        : [...instalacion.hitos_completados, hitoIndex];
      try {
        const updated = await persistProgreso(
          instalacion.deal_id,
          { hito_actual: instalacion.hito_actual, hitos_completados: completados },
          { hito: hitoIndex, accion: "completado" },
        );
        setInstalacion(updated);
      } catch (e: any) {
        toast.error(e.message ?? "Error guardando hito");
      }
    },
    [instalacion],
  );

  const advance = useCallback(
    async (nextIndex: number) => {
      if (!instalacion) return;
      try {
        const updated = await persistProgreso(
          instalacion.deal_id,
          { hito_actual: nextIndex, hitos_completados: instalacion.hitos_completados },
          { hito: nextIndex, accion: "completado" },
        );
        setInstalacion(updated);
      } catch (e: any) {
        toast.error(e.message ?? "Error avanzando hito");
      }
    },
    [instalacion],
  );

  const setCursor = useCallback(
    async (index: number) => {
      if (!instalacion) return;
      if (index === instalacion.hito_actual) return;
      try {
        const updated = await persistProgreso(
          instalacion.deal_id,
          { hito_actual: index, hitos_completados: instalacion.hitos_completados },
          { hito: index, accion: "reabierto" },
        );
        setInstalacion(updated);
      } catch (e: any) {
        toast.error(e.message ?? "Error cambiando hito");
      }
    },
    [instalacion],
  );

  const reopen = useCallback(
    async (hitoIndex: number) => {
      if (!instalacion) return;
      const completados = instalacion.hitos_completados.filter((i) => i !== hitoIndex);
      try {
        const updated = await persistProgreso(
          instalacion.deal_id,
          { hito_actual: hitoIndex, hitos_completados: completados },
          { hito: hitoIndex, accion: "reabierto" },
        );
        setInstalacion(updated);
      } catch (e: any) {
        toast.error(e.message ?? "Error reabriendo hito");
      }
    },
    [instalacion],
  );

  const finishAll = useCallback(async () => {
    if (!instalacion) return;
    const all = HITOS.map((_, i) => i);
    try {
      const updated = await persistProgreso(
        instalacion.deal_id,
        { hito_actual: HITOS.length - 1, hitos_completados: all },
        { hito: HITOS.length - 1, accion: "finalizado" },
      );
      setInstalacion(updated);
    } catch (e: any) {
      toast.error(e.message ?? "Error finalizando");
    }
  }, [instalacion]);

  const registrarEscalacion = useCallback(
    async (hitoIndex: number, blocker: string) => {
      if (!instalacion) return;
      try {
        const updated = await registrarEscalacionApi(instalacion.deal_id, { hito: hitoIndex, blocker });
        setInstalacion(updated);
      } catch (e: any) {
        toast.error(e.message ?? "Error registrando escalación");
      }
    },
    [instalacion],
  );

  return { instalacion, hubspot, loading, notFound, markDone, advance, setCursor, reopen, finishAll, registrarEscalacion };
}
