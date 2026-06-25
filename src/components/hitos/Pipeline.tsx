import { Check } from "lucide-react";
import { HITOS } from "@/lib/hitos";
import { cn } from "@/lib/utils";

type Props = {
  current: number;
  done: number[];
  onJump: (i: number) => void;
};

export default function Pipeline({ current, done, onJump }: Props) {
  return (
    <div className="bg-card border-b border-border overflow-x-auto">
      <div className="flex items-center min-w-max px-5 py-4">
        {HITOS.map((h, i) => {
          const isDone = done.includes(i);
          const isActive = i === current;
          const isClickable = i <= current || isDone;
          return (
            <div key={h.id} className="flex items-center">
              <button
                type="button"
                onClick={() => isClickable && onJump(i)}
                disabled={!isClickable}
                className={cn(
                  "flex flex-col items-center group",
                  isClickable ? "cursor-pointer" : "cursor-not-allowed",
                )}
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all",
                    isDone && "bg-emerald-600 border-emerald-600 text-white",
                    isActive && "bg-foreground border-foreground text-background ring-4 ring-foreground/15",
                    !isDone && !isActive && "bg-card border-border text-muted-foreground group-hover:border-foreground/40",
                  )}
                >
                  {isDone ? <Check className="w-4 h-4" strokeWidth={3} /> : h.code}
                </div>
                <div
                  className={cn(
                    "text-[9px] mt-1 max-w-[60px] leading-tight text-center",
                    isDone ? "text-emerald-700 font-semibold" : isActive ? "text-foreground font-semibold" : "text-muted-foreground",
                  )}
                >
                  {h.label}
                </div>
              </button>
              {i < HITOS.length - 1 && (
                <div
                  className={cn(
                    "w-6 h-0.5 mb-5 mx-0.5",
                    isDone ? "bg-emerald-600" : "bg-border",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
