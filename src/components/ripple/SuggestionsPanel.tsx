import { useSuggestedUsers } from "@/hooks/useFollows";
import { useToggleFollow, useFollowStatus } from "@/hooks/useFollows";
import { useAuth } from "@/contexts/AuthContext";
import { TrendingUp, UserPlus } from "lucide-react";
import VerifiedBadge from "./VerifiedBadge";

const FollowButton = ({ userId }: { userId: string }) => {
  const { data: isFollowing } = useFollowStatus(userId);
  const toggleFollow = useToggleFollow();

  return (
    <button
      onClick={() => toggleFollow.mutate({ targetId: userId, isFollowing: !!isFollowing })}
      className={`px-3 py-1.5 rounded-xl text-xs font-display font-bold transition-all
        ${isFollowing ? "bg-secondary text-foreground" : "gradient-brand text-primary-foreground shadow-glow"}`}
    >
      {isFollowing ? "Flowing" : "Flow"}
    </button>
  );
};

const SuggestionsPanel = () => {
  const { data: users } = useSuggestedUsers();
  const { user } = useAuth();

  return (
    <div className="hidden xl:block w-[300px] pl-6 pt-6 flex-shrink-0">
      {/* Trending */}
      <div className="backdrop-blur-xl bg-card/65 rounded-3xl p-5 border border-white/10 shadow-card mb-4 animate-fade-in">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-foreground text-sm">Making Waves</h3>
        </div>
        {["#DigitalArt", "#NightVibes", "#CodeLife", "#Wanderlust"].map(tag => (
          <button key={tag} className="block text-sm text-primary font-semibold mb-2 hover:underline">
            {tag}
          </button>
        ))}
      </div>

      {/* Suggestions */}
      {users && users.length > 0 && (
        <div className="backdrop-blur-xl bg-card/65 rounded-3xl p-5 border border-white/10 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5 text-accent" />
            <h3 className="font-display font-bold text-foreground text-sm">Find Crew</h3>
          </div>
          <div className="flex flex-col gap-4">
            {users.map((u: any) => (
              <div key={u.user_id} className="flex items-center gap-3">
                <img src={u.avatar_url || ""} alt={u.username} className="w-10 h-10 rounded-xl bg-secondary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-display font-bold text-foreground truncate flex items-center gap-1">{u.username}<VerifiedBadge verified={u.is_verified} size={12} /></p>
                  <p className="text-xs text-muted-foreground">{u.display_name}</p>
                </div>
                <FollowButton userId={u.user_id} />
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground/40 mt-6 text-center font-display">© 2026 Ripple</p>
    </div>
  );
};

export default SuggestionsPanel;
