import { useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Search } from "lucide-react";
import { useInstalacion } from "@/hooks/useInstalacion";
import HitoWorkflow from "@/components/hitos/HitoWorkflow";
import UserMenu from "@/components/hitos/UserMenu";
import { findByDealId, findOrCreate } from "@/lib/instalaciones";
import { fetchHubspotDeal, type HubspotDeal } from "@/lib/hubspot";

type ActiveDeal = { dealId: string; hubspot: HubspotDeal };

export default function DealWorkflow() {
  const { dealId: initialFromUrl } = useParams<{ dealId: string }>();
  const [active, setActive] = useState<ActiveDeal | null>(null);
  const [bootstrapping, setBootstrapping] = useState<boolean>(!!initialFromUrl);
  const [bootstrapTried, setBootstrapTried] = useState(false);

  // Bootstrap from URL once
  if (initialFromUrl && !active && !bootstrapTried) {
    setBootstrapTried(true);
    (async () => {
      try {
        const hubspot = await fetchHubspotDeal(initialFromUrl);
        if (hubspot) {
          const ins = await findByDealId(initialFromUrl);
          if (!ins) await findOrCreate(initialFromUrl);
          setActive({ dealId: initialFromUrl, hubspot });
        }
      } finally {
        setBootstrapping(false);
      }
    })();
  }

  const runSearch = useCallback(async (id: string): Promise<string | null> => {
    try {
      const [instalacion, hubspot] = await Promise.all([
        findByDealId(id),
        fetchHubspotDeal(id),
      ]);
      if (!hubspot) return "Deal no encontrado. Verifica el ID.";
      if (!instalacion) await findOrCreate(id);
      setActive({ dealId: id, hubspot });
      // Reflect in URL without touching history
      window.history.replaceState(null, "", `/deal/${encodeURIComponent(id)}`);
      return null;
    } catch (err: any) {
      return err?.message ?? "Error inesperado";
    }
  }, []);

  if (bootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!active) {
    return <SearchScreen onSubmit={runSearch} />;
  }

  return (
    <DealLoaded
      key={active.dealId}
      dealId={active.dealId}
      initialHubspot={active.hubspot}
      onSubmitNewDeal={runSearch}
    />
  );
}

function DealLoaded({
  dealId,
  initialHubspot,
  onSubmitNewDeal,
}: {
  dealId: string;
  initialHubspot: HubspotDeal;
  onSubmitNewDeal: (id: string) => Promise<string | null>;
}) {
  const { instalacion, hubspot, loading, markDone, advance, setCursor, reopen, finishAll, registrarEscalacion } =
    useInstalacion(dealId, initialHubspot);

  if (loading || !instalacion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <HitoWorkflow
      dealId={instalacion.deal_id}
      hubspot={hubspot}
      current={instalacion.hito_actual}
      done={instalacion.hitos_completados}
      onJump={setCursor}
      onMarkDone={markDone}
      onAdvance={advance}
      onReopen={reopen}
      onFinishAll={finishAll}
      onSubmitNewDeal={onSubmitNewDeal}
      onEscalacion={registrarEscalacion}
    />
  );
}

function SearchScreen({ onSubmit }: { onSubmit: (id: string) => Promise<string | null> }) {
  const [dealId, setDealId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = dealId.trim();
    if (!id) return;
    setLoading(true);
    setError(null);
    const err = await onSubmit(id);
    setLoading(false);
    if (err) setError(err);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-foreground text-background px-5 py-3.5 flex items-center justify-between gap-3">
        <h1 className="text-sm font-medium">Workflow de Hitos — NIKO</h1>
        <UserMenu />
      </header>
      <main className="flex-1 flex items-center justify-center px-4">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-sm"
        >
          <h2 className="text-xl font-bold mb-1">Buscar instalación</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Ingresa el Deal ID para abrir el workflow.
          </p>

          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
            Deal ID
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              autoFocus
              value={dealId}
              onChange={(e) => {
                setDealId(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Ingresa el Deal ID"
              className="flex-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !dealId.trim()}
              className="bg-foreground text-background font-semibold px-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Buscar
            </button>
          </div>

          {error && (
            <div className="mt-2 text-sm rounded-xl border border-red-200 bg-red-50 text-red-800 px-3 py-2.5">
              {error}
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
