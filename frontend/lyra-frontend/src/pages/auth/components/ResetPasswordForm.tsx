// features/auth/components/ResetPasswordForm.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import AuthInput from "./AuthInput";
import AuthButton from "./AuthButton";
import CodeInput from "./CodeInput";
import api from "../../../api/client";

export default function ResetPasswordForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!code || !/^\d{6}$/.test(code)) {
      setError("Invalid or missing reset code");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await api.patch("/auth/reset-password", { email, code, new_password: password });
      const data = res.data;
      if (res.status !== 200) throw new Error(data.detail || "Invalid or expired code");
      setSuccess(true);
    } catch (err: any) {
      setError("Invalid or expired code. Please request a new one.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout title="Password Reset">
        <div className="text-center space-y-6">
          <div className="text-green-600 text-xl font-medium">
            Your password has been reset successfully!
          </div>
          <AuthButton onClick={() => navigate("/login", { replace: true })}>
            Go to Login
          </AuthButton>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Enter Reset Code" subtitle="Check your email for the 6-digit code">
      <form onSubmit={handleSubmit} className="space-y-6">
        <AuthInput
          id="email"
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <CodeInput
          value={code}
          onChange={setCode}
          length={6}
          label="Reset Code"
        />

        <AuthInput
          id="password"
          label="New Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />

        <AuthInput
          id="confirm-password"
          label="Confirm New Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
        />

        {error && <p className="text-red-600 text-sm text-center">{error}</p>}

        <AuthButton type="submit" loading={loading}>
          Reset Password
        </AuthButton>
      </form>

      <p className="mt-6 text-center text-gray-400">
        Didn't receive code?{" "}
        <button
          type="button"
          onClick={() => navigate("/forgot-password", { replace: true })}
          className="text-indigo-400 hover:text-indigo-300 font-medium"
        >
          Resend
        </button>
      </p>
    </AuthLayout>
  );
}