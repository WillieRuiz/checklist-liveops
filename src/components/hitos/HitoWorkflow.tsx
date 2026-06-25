import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, AlertTriangle, RotateCcw, PartyPopper, Loader2, Search, X, Copy, Send, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { registrarNotificacionSlack } from "@/lib/instalaciones";
import { HITOS, type Blocker } from "@/lib/hitos";
import SpeechCard from "./SpeechCard";
import Pipeline from "./Pipeline";
import UserMenu from "./UserMenu";
import DealInfoCard from "./DealInfoCard";
import RequisitosEquipo from "./RequisitosEquipo";
import LogisticaChecklist from "./LogisticaChecklist";
import TestigoTorqueEvidencia from "./TestigoTorqueEvidencia";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { HubspotDeal } from "@/lib/hubspot";
import { cn } from "@/lib/utils";


type State = "idle" | "problem" | "done";

type Props = {
  dealId: string;
  hubspot: HubspotDeal | null;

  current: number;
  done: number[];
  onJump: (i: number) => void;
  onMarkDone: (i: number) => void;
  onAdvance: (i: number) => void;
  onReopen: (i: number) => void;
  onFinishAll: () => void;
  onSubmitNewDeal: (id: string) => Promise<string | null>;
  onEscalacion?: (hitoIndex: number, blocker: string) => Promise<void> | void;
};


