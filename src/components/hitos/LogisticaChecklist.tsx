import { useEffect, useMemo, useState } from "react";
import { Truck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const ITEMS = [
  { id: "log-monitor", label: "Monitor / inversor recibido en bodega" },
  { id: "log-paneles", label: "Paneles recibidos en bodega" },
  { id: "log-micro", label: "Microinversores recibidos en bodega (si aplica)" },
  { id: "log-estructura", label: "Estructura recibida en bodega" },
];

type Props = {
  onUncheckedCountChange?: (n: number) => void;
};

export default function LogisticaChecklist({ onUncheckedCountChange }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const checkedCount = useMemo(() => Object.values(checked).filter(Boolean).length, [checked]);
  const unchecked = ITEMS.length - checkedCount;

  useEffect(() => {
    onUncheckedCountChange?.(unchecked);
  }, [unchecked, onUncheckedCountChange]);

  const toggle = (id: string) => setChecked((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div className="bg-card rounded-2xl border border-border p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-foreground" />
          <h3 className="text-sm font-bold">Verificación de logística — antes de salir a campo</h3>
        </div>
        <div
          className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full",
            checkedCount === ITEMS.length
              ? "bg-emerald-100 text-emerald-700"
              : "bg-muted text-muted-foreground",
          )}
        >
          {checkedCount}/{ITEMS.length}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Live Ops confirma con el EPC antes de autorizar la salida a campo.
      </p>
      <ul className="space-y-1.5">
        {ITEMS.map((i) => (
          <li key={i.id}>
            <label className="flex items-start gap-2.5 cursor-pointer group">
              <Checkbox
                checked={!!checked[i.id]}
                onCheckedChange={() => toggle(i.id)}
                className="mt-0.5"
              />
              <span
                className={cn(
                  "text-sm leading-snug",
                  checked[i.id]
                    ? "text-muted-foreground line-through"
                    : "text-foreground",
                )}
              >
                {i.label}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
