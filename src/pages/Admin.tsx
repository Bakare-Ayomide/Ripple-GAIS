import { useIsAdmin, useAllUsers, useAllPosts } from "@/hooks/useAdmin";
import { Link, Navigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { 
  Users, 
  FileText, 
  Shield, 
  Trash2, 
  Loader2, 
  BadgeCheck, 
  Search, 
  ArrowLeft, 
  Server, 
  UserCog, 
  Database,
  Cpu,
  LayoutDashboard,
  CheckCircle,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import VerifiedBadge from "@/components/ripple/VerifiedBadge";
import { useAuth } from "@/contexts/AuthContext";

const Admin = () => {
  const { user } = useAuth();
  const { data: isAdmin, isLoading: checkingAdmin } = useIsAdmin();
  const { data: users, refetch: refetchUsers } = useAllUsers();
  const { data: posts, refetch: refetchPosts } = useAllPosts();
  const [tab, setTab] = useState<"overview" | "users" | "posts">("overview");
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  // Load custom health and MySQL connection state
  const { data: dbStatus, isLoading: loadingStatus, refetch: refetchStatus } = useQuery({
    queryKey: ["admin-db-status"],
    queryFn: async () => {
      const response = await fetch("/api/admin/db-status");
      if (!response.ok) throw new Error("Could not fetch status");
      return response.json();
    }
  });

  // Query user roles to manage Admin list
  const { data: userRoles, refetch: refetchRoles } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data || [];
    }
  });

  const toggleVerified = async (u: any) => {
    const next = !u.is_verified;
    const { error } = await supabase
      .from("profiles")
      .update({ is_verified: next })
      .eq("id", u.id);
    if (error) {
      toast.error("Failed to update verification");
      return;
    }
    toast.success(next ? `@${u.username} verified` : `@${u.username} unverified`);
    qc.invalidateQueries({ queryKey: ["admin-all-users"] });
    qc.invalidateQueries({ queryKey: ["verified-users"] });
    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["profile-by-username"] });
    refetchUsers();
  };

  const deletePost = async (postId: string) => {
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) {
      toast.error("Failed to delete post");
    } else {
      toast.success("Post deleted successfully");
      qc.invalidateQueries({ queryKey: ["admin-all-posts"] });
      qc.invalidateQueries({ queryKey: ["posts"] });
      refetchPosts();
    }
  };

  const toggleAdminRole = async (targetUserId: string, isCurrentlyAdmin: boolean) => {
    // If we're demoting ourselves, verify first
    if (targetUserId === user?.id && isCurrentlyAdmin) {
      if (!window.confirm("Are you sure you want to demote yourself from Admin? You will lose access to this panel.")) {
        return;
      }
    }

    if (isCurrentlyAdmin) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", targetUserId);
      if (error) {
        toast.error("Failed to revoke Admin role: " + error.message);
      } else {
        toast.success("Admin role revoked successfully.");
        qc.invalidateQueries({ queryKey: ["is-admin"] });
        refetchRoles();
      }
    } else {
      const { error } = await supabase
        .from("user_roles")
        .insert({
          id: Math.random().toString(36).substring(2),
          user_id: targetUserId,
          role: "admin"
        });
      if (error) {
        toast.error("Failed to grant Admin role: " + error.message);
      } else {
        toast.success("Admin role granted successfully.");
        qc.invalidateQueries({ queryKey: ["is-admin"] });
        refetchRoles();
      }
    }
  };

  const verifiedCount = useMemo(
    () => (users || []).filter((u: any) => u.is_verified).length,
    [users]
  );

  const adminCount = useMemo(
    () => (userRoles || []).filter((r: any) => r.role === "admin").length,
    [userRoles]
  );

  const filteredUsers = useMemo(() => {
    const base = users || [];
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (u: any) =>
        u.username?.toLowerCase().includes(q) ||
        u.display_name?.toLowerCase().includes(q)
    );
  }, [users, search]);

  if (checkingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="max-w-[1200px] mx-auto px-4 pt-4 lg:pt-6 pb-20 lg:pb-8 font-sans">
      
      {/* Return to App Button */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 font-display font-semibold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Ripple feed
      </Link>

      {/* Header Panel */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-glow">
          <Shield className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display font-extrabold text-2xl text-foreground">Control Center</h1>
          <p className="text-sm text-muted-foreground">Internal administration, role management, and content control</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Admin Inner Navigation Sidebar */}
        <div className="lg:col-span-3 space-y-2">
          <p className="text-xs font-mono font-bold tracking-wider text-muted-foreground uppercase px-3 mb-2">
            Section Navigation
          </p>
          <button
            onClick={() => setTab("overview")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-display font-bold text-sm transition-all text-left ${
              tab === "overview"
                ? "bg-primary text-primary-foreground shadow-glow"
                : "bg-card border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">Overview & Systems</span>
          </button>
          
          <button
            onClick={() => setTab("users")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-display font-bold text-sm transition-all text-left ${
              tab === "users"
                ? "bg-primary text-primary-foreground shadow-glow"
                : "bg-card border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Users className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">Users & Roles</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/30 text-foreground font-mono">
              {users?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setTab("posts")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-display font-bold text-sm transition-all text-left ${
              tab === "posts"
                ? "bg-primary text-primary-foreground shadow-glow"
                : "bg-card border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <FileText className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">Content Moderation</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/30 text-foreground font-mono">
              {posts?.length || 0}
            </span>
          </button>
        </div>

        {/* Content Pane */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* TAB 1: OVERVIEW */}
          {tab === "overview" && (
            <div className="space-y-6">
              {/* Highlight statistics cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-muted-foreground font-mono">ALL USERS</span>
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <p className="font-display font-extrabold text-3xl text-foreground">{users?.length || 0}</p>
                </div>
                
                <div className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-muted-foreground font-mono">VERIFIED</span>
                    <BadgeCheck className="w-4 h-4 text-[#1d9bf0]" />
                  </div>
                  <p className="font-display font-extrabold text-3xl text-foreground">{verifiedCount}</p>
                </div>

                <div className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-muted-foreground font-mono">POSTS</span>
                    <FileText className="w-4 h-4 text-accent" />
                  </div>
                  <p className="font-display font-extrabold text-3xl text-foreground">{posts?.length || 0}</p>
                </div>

                <div className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-muted-foreground font-mono">ADMINS</span>
                    <UserCog className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="font-display font-extrabold text-3xl text-foreground">{adminCount || 1}</p>
                </div>
              </div>

              {/* Database and Infrastructure Diagnostics */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="font-display font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  Database Configuration
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex justify-between py-1.5 border-b border-border/60">
                      <span className="text-muted-foreground">Target Host:</span>
                      <span className="text-foreground font-bold">{dbStatus?.host || "131.153.147.178"}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/60">
                      <span className="text-muted-foreground">Target Port:</span>
                      <span className="text-foreground">3306</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/60">
                      <span className="text-muted-foreground">Target Database Name:</span>
                      <span className="text-foreground">{dbStatus?.database || "zerolord_ripple"}</span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center items-start border-l lg:border-l border-border pl-6 space-y-2">
                    <p className="text-sm font-semibold text-foreground">Current Operating Sync State:</p>
                    {dbStatus?.useLocalFallback ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20 text-xs font-bold">
                        <Cpu className="w-4 h-4" />
                        Local Fallback Active
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-bold">
                        <CheckCircle className="w-4 h-4 animate-pulse" />
                        Live MySQL Connected
                      </div>
                    )}
                    <span className="text-[11px] text-muted-foreground leading-normal mt-1">
                      If the remote MySQL server is unreachable, Ripple automatically falls back to secure Local JSON Persistence.
                    </span>
                  </div>
                </div>
              </div>

              {/* Logged in Admin Session Detail */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-mono font-bold text-muted-foreground mb-3 uppercase tracking-wider">
                  Active Admin Session
                </h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center font-display font-extrabold text-foreground border border-border">
                    A
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{user?.email || "No email"}</p>
                    <p className="text-xs text-muted-foreground font-mono">User UUID: {user?.id}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER DIRECTORY & ROLES */}
          {tab === "users" && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search user profile handles by username or name..."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-sans"
                />
              </div>

              <div className="space-y-3">
                {filteredUsers.map((u: any) => {
                  const roleObj = userRoles?.find((r: any) => r.user_id === u.user_id);
                  const isUserAdmin = roleObj?.role === "admin";

                  return (
                    <div key={u.id} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-card rounded-2xl px-5 py-4 border border-border hover:border-border/80 transition-all">
                      <img src={u.avatar_url || ""} className="w-12 h-12 rounded-2xl bg-secondary object-cover flex-shrink-0" />
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-display font-extrabold text-foreground truncate flex items-center gap-1.5">
                          {u.username || "No username"}
                          <VerifiedBadge verified={u.is_verified} size={15} />
                          {isUserAdmin && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 text-[9px] font-mono font-bold tracking-tight">
                              ADMIN
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {u.display_name} · Joined {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                        </p>
                        <p className="text-xs font-mono text-muted-foreground truncate mt-0.5">
                          ID: {u.user_id}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 mt-2 sm:mt-0">
                        {/* Grant or Revoke Admin Role */}
                        <button
                          onClick={() => toggleAdminRole(u.user_id, isUserAdmin)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-display font-semibold transition-colors ${
                            isUserAdmin
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20"
                              : "bg-secondary text-foreground hover:bg-border border border-transparent"
                          }`}
                        >
                          <UserCog className="w-4 h-4" />
                          {isUserAdmin ? "Revoke Admin" : "Make Admin"}
                        </button>

                        {/* Toggle Verification status */}
                        <button
                          onClick={() => toggleVerified(u)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-display font-semibold transition-colors ${
                            u.is_verified
                              ? "bg-[#1d9bf0] text-white hover:bg-[#1d9bf0]/90"
                              : "bg-secondary text-foreground hover:bg-border border border-transparent"
                          }`}
                        >
                          <BadgeCheck className="w-4 h-4" />
                          {u.is_verified ? "Verified" : "Verify"}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <div className="text-center bg-card border border-border rounded-2xl py-12">
                    <p className="text-sm text-muted-foreground">No users match your query filter.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CONTENT MODERATION */}
          {tab === "posts" && (
            <div className="space-y-3">
              {posts?.map((p: any) => (
                <div key={p.id} className="flex items-start gap-4 bg-card rounded-2xl px-5 py-4 border border-border">
                  {p.image_url ? (
                    <img src={p.image_url} className="w-16 h-16 rounded-2xl bg-secondary object-cover flex-shrink-0 border border-border" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-secondary border border-border flex items-center justify-center flex-shrink-0 text-muted-foreground font-mono text-xs">
                      Text
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-display font-extrabold text-foreground truncate">{p.profiles?.username || "user"}</p>
                      <VerifiedBadge verified={p.profiles?.is_verified} size={14} />
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 mb-2">"{p.caption || "No caption content"}"</p>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                      <span>{p.likes_count} likes</span>
                      <span>·</span>
                      <span>{p.comments_count} comments</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => deletePost(p.id)}
                    className="p-2.5 rounded-xl hover:bg-destructive/10 text-destructive border border-transparent hover:border-destructive/20 transition-all flex-shrink-0"
                    title="Delete Post permanently"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}

              {!posts?.length && (
                <div className="text-center bg-card border border-border rounded-2xl py-12">
                  <p className="text-sm text-muted-foreground">No posts have been made on the platform yet.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Admin;
