
-- 1. Attach the existing notify functions to their tables (previously not attached)
DROP TRIGGER IF EXISTS trg_notify_on_like ON public.likes;
CREATE TRIGGER trg_notify_on_like
AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

DROP TRIGGER IF EXISTS trg_notify_on_comment ON public.comments;
CREATE TRIGGER trg_notify_on_comment
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

DROP TRIGGER IF EXISTS trg_notify_on_follow ON public.follows;
CREATE TRIGGER trg_notify_on_follow
AFTER INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

DROP TRIGGER IF EXISTS trg_notify_on_message ON public.messages;
CREATE TRIGGER trg_notify_on_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_on_message();

-- 2. Mention notifications on posts (caption) and comments (content)
CREATE OR REPLACE FUNCTION public.notify_on_post_mentions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uname text;
  recipient uuid;
BEGIN
  IF NEW.caption IS NULL THEN RETURN NEW; END IF;
  FOR uname IN
    SELECT DISTINCT lower(substring(m[1] from 2))
    FROM regexp_matches(NEW.caption, '@([A-Za-z0-9_]{2,30})', 'g') AS m
  LOOP
    SELECT user_id INTO recipient FROM public.profiles WHERE lower(username) = uname LIMIT 1;
    IF recipient IS NOT NULL AND recipient <> NEW.user_id THEN
      INSERT INTO public.notifications (recipient_id, actor_id, type, post_id, content)
      VALUES (recipient, NEW.user_id, 'mention', NEW.id, left(NEW.caption, 140));
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_on_comment_mentions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uname text;
  recipient uuid;
BEGIN
  IF NEW.content IS NULL THEN RETURN NEW; END IF;
  FOR uname IN
    SELECT DISTINCT lower(substring(m[1] from 2))
    FROM regexp_matches(NEW.content, '@([A-Za-z0-9_]{2,30})', 'g') AS m
  LOOP
    SELECT user_id INTO recipient FROM public.profiles WHERE lower(username) = uname LIMIT 1;
    IF recipient IS NOT NULL AND recipient <> NEW.user_id THEN
      INSERT INTO public.notifications (recipient_id, actor_id, type, post_id, content)
      VALUES (recipient, NEW.user_id, 'mention', NEW.post_id, left(NEW.content, 140));
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_post_mentions ON public.posts;
CREATE TRIGGER trg_notify_post_mentions
AFTER INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.notify_on_post_mentions();

DROP TRIGGER IF EXISTS trg_notify_comment_mentions ON public.comments;
CREATE TRIGGER trg_notify_comment_mentions
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment_mentions();
