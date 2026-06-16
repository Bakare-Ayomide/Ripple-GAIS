import { Outlet, Navigate } from "react-router-dom";
import DesktopSidebar from "./DesktopSidebar";
import MobileBottomNav from "./MobileBottomNav";
import MobileHeader from "./MobileHeader";
import { useAuth } from "@/contexts/AuthContext";

const AppLayout = () => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <DesktopSidebar />
      <MobileHeader />
      <main className="lg:ml-[220px] xl:ml-[280px] pb-0 lg:pb-0">
        <Outlet />
      </main>
      <MobileBottomNav />
    </div>
  );
};

export default AppLayout;
