import { Waves, Settings } from "lucide-react";
import { Link } from "react-router-dom";

const MobileHeader = () => (
  <header className="lg:hidden sticky top-0 glass border-b border-border z-40">
    <div className="flex items-center justify-between px-4 h-14">
      <Link to="/" className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shadow-glow">
          <Waves className="w-5 h-5 text-primary-foreground" />
        </div>
      </Link>
      <h1 className="font-display text-xl font-extrabold tracking-tight text-foreground">Feeds</h1>
      <button className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
        <Settings className="w-5 h-5 text-foreground" strokeWidth={1.5} />
      </button>
    </div>
  </header>
);

export default MobileHeader;
