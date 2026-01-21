// features/auth/components/AuthForm.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../../api/client";
import { useAuth } from "../../../auth/useAuth";

interface AuthFormProps {
  mode: "login" | "register";
}

export default function AuthForm({ mode }: AuthFormProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    if (isLoading) return;
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const res = await api.post(endpoint, { email, password });
      login(res.data.access_token);
      navigate("/projects");
    } catch (err: unknown) {
      interface AxiosError { response?: { data?: { detail?: string } } }
      const error = err as AxiosError;
      setError(error.response?.data?.detail ?? `${mode === "login" ? "Login" : "Registration"} failed`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>{mode === "login" ? "Login" : "Register"}</h2>

      <form onSubmit={handleSubmit}>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />

        <button type="submit" disabled={isLoading}>{isLoading ? "Loading..." : mode === "login" ? "Login" : "Register"}</button>
      </form>

      <p>
        {mode === "login" ? "Don't have an account?" : "Already have an account?"} <Link to={mode === "login" ? "/register" : "/login"}>{mode === "login" ? "Register" : "Login"}</Link>
      </p>

      {error && <p className="auth-error">{error}</p>}
    </div>
  );
}