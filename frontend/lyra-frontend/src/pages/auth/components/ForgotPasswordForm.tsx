// features/auth/components/ForgotPasswordForm.tsx
import { useState } from "react";
import AuthLayout from "./AuthLayout";
import AuthInput from "./AuthInput";
import AuthButton from "./AuthButton";
import AuthLink from "./AuthLink";
import api from "../../../api/client";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await api.post("/auth/forgot-password", { email });
      const data = res.data;
      if (res.status !== 200) throw new Error(data.detail || "Failed to send reset code");
      setMessage(data.message);
    } catch (err: any) {
      setError("Failed to send reset code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Reset your password" subtitle="Enter your email to receive a reset code">
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthInput
          id="email"
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        {error && <p className="text-red-600 text-sm text-center">{error}</p>}
        {message && <p className="text-green-600 text-sm text-center">{message}</p>}

        <AuthButton type="submit" loading={loading}>
          Send Reset Code
        </AuthButton>
      </form>

      <p className="mt-6 text-center text-[var(--text-secondary)]">
        Remember your password? <AuthLink to="/login">Sign in</AuthLink>
      </p>
    </AuthLayout>
  );
}