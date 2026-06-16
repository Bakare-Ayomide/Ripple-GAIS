import { Link } from "react-router-dom";
import { useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageCircle, UserPlus, Send, Bell, CheckCheck, AtSign, Eye, Bookmark } from "lucide-react";
import { useNotifications, useMarkNotificationsRead } from "@/hooks/useNotifications";
import VerifiedBadge from "@/components/ripple/VerifiedBadge";

const ICONS: Record<string, any> = {
  like: { Icon: Heart, color: "text-rose-500", text: "liked your post" },
  comment: { Icon: MessageCircle, color: "text-primary", text: "commented" },
  follow: { Icon: UserPlus, color: "text-emerald-500", text: "started following you" },
  message: { Icon: Send, color: "text-accent", text: "sent you a message" },
  mention: { Icon: AtSign, color: "text-primary", text: "mentioned you" },
  story_view: { Icon: Eye, color: "text-amber-500", text: "viewed your story" },
  save_post: { Icon: Bookmark, color: "text-violet-500", text: "saved your post" },
};

const Notifications = () => {
  const { data: notifs, isLoading } = useNotifications();
  const markRead = useMarkNotificationsRead();

  useEffect(() => {
    if (notifs?.some((n: any) => !n.is_read)) {
      markRead.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifs?.length]);

  return (
    <div className="max-w-[700px] mx-auto px-3 pt-4 lg:pt-6 pb-24 lg:pb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center shadow-glow">
          <Bell className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display font-extrabold text-2xl text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground">Likes, comments, follows & messages</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !notifs?.length ? (
        <div className="text-center py-16">
          <CheckCheck className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-display font-bold text-lg text-foreground">You're all caught up</p>
          <p className="text-sm text-muted-foreground">New activity will show up here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n: any) => {
            const meta = ICONS[n.type] || ICONS.like;
            const Icon = meta.Icon;
            const to = n.type === "follow"
              ? `/user/${n.actor?.username || ""}`
              : n.type === "message"
                ? "/messages"
                : "/";
            return (
              <Link
                key={n.id}
                to={to}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors ${
                  n.is_read
                    ? "bg-card border-border"
                    : "bg-secondary/60 border-primary/30"
                }`}
              >
                <div className="relative">
                  <img
                    src={n.actor?.avatar_url || ""}
                    alt=""
                    className="w-11 h-11 rounded-xl bg-secondary object-cover"
                  />
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center ${meta.color}`}>
                    <Icon className="w-3 h-3" fill={n.type === "like" ? "currentColor" : "none"} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-display font-bold inline-flex items-center gap-1">
                      {n.actor?.username || "someone"}
                      {n.actor?.is_verified && <VerifiedBadge verified size={12} />}
                    </span>{" "}
                    <span className="text-muted-foreground">{meta.text}</span>
                  </p>
                  {n.content && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">"{n.content}"</p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;