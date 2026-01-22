// features/auth/components/AuthForm.tsx
import { useState, useEffect } from "react";
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

export default function AuthForm({ mode }: AuthFormProps) {
  const navigate = useNavigate();
  const isLogin = mode === "login";
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [emailError, setEmailError] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleEmailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    setEmailError("");

    if (val && !validateEmail(val)) {
      setEmailError("Please enter a valid email address");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    if (!password) {
      setFormError("Password is required");
      return;
    }

    if (!isLogin && !name.trim()) {
      setFormError("Full name is required");
      return;
    }

    setLoading(true);

    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const body = isLogin ? { email, password } : { name, email, password };

      const res = await api.post(endpoint, body);
      const data = res.data;

      if (res.status !== 200) {
        throw new Error(data.detail || data.message || "Authentication failed");
      }

      // Store token (adjust according to your auth system)
      localStorage.setItem("token", data.access_token);
      login(data.access_token);
      navigate("/projects");
    } catch (err: any) {
      if (!isLogin && err.message.includes("Email already registered")) {
        setEmailError(err.message);
      } else {
        setFormError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={isLogin ? "Sign In" : "Create Account"}
      subtitle={isLogin ? "Welcome back — let's get writing" : "Join DraftFlow and start collaborating"}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {!isLogin && (
          <AuthInput
            label="Full Name"
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        )}

        <AuthInput
          label="Email Address"
          id="email"
          type="email"
          value={email}
          onChange={handleEmailChange}
          error={emailError}
          required
          autoComplete="email"
        />

        <AuthInput
          label="Password"
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete={isLogin ? "current-password" : "new-password"}
        />

        {formError && (
          <p className="text-red-600 text-sm text-center font-medium">
            {formError}
          </p>
        )}

        <AuthButton type="submit" loading={loading}>
          {isLogin ? "Sign In" : "Create Account"}
        </AuthButton>
      </form>

      <div className="mt-8 text-center space-y-3 text-sm">
        {isLogin ? (
          <>
            <p className="text-[var(--text-secondary)]">
              New here? <AuthLink to="/register">Create an account</AuthLink>
            </p>
            <p>
              <AuthLink to="/forgot-password">Forgot your password?</AuthLink>
            </p>
          </>
        ) : (
          <p className="text-[var(--text-secondary)]">
            Already have an account? <AuthLink to="/login">Sign in</AuthLink>
          </p>
        )}
      </div>
    </AuthLayout>
  );
}