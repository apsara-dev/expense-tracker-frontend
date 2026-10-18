import { useState, useEffect } from "react";
import api from "../api/axios";
import PasswordInput from "../components/PasswordInput";
import ThemeToggle from "../components/ThemeToggle";
import "./auth.css";

function ForgotPassword() {
  const [step, setStep] = useState(1); // 1 = Request OTP, 2 = Verify & Reset
  const [identifier, setIdentifier] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  // STEP 1: REQUEST OTP
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setSuccess("");

    if (!identifier.trim()) {
      setError("Please enter your registered email address or username.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("forgot-password/request-otp/", {
        email: identifier.trim(),
        username: identifier.trim(),
      });

      setSuccess(res.data.message || "Verification code sent to your email!");
      setMaskedEmail(res.data.email || identifier.trim());
      if (res.data.dev_otp) {
        setDevOtp(res.data.dev_otp);
        setOtp(res.data.dev_otp);
      }
      setStep(2);
      setResendCooldown(45); // 45 seconds countdown before allowing resend
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        "Could not send verification code. Please check your email or username.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: VERIFY OTP AND RESET PASSWORD
  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setSuccess("");

    if (!otp.trim() || !newPassword || !confirmPassword) {
      setError("Please fill in the 6-digit OTP and your new password.");
      return;
    }

    if (otp.trim().length !== 6) {
      setError("Please enter a valid 6-digit OTP code.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match! Please check and try again.");
      return;
    }

    if (newPassword.length < 4) {
      setError("New password must be at least 4 characters long.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("forgot-password/reset/", {
        email: identifier.trim(),
        otp: otp.trim(),
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setSuccess(res.data.message || "Password reset successfully! Redirecting to login...");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        window.location.href = "/login";
      }, 1600);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        "Password reset failed. Please check the OTP code and try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await api.post("forgot-password/request-otp/", {
        email: identifier.trim(),
        username: identifier.trim(),
      });
      if (res.data.dev_otp) {
        setDevOtp(res.data.dev_otp);
        setOtp(res.data.dev_otp);
      }
      setSuccess("New verification code sent to your email!");
      setResendCooldown(45);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to resend verification code.");
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
        {/* Step Indicator Header */}
        <div className="otp-step-header">
          <span className="otp-step-badge">
            Step {step} of 2: {step === 1 ? "Email Verification" : "Enter OTP & Password"}
          </span>
        </div>

        <h2>🔑 Reset Password</h2>
        <p className="auth-card-subtitle">
          {step === 1
            ? "Enter your registered email address to receive a 6-digit OTP"
            : `Enter the 6-digit code sent to ${maskedEmail || "your email"}`}
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

        {/* STEP 1 FORM: ENTER EMAIL / USERNAME */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp}>
            <input
              type="text"
              placeholder="Registered Email or Username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="email"
              required
            />

            <button type="submit" disabled={loading} className="auth-submit-btn">
              {loading ? "Sending OTP Code..." : "Send Verification OTP 📩"}
            </button>
          </form>
        )}

        {/* STEP 2 FORM: ENTER OTP & NEW PASSWORD */}
        {step === 2 && (
          <form onSubmit={handleResetPassword}>
            <div className="otp-input-wrap">
              <input
                type="text"
                placeholder="Enter 6-Digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                className="otp-code-input"
                autoComplete="one-time-code"
                required
              />
            </div>

            <PasswordInput
              placeholder="New Password (min 4 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />

            <PasswordInput
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />

            <button type="submit" disabled={loading} className="auth-submit-btn">
              {loading ? "Verifying & Updating..." : "Verify OTP & Reset Password ✓"}
            </button>

            <div className="otp-action-row">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || loading}
                className="otp-resend-btn"
              >
                {resendCooldown > 0
                  ? `Resend OTP in ${resendCooldown}s`
                  : "Resend Verification Code"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setError("");
                  setSuccess("");
                }}
                className="otp-change-btn"
              >
                Change Email
              </button>
            </div>
          </form>
        )}

        <p className="auth-footer-text">
          Remember your password? <a href="/login">Back to Login</a>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