export default function HitoWorkflow({
  dealId,
  hubspot,

  current,
  done,
  onJump,
  onMarkDone,
  onAdvance,
  onReopen,
  onFinishAll,
  onSubmitNewDeal,
  onEscalacion,
}: Props) {
  const [state, setState] = useState<State>(done.includes(current) ? "done" : "idle");
  const [openBlocker, setOpenBlocker] = useState<number | null>(null);
  const [openEsc, setOpenEsc] = useState<number | null>(null);

  const [editingDeal, setEditingDeal] = useState(false);
  const [draftDeal, setDraftDeal] = useState(dealId);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [reqUnchecked, setReqUnchecked] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [torqueUploaded, setTorqueUploaded] = useState(false);
  const [torqueWarnOpen, setTorqueWarnOpen] = useState(false);

  const submitDealSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = draftDeal.trim();
    if (!id || searching) return;
    setSearching(true);
    setSearchError(null);
    const err = await onSubmitNewDeal(id);
    setSearching(false);
    if (err) {
      setSearchError(err);
      return;
    }
    setEditingDeal(false);
  };


  const reset = () => {
    setOpenBlocker(null);
    setOpenEsc(null);
  };
  const jump = (i: number) => {
    if (i <= current || done.includes(i)) {
      onJump(i);
      setState(done.includes(i) ? "done" : "idle");
      reset();
    }
  };
  const performMarkDone = () => {
    onMarkDone(current);
    setState("done");
    reset();
  };
  const hasRequisitos = HITOS[current].code === "H0" || HITOS[current].code === "H2";
  const isH5 = HITOS[current].code === "H5";
  const handleMarkDone = () => {
    if (isH5 && !torqueUploaded) {
      setTorqueWarnOpen(true);
      return;
    }
    if (hasRequisitos && reqUnchecked > 0) {
      setConfirmOpen(true);
      return;
    }
    performMarkDone();
  };
  const nextH = () => {
    onAdvance(current + 1);
    setState("idle");
    reset();
  };
  const resetH = () => {
    onReopen(current);
    setState("idle");
    reset();
  };

  const allDone = done.length === HITOS.length;
  const h = HITOS[current];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-foreground text-background px-5 py-3 sticky top-0 z-20 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          {editingDeal ? (
            <form onSubmit={submitDealSearch} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  autoFocus
                  value={draftDeal}
                  onChange={(e) => {
                    setDraftDeal(e.target.value);
                    if (searchError) setSearchError(null);
                  }}
                  placeholder="Ingresa el Deal ID"
                  disabled={searching}
                  className="flex-1 min-w-0 max-w-xs bg-background/10 border border-background/20 rounded-lg px-3 py-1.5 text-sm font-mono text-background placeholder:text-background/50 focus:outline-none focus:ring-2 focus:ring-background/40"
                />
                <button
                  type="submit"
                  disabled={searching || !draftDeal.trim()}
                  className="bg-background text-foreground font-semibold text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50"
                >
                  {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  Buscar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingDeal(false);
                    setDraftDeal(dealId);
                    setSearchError(null);
                  }}
                  disabled={searching}
                  className="text-background/70 hover:text-background p-1.5"
                  aria-label="Cancelar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {searchError && (
                <div className="text-[11px] text-red-200 bg-red-900/40 px-2 py-1 rounded">
                  {searchError}
                </div>
              )}
            </form>
          ) : (
            <div className="flex items-center gap-3 min-w-0">
              <h1 className="text-sm font-medium truncate">
                Deal <span className="font-mono opacity-90">{dealId}</span>
              </h1>
              <button
                onClick={() => {
                  setDraftDeal(dealId);
                  setEditingDeal(true);
                }}
                className="text-xs underline opacity-70 hover:opacity-100 transition-opacity shrink-0"
              >
                Cambiar
              </button>
            </div>
          )}
        </div>
        <UserMenu />
      </header>


      <DealInfoCard hubspot={hubspot} />

      <Pipeline current={current} done={done} onJump={jump} />


      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 pb-20">
        {allDone ? (
          <div className="text-center py-16">
            <PartyPopper className="w-16 h-16 mx-auto text-niko-yellow mb-4" />
            <h2 className="text-2xl font-bold mb-2">Todos los hitos completados</h2>
            <p className="text-muted-foreground">
              El sistema fue instalado, activado y entregado correctamente.
              <br />
              Recuerda cerrar el ticket en SCOOP.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: h.phaseColor }} />
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {h.phase} · {h.code}
              </span>
            </div>
            <h1 className="text-2xl font-bold leading-tight mb-1.5">{h.title}</h1>
            <p className="text-sm text-muted-foreground mb-6">{h.sub}</p>

            {h.code === "H1" && <LogisticaChecklist />}

            {h.specials?.map((sp, si) => (
              <div key={si} className="mb-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-2">
                  Protocolo especial · {sp.title}
                </div>
                {sp.speeches.map((s, i) => (
                  <SpeechCard key={i} speech={s} variant="special" />
                ))}
              </div>
            ))}

            <div className="bg-card rounded-2xl border border-border p-5 mb-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Objetivo del hito
              </div>
              <div className="text-base font-medium leading-relaxed mb-3">{h.objetivo}</div>
              <div className="border-l-2 border-border pl-3 space-y-1.5">
                {h.criterios.map((c, i) => (
                  <div key={i} className="flex items-baseline gap-2 text-xs text-muted-foreground">
                    <Check className="w-3 h-3 text-emerald-600 shrink-0 translate-y-0.5" strokeWidth={3} />
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-4 -mt-1">
              <Link
                to={`/deal/${encodeURIComponent(dealId)}/checklist`}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
              >
                Abrir checklist de calidad
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>


            {h.code === "H0" && (
              <RequisitosEquipo
                variant="collapsible"
                title="Verificar antes de autorizar movilización"
                onUncheckedCountChange={setReqUnchecked}
              />
            )}
            {h.code === "H2" && (
              <RequisitosEquipo
                variant="inline"
                title="Requisitos del equipo (referencia rápida)"
                onUncheckedCountChange={setReqUnchecked}
              />
            )}
            {h.code === "H5" && (
              <TestigoTorqueEvidencia onChange={setTorqueUploaded} />
            )}




            {state === "idle" && (
              <div className="bg-card rounded-2xl border border-border p-5">
                <div className="text-sm font-semibold text-center mb-3">¿Lograste el objetivo?</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={handleMarkDone}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <Check className="w-4 h-4" /> Sí, objetivo logrado
                  </button>
                  <button
                    onClick={() => {
                      setState("problem");
                      reset();
                    }}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-4 rounded-xl inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4" /> Hay un problema
                  </button>
                </div>
              </div>
            )}

            {state === "problem" && (
              <ProblemSection
                dealId={dealId}
                hubspot={hubspot}
                hitoLabel={`${h.code} — ${h.title}`}
                hitoIndex={current}
                onEscalacion={onEscalacion}
                blockers={h.blockers}
                openBlocker={openBlocker}
                onOpen={(bi) => {
                  setOpenBlocker(bi);
                  setOpenEsc(null);
                }}
                openEsc={openEsc}
                onEscalate={(bi) => setOpenEsc(bi)}
                onResolved={handleMarkDone}
                onBack={() => {
                  setState("idle");
                  reset();
                }}
              />
            )}

            {state === "done" && (
              <div className="bg-card rounded-2xl border border-border p-6 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                  <Check className="w-7 h-7 text-emerald-600" strokeWidth={3} />
                </div>
                <div className="text-lg font-bold mb-1">{h.code} completado</div>
                <div className="text-sm text-muted-foreground mb-5">
                  {current === HITOS.length - 1 ? "Instalación finalizada" : "Avanza al siguiente hito"}
                </div>
                {current === HITOS.length - 1 ? (
                  <button
                    onClick={onFinishAll}
                    className="w-full bg-foreground text-background font-semibold py-3 rounded-xl mb-2 hover:opacity-90 transition-opacity"
                  >
                    Finalizar y cerrar en SCOOP
                  </button>
                ) : (
                  <button
                    onClick={nextH}
                    className="w-full bg-foreground text-background font-semibold py-3 rounded-xl mb-2 hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2"
                  >
                    Siguiente hito <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={resetH}
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3 h-3" /> Deshacer — volver a este hito
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hay requisitos sin verificar</AlertDialogTitle>
            <AlertDialogDescription>
              Hay {reqUnchecked} {reqUnchecked === 1 ? "requisito sin marcar" : "requisitos sin marcar"}. ¿Confirmas que el equipo cumple con todo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Revisar antes de continuar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                performMarkDone();
              }}
            >
              Sí, confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={torqueWarnOpen} onOpenChange={setTorqueWarnOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Evidencia obligatoria</AlertDialogTitle>
            <AlertDialogDescription>
              La evidencia del testigo de torque es obligatoria para cerrar este hito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setTorqueWarnOpen(false)}>
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProblemSection({
  dealId,
  hubspot,
  hitoLabel,
  hitoIndex,
  onEscalacion,
  blockers,
  openBlocker,
  onOpen,
  openEsc,
  onEscalate,
  onResolved,
  onBack,
}: {
  dealId: string;
  hubspot: HubspotDeal | null;
  hitoLabel: string;
  hitoIndex: number;
  onEscalacion?: (hitoIndex: number, blocker: string) => Promise<void> | void;
  blockers: Blocker[];
  openBlocker: number | null;
  onOpen: (i: number) => void;
  openEsc: number | null;
  onEscalate: (i: number) => void;
  onResolved: () => void;
  onBack: () => void;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold">¿Qué está bloqueando?</h3>
        <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground">
          ← Volver
        </button>
      </div>

      <div className="space-y-2 mb-4">
        {blockers.map((b, bi) => (
          <button
            key={bi}
            onClick={() => onOpen(bi)}
            className={cn(
              "w-full text-left p-3 rounded-xl border transition-colors flex items-center justify-between gap-3",
              openBlocker === bi
                ? "border-foreground bg-muted"
                : "border-border hover:bg-muted/50",
            )}
          >
            <div className="min-w-0">
              <div className="text-sm font-semibold">{b.label}</div>
              <div className="text-xs text-muted-foreground">{b.sub}</div>
            </div>
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shrink-0",
                b.kind === "stop"
                  ? "bg-red-100 text-red-700"
                  : "bg-amber-100 text-amber-700",
              )}
            >
              {b.kind === "stop" ? "NO rotundo" : "Recuperable"}
            </span>
          </button>
        ))}
      </div>

      {openBlocker !== null && (
        <Workaround
          dealId={dealId}
          hubspot={hubspot}
          hitoLabel={hitoLabel}
          hitoIndex={hitoIndex}
          blockerIndex={openBlocker}
          onEscalacion={onEscalacion}
          blocker={blockers[openBlocker]}
          escOpen={openEsc === openBlocker}
          onEscalate={() => onEscalate(openBlocker)}
          onResolved={onResolved}
          onRetry={() => onOpen(openBlocker)}
        />
      )}
    </div>
  );
}

function Workaround({
  dealId,
  hubspot,
  hitoLabel,
  hitoIndex,
  blockerIndex,
  onEscalacion,
  blocker,
  escOpen,
  onEscalate,
  onResolved,
  onRetry,
}: {
  dealId: string;
  hubspot: HubspotDeal | null;
  hitoLabel: string;
  hitoIndex: number;
  blockerIndex: number;
  onEscalacion?: (hitoIndex: number, blocker: string) => Promise<void> | void;
  blocker: Blocker;
  escOpen: boolean;
  onEscalate: () => void;
  onResolved: () => void;
  onRetry: () => void;
}) {
  const chainHasPlaneacion = !!blocker.chain?.some((s) =>
    /planea|planning/i.test(s),
  );
  const [notif, setNotif] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [fallbackText, setFallbackText] = useState<string>("");
  const [notifError, setNotifError] = useState<string>("");
  const firedKey = useRef<string | null>(null);

  const sendSlack = async (kind: "warning" | "stop") => {
    setNotif("sending");
    setNotifError("");
    try {
      const { data, error } = await supabase.functions.invoke("notify-slack", {
        body: {
          dealId,
          clienteNombre: hubspot?.dealname ?? null,
          hito: hitoLabel,
          blocker: blocker.label,
          direccion: hubspot?.project_address ?? null,
          rpu: hubspot?.numero_de_servicio_cfe ?? null,
          kind,
        },
      });
      if (error) throw error;
      const payload = data as { ok: boolean; text: string; error?: string };
      setFallbackText(payload?.text ?? "");
      if (payload?.ok) {
        setNotif("sent");
        toast.success("✓ Notificación enviada al canal de instalaciones");
      } else {
        setNotifError(payload?.error ?? "Respuesta no OK");
        setNotif("failed");
        toast.error("No se pudo notificar a Slack — copia el mensaje manualmente");
      }
    } catch (e: any) {
      setNotifError(e?.message ?? "Error de red");
      setNotif("failed");
      toast.error("No se pudo notificar a Slack — copia el mensaje manualmente");
    }
    try {
      await registrarNotificacionSlack(dealId, {
        hito: hitoIndex,
        blocker: blocker.label,
        blocker_kind: kind,
      });
    } catch {
      /* no bloquear UI */
    }
  };

  useEffect(() => {
    if (!escOpen || !blocker.escalate || !chainHasPlaneacion) return;
    const key = `${dealId}:${hitoIndex}:${blockerIndex}`;
    if (firedKey.current === key) return;
    firedKey.current = key;
    (async () => {
      await sendSlack("stop");
      try {
        await onEscalacion?.(hitoIndex, blocker.label);
      } catch {
        /* error toast handled in hook */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escOpen, blocker.escalate, chainHasPlaneacion, dealId, hitoIndex, blockerIndex]);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(fallbackText);
      toast.success("Copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  };
  return (
    <div className="border-t border-border pt-4">
      {blocker.speeches.map((s, i) => (
        <SpeechCard key={i} speech={s} variant={blocker.kind} />
      ))}
      {blocker.chain && (
        <div className="flex items-center gap-1.5 flex-wrap my-3">
          {blocker.chain.map((step, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="text-[10px] bg-muted border border-border px-2 py-0.5 rounded-full text-muted-foreground font-medium">
                {step}
              </span>
              {i < blocker.chain!.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
            </span>
          ))}
        </div>
      )}

      {/* Notificar en Slack — disponible para TODOS los blockers */}
      <div className="rounded-xl border border-border bg-muted/40 p-3 mt-2 mb-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-muted-foreground">
            {blocker.kind === "stop"
              ? "Notifica el paro de obra al canal de instalaciones."
              : "Avisa al canal sobre esta fricción (sin escalar aún)."}
          </div>
          <button
            type="button"
            onClick={() => sendSlack(blocker.kind === "stop" ? "stop" : "warning")}
            disabled={notif === "sending"}
            className="inline-flex items-center gap-1.5 bg-foreground text-background font-semibold text-xs px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {notif === "sending" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Notificar en Slack
          </button>
        </div>
        {notif === "sent" && (
          <div className="mt-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            ✓ Notificación enviada al canal de instalaciones
          </div>
        )}
        {notif === "failed" && (
          <div className="mt-2 text-xs bg-amber-50 border border-amber-300 rounded-lg p-3">
            <div className="font-semibold text-amber-900 mb-1">
              No se pudo notificar a Slack — copia el mensaje manualmente
            </div>
            {notifError && (
              <div className="text-[11px] text-amber-900/70 mb-2 font-mono break-words">
                {notifError}
              </div>
            )}
            <pre className="whitespace-pre-wrap break-words bg-white border border-amber-200 rounded p-2 text-[11px] text-foreground font-mono mb-2">
{fallbackText}
            </pre>
            <button
              type="button"
              onClick={copyText}
              className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg"
            >
              <Copy className="w-3 h-3" /> Copiar mensaje
            </button>
          </div>
        )}
      </div>

      <div
        className={cn(
          "rounded-xl p-4 mt-2",
          blocker.kind === "stop" ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200",
        )}
      >
        <div className="text-sm font-semibold mb-3">¿Se resolvió? ¿Podemos lograr el objetivo?</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={onResolved}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg inline-flex items-center justify-center gap-2 text-sm"
          >
            <Check className="w-4 h-4" /> Sí, objetivo logrado
          </button>
          <button
            onClick={blocker.escalate ? onEscalate : onRetry}
            className="bg-foreground text-background font-semibold py-2.5 px-4 rounded-lg text-sm hover:opacity-90"
          >
            {blocker.escalate ? "Escalar a Planning" : "Reintentar"}
          </button>
        </div>
      </div>
      {blocker.escalate && escOpen && (
        <div className="mt-3 bg-red-50 border-2 border-red-200 rounded-xl p-4">
          <h4 className="font-bold text-red-900 mb-2 text-sm">Escalación obligatoria</h4>
          <p className="text-sm text-red-900/80 mb-3">{blocker.escalateText}</p>
          <div className="flex items-center gap-1.5 flex-wrap mb-3">
            {blocker.chain?.map((step, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="text-[10px] bg-white border border-red-200 px-2 py-0.5 rounded-full text-red-900 font-medium">
                  {step}
                </span>
                {i < (blocker.chain!.length - 1) && <ArrowRight className="w-3 h-3 text-red-600" />}
              </span>
            ))}
          </div>
          <button
            onClick={onResolved}
            className="w-full bg-foreground text-background font-semibold py-2.5 rounded-lg text-sm hover:opacity-90"
          >
            Planning resolvió — objetivo logrado
          </button>
        </div>
      )}
    </div>
  );
}
