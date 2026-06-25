import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useChecklist } from "./hooks/useChecklist";
import ChecklistSidebar from "./components/ChecklistSidebar";
import ChecklistPanel from "./components/ChecklistPanel";
import UserMenu from "@/components/hitos/UserMenu";

export default function ChecklistPage() {
  const { dealId = "" } = useParams<{ dealId: string }>();
  const { user } = useAuth();

  const ctx = useChecklist(dealId);

  const revisorId    = user?.id ?? "";
  const revisorEmail = user?.email ?? "";

  if (ctx.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-foreground text-background px-5 py-3 sticky top-0 z-20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={`/deal/${encodeURIComponent(dealId)}`}
            className="text-background/70 hover:text-background transition-colors shrink-0"
            aria-label="Volver al workflow"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-sm font-medium truncate">
            Checklist de calidad · Deal <span className="font-mono">{dealId}</span>
          </h1>
        </div>
        <UserMenu />
      </header>

      {/* Error cargando items */}
      {ctx.itemsError && (
        <div className="bg-red-50 border-b border-red-200 px-5 py-2 text-xs text-red-700">
          No se pudo cargar el checklist desde Google Sheets. Revisa la configuración de la Edge Function.
        </div>
      )}

      {/* Error cargando entidades/revisiones */}
      {ctx.loadError && (
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-2 text-xs text-amber-700">
          {ctx.loadError}
        </div>
      )}

      {/* Body: sidebar + main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 border-r border-border overflow-y-auto hidden md:block">
          <ChecklistSidebar dealId={dealId} ctx={ctx} />
        </aside>

        {/* Main panel */}
        <ChecklistPanel
          dealId={dealId}
          ctx={ctx}
          revisorId={revisorId}
          revisorEmail={revisorEmail}
        />
      </div>
    </div>
  );
}
