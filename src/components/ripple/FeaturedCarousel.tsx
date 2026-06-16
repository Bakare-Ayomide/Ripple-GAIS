import { useRef } from "react";
import { ChevronLeft, ChevronRight, Flame, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import type { PostWithProfile } from "@/hooks/usePosts";

interface Props {
  posts: PostWithProfile[];
  onPostClick: (post: PostWithProfile) => void;
}

const FeaturedCarousel = ({ posts, onPostClick }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "left" ? -220 : 220, behavior: "smooth" });
  };

  if (!posts.length) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between px-1 mb-3">
        <div>
          <h3 className="font-display font-extrabold text-foreground text-base">🔥 Hot Ripples</h3>
          <p className="text-xs text-muted-foreground font-medium">Most engaging posts</p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => scroll("left")} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>
          <button onClick={() => scroll("right")} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
            <ChevronRight className="w-4 h-4 text-foreground" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex gap-3 overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-1">
        {posts.map((post) => (
          <motion.button
            key={post.id}
            whileTap={{ scale: 0.96 }}
            onClick={() => onPostClick(post)}
            className="flex-shrink-0 w-[200px] snap-start rounded-2xl overflow-hidden border border-border bg-card shadow-card text-left transition-all hover:border-primary/30"
          >
            {post.image_url ? (
              <img src={post.image_url} alt="" className="w-full h-[240px] object-cover" />
            ) : (
              <div className="w-full h-[240px] bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center p-4">
                <p className="text-xs text-foreground font-medium line-clamp-6">{post.caption}</p>
              </div>
            )}
            <div className="p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <img src={post.profiles?.avatar_url || ""} className="w-6 h-6 rounded-full bg-secondary" />
                <p className="text-xs font-display font-bold text-foreground truncate flex-1">
                  {post.profiles?.username || "user"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[11px] text-accent font-bold">
                  <Flame className="w-3.5 h-3.5" /> {post.likes_count || 0}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-bold">
                  <Pencil className="w-3.5 h-3.5" /> {post.comments_count || 0}
                </span>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default FeaturedCarousel;
