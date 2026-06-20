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
  Clock,
  UserPlus,
  Edit,
  X,
  UserCheck,
  Ban,
  AlertTriangle,
  Plus,
  FilePlus,
  PenTool
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import VerifiedBadge from "@/components/ripple/VerifiedBadge";
import { useAuth } from "@/contexts/AuthContext";

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
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

  // --- STATE FOR USER MODES & CRUD ---
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({ email: "", username: "", display_name: "", password: "" });

  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editUserForm, setEditUserForm] = useState({ user_id: "", username: "", display_name: "", bio: "", is_verified: false, is_onboarding_core: false });

  // --- STATE FOR POST MODES & CRUD ---
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [createPostForm, setCreatePostForm] = useState({ user_id: "", caption: "", image_url: "", media_type: "image" });

  const [editPostOpen, setEditPostOpen] = useState(false);
  const [editPostForm, setEditPostForm] = useState({ id: "", caption: "", image_url: "", media_type: "image" });

  const toggleVerified = async (u: any) => {
    const next = !u.is_verified;
    try {
      const res = await fetch("/api/admin/users/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: u.user_id, is_verified: next })
      });
      if (!res.ok) throw new Error("Failed to change verification");
      toast.success(next ? `@${u.username} verified` : `@${u.username} unverified`);
      refetchUsers();
      qc.invalidateQueries({ queryKey: ["admin-all-users"] });
      qc.invalidateQueries({ queryKey: ["verified-users"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update verification");
    }
  };

  const toggleOnboardingCore = async (u: any) => {
    const next = !u.is_onboarding_core;
    try {
      const res = await fetch("/api/admin/users/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: u.user_id, is_onboarding_core: next })
      });
      if (!res.ok) throw new Error("Failed to change core onboarding status");
      toast.success(next ? `@${u.username} is now a core onboarding creator` : `@${u.username} removed from core onboarding`);
      refetchUsers();
      qc.invalidateQueries({ queryKey: ["admin-all-users"] });
      qc.invalidateQueries({ queryKey: ["onboarding-core-users"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update onboarding core status");
    }
  };

  const deletePost = async (postId: string) => {
    if (!window.confirm("Are you sure you want to delete this post? This will permanently remove it along with all its likes and comments from the database.")) {
      return;
    }
    try {
      const res = await fetch("/api/admin/posts/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: postId })
      });
      if (!res.ok) throw new Error("Could not delete post");
      toast.success("Post deleted successfully");
      refetchPosts();
      qc.invalidateQueries({ queryKey: ["admin-all-posts"] });
      qc.invalidateQueries({ queryKey: ["posts"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createUserForm.email || !createUserForm.username || !createUserForm.password) {
      toast.error("Please fill required fields (email, username, password).");
      return;
    }
    try {
      const res = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createUserForm)
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to create user.");
      }
      toast.success(`User @${createUserForm.username} created successfully!`);
      setCreateUserOpen(false);
      setCreateUserForm({ email: "", username: "", display_name: "", password: "" });
      refetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserForm.user_id) return;
    try {
      const res = await fetch("/api/admin/users/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editUserForm)
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to update user.");
      }
      toast.success("User updated successfully!");
      setEditUserOpen(false);
      refetchUsers();
      qc.invalidateQueries({ queryKey: ["admin-all-users"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`CRITICAL SYSTEM WARNING: Are you sure you want to permanently delete user @${username}? This will thoroughly remove all their posts, replies, likes, follow connections, role and main credentials from both the live database and Local persistences. This operation cannot be undone!`)) {
      return;
    }
    try {
      const res = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId })
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to execute deletion.");
      }
      toast.success(`User @${username} has been fully deleted from the service.`);
      refetchUsers();
      refetchPosts();
      qc.invalidateQueries({ queryKey: ["admin-all-users"] });
      qc.invalidateQueries({ queryKey: ["admin-all-posts"] });
      qc.invalidateQueries({ queryKey: ["posts"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleBan = async (userId: string, currentBan: boolean) => {
    try {
      const next = !currentBan;
      const res = await fetch("/api/admin/users/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, is_banned: next })
      });
      if (!res.ok) throw new Error("Could not change ban status");
      toast.success(next ? "Account has been banned from connecting" : "Account ban status lifted");
      refetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleSuspend = async (userId: string, currentSusp: boolean) => {
    try {
      const next = !currentSusp;
      const res = await fetch("/api/admin/users/suspend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, is_suspended: next })
      });
      if (!res.ok) throw new Error("Could not change suspend state");
      toast.success(next ? "Account has been suspended" : "Account suspension lifted");
      refetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createPostForm.user_id) {
      toast.error("Please pick an author.");
      return;
    }
    try {
      const res = await fetch("/api/admin/posts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createPostForm)
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to create post.");
      }
      toast.success("Post created successfully!");
      setCreatePostOpen(false);
      setCreatePostForm({ user_id: "", caption: "", image_url: "", media_type: "image" });
      refetchPosts();
      qc.invalidateQueries({ queryKey: ["admin-all-posts"] });
      qc.invalidateQueries({ queryKey: ["posts"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPostForm.id) return;
    try {
      const res = await fetch("/api/admin/posts/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editPostForm)
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to edit post.");
      }
      toast.success("Post revised successfully!");
      setEditPostOpen(false);
      refetchPosts();
      qc.invalidateQueries({ queryKey: ["admin-all-posts"] });
      qc.invalidateQueries({ queryKey: ["posts"] });
    } catch (err: any) {
      toast.error(err.message);
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

  if (authLoading || checkingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background text-foreground w-full py-8 md:py-12">
      <div className="max-w-[1200px] mx-auto px-4 font-sans">
      
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
        <div className="lg:col-span-3 flex flex-row overflow-x-auto lg:flex-col gap-2 pb-4 lg:pb-0 lg:space-y-2 scrollbar-none">
          <p className="hidden lg:block text-xs font-mono font-bold tracking-wider text-muted-foreground uppercase px-3 mb-2">
            Section Navigation
          </p>
          <button
            onClick={() => setTab("overview")}
            className={`flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-2xl font-display font-bold text-sm transition-all text-left lg:w-full ${
              tab === "overview"
                ? "bg-primary text-primary-foreground shadow-glow"
                : "bg-card border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            <span className="whitespace-nowrap">Overview & Systems</span>
          </button>
          
          <button
            onClick={() => setTab("users")}
            className={`flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-2xl font-display font-bold text-sm transition-all text-left lg:w-full ${
              tab === "users"
                ? "bg-primary text-primary-foreground shadow-glow"
                : "bg-card border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Users className="w-5 h-5 flex-shrink-0" />
            <span className="whitespace-nowrap">Users & Roles</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/35 text-foreground font-mono">
              {users?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setTab("posts")}
            className={`flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-2xl font-display font-bold text-sm transition-all text-left lg:w-full ${
              tab === "posts"
                ? "bg-primary text-primary-foreground shadow-glow"
                : "bg-card border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <FileText className="w-5 h-5 flex-shrink-0" />
            <span className="whitespace-nowrap">Content Moderation</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/35 text-foreground font-mono">
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search user profile handles by username or name..."
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-sans"
                  />
                </div>
                
                <button
                  onClick={() => setCreateUserOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-primary text-primary-foreground font-display font-extrabold text-sm shadow-glow hover:bg-primary/90 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  Create User
                </button>
              </div>

              {/* USER CREATION PANEL MODAL */}
              {createUserOpen && (
                <div className="p-6 bg-card border-2 border-primary/20 rounded-2xl space-y-4 relative">
                  <button 
                    type="button"
                    onClick={() => setCreateUserOpen(false)}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <h3 className="font-display font-extrabold text-lg text-foreground flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-primary" /> Create New User Account
                  </h3>
                  <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-mono text-muted-foreground block">EMAIL ADDRESS *</label>
                      <input
                        type="email"
                        required
                        value={createUserForm.email}
                        onChange={e => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                        placeholder="e.g. user@ripple.com"
                        className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-mono text-muted-foreground block">USERNAME (UNIQUE) *</label>
                      <input
                        type="text"
                        required
                        value={createUserForm.username}
                        onChange={e => setCreateUserForm({ ...createUserForm, username: e.target.value })}
                        placeholder="e.g. ripplesmith"
                        className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-mono text-muted-foreground block">DISPLAY NAME</label>
                      <input
                        type="text"
                        value={createUserForm.display_name}
                        onChange={e => setCreateUserForm({ ...createUserForm, display_name: e.target.value })}
                        placeholder="e.g. Ripple Smith"
                        className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-mono text-muted-foreground block">PASSWORD *</label>
                      <input
                        type="password"
                        required
                        value={createUserForm.password}
                        onChange={e => setCreateUserForm({ ...createUserForm, password: e.target.value })}
                        placeholder="Enter dynamic credentials..."
                        className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setCreateUserOpen(false)}
                        className="px-4 py-2 rounded-xl text-xs bg-secondary hover:bg-border text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl text-xs bg-primary text-primary-foreground font-bold transition-colors"
                      >
                        Provision Account
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* USER EDIT PANEL MODAL */}
              {editUserOpen && (
                <div className="p-6 bg-card border-2 border-[#1d9bf0]/20 rounded-2xl space-y-4 relative">
                  <button 
                    type="button"
                    onClick={() => setEditUserOpen(false)}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <h3 className="font-display font-extrabold text-lg text-foreground flex items-center gap-2">
                    <Edit className="w-5 h-5 text-[#1d9bf0]" /> Modify User Profile
                  </h3>
                  <form onSubmit={handleUpdateUser} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-mono text-muted-foreground block">USERNAME HANDLE</label>
                        <input
                          type="text"
                          required
                          value={editUserForm.username}
                          onChange={e => setEditUserForm({ ...editUserForm, username: e.target.value })}
                          className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-mono text-muted-foreground block">DISPLAY NAME</label>
                        <input
                          type="text"
                          required
                          value={editUserForm.display_name}
                          onChange={e => setEditUserForm({ ...editUserForm, display_name: e.target.value })}
                          className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-mono text-muted-foreground block">BIO DESCRIPTION</label>
                      <textarea
                        value={editUserForm.bio}
                        onChange={e => setEditUserForm({ ...editUserForm, bio: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-6">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="edit_verified"
                          checked={editUserForm.is_verified}
                          onChange={e => setEditUserForm({ ...editUserForm, is_verified: e.target.checked })}
                          className="rounded bg-background border-border text-primary focus:ring-primary"
                        />
                        <label htmlFor="edit_verified" className="text-xs font-mono text-foreground cursor-pointer">
                          VERIFIED BADGE STATUS
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="edit_onboarding_core"
                          checked={editUserForm.is_onboarding_core}
                          onChange={e => setEditUserForm({ ...editUserForm, is_onboarding_core: e.target.checked })}
                          className="rounded bg-background border-border text-primary focus:ring-primary"
                        />
                        <label htmlFor="edit_onboarding_core" className="text-xs font-mono text-foreground cursor-pointer">
                          ONBOARDING CORE CHANNEL
                        </label>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditUserOpen(false)}
                        className="px-4 py-2 rounded-xl text-xs bg-secondary hover:bg-border text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl text-xs bg-primary text-primary-foreground font-bold transition-colors"
                      >
                        Apply Profile Updates
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-3">
                {filteredUsers.map((u: any) => {
                  const roleObj = userRoles?.find((r: any) => r.user_id === u.user_id);
                  const isUserAdmin = roleObj?.role === "admin";

                  return (
                    <div key={u.id} className="flex flex-col bg-card rounded-2xl px-5 py-5 border border-border hover:border-border/80 transition-all space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <img src={u.avatar_url || ""} className="w-12 h-12 rounded-2xl bg-secondary object-cover flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center flex-wrap gap-1.5">
                              <p className="text-sm font-display font-extrabold text-foreground truncate">
                                {u.username || "No username"}
                              </p>
                              <VerifiedBadge verified={u.is_verified} size={15} />
                              {isUserAdmin && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 text-[9px] font-mono font-bold tracking-tight">
                                  ADMIN
                                </span>
                              )}
                              {u.is_onboarding_core && (
                                <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 text-[9px] font-mono font-bold tracking-tight">
                                  CORE
                                </span>
                              )}
                              {u.is_banned ? (
                                <span className="px-2 py-0.5 rounded-full bg-destructive/15 text-destructive text-[9px] font-mono font-bold tracking-tight flex items-center gap-0.5">
                                  <Ban className="w-2.5 h-2.5" /> BANNED
                                </span>
                              ) : u.is_suspended ? (
                                <span className="px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-500 text-[9px] font-mono font-bold tracking-tight flex items-center gap-0.5">
                                  <AlertTriangle className="w-2.5 h-2.5" /> SUSPENDED
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-mono font-bold tracking-tight">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {u.display_name} · Joined {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                            </p>
                            <p className="text-xs font-mono text-muted-foreground/80 truncate mt-0.5">
                              ID: {u.user_id}
                            </p>
                          </div>
                        </div>

                        {/* Top action flags: Quick Verify & Quick Admin */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => toggleAdminRole(u.user_id, isUserAdmin)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-display font-semibold transition-colors ${
                              isUserAdmin
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20"
                                : "bg-secondary text-foreground hover:bg-border border border-transparent"
                            }`}
                          >
                            <UserCog className="w-4 h-4" />
                            {isUserAdmin ? "Revoke Admin" : "Make Admin"}
                          </button>

                          <button
                            onClick={() => toggleVerified(u)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-display font-semibold transition-colors ${
                              u.is_verified
                                ? "bg-[#1d9bf0] text-white hover:bg-[#1d9bf0]/90"
                                : "bg-secondary text-foreground hover:bg-border border border-transparent"
                            }`}
                          >
                            <BadgeCheck className="w-4 h-4" />
                            {u.is_verified ? "Verified" : "Verify"}
                          </button>

                          <button
                            onClick={() => toggleOnboardingCore(u)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-display font-semibold transition-colors ${
                              u.is_onboarding_core
                                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                : "bg-secondary text-foreground hover:bg-border border border-transparent"
                            }`}
                          >
                            <Users className="w-4 h-4" />
                            {u.is_onboarding_core ? "Core Channel" : "Make Core"}
                          </button>
                        </div>
                      </div>

                      {/* Display bio for content contextualization */}
                      {u.bio && (
                        <div className="p-3 bg-secondary/30 rounded-xl text-xs text-muted-foreground italic border border-border/40">
                          Bio: "{u.bio}"
                        </div>
                      )}

                      {/* Complete Accounts and Controls Row */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                        <button
                          onClick={() => {
                            setEditUserForm({
                              user_id: u.user_id,
                              username: u.username || "",
                              display_name: u.display_name || "",
                              bio: u.bio || "",
                              is_verified: !!u.is_verified,
                              is_onboarding_core: !!u.is_onboarding_core
                            });
                            setEditUserOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary text-foreground hover:bg-border text-xs font-semibold transition-colors border border-transparent"
                        >
                          <Edit className="w-3.5 h-3.5 text-blue-500" />
                          Edit Profile
                        </button>

                        <button
                          onClick={() => toggleBan(u.user_id, !!u.is_banned)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                            u.is_banned
                              ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 border-transparent"
                              : "bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border-destructive/20"
                          }`}
                        >
                          <Ban className="w-3.5 h-3.5" />
                          {u.is_banned ? "Unban Account" : "Ban Account"}
                        </button>

                        <button
                          onClick={() => toggleSuspend(u.user_id, !!u.is_suspended)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                            u.is_suspended
                              ? "bg-orange-500 text-white hover:bg-orange-600 border-transparent"
                              : "bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white border-orange-500/20"
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {u.is_suspended ? "Unsuspend Account" : "Suspend Account"}
                        </button>

                        <div className="ml-auto">
                          <button
                            onClick={() => handleDeleteUser(u.user_id, u.username)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground border border-destructive/20 text-destructive text-xs font-bold transition-all"
                            title="Completely delete account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete Account
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <div className="text-center bg-card border border-border rounded-2xl py-12">
                    <p className="text-sm text-muted-foreground font-mono">No users match your query filter.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CONTENT MODERATION */}
          {tab === "posts" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-card p-4 rounded-2xl border border-border">
                <div>
                  <p className="text-sm font-semibold text-foreground">Content Feed Rules</p>
                  <p className="text-xs text-muted-foreground">Admin-authorized post creation and structural caption moderation.</p>
                </div>
                <button
                  onClick={() => setCreatePostOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1d9bf0] text-white hover:bg-[#1d9bf0]/90 rounded-xl text-xs font-bold font-display shadow-sm transition-all"
                >
                  <FilePlus className="w-4 h-4" />
                  Compose Post
                </button>
              </div>

              {/* POST CREATION FORM PANEL */}
              {createPostOpen && (
                <div className="p-6 bg-card border border-border rounded-2xl space-y-4 relative">
                  <button 
                    type="button"
                    onClick={() => setCreatePostOpen(false)}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <h3 className="font-display font-extrabold text-md text-foreground flex items-center gap-2">
                    <FilePlus className="w-5 h-5 text-primary" /> Create Post as Administrator
                  </h3>
                  <form onSubmit={handleCreatePost} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-mono text-muted-foreground block">SELECT AUTHOR SYSTEM USER *</label>
                        <select
                          required
                          value={createPostForm.user_id}
                          onChange={e => setCreatePostForm({ ...createPostForm, user_id: e.target.value })}
                          className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none"
                        >
                          <option value="">-- Choose User Accessor --</option>
                          {users?.map((usr: any) => (
                            <option key={usr.id} value={usr.user_id}>@{usr.username} - {usr.display_name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-mono text-muted-foreground block">MEDIA FORMAT TYPE</label>
                        <select
                          value={createPostForm.media_type}
                          onChange={e => setCreatePostForm({ ...createPostForm, media_type: e.target.value })}
                          className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground"
                        >
                          <option value="image">Still Image Media</option>
                          <option value="text">Pure Text/Message</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-mono text-muted-foreground block">IMAGE URL (OPTIONAL)</label>
                        <input
                          type="text"
                          value={createPostForm.image_url}
                          onChange={e => setCreatePostForm({ ...createPostForm, image_url: e.target.value })}
                          placeholder="https://images.unsplash.com/photo-..."
                          className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-mono text-muted-foreground block">POST CAPTION OR TEXT CONTENT *</label>
                        <textarea
                          required
                          value={createPostForm.caption}
                          onChange={e => setCreatePostForm({ ...createPostForm, caption: e.target.value })}
                          rows={3}
                          placeholder="Write post announcement content..."
                          className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setCreatePostOpen(false)}
                        className="px-4 py-2 rounded-xl text-xs bg-secondary hover:bg-border text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl text-xs bg-primary text-primary-foreground font-bold transition-colors"
                      >
                        Publish Post to Feed
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* POST EDIT FORM PANEL */}
              {editPostOpen && (
                <div className="p-6 bg-card border-2 border-accent/20 rounded-2xl space-y-4 relative">
                  <button 
                    type="button"
                    onClick={() => setEditPostOpen(false)}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <h3 className="font-display font-extrabold text-md text-foreground flex items-center gap-2">
                    <Edit className="w-5 h-5 text-accent" /> Edit Post content
                  </h3>
                  <form onSubmit={handleUpdatePost} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-mono text-muted-foreground block">MEDIA FORMAT TYPE</label>
                        <select
                          value={editPostForm.media_type}
                          onChange={e => setEditPostForm({ ...editPostForm, media_type: e.target.value })}
                          className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground"
                        >
                          <option value="image">Still Image Media</option>
                          <option value="text">Pure Text/Message</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-mono text-muted-foreground block">IMAGE URL</label>
                        <input
                          type="text"
                          value={editPostForm.image_url}
                          onChange={e => setEditPostForm({ ...editPostForm, image_url: e.target.value })}
                          className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-mono text-muted-foreground block">POST CAPTION OR TEXT CONTENT</label>
                      <textarea
                        required
                        value={editPostForm.caption}
                        onChange={e => setEditPostForm({ ...editPostForm, caption: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditPostOpen(false)}
                        className="px-4 py-2 rounded-xl text-xs bg-secondary hover:bg-border"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl text-xs bg-primary text-primary-foreground font-bold"
                      >
                        Apply Edits
                      </button>
                    </div>
                  </form>
                </div>
              )}

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

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditPostForm({
                            id: p.id,
                            caption: p.caption || "",
                            image_url: p.image_url || "",
                            media_type: p.media_type || "image"
                          });
                          setEditPostOpen(true);
                        }}
                        className="p-2.5 rounded-xl hover:bg-secondary text-muted-foreground border border-transparent hover:border-border transition-all flex-shrink-0"
                        title="Edit post parameters"
                      >
                        <Edit className="w-4 h-4 text-[#1d9bf0]" />
                      </button>

                      <button
                        onClick={() => deletePost(p.id)}
                        className="p-2.5 rounded-xl hover:bg-destructive/10 text-destructive border border-transparent hover:border-destructive/20 transition-all flex-shrink-0"
                        title="Delete Post permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {!posts?.length && (
                  <div className="text-center bg-card border border-border rounded-2xl py-12">
                    <p className="text-sm text-muted-foreground">No posts have been made on the platform yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  </div>
  );
};

export default Admin;
