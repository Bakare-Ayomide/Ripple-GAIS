import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useStories = () => {
  return useQuery({
    queryKey: ["stories"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("stories")
        .select("*, profiles!stories_user_id_profiles_fkey(username, display_name, avatar_url, is_verified)")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false }) as any);
      
      if (error) {
        console.warn("Stories fetch error (degrading gracefully):", error);
        return [];
      }

      console.log("Stories data fetched:", data);

      const grouped = new Map<string, any>();
      for (const story of data || []) {
        // Fallback for profile object access
        let profileObj = story.profiles || story["profiles!stories_user_id_profiles_fkey"];
        if (!profileObj) {
          // Look for any object property that has username attribute
          for (const key of Object.keys(story)) {
            if (story[key] && typeof story[key] === "object" && "username" in story[key]) {
              profileObj = story[key];
              break;
            }
          }
        }
        
        // Defensively construct fallback details if profile is completely missing
        if (!profileObj) {
          profileObj = {
            username: "user_" + (story.user_id ? story.user_id.substring(0, 5) : "unknown"),
            display_name: "Creative Ripple User",
            avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${story.user_id || "default"}`,
            is_verified: false
          };
        }

        if (!grouped.has(story.user_id)) {
          grouped.set(story.user_id, {
            user_id: story.user_id,
            profile: profileObj,
            stories: [],
          });
        }
        grouped.get(story.user_id).stories.push(story);
      }
      const result = Array.from(grouped.values());
      console.log("Grouped stories:", result);
      return result;
    },
  });
};

export const useCreateStory = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      imageFile,
      caption,
      expiresInHours = 24,
      onProgress,
    }: {
      imageFile: File;
      caption?: string;
      expiresInHours?: number;
      onProgress?: (pct: number) => void;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const ext = imageFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;

      // Simulated progress (Supabase JS doesn't expose native upload progress)
      onProgress?.(5);
      const progressTimer = setInterval(() => {
        onProgress?.(Math.min(90, Math.random() * 15 + 30));
      }, 200);

      const { error: uploadError } = await supabase.storage.from("stories").upload(path, imageFile);
      clearInterval(progressTimer);
      if (uploadError) throw uploadError;
      onProgress?.(95);

      const { data: { publicUrl } } = supabase.storage.from("stories").getPublicUrl(path);

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);

      const { error } = await (supabase.from("stories").insert({
        user_id: user.id,
        image_url: publicUrl,
        caption: caption || null,
        expires_at: expiresAt.toISOString(),
      } as any));
      if (error) throw error;
      onProgress?.(100);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stories"] }),
  });
};
