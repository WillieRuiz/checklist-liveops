import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { WHO, type Speech, type BlockerKind } from "@/lib/hitos";
import { cn } from "@/lib/utils";

const TONE_BADGE: Record<string, string> = {
  epc: "bg-foreground text-background",
  lo_cl: "bg-emerald-600 text-white",
  lo_epc: "bg-blue-600 text-white",
};

const KIND_BORDER: Record<string, string> = {
  warn: "border-l-4 border-l-amber-500",
  stop: "border-l-4 border-l-red-600",
  special: "border-l-4 border-l-blue-500",
  default: "border-l-4 border-l-border",
};

export default function SpeechCard({
  speech,
  variant = "default",
}: {
  speech: Speech;
  variant?: BlockerKind | "special" | "default";
}) {
  const [copied, setCopied] = useState(false);
  const w = WHO[speech.who];

  const copy = () => {
    navigator.clipboard.writeText(speech.text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className={cn("bg-card rounded-xl border border-border p-4 mb-2.5", KIND_BORDER[variant])}>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded", TONE_BADGE[w.tone])}>
          {w.label}
        </span>
        <span className="text-muted-foreground text-xs">{w.arrow}</span>
        <span className="text-xs text-muted-foreground font-medium">{w.target}</span>
      </div>
      <div className="text-sm font-semibold mb-2">{speech.title}</div>
      <div className="bg-muted/50 rounded-lg p-3 relative">
        <div className="text-sm leading-relaxed whitespace-pre-line text-foreground/90 pr-20">
          {speech.text}
        </div>
        <button
          onClick={copy}
          className={cn(
            "absolute top-2 right-2 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md border transition-colors",
            copied
              ? "bg-emerald-600 text-white border-emerald-600"
              : "bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground",
          )}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      {speech.note && (
        <div className="mt-2 text-[11px] text-muted-foreground bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
          {speech.note}
        </div>
      )}
    </div>
  );
}
