// src/pages/auth/VerifyEmail.page.tsx
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../api/client";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token found.");
      return;
    }

    api
      .get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(() => {
        setStatus("success");
        setMessage("Your email has been verified successfully!");
      })
      .catch((err) => {
        const detail = err.response?.data?.detail || "Verification failed. The link may be invalid or expired.";
        setStatus("error");
        setMessage(detail);
      });
  }, [token]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-[var(--accent)] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-[var(--text-primary)]">Verifying your email...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-6">
      <div className="max-w-md w-full text-center">
        {status === "success" ? (
          <>
            <div className="text-6xl mb-6">✅</div>
            <h1 className="text-3xl font-semibold text-[var(--text-primary)] mb-3">Email Verified!</h1>
            <p className="text-[var(--text-secondary)] mb-8">{message}</p>
            <button
              onClick={() => navigate("/login")}
              className="w-full py-3 px-6 bg-[var(--accent)] text-white rounded-lg font-medium hover:bg-[var(--accent)]/90 transition"
            >
              Go to Sign In
            </button>
          </>
        ) : (
          <>
            <div className="text-6xl mb-6">❌</div>
            <h1 className="text-3xl font-semibold text-[var(--text-primary)] mb-3">Verification Failed</h1>
            <p className="text-[var(--text-secondary)] mb-8">{message}</p>
            <button
              onClick={() => navigate("/register")}
              className="w-full py-3 px-6 bg-[var(--accent)] text-white rounded-lg font-medium hover:bg-[var(--accent)]/90 transition"
            >
              Back to Register
            </button>
          </>
        )}
      </div>
    </div>
  );
}