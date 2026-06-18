import { Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const MobileHeader = () => {
  const { signOut } = useAuth();

  return (
    <div className="lg:hidden fixed top-4 right-4 z-50">
      <button
        onClick={signOut}
        className="btn-liquid-glass-base btn-liquid-glass-secondary w-11 h-11 rounded-full flex items-center justify-center shadow-glow"
        aria-label="Settings"
      >
        <Settings className="w-5 h-5 text-foreground" strokeWidth={1.5} />
      </button>
    </div>
  );
};

export default MobileHeader;
