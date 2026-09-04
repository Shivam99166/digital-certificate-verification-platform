import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import GoogleAuthButton from "../components/GoogleAuthButton";

function Register() {
  const navigate = useNavigate();

  const [role, setRole] = useState("organization");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    organization: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRoleChange = (r) => {
    setRole(r);
    setError("");
    if (r === "recipient") {
      setFormData((prev) => ({ ...prev, organization: "" }));
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role,
      };
      if (role === "organization") {
        payload.organization = formData.organization.trim();
      }

      await api.post("/auth/register", payload);

      navigate("/login", {
        state: { message: "Account created! Please sign in." },
      });
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
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

        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Choose your role to get started</p>

        {/* Google one-click sign-up for recipients */}
        {role === "recipient" && (
          <>
            <GoogleAuthButton
              text="signup_with"
              role="recipient"
              onSuccess={(token, user) => {
                localStorage.setItem("token", token);
                localStorage.setItem("user", JSON.stringify({
                  id: user.id, name: user.name, email: user.email,
                  organization: user.organization, role: user.role,
                }));
                navigate("/recipient-dashboard");
              }}
              onError={(msg) => setError(msg)}
            />
            <div className="auth-divider"><span>or register with email</span></div>
          </>
        )}

        {/* Role picker */}
        <div className="role-selector" role="group" aria-label="Account type">
          <button
            id="role-organization"
            type="button"
            className={`role-option ${role === "organization" ? "role-option--active" : ""}`}
            onClick={() => handleRoleChange("organization")}
            aria-pressed={role === "organization"}
          >
            <span className="role-option__icon">🏢</span>
            <span className="role-option__label">Organization</span>
            <span className="role-option__desc">Issue &amp; manage certs</span>
          </button>

          <button
            id="role-recipient"
            type="button"
            className={`role-option ${role === "recipient" ? "role-option--active" : ""}`}
            onClick={() => handleRoleChange("recipient")}
            aria-pressed={role === "recipient"}
          >
            <span className="role-option__icon">🎓</span>
            <span className="role-option__label">Recipient</span>
            <span className="role-option__desc">View your certificates</span>
          </button>
        </div>

        {error && (
          <div id="register-error" className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">Full Name</label>
            <input
              id="reg-name"
              className="form-input"
              type="text"
              name="name"
              placeholder="Jane Smith"
              value={formData.name}
              onChange={handleChange}
              required
              maxLength={100}
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email Address</label>
            <input
              id="reg-email"
              className="form-input"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              className="form-input"
              type="password"
              name="password"
              placeholder="Minimum 8 characters"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
            />
          </div>

          {role === "organization" && (
            <div className="form-group anim-fade-up">
              <label className="form-label" htmlFor="reg-organization">Organization Name</label>
              <input
                id="reg-organization"
                className="form-input"
                type="text"
                name="organization"
                placeholder="e.g. Acme University"
                value={formData.organization}
                onChange={handleChange}
                required
                maxLength={200}
                autoComplete="organization"
              />
            </div>
          )}

          <button
            id="register-submit-btn"
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            style={{ marginTop: "8px" }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Creating account…
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{" "}
          <Link to="/login" id="go-to-login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
