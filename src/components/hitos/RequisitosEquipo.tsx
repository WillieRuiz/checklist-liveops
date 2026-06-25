import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type Item = { id: string; label: string; hint?: string };
type Block = { id: string; title: string; items: Item[] };

const BLOCKS: Block[] = [
  {
    id: "b2",
    title: "Herramientas de medición",
    items: [
      { id: "b2-multi", label: "Multímetro calibrado mínimo 1000V CAT III" },
      { id: "b2-pinza", label: "Pinza amperimétrica mínimo 600A" },
      { id: "b2-termo", label: "Cámara termográfica (recomendada)" },
      { id: "b2-iv", label: "Kit medidor de curvas I-V" },
    ],
  },
  {
    id: "b3",
    title: "EPP obligatorio",
    items: [
      { id: "b3-guantes", label: "Guantes de hule dieléctricos certificados" },
      { id: "b3-casco", label: "Casco con barbiquejo" },
      { id: "b3-botas", label: "Botas dieléctricas con casquillo" },
      { id: "b3-chaleco", label: "Chaleco de alta visibilidad" },
      { id: "b3-arnes", label: "Arnés de 3 o 5 puntos" },
      { id: "b3-careta", label: "Careta y traje dieléctrico (si voltaje >1000V CD)" },
      { id: "b3-pasos", label: "Pasos de gato / tablones (techos de lámina)" },
    ],
  },
  {
    id: "b4",
    title: "Herramientas y consumibles",
    items: [
      { id: "b4-torq", label: "Torquímetro" },
      { id: "b4-sierra", label: "Sierra ingletadora" },
      { id: "b4-mc4", label: "Ponchadora MC4" },
      { id: "b4-taladro", label: "Taladro rotomartillo" },
      { id: "b4-pc", label: "Equipo de cómputo con LAN y WiFi" },
      { id: "b4-sella", label: "Sellador de poliuretano (Sikaflex-1A, 3M 540 o Duretán)" },
      { id: "b4-flash", label: "Flashing tape" },
      { id: "b4-spray", label: "Spray galvanizado en frío" },
      { id: "b4-cintas", label: "Cintas de aislamiento (roja, negra, gris, blanca, verde)" },
      { id: "b4-conduit", label: "Conduit (PVC exterior / metálico interior)" },
      { id: "b4-cinchos", label: "Cinchos negros con protección UV" },
      { id: "b4-testigo", label: "Testigo de torque" },
    ],
  },
];

const TOTAL = BLOCKS.reduce((n, b) => n + b.items.length, 0);

type Props = {
  variant: "collapsible" | "inline";
  title: string;
  onUncheckedCountChange?: (n: number) => void;
};

export default function RequisitosEquipo({ variant, title, onUncheckedCountChange }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(false);

  const checkedCount = useMemo(() => Object.values(checked).filter(Boolean).length, [checked]);
  const unchecked = TOTAL - checkedCount;

  useEffect(() => {
    onUncheckedCountChange?.(unchecked);
  }, [unchecked, onUncheckedCountChange]);

  const toggle = (id: string) => setChecked((p) => ({ ...p, [id]: !p[id] }));

  const Body = (
    <div className="space-y-4">
      {BLOCKS.map((b) => {
        const bChecked = b.items.filter((i) => checked[i.id]).length;
        return (
          <div key={b.id}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {b.title}
              </div>
              <div
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full",
                  bChecked === b.items.length
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {bChecked}/{b.items.length}
              </div>
            </div>
            <ul className="space-y-1.5">
              {b.items.map((i) => (
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
                          : "text-foreground group-hover:text-foreground",
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
      })}
    </div>
  );

  if (variant === "inline") {
    return (
      <div className="bg-card rounded-2xl border border-border p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-foreground" />
            <h3 className="text-sm font-bold">{title}</h3>
          </div>
          <div className="text-[11px] font-semibold text-muted-foreground">
            {checkedCount}/{TOTAL} verificados
          </div>
        </div>
        {Body}
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-4">
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <CollapsibleTrigger className="w-full p-5 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span className="text-sm font-bold text-left">{title}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full",
                checkedCount === TOTAL
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {checkedCount}/{TOTAL}
            </span>
            <ChevronDown
              className={cn("w-4 h-4 transition-transform", open && "rotate-180")}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-5 pb-5 pt-0 border-t border-border">{Body}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
