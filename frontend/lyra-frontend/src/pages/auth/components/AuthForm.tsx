// features/auth/components/AuthForm.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import AuthInput from "./AuthInput";
import AuthButton from "./AuthButton";
import AuthLink from "./AuthLink";
import api from "../../../api/client";
import { useAuth } from "../../../auth/useAuth";

type Mode = "login" | "register";

interface AuthFormProps {
  mode: Mode;
}

// ── Verification-pending screen ────────────────────────────────────────────────
function VerificationPending({ email }: { email: string }) {
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const handleResend = async () => {
    setResendLoading(true);
    setResendMessage("");
    try {
      await api.post("/auth/resend-verification", { email });
      setResendMessage("A new verification email has been sent.");
    } catch {
      setResendMessage("Something went wrong. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Check your email"
      subtitle="We sent a verification link to activate your account"
    >
      <div className="space-y-6 text-center">
        <div className="text-5xl select-none">✉️</div>
        <p className="text-(--text-secondary) text-sm leading-relaxed">
          A verification link was sent to{" "}
          <span className="text-(--text-primary) font-medium">{email}</span>.
          Click it to activate your account, then come back to sign in.
        </p>

        {resendMessage ? (
          <p className="text-sm text-(--text-secondary)">{resendMessage}</p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading}
            className="text-sm text-(--accent) hover:underline disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {resendLoading ? "Sending…" : "Resend verification email"}
          </button>
        )}

        <p className="text-sm text-(--text-secondary)">
          Already verified? <AuthLink to="/login">Sign in</AuthLink>
        </p>
      </div>
    </AuthLayout>
  );
}

// ── Main form ──────────────────────────────────────────────────────────────────
export default function AuthForm({ mode }: AuthFormProps) {
  const navigate = useNavigate();
  const isLogin = mode === "login";
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [nameError, setNameError] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  // Register: show verification-pending screen after success
  const [verificationPending, setVerificationPending] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  // Login: unverified-email resend state
  const [showResend, setShowResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setEmailError("");
    setPasswordError("");
    setNameError("");
    setShowResend(false);
    setResendMessage("");

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    if (!password) {
      setPasswordError("Password is required");
      return;
    }
    if (!isLogin && !name.trim()) {
      setNameError("Full name is required");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const res = await api.post("/auth/login", {
          email,
          password,
          remember_me: rememberMe,
        });
        login(res.data.access_token);
        navigate("/projects");
      } else {
        await api.post("/auth/register", { name, email, password });
        setPendingEmail(email);
        setVerificationPending(true);
      }
    } catch (err: any) {
      // FastAPI 422 field validation errors
      if (err.response?.status === 422 && err.response.data?.errors) {
        const errs: any[] = err.response.data.errors;
        const fieldErrors: Record<string, string[]> = {};
        errs.forEach((e) => {
          const loc = Array.isArray(e.loc) ? e.loc : [e.loc];
          const key = loc[loc.length - 1];
          fieldErrors[key] = fieldErrors[key] || [];
          fieldErrors[key].push(e.msg);
        });
        if (fieldErrors.email) setEmailError(fieldErrors.email.join(" "));
        if (fieldErrors.password) setPasswordError(fieldErrors.password.join(" "));
        if (fieldErrors.name) setNameError(fieldErrors.name.join(" "));
        return;
      }

      const detail: string =
        err.response?.data?.detail ?? err.message ?? "Authentication failed";

      if (detail === "email_not_verified" || detail.includes("not verified")) {
        setFormError("Please verify your email before signing in.");
        setShowResend(true);
        return;
      }

      if (!isLogin && detail.includes("Email already registered")) {
        setEmailError(detail);
      } else {
        setFormError(detail);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setResendMessage("");
    try {
      await api.post("/auth/resend-verification", { email });
      setResendMessage("Verification email sent — check your inbox.");
    } catch {
      setResendMessage("Something went wrong. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  if (verificationPending) {
    return <VerificationPending email={pendingEmail} />;
  }

  return (
    <AuthLayout
      title={isLogin ? "Sign In" : "Create Account"}
      subtitle={isLogin ? "Welcome back — let's get writing" : "Join Lyra"}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {!isLogin && (
          <AuthInput
            label="Full Name"
            id="name"
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setNameError(""); }}
            error={nameError}
            required
            autoComplete="name"
          />
        )}

        <AuthInput
          label="Email Address"
          id="email"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
          error={emailError}
          required
          autoComplete="email"
        />

        <AuthInput
          label="Password"
          id="password"
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }}
          error={passwordError}
          required
          autoComplete={isLogin ? "current-password" : "new-password"}
        />

        {/* Remember Me — login only */}
        {isLogin && (
          <label className="flex items-center gap-2.5 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-(--border) accent-(--accent) cursor-pointer"
            />
            <span className="text-sm text-(--text-secondary) group-hover:text-(--text-primary) transition-colors">
              Remember me
            </span>
          </label>
        )}

        {/* Form-level error */}
        {formError && (
          <p className="text-(--text-secondary) text-sm text-center font-medium">
            {formError}
          </p>
        )}

        {/* Resend option when login is blocked by unverified email */}
        {showResend && (
          <div className="text-center">
            {resendMessage ? (
              <p className="text-sm text-(--text-secondary)">{resendMessage}</p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="text-sm text-(--accent) hover:underline disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {resendLoading ? "Sending…" : "Resend verification email"}
              </button>
            )}
          </div>
        )}

        <AuthButton type="submit" loading={loading}>
          {isLogin ? "Sign In" : "Create Account"}
        </AuthButton>
      </form>

      <div className="mt-8 text-center space-y-3 text-sm">
        {isLogin ? (
          <>
            <p className="text-(--text-secondary)">
              New here? <AuthLink to="/register">Create an account</AuthLink>
            </p>
            <p>
              <AuthLink to="/forgot-password">Forgot your password?</AuthLink>
            </p>
          </>
        ) : (
          <p className="text-(--text-secondary)">
            Already have an account? <AuthLink to="/login">Sign in</AuthLink>
          </p>
        )}
      </div>
    </AuthLayout>
  );
}
