import { useNavigate, useLocation } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || {};
    } catch {
      return {};
    }
  })();

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  const isAdmin = user.role === "admin";

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      {/* Brand */}
      <div className="navbar-brand">
        <div className="navbar-logo-box" aria-hidden="true">🏅</div>
        <span className="navbar-brand-name">CertVault</span>
      </div>

      {/* Nav links */}
      <div className="navbar-nav">
        {isAdmin ? (
          // Admin sees Admin Dashboard as primary nav
          <button
            id="nav-admin"
            className={`nav-link ${isActive("/admin") ? "active" : ""}`}
            onClick={() => navigate("/admin")}
          >
            <span>Admin</span>
          </button>
        ) : user.role === "recipient" ? (
          // Recipient sees their own certificate dashboard
          <button
            id="nav-recipient-dashboard"
            className={`nav-link ${isActive("/recipient-dashboard") ? "active" : ""}`}
            onClick={() => navigate("/recipient-dashboard")}
          >
            <span>My Certificates</span>
          </button>
        ) : (
          // Organization sees standard nav
          <>
            <button
              id="nav-dashboard"
              className={`nav-link ${isActive("/dashboard") ? "active" : ""}`}
              onClick={() => navigate("/dashboard")}
            >
              <span>Dashboard</span>
            </button>
            <button
              id="nav-issue"
              className={`nav-link ${isActive("/issue-certificate") ? "active" : ""}`}
              onClick={() => navigate("/issue-certificate")}
            >
              <span>Issue Certificate</span>
            </button>
          </>
        )}
      </div>

      {/* Right side */}
      <div className="navbar-right">
        {user.name && (
          <span className="navbar-user-name">{user.name}</span>
        )}

        {/* Avatar — clicks to profile */}
        <button
          id="nav-profile"
          className="navbar-avatar"
          onClick={() => navigate("/profile")}
          title="My Profile"
          aria-label="Go to profile"
          style={{ cursor: "pointer", border: "none" }}
        >
          {initials}
        </button>

        <button
          id="nav-logout"
          className="btn btn-ghost btn-sm"
          onClick={handleLogout}
          title="Logout"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
