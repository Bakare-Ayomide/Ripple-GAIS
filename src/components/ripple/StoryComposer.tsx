import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image as ImageIcon, Loader2, Hash, AtSign } from "lucide-react";
import { useCreateStory } from "@/hooks/useStories";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import UploadProgress from "./UploadProgress";

interface Props {
  open: boolean;
  onClose: () => void;
}

const StoryComposer = ({ open, onClose }: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [pct, setPct] = useState(0);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const createStory = useCreateStory();

  const { data: mentionUsers } = useQuery({
    queryKey: ["mention-users-story", mentionSearch],
    queryFn: async () => {
      const search = mentionSearch.replace("@", "");
      if (!search) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .ilike("username", `%${search}%`)
        .limit(6);
      return data || [];
    },
    enabled: showMentions && mentionSearch.length > 0,
  });

  useEffect(() => {
    if (!open) {
      setFile(null);
      setPreview("");
      setCaption("");
      setPct(0);
    }
  }, [open]);

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const insertText = (text: string) => {
    const ta = taRef.current;
    if (!ta) { setCaption((c) => c + text); return; }
    const start = ta.selectionStart;
    const before = caption.slice(0, start);
    const after = caption.slice(ta.selectionEnd);
    const lastWord = before.match(/[@#]\w*$/);
    const wordStart = lastWord ? start - lastWord[0].length : start;
    setCaption(caption.slice(0, wordStart) + text + " " + after);
  };

  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setCaption(v);
    const cursor = e.target.selectionStart;
    const lastWord = v.slice(0, cursor).split(/\s/).pop() || "";
    if (lastWord.startsWith("@") && lastWord.length > 0) {
      setMentionSearch(lastWord);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const submit = async () => {
    if (!file) return toast.error("Pick a photo");
    try {
      await createStory.mutateAsync({
        imageFile: file,
        caption: caption.trim() || undefined,
        onProgress: setPct,
      });
      toast.success("Wave added!");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    }
  };

  if (!open) return null;

  const node = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/50 backdrop-blur-[24px] flex items-end sm:items-center justify-center"
        style={{ zIndex: 99999 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card/75 w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-elevated overflow-hidden backdrop-blur-xl"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-display font-extrabold text-lg text-foreground">New Wave</h2>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary"><X className="w-5 h-5" /></button>
          </div>

          <div className="p-5 space-y-4">
            {!preview ? (
              <button onClick={() => fileRef.current?.click()}
                className="w-full aspect-[3/4] rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 hover:border-primary/50">
                <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center">
                  <ImageIcon className="w-7 h-7 text-primary-foreground" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">Pick a photo for your Wave</p>
              </button>
            ) : (
              <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-black">
                <img src={preview} alt="" className="w-full h-full object-cover" />
                {caption && (
                  <div className="absolute bottom-3 inset-x-3 bg-black/40 backdrop-blur-sm rounded-xl px-3 py-2">
                    <p className="text-white text-sm font-display font-bold drop-shadow">{caption}</p>
                  </div>
                )}
              </div>
            )}

            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />

            <div className="relative">
              <textarea
                ref={taRef}
                value={caption}
                onChange={handleCaptionChange}
                placeholder="Add text, #hashtags or @mentions..."
                rows={2}
                className="w-full bg-secondary rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              <AnimatePresence>
                {showMentions && mentionUsers && mentionUsers.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    className="absolute left-0 right-0 bottom-full mb-1 bg-card border border-border rounded-2xl shadow-elevated max-h-48 overflow-y-auto z-20"
                  >
                    {mentionUsers.map((u: any) => (
                      <button key={u.user_id} onClick={() => { insertText(`@${u.username}`); setShowMentions(false); }}
                        className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-secondary/80">
                        <img src={u.avatar_url || ""} className="w-8 h-8 rounded-full bg-secondary" />
                        <div>
                          <p className="text-sm font-display font-bold">@{u.username}</p>
                          <p className="text-xs text-muted-foreground">{u.display_name}</p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex gap-2">
              <button onClick={() => insertText("#")} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-sm font-display font-bold">
                <Hash className="w-4 h-4 text-primary" /> Hashtag
              </button>
              <button onClick={() => insertText("@")} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-sm font-display font-bold">
                <AtSign className="w-4 h-4 text-accent" /> Mention
              </button>
            </div>

            {createStory.isPending && <UploadProgress value={pct} label="Streaming your Wave" />}

            <button
              onClick={submit}
              disabled={!file || createStory.isPending}
              className="w-full py-3.5 rounded-2xl gradient-brand text-primary-foreground font-display font-extrabold shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {createStory.isPending ? <><Loader2 className="w-5 h-5 animate-spin" /> {Math.round(pct)}%</> : "Share Wave"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(node, document.body);
};

export default StoryComposer;
