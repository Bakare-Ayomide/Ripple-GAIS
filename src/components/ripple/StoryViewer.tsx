import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X, Send, UserPlus, ChevronDown } from "lucide-react";

import RichCaption from "./RichCaption";

type Story = {
  id: string;
  image_url: string;
  created_at: string;
  views_count: number | null;
  caption?: string | null;
};

type StoryGroup = {
  user_id: string;
  profile: { username: string; display_name: string; avatar_url: string } | null;
  stories: Story[];
};

interface StoryViewerProps {
  groups: StoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
}

const STORY_DURATION = 5000;

const StoryViewer = ({ groups, initialGroupIndex, onClose }: StoryViewerProps) => {
  const [groupIdx, setGroupIdx] = useState(initialGroupIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [dragY, setDragY] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const startTimeRef = useRef(Date.now());

  const group = groups[groupIdx];
  const story = group?.stories[storyIdx];

  const resetTimer = useCallback(() => {
    setProgress(0);
    startTimeRef.current = Date.now();
  }, []);

  const goNext = useCallback(() => {
    if (!group) return;
    if (storyIdx < group.stories.length - 1) {
      setStoryIdx((s) => s + 1);
      resetTimer();
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx((g) => g + 1);
      setStoryIdx(0);
      resetTimer();
    } else {
      onClose();
    }
  }, [group, storyIdx, groupIdx, groups.length, onClose, resetTimer]);

  const goPrev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx((s) => s - 1);
      resetTimer();
    } else if (groupIdx > 0) {
      setGroupIdx((g) => g - 1);
      setStoryIdx(0);
      resetTimer();
    }
  }, [storyIdx, groupIdx, resetTimer]);

  useEffect(() => {
    if (paused) return;
    startTimeRef.current = Date.now() - (progress / 100) * STORY_DURATION;
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) goNext();
    }, 30);
    return () => clearInterval(timerRef.current);
  }, [groupIdx, storyIdx, paused, goNext]);

  const handleTap = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) goPrev();
    else goNext();
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y > 100) onClose();
    else if (info.offset.x < -50) goNext();
    else if (info.offset.x > 50) goPrev();
    setDragY(0);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  if (!group || !story) return null;
  const profile = group.profile;
  const timeAgo = (() => {
    const mins = Math.floor((Date.now() - new Date(story.created_at).getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h`;
  })();

  const viewer = (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black flex items-center justify-center"
        style={{ zIndex: 99999 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative w-full h-full max-w-[480px] mx-auto"
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.4}
          onDrag={(_, info) => setDragY(info.offset.y)}
          onDragEnd={handleDragEnd}
          style={{ opacity: 1 - Math.abs(dragY) / 400 }}
        >
          {/* Full-screen story image */}
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={handleTap}
            onMouseDown={() => setPaused(true)}
            onMouseUp={() => setPaused(false)}
            onTouchStart={() => setPaused(true)}
            onTouchEnd={() => setPaused(false)}
          >
            <img
              src={story.image_url}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent" />
          </div>

          {/* Progress bars */}
          <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 px-3 pt-3">
            {group.stories.map((_, i) => (
              <div key={i} className="flex-1 h-[2.5px] rounded-full bg-white/25 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white transition-none"
                  style={{
                    width: i < storyIdx ? "100%" : i === storyIdx ? `${progress}%` : "0%",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-7 left-0 right-0 z-10 flex items-center justify-between px-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/50 shadow-lg">
                <img src={profile?.avatar_url || ""} alt="" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-white font-display font-extrabold text-sm leading-tight drop-shadow-lg">
                  {profile?.display_name || profile?.username || "User"}
                </p>
                <p className="text-white/50 text-[11px] font-medium">{timeAgo}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-accent text-accent-foreground text-[11px] font-display font-extrabold shadow-md">
                <UserPlus className="w-3 h-3" />
                Follow
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                <X className="w-6 h-6" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Swipe down indicator */}
          <div className="absolute top-[72px] left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 animate-bounce">
            <ChevronDown className="w-5 h-5 text-white/40" />
          </div>

          {/* Right side actions */}
          <div className="absolute right-4 bottom-24 z-10 flex flex-col items-center gap-4">
            <button className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <Send className="w-5 h-5 text-white" />
            </button>
            <button className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </button>
          </div>

          {/* Story caption with hashtags/mentions */}
          {story.caption && (
            <div className="absolute left-4 right-20 bottom-24 z-10">
              <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-4 py-2.5 inline-block max-w-full">
                <RichCaption
                  text={story.caption}
                  className="text-white text-base font-display font-bold drop-shadow leading-snug block"
                  hashtagClass="text-accent font-extrabold cursor-pointer"
                  mentionClass="text-primary font-extrabold cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Reply bar */}
          <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-6">
            <div className="flex gap-2 items-center">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onFocus={() => setPaused(true)}
                onBlur={() => setPaused(false)}
                placeholder="Reply Story.."
                className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm rounded-full px-4 py-3 placeholder:text-white/40 outline-none focus:border-white/40"
              />
              <button className="w-11 h-11 rounded-full bg-accent flex items-center justify-center shadow-md">
                <Send className="w-5 h-5 text-accent-foreground" style={{ transform: "rotate(-30deg)" }} />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  // Portal to document.body so it overlays EVERYTHING
  return createPortal(viewer, document.body);
};

export default StoryViewer;
