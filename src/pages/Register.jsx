import { useState } from "react";
import api from "../api/axios";
import PasswordInput from "../components/PasswordInput";
import ThemeToggle from "../components/ThemeToggle";
import "./auth.css";

function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setSuccess("");

    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Please fill in all fields (username, email, and password).");
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address (e.g., name@example.com).");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match! Please check and try again.");
      return;
    }

    if (password.length < 4) {
      setError("Password must be at least 4 characters long.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("register/", {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirm_password: confirmPassword,
      });

      setSuccess(res.data.message || "Account created successfully! Redirecting to login...");
      setUsername("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError("Registration failed. Please check your network or try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-top-bar">
        <ThemeToggle />
      </div>

      <div className="auth-card">
        <h2>📝 Create Account</h2>
        <p className="auth-card-subtitle">
          Join FinTrack to manage and track your wealth effortlessly
        </p>

        {error && <div className="auth-alert-error">{error}</div>}
        {success && <div className="auth-alert-success">{success}</div>}

        <form onSubmit={handleRegister}>
          <div className="auth-input-group">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="auth-input-group">
            <input
              type="email"
              placeholder="Email Address (e.g. name@example.com)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <PasswordInput
            placeholder="Password (min 4 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />

          <PasswordInput
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />

          <button type="submit" disabled={loading} className="auth-submit-btn">
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="auth-footer-text">
          Already have an account? <a href="/login">Login here</a>
        </p>
      </div>
    </div>
  );
}

export default Register;