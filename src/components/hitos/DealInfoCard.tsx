import type { HubspotDeal } from "@/lib/hubspot";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  hubspot: HubspotDeal | null;
  loading?: boolean;
};

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
        {label}
      </div>
      <div className="text-sm font-medium break-words whitespace-normal">
        {value && value.trim() ? value : "—"}
      </div>
    </div>
  );
}

export default function DealInfoCard({ hubspot, loading }: Props) {
  return (
    <div className="bg-card border-b border-border px-4 py-3">
      <div className="max-w-2xl mx-auto">
        {loading || !hubspot ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
            <Field label="Nombre del deal" value={hubspot.dealname} />
            <Field label="Dirección" value={hubspot.project_address} />
            <Field label="Número de servicio" value={hubspot.numero_de_servicio_cfe} />
          </div>
        )}
      </div>
    </div>
  );
}
