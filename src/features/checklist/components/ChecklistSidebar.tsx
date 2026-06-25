import { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HITO1_CONCEPTOS,
  HITO2_CONCEPTOS,
  PER_RACK,
  PER_GAB,
  PER_CAN,
  ELECTRICA_CONCEPTOS,
  MARCHA_CONCEPTOS,
  ZNE_CONCEPTO,
  LAMINA_CONCEPTO,
  makeSavedKey,
} from "../lib/types";
import type { useChecklist } from "../hooks/useChecklist";

type Props = {
  dealId: string;
  ctx: ReturnType<typeof useChecklist>;
};

// ---------------------------------------------------------------------------
// Nav button
// ---------------------------------------------------------------------------

function NavBtn({
  label,
  entityId,
  concepto,
  saved,
  selected,
  onSelect,
}: {
  label: string;
  entityId: string;
  concepto: string;
  saved: Set<string>;
  selected: [string, string] | null;
  onSelect: (eid: string, c: string) => void;
}) {
  const isSaved    = saved.has(makeSavedKey(entityId, concepto));
  const isSelected = selected?.[0] === entityId && selected?.[1] === concepto;
  return (
    <button
      onClick={() => onSelect(entityId, concepto)}
      className={cn(
        "w-full text-left text-xs px-3 py-2 rounded-lg flex items-center gap-2 transition-colors",
        isSelected
          ? "bg-foreground text-background"
          : "hover:bg-muted text-foreground",
      )}
    >
      <span className="shrink-0 w-3.5 text-center">
        {isSaved ? "✅" : "○"}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Collapsible section
// ---------------------------------------------------------------------------

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-1.5 px-1 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {title}
      </button>
      {open && <div className="space-y-0.5 pl-1">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main sidebar
// ---------------------------------------------------------------------------

export default function ChecklistSidebar({ dealId, ctx }: Props) {
  const {
    racks, gabs, cans,
    hasZne, hasLamina,
    selected, saved, byConcepto,
    addRack, addGab, addCan,
    toggleZne, toggleLamina,
    select,
  } = ctx;

  const [rackCfg, setRackCfg]   = useState("");
  const [rackErr, setRackErr]   = useState<string | null>(null);
  const [gabNombre, setGabNombre] = useState("");
  const [gabErr, setGabErr]     = useState<string | null>(null);
  const [addingRack, setAddingRack] = useState(false);
  const [addingGab, setAddingGab]   = useState(false);

  const navProps = { saved, selected, onSelect: select };

  const handleAddRack = async () => {
    setRackErr(null);
    try {
      await addRack(rackCfg.trim());
      setRackCfg("");
      setAddingRack(false);
    } catch (e: any) {
      setRackErr(e.message);
    }
  };

  const handleAddGab = async () => {
    setGabErr(null);
    try {
      await addGab(gabNombre.trim());
      setGabNombre("");
      setAddingGab(false);
    } catch (e: any) {
      setGabErr(e.message);
    }
  };

  const handleAddCan = async () => {
    await addCan();
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto py-4 px-3 space-y-1">

      {/* Hito 1 — Evaluación de Techo */}
      <Section title="Evaluación de Techo">
        {HITO1_CONCEPTOS.map((c) =>
          byConcepto[c] ? (
            <NavBtn key={c} label={c} entityId={dealId} concepto={c} {...navProps} />
          ) : null,
        )}
      </Section>

      <div className="border-t border-border my-1" />

      {/* Hito 2 — Preparación y Seguridad */}
      <Section title="Preparación y Seguridad">
        {HITO2_CONCEPTOS.map((c) =>
          byConcepto[c] ? (
            <NavBtn key={c} label={c} entityId={dealId} concepto={c} {...navProps} />
          ) : null,
        )}
      </Section>

      <div className="border-t border-border my-1" />

      {/* Racks */}
      <Section title="Racks">
        {/* Toggle lámina */}
        <label className="flex items-center gap-2 px-3 py-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={hasLamina}
            onChange={(e) => toggleLamina(e.target.checked)}
            className="rounded border-border"
          />
          <span className="text-xs text-muted-foreground">¿Techo de lámina?</span>
        </label>

        {racks.map((rack, i) => (
          <div key={rack.id} className="border border-border rounded-lg p-1.5 mb-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1.5 pb-1">
              Rack {i + 1} · {rack.config}
            </div>
            <div className="space-y-0.5">
              {PER_RACK.map((c) =>
                byConcepto[c] ? (
                  <NavBtn key={c} label={c} entityId={rack.id} concepto={c} {...navProps} />
                ) : null,
              )}
              {hasLamina && byConcepto[LAMINA_CONCEPTO] && (
                <NavBtn label="Anclajes para lámina" entityId={rack.id} concepto={LAMINA_CONCEPTO} {...navProps} />
              )}
            </div>
          </div>
        ))}

        {/* Agregar rack */}
        {addingRack ? (
          <div className="rounded-lg border border-border p-2 space-y-1.5">
            <input
              autoFocus
              type="text"
              placeholder="Config: 2x4"
              value={rackCfg}
              onChange={(e) => setRackCfg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddRack()}
              className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20"
            />
            {rackErr && <p className="text-[10px] text-red-600">{rackErr}</p>}
            <div className="flex gap-1.5">
              <button onClick={handleAddRack} className="flex-1 text-xs bg-foreground text-background py-1.5 rounded-lg font-semibold">
                Agregar
              </button>
              <button onClick={() => { setAddingRack(false); setRackErr(null); }} className="text-xs px-2 py-1.5 rounded-lg border border-border">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingRack(true)}
            className="w-full flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <Plus className="w-3 h-3" /> Agregar rack
          </button>
        )}
      </Section>

      <div className="border-t border-border my-1" />

      {/* Instalación Eléctrica */}
      <Section title="Instalación Eléctrica">
        {ELECTRICA_CONCEPTOS.filter((c) => c !== "Medidor / Acometida").map((c) =>
          byConcepto[c] ? (
            <NavBtn key={c} label={c} entityId={dealId} concepto={c} {...navProps} />
          ) : null,
        )}

        {/* Gabinetes */}
        {gabs.map((g) =>
          byConcepto["Gabinetes"] ? (
            <NavBtn key={g.id} label={g.nombre || g.id} entityId={g.id} concepto="Gabinetes" {...navProps} />
          ) : null,
        )}

        {addingGab ? (
          <div className="rounded-lg border border-border p-2 space-y-1.5">
            <input
              autoFocus
              type="text"
              placeholder="Nombre del gabinete"
              value={gabNombre}
              onChange={(e) => setGabNombre(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddGab()}
              className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20"
            />
            {gabErr && <p className="text-[10px] text-red-600">{gabErr}</p>}
            <div className="flex gap-1.5">
              <button onClick={handleAddGab} className="flex-1 text-xs bg-foreground text-background py-1.5 rounded-lg font-semibold">
                Agregar
              </button>
              <button onClick={() => { setAddingGab(false); setGabErr(null); }} className="text-xs px-2 py-1.5 rounded-lg border border-border">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingGab(true)}
            className="w-full flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <Plus className="w-3 h-3" /> Agregar gabinete
          </button>
        )}

        {/* Canalización por tramo */}
        {cans.map((can, i) =>
          PER_CAN.map((c) =>
            byConcepto[c] ? (
              <NavBtn key={`${can.id}-${c}`} label={`Tramo ${i + 1} · ${c}`} entityId={can.id} concepto={c} {...navProps} />
            ) : null,
          ),
        )}

        <button
          onClick={handleAddCan}
          className="w-full flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <Plus className="w-3 h-3" /> Agregar tramo
        </button>

        {byConcepto["Medidor / Acometida"] && (
          <NavBtn label="Medidor / Acometida" entityId={dealId} concepto="Medidor / Acometida" {...navProps} />
        )}
      </Section>

      <div className="border-t border-border my-1" />

      {/* Puesta en Marcha */}
      <Section title="Puesta en Marcha">
        {MARCHA_CONCEPTOS.map((c) =>
          byConcepto[c] ? (
            <NavBtn key={c} label={c} entityId={dealId} concepto={c} {...navProps} />
          ) : null,
        )}

        <label className="flex items-center gap-2 px-3 py-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={hasZne}
            onChange={(e) => toggleZne(e.target.checked)}
            className="rounded border-border"
          />
          <span className="text-xs text-muted-foreground">¿Incluye ZNE / Smart Meter?</span>
        </label>

        {hasZne && byConcepto[ZNE_CONCEPTO] && (
          <NavBtn label="ZNE / Smart Meter" entityId={dealId} concepto={ZNE_CONCEPTO} {...navProps} />
        )}
      </Section>
    </div>
  );
}
