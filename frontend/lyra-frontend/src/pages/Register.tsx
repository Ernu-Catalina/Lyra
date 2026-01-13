import { useState } from "react";
import "./AuthForm.css";
import api from "../api/client";
import { useAuth } from "../auth/useAuth";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";



export default function Register() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await api.post("/auth/register", {
        email,
        password,
      });

      login(res.data.access_token);
      navigate("/projects");
    } catch (err: unknown) {
      interface AxiosError {
        response?: {
          data?: {
            detail?: string;
          };
        };
      }
      const error = err as AxiosError;
      if (error.response?.data?.detail) {
        setError(error.response.data.detail);
      } else {
        setError("Registration failed");
      }
    }
  };

  return (
    <div>
      <h2>Register</h2>

      <form onSubmit={handleSubmit}>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Register</button>
      </form>
      <p>
         Already have an account? <Link to="/login">Login</Link>
      </p>

      {error && <p className="auth-error">{error}</p>}
    </div>
  );
}
