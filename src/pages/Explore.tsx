import { usePosts } from "@/hooks/usePosts";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

const Explore = () => {
  const { data: posts } = usePosts();
  const [search, setSearch] = useState("");

  const allPosts = posts || [];

  return (
    <div className="max-w-[900px] mx-auto px-3 pt-4 lg:pt-6">
      {/* Search */}
      <div className="mb-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search waves, people, tags..."
            className="w-full h-12 pl-12 pr-4 rounded-2xl bg-card border border-border text-foreground placeholder:text-muted-foreground font-medium outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Tags */}
      <div className="flex gap-2 mb-5 overflow-x-auto hide-scrollbar">
        {["🔥 Trending", "📸 Photos", "🎥 Video", "🎵 Music", "🎨 Art", "✈️ Travel"].map(tag => (
          <button key={tag} className="px-4 py-2 rounded-2xl bg-card border border-border text-sm font-display font-semibold text-foreground whitespace-nowrap hover:bg-secondary transition-colors">
            {tag}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-1.5 pb-20 lg:pb-8">
        {allPosts.map((post, i) => {
          const isLarge = i % 5 === 0;
          return (
            <motion.button
              key={post.id}
              whileTap={{ scale: 0.97 }}
              className={`relative overflow-hidden rounded-2xl group ${isLarge ? "col-span-2 row-span-2" : ""}`}
            >
              <img
                src={post.image_url || ""}
                alt=""
                className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.button>
          );
        })}
        {!allPosts.length && (
          <div className="col-span-3 text-center py-12">
            <p className="text-muted-foreground text-sm">No posts to explore yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Explore;
