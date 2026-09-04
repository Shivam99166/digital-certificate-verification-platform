import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function ForgotPassword() {
  const [email, setEmail]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: "420px" }}>
        {/* Logo */}
        <div style={{ marginBottom: "28px", textAlign: "center" }}>
          <div style={{ fontSize: "40px", marginBottom: "10px" }}>🏅</div>
          <div style={{ fontWeight: 800, fontSize: "20px" }}>CertVault</div>
        </div>

        {!sent ? (
          <>
            <h1 className="auth-title">Forgot Password</h1>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", textAlign: "center", marginBottom: "28px", lineHeight: 1.6 }}>
              Enter the email address associated with your account and we'll send you a password reset link.
            </p>

            {error && (
              <div className="alert alert-error" role="alert" style={{ marginBottom: "20px" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="forgot-email">Email Address</label>
                <input
                  id="forgot-email"
                  className="form-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                />
              </div>

              <button
                id="forgot-password-submit"
                type="submit"
                className="btn btn-primary btn-full btn-lg"
                disabled={loading || !email.trim()}
                style={{ marginTop: "8px" }}
              >
                {loading ? (
                  <><span className="spinner" aria-hidden="true" /> Sending…</>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>
          </>
        ) : (
          /* ── Success state ── */
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "56px", marginBottom: "16px", lineHeight: 1 }}>📧</div>
            <h1 className="auth-title">Check your inbox</h1>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "28px", lineHeight: 1.7 }}>
              If an account exists for <strong style={{ color: "var(--text-primary)" }}>{email}</strong>,
              you'll receive a password reset link shortly.
              <br /><br />
              The link expires in <strong style={{ color: "var(--primary-light)" }}>1 hour</strong>.
              Check your spam folder if you don't see it.
            </p>
            <button
              id="resend-reset-btn"
              className="btn btn-secondary btn-full"
              onClick={() => { setSent(false); setEmail(""); }}
            >
              ← Try a different email
            </button>
          </div>
        )}

        <div style={{ marginTop: "24px", textAlign: "center" }}>
          <Link to="/login" style={{ color: "var(--primary-light)", fontSize: "14px" }}>
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
