import { useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { useChecklist } from "../hooks/useChecklist";

type Props = {
  dealId: string;
  ctx: ReturnType<typeof useChecklist>;
  revisorId: string;
  revisorEmail: string;
};

export default function ChecklistPanel({ dealId, ctx, revisorId, revisorEmail }: Props) {
  const { selected, byConcepto, racks, gabs, cans, getCheck, setCheck, saveSection } = ctx;
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!selected) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-8 text-center">
        Selecciona una sección del panel izquierdo para comenzar la revisión.
      </div>
    );
  }

  const [entityId, concepto] = selected;
  const items = byConcepto[concepto] ?? [];

  if (!items.length) {
    return (
      <div className="flex-1 p-8 text-sm text-muted-foreground">
        No se encontraron ítems para "{concepto}" en el Google Sheet.
      </div>
    );
  }

  // Progress
  const done  = items.filter((it) => getCheck(entityId, concepto, it.check)).length;
  const total = items.length;
  const pct   = total > 0 ? (done / total) * 100 : 0;

  // Entity label
  let entityLabel = "";
  if (entityId !== dealId) {
    const rack = racks.find((r) => r.id === entityId);
    const gab  = gabs.find((g) => g.id === entityId);
    const canI = cans.findIndex((c) => c.id === entityId);
    if (rack) entityLabel = `Rack · ${rack.config}`;
    else if (gab) entityLabel = gab.nombre;
    else if (canI >= 0) entityLabel = `Tramo ${canI + 1}`;
  }

  // Group by hito
  const hitoOrder: string[] = [];
  const hitoGroups: Record<string, typeof items> = {};
  for (const item of items) {
    if (!hitoGroups[item.hito]) {
      hitoOrder.push(item.hito);
      hitoGroups[item.hito] = [];
    }
    hitoGroups[item.hito].push(item);
  }

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await saveSection(entityId, concepto, revisorId, revisorEmail);
      setSaveMsg({ ok: true, text: "Revisión guardada ✓" });
    } catch (e: any) {
      setSaveMsg({ ok: false, text: e.message ?? "Error al guardar" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-6">
        {/* Header */}
        <h2 className="text-2xl font-bold leading-tight mb-1">{concepto}</h2>
        <p className="text-xs text-muted-foreground mb-5">
          Deal: <span className="font-mono">{dealId}</span>
          {entityLabel && <> · {entityLabel}</>}
        </p>

        {/* Progress */}
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>{done} / {total} puntos revisados</span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5 mb-6">
          <div
            className={cn("h-1.5 rounded-full transition-all", pct === 100 ? "bg-emerald-500" : "bg-foreground")}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Checklist items grouped by hito */}
        {hitoOrder.map((hito) => (
          <div key={hito} className="mb-6">
            {hito && (
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                {hito}
              </div>
            )}
            <div className="bg-card rounded-2xl border border-border divide-y divide-border">
              {hitoGroups[hito].map((item) => {
                const checked = getCheck(entityId, concepto, item.check);
                return (
                  <label
                    key={item.check}
                    className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => setCheck(entityId, concepto, item.check, e.target.checked)}
                      className="mt-0.5 shrink-0 rounded border-border accent-foreground w-4 h-4"
                    />
                    <span className={cn("text-sm leading-snug", checked && "text-muted-foreground line-through")}>
                      {item.check}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        {/* Save button */}
        <div className="pt-2 pb-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-foreground text-background font-semibold py-3 rounded-xl inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar revisión
          </button>

          {saveMsg && (
            <p className={cn("text-sm text-center mt-3", saveMsg.ok ? "text-emerald-600" : "text-red-600")}>
              {saveMsg.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
