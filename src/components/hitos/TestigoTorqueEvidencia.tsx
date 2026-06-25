import { useEffect, useRef, useState } from "react";
import { Camera, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onChange?: (uploaded: boolean) => void;
};

export default function TestigoTorqueEvidencia({ onChange }: Props) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onChange?.(!!fileName);
  }, [fileName, onChange]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFile = (file: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (!file) {
      setFileName(null);
      setPreviewUrl(null);
      return;
    }
    setFileName(file.name);
    setPreviewUrl(URL.createObjectURL(file));
  };

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 mb-4",
        fileName
          ? "bg-emerald-50 border-emerald-200"
          : "bg-amber-50 border-amber-200",
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Camera className="w-4 h-4" />
        <h3 className="text-sm font-bold">Evidencia obligatoria — testigo de torque</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Sube una foto del testigo de torque. Es obligatoria para cerrar este hito.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      {!fileName ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full bg-foreground text-background font-semibold py-2.5 px-4 rounded-xl inline-flex items-center justify-center gap-2 text-sm hover:opacity-90"
        >
          <Camera className="w-4 h-4" /> Subir foto del testigo de torque
        </button>
      ) : (
        <div className="flex items-center gap-3">
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Testigo de torque"
              className="w-16 h-16 object-cover rounded-lg border border-emerald-300"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold mb-0.5">
              <Check className="w-3.5 h-3.5" strokeWidth={3} /> Evidencia cargada
            </div>
            <div className="text-xs text-muted-foreground truncate">{fileName}</div>
          </div>
          <button
            type="button"
            onClick={() => handleFile(null)}
            className="text-muted-foreground hover:text-foreground p-1.5"
            aria-label="Quitar foto"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
