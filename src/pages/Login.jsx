import { useState, useEffect } from "react";
import api from "../api/axios";
import PasswordInput from "../components/PasswordInput";
import ThemeToggle from "../components/ThemeToggle";
import "./auth.css";

function Login() {
  const [step, setStep] = useState(1); // 1 = Credentials, 2 = 2FA OTP
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [usernameForOtp, setUsernameForOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devOtp, setDevOtp] = useState("");

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // STEP 1: VERIFY CREDENTIALS & TRIGGER LOGIN OTP
  const handleCredentialSubmit = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setSuccess("");

    if (!username.trim() || !password) {
      setError("Please enter your username/email and password.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("login/", {
        username: username.trim(),
        password,
      });

      // If 2FA OTP is required
      if (res.data.otp_required) {
        setUsernameForOtp(res.data.username || username.trim());
        setMaskedEmail(res.data.email || "");
        if (res.data.dev_otp) {
          setDevOtp(res.data.dev_otp);
          setOtp(res.data.dev_otp);
        }
        setSuccess(res.data.message || "Security verification code sent to your email!");
        setStep(2);
        setResendCooldown(45);
        return;
      }

      // If direct access returned (fallback)
      if (res.data.access) {
        localStorage.setItem("access", res.data.access);
        if (res.data.refresh) localStorage.setItem("refresh", res.data.refresh);
        if (res.data.username) localStorage.setItem("username", res.data.username);
        if (res.data.email) localStorage.setItem("email", res.data.email);
        window.location.href = "/dashboard";
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Login failed. Please check your credentials or network.");
      }
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: VERIFY LOGIN OTP
  const handleOtpSubmit = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setSuccess("");

    if (!otp.trim() || otp.trim().length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("login/verify-otp/", {
        username: usernameForOtp,
        otp: otp.trim(),
      });

      localStorage.setItem("access", res.data.access);
      if (res.data.refresh) localStorage.setItem("refresh", res.data.refresh);
      if (res.data.username) localStorage.setItem("username", res.data.username);
      if (res.data.email) localStorage.setItem("email", res.data.email);

      setSuccess("Identity verified! Loading dashboard...");

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 800);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Invalid or expired verification code. Please check and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendLoginOtp = async () => {
    if (resendCooldown > 0) return;
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await api.post("login/resend-otp/", {
        username: usernameForOtp,
      });
      if (res.data.dev_otp) {
        setDevOtp(res.data.dev_otp);
        setOtp(res.data.dev_otp);
      }
      setSuccess("A fresh verification code has been emailed to you!");
      setResendCooldown(45);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to resend code.");
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
        {step === 2 && (
          <div className="otp-step-header">
            <span className="otp-step-badge">2-Factor Security Verification</span>
          </div>
        )}

        <h2>{step === 1 ? "🔐 Welcome Back" : "🛡️ Enter Login OTP"}</h2>
        <p className="auth-card-subtitle">
          {step === 1
            ? "Log in with your username or registered email address"
            : `Enter the 6-digit security code sent to ${maskedEmail || "your email"}`}
        </p>

        {error && <div className="auth-alert-error">{error}</div>}
        {success && <div className="auth-alert-success">{success}</div>}

        {step === 2 && devOtp && (
          <div style={{
            background: "rgba(99, 102, 241, 0.1)",
            border: "1px dashed var(--color-primary, #6366f1)",
            borderRadius: "10px",
            padding: "8px 12px",
            fontSize: "12px",
            color: "var(--color-primary, #6366f1)",
            marginBottom: "14px",
            textAlign: "center",
            fontWeight: "600"
          }}>
            🔑 Dev Verification Code: <strong>{devOtp}</strong> (Console Backend)
          </div>
        )}

        {/* STEP 1: USERNAME/EMAIL + PASSWORD */}
        {step === 1 && (
          <form onSubmit={handleCredentialSubmit}>
            <input
              type="text"
              placeholder="Username or Email Address"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />

            <PasswordInput
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            <div className="auth-helper-row">
              <a href="/forgot-password" className="auth-link-forgot">
                Forgot password? Reset via OTP
              </a>
            </div>

            <button type="submit" disabled={loading} className="auth-submit-btn">
              {loading ? "Checking Credentials..." : "Continue to Login →"}
            </button>
          </form>
        )}

        {/* STEP 2: 2FA LOGIN OTP */}
        {step === 2 && (
          <form onSubmit={handleOtpSubmit}>
            <div className="otp-input-wrap">
              <input
                type="text"
                placeholder="Enter 6-Digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                className="otp-code-input"
                autoComplete="one-time-code"
                autoFocus
                required
              />
            </div>

            <button type="submit" disabled={loading} className="auth-submit-btn">
              {loading ? "Verifying Code..." : "Verify Code & Open Dashboard 🚀"}
            </button>

            <div className="otp-action-row">
              <button
                type="button"
                onClick={handleResendLoginOtp}
                disabled={resendCooldown > 0 || loading}
                className="otp-resend-btn"
              >
                {resendCooldown > 0
                  ? `Resend Code in ${resendCooldown}s`
                  : "Resend Security Code"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setOtp("");
                  setError("");
                  setSuccess("");
                }}
                className="otp-change-btn"
              >
                Change Account
              </button>
            </div>
          </form>
        )}

        <p className="auth-footer-text">
          New to FinTrack? <a href="/register">Create an Account</a>
        </p>
      </div>
    </div>
  );
}

export default Login;