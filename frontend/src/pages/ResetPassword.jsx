import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";

function ResetPassword() {
  const { token }   = useParams();
  const navigate    = useNavigate();

  const [password, setPassword]         = useState("");
  const [confirm, setConfirm]           = useState("");
  const [showPass, setShowPass]         = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [success, setSuccess]           = useState(false);

  const strength = (() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8)  score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  })();

  const strengthLabel = ["", "Very weak", "Weak", "Fair", "Good", "Strong"];
  const strengthColor = ["", "var(--error-light)", "var(--warning-light)", "var(--warning-light)", "var(--success-light)", "var(--success-light)"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post(`/auth/reset-password/${token}`, { password });

      // Auto-login: store the returned token + user
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify({
        id:           res.data.user.id,
        name:         res.data.user.name,
        email:        res.data.user.email,
        organization: res.data.user.organization,
        role:         res.data.user.role,
      }));

      setSuccess(true);

      // Redirect to appropriate dashboard after 2.5 seconds
      setTimeout(() => {
        const role = res.data.user.role;
        if (role === "admin")        navigate("/admin");
        else if (role === "recipient") navigate("/recipient-dashboard");
        else                           navigate("/dashboard");
      }, 2500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: "420px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <h1 className="auth-title">Invalid Link</h1>
          <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
            This password reset link is missing a token. Please request a new one.
          </p>
          <Link to="/forgot-password">
            <button className="btn btn-primary btn-full">Request New Link</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: "420px" }}>
        {/* Logo */}
        <div style={{ marginBottom: "28px", textAlign: "center" }}>
          <div style={{ fontSize: "40px", marginBottom: "10px" }}>🏅</div>
          <div style={{ fontWeight: 800, fontSize: "20px" }}>CertVault</div>
        </div>

        {success ? (
          /* ── Success state ── */
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "56px", marginBottom: "16px", lineHeight: 1 }}>✅</div>
            <h1 className="auth-title">Password Reset!</h1>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "16px", lineHeight: 1.7 }}>
              Your password has been updated successfully.
              <br />You're now being signed in…
            </p>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <span className="spinner spinner--lg" aria-label="Signing in" />
            </div>
          </div>
        ) : (
          <>
            <h1 className="auth-title">Set New Password</h1>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", textAlign: "center", marginBottom: "28px" }}>
              Choose a strong new password for your CertVault account.
            </p>

            {error && (
              <div className="alert alert-error" role="alert" style={{ marginBottom: "20px" }}>
                {error}
                {error.includes("expired") && (
                  <div style={{ marginTop: "10px" }}>
                    <Link to="/forgot-password" style={{ color: "var(--error-light)", textDecoration: "underline", fontSize: "13px" }}>
                      → Request a new reset link
                    </Link>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* New password */}
              <div className="form-group">
                <label className="form-label" htmlFor="new-password">New Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    id="new-password"
                    className="form-input"
                    type={showPass ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                    autoComplete="new-password"
                    style={{ paddingRight: "44px" }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", padding: "4px 8px" }}
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? "🙈" : "👁"}
                  </button>
                </div>

                {/* Strength bar */}
                {password && (
                  <div style={{ marginTop: "8px" }}>
                    <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            height: "4px",
                            borderRadius: "2px",
                            background: i <= strength ? strengthColor[strength] : "var(--border)",
                            transition: "background 0.25s",
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ fontSize: "12px", color: strengthColor[strength] }}>
                      {strengthLabel[strength]}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="form-group">
                <label className="form-label" htmlFor="confirm-password">Confirm Password</label>
                <input
                  id="confirm-password"
                  className="form-input"
                  type={showPass ? "text" : "password"}
                  placeholder="Repeat your new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  style={{ borderColor: confirm && confirm !== password ? "var(--error)" : undefined }}
                />
                {confirm && confirm !== password && (
                  <p style={{ fontSize: "12px", color: "var(--error-light)", marginTop: "5px" }}>
                    Passwords do not match
                  </p>
                )}
              </div>

              <button
                id="reset-password-submit"
                type="submit"
                className="btn btn-primary btn-full btn-lg"
                disabled={loading || !password || !confirm || password !== confirm}
                style={{ marginTop: "8px" }}
              >
                {loading ? (
                  <><span className="spinner" aria-hidden="true" /> Updating…</>
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>
          </>
        )}

        {!success && (
          <div style={{ marginTop: "24px", textAlign: "center" }}>
            <Link to="/login" style={{ color: "var(--primary-light)", fontSize: "14px" }}>
              ← Back to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
