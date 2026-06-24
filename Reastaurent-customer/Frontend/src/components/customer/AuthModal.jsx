import { useState } from "react";
import { X } from "lucide-react";
import { customerAuthStorage } from "../../auth/customerAuthStorage";
import { loginCustomer, registerCustomer } from "../../services/customerAuthApi";
import { AnimatePresence, motion } from "framer-motion";

function Notice({ tone = "success", message }) {
  if (!message) return null;
  const isSuccess = tone === "success";
  return (
    <div
      className={`rounded-xl px-[14px] py-3 text-[13px] mb-4 ${
        isSuccess
          ? "border border-green-500/25 bg-green-500/15 text-green-200"
          : "border border-red-500/25 bg-red-500/10 text-red-200"
      }`}
    >
      {message}
    </div>
  );
}

export default function AuthModal({ open, onClose, onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
  });

  const isLogin = mode === "login";

  const handleLogin = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    try {
      const session = await loginCustomer(loginForm);
      customerAuthStorage.setSession({
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        customer: session.customer,
      });
      onAuthenticated(session.customer);
      onClose();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    try {
      const session = await registerCustomer(registerForm);
      customerAuthStorage.setSession({
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        customer: session.customer,
      });
      onAuthenticated(session.customer);
      onClose();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-[301] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full max-w-md bg-[#110e0d] border border-white/10 rounded-3xl shadow-2xl overflow-hidden pointer-events-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/5">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-white">
                    {isLogin ? "Welcome Back" : "Create Account"}
                  </h2>
                  <p className="mt-1 text-sm text-white/50">
                    {isLogin ? "Sign in to your account" : "Join our coffee club"}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white transition-colors hover:bg-cafe-gold hover:text-[#110e0d]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6">
                <div className="mb-6 flex gap-2">
                  {["login", "register"].map((tab) => {
                    const active = tab === mode;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => {
                          setMode(tab);
                          setErrorMessage("");
                        }}
                        className={`flex-1 rounded-xl px-3 py-2.5 font-bold capitalize transition-all ${
                          active
                            ? "bg-cafe-gold text-[#110e0d] shadow-[0_0_15px_rgba(202,138,4,0.3)]"
                            : "border border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06]"
                        }`}
                      >
                        {tab}
                      </button>
                    );
                  })}
                </div>

                <Notice tone="error" message={errorMessage} />

                <form onSubmit={isLogin ? handleLogin : handleRegister} className="flex flex-col gap-4">
                  {isLogin ? (
                    <>
                      <input
                        type="email"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="Email address"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/40 focus:border-cafe-gold/50 focus:ring-1 focus:ring-cafe-gold/50 outline-none transition-all"
                        required
                      />
                      <input
                        type="password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                        placeholder="Password"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/40 focus:border-cafe-gold/50 focus:ring-1 focus:ring-cafe-gold/50 outline-none transition-all"
                        required
                      />
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={registerForm.name}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Full name"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/40 focus:border-cafe-gold/50 outline-none transition-all"
                        required
                      />
                      <input
                        type="email"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="Email address"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/40 focus:border-cafe-gold/50 outline-none transition-all"
                        required
                      />
                      <input
                        type="tel"
                        value={registerForm.phone}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="Mobile number"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/40 focus:border-cafe-gold/50 outline-none transition-all"
                        required
                      />
                      <input
                        type="password"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                        placeholder="Password"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/40 focus:border-cafe-gold/50 outline-none transition-all"
                        required
                      />
                      <input
                        type="password"
                        value={registerForm.confirm_password}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, confirm_password: e.target.value }))}
                        placeholder="Confirm password"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/40 focus:border-cafe-gold/50 outline-none transition-all"
                        required
                      />
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-2 w-full bg-cafe-gold text-[#110e0d] font-bold uppercase tracking-wider py-4 rounded-xl transition-all hover:bg-white hover:shadow-[0_0_20px_rgba(202,138,4,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (isLogin ? "Signing in..." : "Creating account...") : (isLogin ? "Sign In" : "Register")}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
