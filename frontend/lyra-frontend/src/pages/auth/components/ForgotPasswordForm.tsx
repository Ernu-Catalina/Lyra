import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import AuthInput from "./AuthInput";
import AuthButton from "./AuthButton";
import AuthLink from "./AuthLink";
import CodeInput from "./CodeInput";
import api from "../../../api/client";

export default function ForgotPasswordForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"email" | "reset">("email");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setMessage(data.message || "Code sent! Check your email.");
      setStep("reset");
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", { email, code, new_password: password });
      setMessage("Password reset successfully!");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  if (step === "email") {
    return (
      <AuthLayout title="Reset your password" subtitle="Enter your email to receive a reset code">
        <form onSubmit={handleSubmit} className="space-y-5">
          <AuthInput label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {error && <p className="text-[var(--accent)] text-sm text-center">{error}</p>}
          {message && <p className="text-green-400 text-sm text-center">{message}</p>}
          <AuthButton type="submit" loading={loading}>Send Reset Code</AuthButton>
        </form>
        <p className="mt-6 text-center text-gray-400">
          Remember your password? <AuthLink to="/login">Sign in</AuthLink>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Enter Reset Code" subtitle="Check your email for the 6-digit code">
      <form onSubmit={handleReset} className="space-y-6">
        <CodeInput value={code} onChange={setCode} />
        <AuthInput label="New Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <AuthInput label="Confirm Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        {error && <p className="text-[var(--accent)] text-sm text-center">{error}</p>}
        {message && <p className="text-green-400 text-sm text-center">{message}</p>}
        <AuthButton type="submit" loading={loading}>Reset Password</AuthButton>
      </form>
      <p className="mt-6 text-center text-gray-400">
        Didn't receive the code? <button type="button" onClick={() => setStep("email")} className="text-indigo-400 hover:text-indigo-300">Resend</button>
      </p>
    </AuthLayout>
  );
}