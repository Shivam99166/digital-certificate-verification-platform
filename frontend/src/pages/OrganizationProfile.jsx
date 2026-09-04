import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";

function OrganizationProfile() {
  const navigate = useNavigate();

  const [user, setUser]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");

  // Edit form state
  const [editing, setEditing]         = useState(false);
  const [name, setName]               = useState("");
  const [orgName, setOrgName]         = useState("");
  const [website, setWebsite]         = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone]             = useState("");

  // Cert counts for this user
  const [certStats, setCertStats] = useState({ total: 0, valid: 0, revoked: 0, expired: 0 });

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get("/auth/me");
      const u = res.data;
      setUser(u);
      setName(u.name || "");
      setOrgName(u.organization || "");
      setWebsite(u.website || "");
      setDescription(u.description || "");
      setContactEmail(u.contactEmail || "");
      setPhone(u.phone || "");
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }
      setError("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const fetchCertStats = useCallback(async () => {
    try {
      // Read role from localStorage — it's available synchronously at mount time
      // (user state is still null when this is first called alongside fetchProfile)
      const storedUser = (() => {
        try { return JSON.parse(localStorage.getItem("user")) || {}; }
        catch { return {}; }
      })();
      const isRecipient = storedUser.role === "recipient";
      const base = isRecipient ? "/certificates/my" : "/certificates";

      const [all, valid, revoked, expired] = await Promise.all([
        api.get(`${base}?limit=1`),
        api.get(`${base}?status=VALID&limit=1`),
        api.get(`${base}?status=REVOKED&limit=1`),
        api.get(`${base}?status=EXPIRED&limit=1`),
      ]);
      setCertStats({
        total:   all.data.total     ?? 0,
        valid:   valid.data.total   ?? 0,
        revoked: revoked.data.total ?? 0,
        expired: expired.data.total ?? 0,
      });
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchCertStats();
  }, [fetchProfile, fetchCertStats]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = { name };
      if (user.role === "organization") {
        payload.organization = orgName;
        payload.website = website;
        payload.description = description;
        payload.contactEmail = contactEmail;
        payload.phone = phone;
      }

      const res = await api.patch("/auth/me", payload);
      const updated = res.data.user;

      setUser(updated);
      setName(updated.name || "");
      setOrgName(updated.organization || "");
      setWebsite(updated.website || "");
      setDescription(updated.description || "");
      setContactEmail(updated.contactEmail || "");
      setPhone(updated.phone || "");

      // Keep localStorage in sync
      localStorage.setItem("user", JSON.stringify({
        id:           updated._id,
        name:         updated.name,
        email:        updated.email,
        organization: updated.organization,
        role:         updated.role,
        website:      updated.website,
        contactEmail: updated.contactEmail,
      }));

      setSuccess("Profile updated successfully!");
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEditing(false);
    setName(user?.name || "");
    setOrgName(user?.organization || "");
    setWebsite(user?.website || "");
    setDescription(user?.description || "");
    setContactEmail(user?.contactEmail || "");
    setPhone(user?.phone || "");
    setError("");
  };

  const initials = (n) =>
    n
      ? n.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
      : "?";

  if (loading) {
    return (
      <div className="profile-page">
        <Navbar />
        <div className="profile-main">
          <div className="state-center" style={{ paddingTop: "80px" }}>
            <div className="spinner spinner--lg" aria-label="Loading profile" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <Navbar />

      <div className="profile-main">
        {/* Page header */}
        <div className="page-header page-header-row">
          <div>
            <h1 className="page-title">My Profile</h1>
            <p className="page-subtitle">Manage your account information.</p>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate("/dashboard")}>
            ← Dashboard
          </button>
        </div>

        {/* Profile header card */}
        <div className="profile-header-card">
          <div className="profile-avatar" aria-hidden="true">
            {initials(user?.name)}
          </div>
          <div>
            <div className="profile-meta-name">{user?.name}</div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginBottom: "4px" }}>
              <span className="profile-role-badge">
                {user?.role === "organization" ? "🏢" : user?.role === "admin" ? "🛡️" : "🎓"} {user?.role}
              </span>
              {!user?.isActive && (
                <span className="badge badge-revoked">Deactivated</span>
              )}
            </div>
            <div className="profile-email">{user?.email}</div>
          </div>
        </div>

        {/* Certificate stats */}
        <div className="stats-grid" style={{ marginBottom: "20px" }}>
          <div className="stat-card stat-card--total">
            <div className="stat-icon">📋</div>
            <div className="stat-value">{certStats.total}</div>
            <div className="stat-label">Total Issued</div>
          </div>
          <div className="stat-card stat-card--valid">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{certStats.valid}</div>
            <div className="stat-label">Valid</div>
          </div>
          <div className="stat-card stat-card--revoked">
            <div className="stat-icon">🚫</div>
            <div className="stat-value">{certStats.revoked}</div>
            <div className="stat-label">Revoked</div>
          </div>
          <div className="stat-card stat-card--expired">
            <div className="stat-icon">⏰</div>
            <div className="stat-value">{certStats.expired}</div>
            <div className="stat-label">Expired</div>
          </div>
        </div>

        {/* Edit form */}
        <div className="form-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "16px", marginBottom: "2px" }}>Account Details</div>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                Update your name{user?.role === "organization" ? " and organization name" : ""}.
              </div>
            </div>
            {!editing && (
              <button
                id="edit-profile-btn"
                className="btn btn-secondary btn-sm"
                onClick={() => { setEditing(true); setSuccess(""); setError(""); }}
              >
                Edit
              </button>
            )}
          </div>

          {error   && <div className="alert alert-error"   role="alert">{error}</div>}
          {success && <div className="alert alert-success" role="status">{success}</div>}

          {!editing ? (
            // Read-only view
            <div>
              <div className="detail-row">
                <div className="detail-label">Full Name</div>
                <div className="detail-value">{user?.name || "—"}</div>
              </div>
              <div className="detail-row">
                <div className="detail-label">Account Email</div>
                <div className="detail-value">{user?.email}</div>
              </div>
              {user?.role === "organization" && (
                <>
                  <div className="detail-row">
                    <div className="detail-label">Organization</div>
                    <div className="detail-value">{user?.organization || "—"}</div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-label">Website</div>
                    <div className="detail-value">
                      {user?.website ? (
                        <a
                          href={user.website.startsWith("http") ? user.website : `https://${user.website}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "var(--primary-400)", textDecoration: "underline" }}
                        >
                          {user.website} ↗
                        </a>
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-label">Official Contact Email</div>
                    <div className="detail-value">{user?.contactEmail || "—"}</div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-label">Phone Number</div>
                    <div className="detail-value">{user?.phone || "—"}</div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-label">About / Bio</div>
                    <div className="detail-value" style={{ whiteSpace: "pre-wrap", maxWidth: "480px" }}>
                      {user?.description || "—"}
                    </div>
                  </div>
                </>
              )}
              <div className="detail-row">
                <div className="detail-label">Member Since</div>
                <div className="detail-value">
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString("en-IN", {
                        year: "numeric", month: "long", day: "numeric",
                      })
                    : "—"}
                </div>
              </div>
            </div>
          ) : (
            // Edit form
            <form onSubmit={handleSave} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-name">Full Name</label>
                <input
                  id="profile-name"
                  className="form-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  required
                  placeholder="Your full name"
                />
              </div>

              {user?.role === "organization" && (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="profile-org">Organization Name</label>
                    <input
                      id="profile-org"
                      className="form-input"
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      maxLength={200}
                      placeholder="Your organization name"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="profile-website">Website URL</label>
                    <input
                      id="profile-website"
                      className="form-input"
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      maxLength={200}
                      placeholder="https://example.org"
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="profile-contact-email">Contact Email</label>
                      <input
                        id="profile-contact-email"
                        className="form-input"
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="contact@organization.org"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="profile-phone">Contact Phone</label>
                      <input
                        id="profile-phone"
                        className="form-input"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        maxLength={30}
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="profile-desc">About Organization</label>
                    <textarea
                      id="profile-desc"
                      className="form-input"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={1000}
                      placeholder="Describe your organization, accreditation, or certification programs..."
                      style={{ resize: "vertical", fontFamily: "inherit" }}
                    />
                    <div className="form-hint" style={{ textAlign: "right" }}>
                      {description.length}/1000 characters
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  id="save-profile-btn"
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <><span className="spinner" aria-hidden="true" /> Saving…</>
                  ) : (
                    "Save Changes"
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrganizationProfile;
