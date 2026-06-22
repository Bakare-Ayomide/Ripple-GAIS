import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Waves, ArrowRight, Eye, EyeOff, Settings } from "lucide-react";
import { toast } from "sonner";

type Mode = "signin" | "signup" | "forgot";

const Auth = () => {
  const { user, loading, signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "nonbinary">("male");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showServerSettings, setShowServerSettings] = useState(false);
  const [tempApiUrl, setTempApiUrl] = useState(() => {
    return localStorage.getItem("ripple_custom_api_url") || "";
  });

  const handleSaveApiUrl = () => {
    let cleanUrl = tempApiUrl.trim();
    if (cleanUrl) {
      if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
        cleanUrl = `https://${cleanUrl}`;
      }
      if (cleanUrl.endsWith("/")) {
        cleanUrl = cleanUrl.slice(0, -1);
      }
      localStorage.setItem("ripple_custom_api_url", cleanUrl);
      toast.success(`Server URL updated to ${cleanUrl}`);
    } else {
      localStorage.removeItem("ripple_custom_api_url");
      toast.success("Using default production API configuration.");
    }
    setShowServerSettings(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );

  if (user) {
    if (user.user_metadata?.needs_onboarding === true) {
      return <Navigate to="/onboarding" replace />;
    } else {
      return <Navigate to="/" replace />;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      if (mode === "forgot") {
        const { error } = await resetPassword(email);
        if (error) throw error;
        toast.success("Reset link sent! Check your email.");
        setMode("signin");
      } else if (mode === "signup") {
        if (username.length < 3) { toast.error("Username must be at least 3 characters"); setSubmitting(false); return; }
        if (password.length < 6) { toast.error("Password must be at least 6 characters"); setSubmitting(false); return; }
        const { error } = await signUp(email, password, username, gender);
        if (error) throw error;
        toast.success("Welcome to Ripple! 🌊");
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-primary/10 blur-[100px]" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 rounded-full bg-accent/10 blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm z-10"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center">
            <Waves className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
            Ripple
          </h1>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl p-6 shadow-elevated border border-border">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="font-display text-xl font-bold text-foreground mb-1">
                {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create account" : "Reset password"}
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                {mode === "signin"
                  ? "Sign in to continue making waves"
                  : mode === "signup"
                  ? "Join the wave — it's free"
                  : "We'll send you a reset link"}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <>
                    <input
                      type="text"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      className="w-full h-12 px-4 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground font-medium outline-none focus:ring-2 focus:ring-primary transition-shadow"
                      required
                      maxLength={20}
                    />
                    
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Align Gender Identity *</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["male", "female", "nonbinary"] as const).map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setGender(g)}
                            className={`h-10 rounded-xl font-display font-bold text-xs select-none transition-all border
                              ${gender === g
                                ? "gradient-brand text-primary-foreground border-transparent shadow shadow-primary/20"
                                : "bg-secondary text-foreground/85 border-border/40 hover:bg-muted"}`}
                          >
                            {g === "nonbinary" ? "Non-Binary" : g.charAt(0).toUpperCase() + g.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground font-medium outline-none focus:ring-2 focus:ring-primary transition-shadow"
                  required
                />
                {mode !== "forgot" && (
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-12 px-4 pr-12 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground font-medium outline-none focus:ring-2 focus:ring-primary transition-shadow"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                )}

                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-sm text-primary font-semibold hover:underline"
                  >
                    Forgot password?
                  </button>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 rounded-xl gradient-brand text-primary-foreground font-display font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-5 h-5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                  ) : (
                    <>
                      {mode === "signin" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer toggle */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          {mode === "signin" ? (
            <>Don't have an account?{" "}
              <button onClick={() => setMode("signup")} className="text-primary font-semibold hover:underline">Sign up</button>
            </>
          ) : (
            <>Already have an account?{" "}
              <button onClick={() => setMode("signin")} className="text-primary font-semibold hover:underline">Sign in</button>
            </>
          )}
        </p>
      </motion.div>

      {/* Connection gear button */}
      <div className="absolute top-4 right-4 z-20">
        <button 
          onClick={() => setShowServerSettings(true)}
          className="p-2.5 rounded-full bg-secondary/80 text-muted-foreground hover:text-foreground border border-border/40 backdrop-blur"
          title="Configure API Server"
        >
          <Settings className="w-5 h-5 animate-spin-slow" />
        </button>
      </div>

      {/* Absolute overlay modal for API Server Endpoint customization */}
      <AnimatePresence>
        {showServerSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl relative"
            >
              <h3 className="font-display font-extrabold text-lg text-foreground mb-1 flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" /> API Server Connection
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Configure the target API server endpoint to route requests. Ideal for web testing and native android app (APK) debugging.
              </p>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Server URL</label>
                  <input
                    type="url"
                    placeholder="https://ripple.zerolord.com"
                    value={tempApiUrl}
                    onChange={(e) => setTempApiUrl(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-secondary text-foreground text-sm font-medium border border-border/60 outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <p className="text-[10px] text-muted-foreground italic">
                    Leave completely empty to default to standard production API (or localhost).
                  </p>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    onClick={() => {
                      setShowServerSettings(false);
                      setTempApiUrl(localStorage.getItem("ripple_custom_api_url") || "");
                    }}
                    className="h-10 px-4 rounded-xl text-xs font-semibold hover:bg-secondary text-muted-foreground transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveApiUrl}
                    className="h-10 px-4 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-95 transition-all shadow-sm"
                  >
                    Save & Reconnect
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Auth;
