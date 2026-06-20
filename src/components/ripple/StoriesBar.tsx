import { Bell, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useStories } from "@/hooks/useStories";
import { useProfile } from "@/hooks/useProfile";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useUnreadNotificationsCount } from "@/hooks/useNotifications";
import StoryViewer from "./StoryViewer";
import StoryComposer from "./StoryComposer";

const StoryCircle = ({ avatar, username, hasStory, isOwn, onClick }: { avatar: string; username: string; hasStory?: boolean; isOwn?: boolean; onClick?: () => void }) => (
  <motion.button
    whileTap={{ scale: 0.92 }}
    onClick={onClick}
    className="relative flex-shrink-0 group"
    title={username}
  >
    <div className={`w-14 h-14 lg:w-12 lg:h-12 rounded-full p-[2.5px] ${hasStory ? "bg-gradient-to-br from-primary to-accent" : isOwn ? "gradient-brand" : "bg-border"}`}>
      <div className="w-full h-full rounded-full bg-background p-[2px]">
        <img src={avatar || ""} alt={username} className="w-full h-full rounded-full object-cover bg-secondary" />
      </div>
    </div>
    {isOwn && (
      <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full gradient-brand flex items-center justify-center border-2 border-background">
        <Plus className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
      </div>
    )}
  </motion.button>
);

const StoriesBar = () => {
  const { data: storyGroups } = useStories();
  const { data: profile } = useProfile();
  const { data: unreadNotifs = 0 } = useUnreadNotificationsCount();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerStartIdx, setViewerStartIdx] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const location = useLocation();

  const openViewer = (idx: number) => {
    setViewerStartIdx(idx);
    setViewerOpen(true);
  };

  const isActivityActive = location.pathname === "/activity";

  return (
    <div className="flex-shrink-0 w-[72px] lg:w-[68px] h-[calc(100vh-3.5rem)] lg:h-screen sticky top-14 lg:top-0 z-10">
      <div className="flex flex-col items-center gap-3 py-3 px-1 h-full overflow-y-auto hide-scrollbar">
        {/* Notification bell styled with Liquid Glass */}
        <Link to="/activity" className="relative mb-1 block">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isActivityActive
              ? "btn-liquid-glass-base btn-liquid-glass-primary text-foreground shadow-glow"
              : "btn-liquid-glass-base btn-liquid-glass-secondary text-foreground"
          }`}>
            <Bell className="w-5.5 h-5.5 text-foreground" strokeWidth={1.5} />
          </div>
          {unreadNotifs > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center z-10 shadow-sm">
              {unreadNotifs > 99 ? "99+" : unreadNotifs}
            </span>
          )}
        </Link>

        {/* Own story */}
        <StoryCircle
          avatar={profile?.avatar_url || ""}
          username="Your wave"
          isOwn
          onClick={() => setComposerOpen(true)}
        />

        {/* Other stories */}
        {storyGroups?.map((group: any, i: number) => (
          <StoryCircle
            key={group.user_id}
            avatar={group.profile?.avatar_url || ""}
            username={group.profile?.username || "user"}
            hasStory
            onClick={() => openViewer(i)}
          />
        ))}

        {/* Placeholder circles if no stories */}
        {(!storyGroups || storyGroups.length === 0) && (
          <>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="w-14 h-14 lg:w-12 lg:h-12 rounded-full bg-secondary/40 border-2 border-border flex-shrink-0" />
            ))}
          </>
        )}
      </div>

      {viewerOpen && storyGroups && storyGroups.length > 0 && (
        <StoryViewer
          groups={storyGroups}
          initialGroupIndex={viewerStartIdx}
          onClose={() => setViewerOpen(false)}
        />
      )}

      <StoryComposer open={composerOpen} onClose={() => setComposerOpen(false)} />
    </div>
  );
};

export default StoriesBar;
