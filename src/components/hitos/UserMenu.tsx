import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function UserMenu() {
  const { user, signOut } = useAuth();
  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-background/70 hidden sm:inline">{user.email}</span>
      <button
        onClick={signOut}
        className="text-[11px] text-background/70 hover:text-background inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-background/10 transition-colors"
        title="Cerrar sesión"
      >
        <LogOut className="w-3 h-3" />
        <span className="hidden sm:inline">Salir</span>
      </button>
    </div>
  );
}
