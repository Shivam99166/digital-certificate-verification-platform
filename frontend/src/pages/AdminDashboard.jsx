import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";

function AdminDashboard() {
  const navigate = useNavigate();

  const [stats, setStats]           = useState(null);
  const [users, setUsers]           = useState([]);
  const [certs, setCerts]           = useState([]);
  const [tab, setTab]               = useState("organizations"); // "organizations" | "certificates"

  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [togglingId, setTogglingId] = useState(null);

  // Filters
  const [userSearch, setUserSearch]   = useState("");
  const [certSearch, setCertSearch]   = useState("");
  const [certStatus, setCertStatus]   = useState("");
  const [userPage, setUserPage]       = useState(1);
  const [certPage, setCertPage]       = useState(1);
  const [userPages, setUserPages]     = useState(1);
  const [certPages, setCertPages]     = useState(1);
  const [userTotal, setUserTotal]     = useState(0);
  const [certTotal, setCertTotal]     = useState(0);

  // Load stats once
  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await api.get("/admin/stats");
        setStats(res.data.stats);
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
        } else if (err.response?.status === 403) {
          navigate("/unauthorized");
        } else {
          setError("Failed to load admin data.");
        }
      }
    };
    loadStats();
  }, [navigate]);

  // Load users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: userPage, limit: 15, role: "organization" });
      if (userSearch) params.set("search", userSearch);
      const res = await api.get(`/admin/users?${params}`);
      setUsers(res.data.users || []);
      setUserPages(res.data.pages ?? 1);
      setUserTotal(res.data.total ?? 0);
    } catch {
      setError("Failed to load organizations.");
    } finally {
      setLoading(false);
    }
  }, [userPage, userSearch]);

  // Load certs
  const fetchCerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: certPage, limit: 15 });
      if (certSearch) params.set("search", certSearch);
      if (certStatus) params.set("status", certStatus);
      const res = await api.get(`/admin/certificates?${params}`);
      setCerts(res.data.certificates || []);
      setCertPages(res.data.pages ?? 1);
      setCertTotal(res.data.total ?? 0);
    } catch {
      setError("Failed to load certificates.");
    } finally {
      setLoading(false);
    }
  }, [certPage, certSearch, certStatus]);

  useEffect(() => {
    if (tab === "organizations") fetchUsers();
    else fetchCerts();
  }, [tab, fetchUsers, fetchCerts]);

  // Debounce searches
  useEffect(() => {
    const t = setTimeout(() => { setUserPage(1); }, 400);
    return () => clearTimeout(t);
  }, [userSearch]);

  useEffect(() => {
    const t = setTimeout(() => { setCertPage(1); }, 400);
    return () => clearTimeout(t);
  }, [certSearch, certStatus]);

  const handleToggleStatus = async (userId, currentStatus) => {
    const action = currentStatus ? "deactivate" : "activate";
    if (!window.confirm(`Are you sure you want to ${action} this account?`)) return;

    setTogglingId(userId);
    try {
      await api.patch(`/admin/users/${userId}/status`);
      await fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} account.`);
    } finally {
      setTogglingId(null);
    }
  };

  const initials = (name = "") =>
    name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";

  const statusBadge = (status) => {
    const cls = { VALID: "badge-valid", REVOKED: "badge-revoked", EXPIRED: "badge-expired" };
    return <span className={`badge ${cls[status] || "badge-valid"}`}>{status}</span>;
  };

  return (
    <div className="admin-page">
      <Navbar />

      <div className="admin-main">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">🛡️ Admin Dashboard</h1>
          <p className="page-subtitle">Manage organizations, users, and all certificates across the platform.</p>
        </div>

        {error && <div className="alert alert-error" role="alert">{error}</div>}

        {/* Stats */}
        {stats && (
          <div className="stats-grid" style={{ marginBottom: "28px" }}>
            <div className="stat-card stat-card--total">
              <div className="stat-icon">🏢</div>
              <div className="stat-value">{stats.totalOrgs}</div>
              <div className="stat-label">Organizations</div>
            </div>
            <div className="stat-card stat-card--valid">
              <div className="stat-icon">📋</div>
              <div className="stat-value">{stats.totalCerts}</div>
              <div className="stat-label">Total Certificates</div>
            </div>
            <div className="stat-card stat-card--revoked">
              <div className="stat-icon">✅</div>
              <div className="stat-value">{stats.validCerts}</div>
              <div className="stat-label">Valid Certs</div>
            </div>
            <div className="stat-card stat-card--expired">
              <div className="stat-icon">🚫</div>
              <div className="stat-value">{stats.revokedCerts}</div>
              <div className="stat-label">Revoked Certs</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="tab-bar">
          <button
            id="tab-orgs"
            className={`tab-btn ${tab === "organizations" ? "active" : ""}`}
            onClick={() => setTab("organizations")}
          >
            Organizations ({userTotal})
          </button>
          <button
            id="tab-certs"
            className={`tab-btn ${tab === "certificates" ? "active" : ""}`}
            onClick={() => setTab("certificates")}
          >
            All Certificates ({certTotal})
          </button>
        </div>

        {/* ── Organizations tab ── */}
        {tab === "organizations" && (
          <div className="section-card">
            <div className="filter-bar">
              <div className="search-wrap">
                <span className="search-icon">🔍</span>
                <input
                  id="admin-user-search"
                  className="search-input"
                  type="text"
                  placeholder="Search name, email, or organization…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="state-center">
                <div className="spinner spinner--lg" />
              </div>
            ) : users.length === 0 ? (
              <div className="state-center">
                <div className="state-icon">🔍</div>
                <p className="state-title">No organizations found</p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Organization</th>
                      <th>Organization Name</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id}>
                        <td>
                          <div className="user-cell">
                            <div className="user-cell-avatar">{initials(u.name)}</div>
                            <div>
                              <div className="user-cell-name">{u.name}</div>
                              <div className="user-cell-email">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: "var(--text-secondary)" }}>
                          {u.organization || "—"}
                        </td>
                        <td>
                          <span className={`badge ${u.isActive !== false ? "badge-active" : "badge-inactive"}`}>
                            {u.isActive !== false ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                          {new Date(u.createdAt).toLocaleDateString("en-IN", {
                            year: "numeric", month: "short", day: "numeric",
                          })}
                        </td>
                        <td>
                          <button
                            id={`toggle-user-${u._id}`}
                            className={`btn btn-sm ${u.isActive !== false ? "btn-danger" : "btn-success"}`}
                            onClick={() => handleToggleStatus(u._id, u.isActive !== false)}
                            disabled={togglingId === u._id}
                          >
                            {togglingId === u._id ? (
                              <span className="spinner" aria-hidden="true" />
                            ) : u.isActive !== false ? (
                              "Deactivate"
                            ) : (
                              "Activate"
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {userPages > 1 && (
              <div className="pagination">
                <span>Page {userPage} of {userPages} ({userTotal} total)</span>
                <div className="pagination-controls">
                  <button className="btn btn-secondary btn-sm" disabled={userPage <= 1} onClick={() => setUserPage((p) => p - 1)}>← Prev</button>
                  <button className="btn btn-secondary btn-sm" disabled={userPage >= userPages} onClick={() => setUserPage((p) => p + 1)}>Next →</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Certificates tab ── */}
        {tab === "certificates" && (
          <div className="section-card">
            <div className="filter-bar">
              <div className="search-wrap">
                <span className="search-icon">🔍</span>
                <input
                  id="admin-cert-search"
                  className="search-input"
                  type="text"
                  placeholder="Search recipient, course, or ID…"
                  value={certSearch}
                  onChange={(e) => setCertSearch(e.target.value)}
                />
              </div>
              <select
                id="admin-cert-status"
                className="filter-select"
                value={certStatus}
                onChange={(e) => setCertStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="VALID">Valid</option>
                <option value="REVOKED">Revoked</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>

            {loading ? (
              <div className="state-center">
                <div className="spinner spinner--lg" />
              </div>
            ) : certs.length === 0 ? (
              <div className="state-center">
                <div className="state-icon">🔍</div>
                <p className="state-title">No certificates found</p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Recipient</th>
                      <th>Course</th>
                      <th>Issued By</th>
                      <th>Status</th>
                      <th>Issue Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certs.map((c) => (
                      <tr key={c._id}>
                        <td>
                          <div className="user-cell">
                            <div className="user-cell-avatar">{initials(c.recipientName)}</div>
                            <div>
                              <div className="user-cell-name">{c.recipientName}</div>
                              <div className="user-cell-email" style={{ fontFamily: "monospace", fontSize: "11px" }}>{c.certificateId}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: "var(--text-secondary)" }}>{c.courseName}</td>
                        <td style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                          {c.issuedBy?.organization || c.issuedBy?.name || "—"}
                        </td>
                        <td>{statusBadge(c.status)}</td>
                        <td style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                          {new Date(c.issueDate || c.createdAt).toLocaleDateString("en-IN", {
                            year: "numeric", month: "short", day: "numeric",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {certPages > 1 && (
              <div className="pagination">
                <span>Page {certPage} of {certPages} ({certTotal} total)</span>
                <div className="pagination-controls">
                  <button className="btn btn-secondary btn-sm" disabled={certPage <= 1} onClick={() => setCertPage((p) => p - 1)}>← Prev</button>
                  <button className="btn btn-secondary btn-sm" disabled={certPage >= certPages} onClick={() => setCertPage((p) => p + 1)}>Next →</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
