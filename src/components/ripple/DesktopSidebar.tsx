import { Home, Compass, Search, Send, Zap, Plus, User, Settings, Waves, Shield } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useAdmin";
import { useUnreadNotificationsCount, useUnreadMessagesCount } from "@/hooks/useNotifications";
import CreatePostModal from "./CreatePostModal";
import { useState } from "react";

const DesktopSidebar = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const { data: unreadNotifs = 0 } = useUnreadNotificationsCount();
  const { data: unreadMsgs = 0 } = useUnreadMessagesCount();
  const [showCreate, setShowCreate] = useState(false);

  const navItems = [
    { icon: Home, path: "/", label: "Home", badge: 0 },
    { icon: Search, path: "/search", label: "Search", badge: 0 },
    { icon: Compass, path: "/explore", label: "Explore", badge: 0 },
    { icon: Send, path: "/messages", label: "Messages", badge: unreadMsgs },
    { icon: Zap, path: "/activity", label: "Notifications", badge: unreadNotifs },
    { icon: User, path: "/profile", label: "Profile", badge: 0 },
  ];

  return (
    <>
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[220px] xl:w-[280px] flex-col bg-card border-r border-border z-50 py-6 px-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 px-3 mb-10">
          <div className="w-10 h-10 rounded-2xl gradient-brand flex items-center justify-center shadow-glow">
            <Waves className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">Ripple</h1>
        </Link>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-1">
          {navItems.map(({ icon: Icon, path, label, badge }) => {
            const isActive = location.pathname === path;
            return (
              <Link key={path} to={path}
                className={`flex items-center gap-4 px-3 py-3 rounded-2xl transition-all group
                  ${isActive
                    ? "bg-secondary text-foreground font-bold"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
              >
                <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 1.5} />
                <span className="text-base font-display font-semibold">{label}</span>
                {badge > 0 ? (
                  <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
                    {badge > 99 ? "99+" : badge}
                  </span>
                ) : isActive ? (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                ) : null}
              </Link>
            );
          })}

          {/* Create button */}
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-4 px-3 py-3 my-2 rounded-2xl gradient-brand text-primary-foreground font-display font-bold shadow-glow transition-transform hover:scale-[1.02]"
          >
            <Plus className="w-6 h-6" strokeWidth={2.5} />
            <span className="text-base">Create</span>
          </button>

          {/* Admin link */}
          {isAdmin && (
            <Link to="/admin"
              className={`flex items-center gap-4 px-3 py-3 rounded-2xl transition-all group
                ${location.pathname === "/admin"
                  ? "bg-secondary text-foreground font-bold"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
            >
              <Shield className="w-6 h-6" strokeWidth={location.pathname === "/admin" ? 2.5 : 1.5} />
              <span className="text-base font-display font-semibold">Admin</span>
            </Link>
          )}
        </nav>

        {/* Bottom */}
        <button
          onClick={signOut}
          className="flex items-center gap-4 px-3 py-3 rounded-2xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <Settings className="w-6 h-6" strokeWidth={1.5} />
          <span className="text-base font-display font-semibold">Settings</span>
        </button>
      </aside>
      <CreatePostModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
};

export default DesktopSidebar;
