import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";

function RecipientDashboard() {
  const navigate = useNavigate();

  const [certificates, setCertificates] = useState([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [pages, setPages]               = useState(1);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [refreshKey, setRefreshKey]     = useState(0);

  // Filter state
  const [searchInput, setSearchInput]   = useState("");
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Quick stats (fetched once, no filter applied)
  const [stats, setStats] = useState({ total: 0, valid: 0, revoked: 0, expired: 0 });

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user")) || {}; }
    catch { return {}; }
  })();

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Fetch stats once on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [all, valid, revoked, expired] = await Promise.all([
          api.get("/certificates/my?limit=1"),
          api.get("/certificates/my?status=VALID&limit=1"),
          api.get("/certificates/my?status=REVOKED&limit=1"),
          api.get("/certificates/my?status=EXPIRED&limit=1"),
        ]);
        setStats({
          total:   all.data.total     ?? 0,
          valid:   valid.data.total   ?? 0,
          revoked: revoked.data.total ?? 0,
          expired: expired.data.total ?? 0,
        });
      } catch {
        // Non-critical
      }
    };
    fetchStats();
  }, []);

  // Fetch certificates list
  useEffect(() => {
    let isMounted = true;

    const loadCertificates = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page, limit: 15 });
        if (search)       params.set("search", search);
        if (statusFilter) params.set("status", statusFilter);

        const res = await api.get(`/certificates/my?${params}`);
        if (!isMounted) return;
        setCertificates(res.data.certificates || []);
        setTotal(res.data.total ?? 0);
        setPages(res.data.pages ?? 1);
      } catch (err) {
        if (!isMounted) return;
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }
        setError("Unable to load your certificates. Please try again.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadCertificates();

    return () => {
      isMounted = false;
    };
  }, [search, statusFilter, page, refreshKey, navigate]);

  const handleStatusFilter = (val) => {
    setStatusFilter(val);
    setPage(1);
  };

  const statusBadge = (status) => {
    const cls = { VALID: "badge-valid", REVOKED: "badge-revoked", EXPIRED: "badge-expired" };
    return <span className={`badge ${cls[status] || "badge-valid"}`}>{status}</span>;
  };

  const orgInitials = (orgName = "") =>
    orgName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "🏢";

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "—";

  const isFiltering = search || statusFilter;

  return (
    <div className="recipient-page">
      <Navbar />

      <div className="recipient-main">

        {/* Welcome banner */}
        <div className="welcome-banner">
          <div className="welcome-banner-icon">🎓</div>
          <div>
            <div className="welcome-banner-title">
              Welcome back, {user.name?.split(" ")[0] || "there"}!
            </div>
            <div className="welcome-banner-sub">
              Here are all certificates issued to <strong>{user.email}</strong>.
            </div>
          </div>
        </div>

        {/* Page header */}
        <div className="page-header page-header-row">
          <div>
            <h1 className="page-title">My Certificates</h1>
            <p className="page-subtitle">Digital certificates issued to your email address.</p>
          </div>
          <Link to="/verify">
            <button id="verify-a-cert-btn" className="btn btn-secondary">
              🔍 Verify a Certificate
            </button>
          </Link>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card stat-card--total">
            <div className="stat-icon">🏅</div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-card stat-card--valid">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{stats.valid}</div>
            <div className="stat-label">Valid</div>
          </div>
          <div className="stat-card stat-card--revoked">
            <div className="stat-icon">🚫</div>
            <div className="stat-value">{stats.revoked}</div>
            <div className="stat-label">Revoked</div>
          </div>
          <div className="stat-card stat-card--expired">
            <div className="stat-icon">⏰</div>
            <div className="stat-value">{stats.expired}</div>
            <div className="stat-label">Expired</div>
          </div>
        </div>

        {/* Certificate list */}
        <div className="section-card">
          <div className="section-head">
            <span className="section-head-title">Certificates</span>
            <span className="section-head-count">
              {isFiltering ? `${certificates.length} of ${total}` : `${total} total`}
            </span>
          </div>

          {/* Search / filter bar */}
          <div className="filter-bar">
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input
                id="recipient-cert-search"
                className="search-input"
                type="text"
                placeholder="Search course name, organization, or ID…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Search certificates"
              />
            </div>

            <select
              id="recipient-status-filter"
              className="filter-select"
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="VALID">Valid</option>
              <option value="REVOKED">Revoked</option>
              <option value="EXPIRED">Expired</option>
            </select>

            {isFiltering && (
              <button
                id="clear-recipient-filters"
                className="btn btn-ghost btn-sm"
                onClick={() => { setSearchInput(""); setSearch(""); setStatusFilter(""); setPage(1); }}
              >
                ✕ Clear
              </button>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="state-center">
              <div className="spinner spinner--lg" aria-label="Loading certificates" />
              <p style={{ color: "var(--text-secondary)", marginTop: "16px" }}>Loading your certificates…</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="state-center">
              <div className="state-icon">⚠️</div>
              <p className="state-title">Something went wrong</p>
              <p className="state-desc">{error}</p>
              <button className="btn btn-secondary" onClick={() => setRefreshKey((k) => k + 1)}>Try again</button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && certificates.length === 0 && (
            <div className="state-center">
              <div className="state-icon">{isFiltering ? "🔍" : "🎓"}</div>
              <p className="state-title">
                {isFiltering ? "No certificates match your search" : "No certificates yet"}
              </p>
              <p className="state-desc">
                {isFiltering
                  ? "Try adjusting or clearing your filters."
                  : `No certificates have been issued to ${user.email} yet. They will appear here once an organization issues one to your email address.`}
              </p>
              {isFiltering && (
                <button
                  className="btn btn-secondary"
                  onClick={() => { setSearchInput(""); setSearch(""); setStatusFilter(""); setPage(1); }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {/* Certificate cards */}
          {!loading && !error && certificates.length > 0 && (
            <div role="list" aria-label="My certificates">
              {certificates.map((cert) => (
                <div key={cert._id} className="rcert-card" role="listitem">
                  {/* Org icon */}
                  <div
                    className="rcert-org-icon"
                    aria-hidden="true"
                    title={cert.organization}
                  >
                    {orgInitials(cert.organization)}
                  </div>

                  {/* Info */}
                  <div className="rcert-info">
                    <div className="rcert-course">{cert.courseName}</div>
                    <div className="rcert-org">Issued by: {cert.organization}</div>
                    <div className="rcert-date">
                      {formatDate(cert.issueDate)}
                      {cert.expiryDate && ` · Expires ${formatDate(cert.expiryDate)}`}
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="rcert-right">
                    {statusBadge(cert.status)}
                    <Link
                      to={`/verify/${cert.certificateId}`}
                      id={`view-my-cert-${cert.certificateId}`}
                    >
                      <button className="btn btn-primary btn-sm">
                        View &amp; Verify
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && pages > 1 && (
            <div className="pagination">
              <span>Page {page} of {pages} ({total} total)</span>
              <div className="pagination-controls">
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← Prev
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={page >= pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "13px", marginTop: "24px" }}>
          To verify a certificate someone shared with you, use the{" "}
          <Link to="/verify" style={{ color: "var(--primary-light)" }}>
            verification page
          </Link>.
        </p>
      </div>
    </div>
  );
}

export default RecipientDashboard;
