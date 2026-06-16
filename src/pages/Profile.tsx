import { Settings, Grid3X3, Bookmark, Flame, LogOut, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useFollowCounts } from "@/hooks/useFollows";
import { usePosts } from "@/hooks/usePosts";
import { motion } from "framer-motion";
import VerifiedBadge from "@/components/ripple/VerifiedBadge";

const formatNumber = (n: number) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
};

const Profile = () => {
  const [tab, setTab] = useState<"posts" | "saved" | "waves">("posts");
  const { signOut, user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const { data: counts } = useFollowCounts(user?.id || "");
  const { data: allPosts } = usePosts();

  const myPosts = allPosts?.filter((p) => p.user_id === user?.id) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto px-3 pt-4 lg:pt-6">
      {/* Header */}
      <div className="bg-card rounded-3xl p-5 lg:p-8 border border-border shadow-card mb-4">
        <div className="flex items-start gap-5 lg:gap-10">
          <div className="w-20 h-20 lg:w-28 lg:h-28 rounded-3xl p-[3px] gradient-brand shadow-glow flex-shrink-0">
            <img src={profile?.avatar_url || ""} alt={profile?.username || ""} className="w-full h-full rounded-[21px] object-cover bg-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <h2 className="text-xl lg:text-2xl font-display font-extrabold text-foreground flex items-center gap-2">{profile?.username || "user"}<VerifiedBadge verified={(profile as any)?.is_verified} size={18} /></h2>
              <button className="px-4 py-1.5 rounded-xl bg-secondary text-sm font-display font-bold text-foreground hover:bg-muted transition-colors">
                Edit profile
              </button>
              <button onClick={signOut} className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-6 mb-3">
              {[
                { value: myPosts.length, label: "posts" },
                { value: counts?.followers || 0, label: "followers" },
                { value: counts?.following || 0, label: "following" },
              ].map(stat => (
                <div key={stat.label} className="text-center lg:text-left">
                  <p className="text-lg font-display font-extrabold text-foreground">{formatNumber(stat.value)}</p>
                  <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
            <p className="hidden lg:block text-sm text-secondary-foreground leading-relaxed">{profile?.bio || "No bio yet"}</p>
          </div>
        </div>
        <p className="lg:hidden text-sm text-secondary-foreground mt-3 leading-relaxed">{profile?.bio || "No bio yet"}</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-card rounded-2xl border border-border p-1 mb-4">
        {[
          { key: "posts" as const, icon: Grid3X3, label: "Posts" },
          { key: "saved" as const, icon: Bookmark, label: "Saved" },
          { key: "waves" as const, icon: Flame, label: "Waves" },
        ].map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-display font-bold text-sm transition-all
              ${tab === key ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-1.5 pb-20 lg:pb-8">
        {myPosts.length ? myPosts.map((post, i) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="relative aspect-square group overflow-hidden rounded-2xl"
          >
            <img src={post.image_url || ""} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.div>
        )) : (
          <div className="col-span-3 text-center py-12">
            <p className="text-muted-foreground text-sm">No posts yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
