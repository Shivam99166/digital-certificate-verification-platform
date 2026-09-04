import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import api from "../services/api";
import GoogleAuthButton from "../components/GoogleAuthButton";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const successMessage = location.state?.message || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      const { token, user } = response.data;

      if (!token) throw new Error("No token received from server");

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      if (user.role === "admin") {
        navigate("/admin");
      } else if (user.role === "recipient") {
        navigate("/recipient-dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon" aria-hidden="true">🏅</div>
          <span className="auth-logo-name">CertVault</span>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your account to continue</p>

        {successMessage && (
          <div className="alert alert-success" role="alert">
            {successMessage}
          </div>
        )}

        {error && (
          <div id="login-error" className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        {/* Google Sign-In */}
        <GoogleAuthButton
          text="signin_with"
          onSuccess={(token, user) => {
            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify({
              id: user.id, name: user.name, email: user.email,
              organization: user.organization, role: user.role,
            }));
            if (user.role === "admin")          navigate("/admin");
            else if (user.role === "recipient") navigate("/recipient-dashboard");
            else                                navigate("/dashboard");
          }}
          onError={(msg) => setError(msg)}
        />

        {/* Divider */}
        <div className="auth-divider"><span>or sign in with email</span></div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label className="form-label" htmlFor="login-password" style={{ margin: 0 }}>Password</label>
              <Link
                to="/forgot-password"
                id="forgot-password-link"
                style={{ fontSize: "13px", color: "var(--primary-light)" }}
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="login-password"
              className="form-input"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            style={{ marginTop: "8px" }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="auth-footer">
          Don&apos;t have an account?{" "}
          <Link to="/register" id="go-to-register">Create one free</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;