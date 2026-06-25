import { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const handleGoogle = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      toast.error("No se pudo iniciar sesión con Google");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">
            Live Ops
          </div>
          <h1 className="text-3xl font-bold">Workflow de Hitos</h1>
          <p className="text-sm text-muted-foreground mt-2">NIKO</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6">
          <button
            onClick={handleGoogle}
            disabled={busy}
            className="w-full bg-foreground text-background font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden>
              <path fill="currentColor" d="M21.6 12.227c0-.71-.057-1.39-.164-2.043H12v3.866h5.382a4.6 4.6 0 0 1-1.994 3.018v2.51h3.227c1.888-1.74 2.985-4.302 2.985-7.351Z"/>
              <path fill="currentColor" d="M12 22c2.7 0 4.964-.895 6.615-2.422l-3.227-2.51c-.895.6-2.04.955-3.388.955-2.604 0-4.81-1.76-5.598-4.123H3.064v2.59A10 10 0 0 0 12 22Z"/>
              <path fill="currentColor" d="M6.402 13.9a6 6 0 0 1 0-3.8V7.51H3.064a10 10 0 0 0 0 8.98l3.338-2.59Z"/>
              <path fill="currentColor" d="M12 5.977c1.47 0 2.786.505 3.823 1.498l2.866-2.866C16.96 3.025 14.696 2 12 2A10 10 0 0 0 3.064 7.51l3.338 2.59C7.19 7.738 9.395 5.977 12 5.977Z"/>
            </svg>
            {busy ? "Conectando…" : "Entrar con Google"}
          </button>
        </div>
      </div>
    </div>
  );
}
