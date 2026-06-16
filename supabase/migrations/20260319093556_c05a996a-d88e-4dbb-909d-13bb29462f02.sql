
-- Add unique constraint on profiles.user_id so it can be referenced as FK
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- Add FK from posts.user_id to profiles.user_id
ALTER TABLE public.posts
  ADD CONSTRAINT posts_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add FK from comments.user_id to profiles.user_id
ALTER TABLE public.comments
  ADD CONSTRAINT comments_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add FK from likes.user_id to profiles.user_id
ALTER TABLE public.likes
  ADD CONSTRAINT likes_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add FK from stories.user_id to profiles.user_id
ALTER TABLE public.stories
  ADD CONSTRAINT stories_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add FK from saved_posts.user_id to profiles.user_id
ALTER TABLE public.saved_posts
  ADD CONSTRAINT saved_posts_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add FK from follows.follower_id to profiles.user_id
ALTER TABLE public.follows
  ADD CONSTRAINT follows_follower_id_profiles_fkey FOREIGN KEY (follower_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add FK from follows.following_id to profiles.user_id
ALTER TABLE public.follows
  ADD CONSTRAINT follows_following_id_profiles_fkey FOREIGN KEY (following_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add FK from messages.sender_id to profiles.user_id
ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_id_profiles_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add FK from messages.receiver_id to profiles.user_id
ALTER TABLE public.messages
  ADD CONSTRAINT messages_receiver_id_profiles_fkey FOREIGN KEY (receiver_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
