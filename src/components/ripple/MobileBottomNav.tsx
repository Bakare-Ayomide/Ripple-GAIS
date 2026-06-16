import { Home, Search, Plus, MessageSquare, User } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import CreatePostModal from "./CreatePostModal";
import { useState } from "react";
import { useUnreadMessagesCount } from "@/hooks/useNotifications";

const MobileBottomNav = () => {
  const location = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const { data: unread = 0 } = useUnreadMessagesCount();

  const navItems: Array<{ icon: any; path: string; label: string; isCreate?: boolean; badge?: number }> = [
    { icon: Home, path: "/", label: "Home" },
    { icon: Search, path: "/explore", label: "Explore" },
    { icon: Plus, path: "/create", label: "Create", isCreate: true },
    { icon: MessageSquare, path: "/messages", label: "Messages", badge: unread },
    { icon: User, path: "/profile", label: "Profile" },
  ];

  return (
    <>
      <nav className="lg:hidden fixed bottom-4 left-4 right-4 z-50">
        <div className="flex items-center justify-around h-16 rounded-[28px] bg-secondary/90 backdrop-blur-xl border border-border shadow-elevated">
          {navItems.map(({ icon: Icon, path, label, isCreate, badge }) => {
            const isActive = location.pathname === path;

            if (isCreate) {
              return (
                <button
                  key={path}
                  aria-label={label}
                  onClick={() => setShowCreate(true)}
                  className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center border border-border"
                >
                  <Plus className="w-6 h-6 text-foreground" strokeWidth={2} />
                </button>
              );
            }

            return (
              <Link
                key={path}
                to={path}
                aria-label={label}
                className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                  isActive ? "bg-foreground" : ""
                }`}
              >
                <Icon
                  className={`w-6 h-6 ${isActive ? "text-background" : "text-muted-foreground"}`}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  fill={isActive ? "currentColor" : "none"}
                />
                {badge && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
      <CreatePostModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
};

export default MobileBottomNav;
