import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";

function Dashboard() {
  const navigate = useNavigate();

  const [certificates, setCertificates]  = useState([]);
  const [total, setTotal]                = useState(0);
  const [page, setPage]                  = useState(1);
  const [pages, setPages]                = useState(1);
  const [loading, setLoading]            = useState(true);
  const [error, setError]                = useState("");
  const [revokingId, setRevokingId]      = useState(null);

  // Filter state
  const [searchInput, setSearchInput]    = useState("");
  const [search, setSearch]              = useState("");
  const [statusFilter, setStatusFilter]  = useState("");

  const [refreshKey, setRefreshKey]      = useState(0);

  // Debounce search input → actual search param
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Fetch whenever search/status/page/refreshKey changes
  useEffect(() => {
    let isMounted = true;

    const loadCertificates = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page, limit: 20 });
        if (search)       params.set("search", search);
        if (statusFilter) params.set("status", statusFilter);

        const response = await api.get(`/certificates?${params}`);
        if (!isMounted) return;
        setCertificates(response.data.certificates || []);
        setTotal(response.data.total ?? 0);
        setPages(response.data.pages ?? 1);
      } catch (err) {
        if (!isMounted) return;
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }
        if (err.response?.status === 403) {
          navigate("/unauthorized");
          return;
        }
        setError("Unable to load certificates. Please try again.");
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

  const handleRevoke = async (certificateId) => {
    if (!window.confirm("Revoke this certificate? This cannot be undone and a notification will be emailed to the recipient.")) return;

    setRevokingId(certificateId);
    try {
      await api.patch(`/certificates/${certificateId}/revoke`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to revoke certificate.");
    } finally {
      setRevokingId(null);
    }
  };

  // Stats derived from full set (we call without filter for stats)
  const validCount   = certificates.filter((c) => c.status === "VALID").length;
  const revokedCount = certificates.filter((c) => c.status === "REVOKED").length;
  const expiredCount = certificates.filter((c) => c.status === "EXPIRED").length;

  const statusBadge = (status) => {
    const cls = { VALID: "badge-valid", REVOKED: "badge-revoked", EXPIRED: "badge-expired" };
    return <span className={`badge ${cls[status] || "badge-valid"}`}>{status}</span>;
  };

  const isFiltering = search || statusFilter;

  return (
    <div className="dash-page">
      <Navbar />

      <div className="dash-main">
        {/* Header */}
        <div className="page-header page-header-row">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">
              Manage and track certificates issued by your organization.
            </p>
          </div>
          <button
            id="issue-cert-btn"
            className="btn btn-primary"
            onClick={() => navigate("/issue-certificate")}
          >
            + Issue Certificate
          </button>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card stat-card--total">
            <div className="stat-icon">📋</div>
            <div className="stat-value">{total}</div>
            <div className="stat-label">Total Certificates</div>
          </div>
          <div className="stat-card stat-card--valid">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{validCount}</div>
            <div className="stat-label">Valid</div>
          </div>
          <div className="stat-card stat-card--revoked">
            <div className="stat-icon">🚫</div>
            <div className="stat-value">{revokedCount}</div>
            <div className="stat-label">Revoked</div>
          </div>
          <div className="stat-card stat-card--expired">
            <div className="stat-icon">⏰</div>
            <div className="stat-value">{expiredCount}</div>
            <div className="stat-label">Expired</div>
          </div>
        </div>

        {/* Certificate list section */}
        <div className="section-card">
          {/* Section header */}
          <div className="section-head">
            <span className="section-head-title">Certificates</span>
            <span className="section-head-count">
              {isFiltering ? `${certificates.length} of ${total}` : `${total} total`}
            </span>
          </div>

          {/* Filter bar */}
          <div className="filter-bar">
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input
                id="cert-search"
                className="search-input"
                type="text"
                placeholder="Search recipient, course, or certificate ID…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Search certificates"
              />
            </div>

            <select
              id="cert-status-filter"
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
                id="clear-filters-btn"
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
              <div className="spinner spinner--lg" aria-label="Loading" />
              <p style={{ color: "var(--text-secondary)", marginTop: "16px" }}>Loading certificates…</p>
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
                {isFiltering ? "No certificates match your filters" : "No certificates yet"}
              </p>
              <p className="state-desc">
                {isFiltering
                  ? "Try changing or clearing your search filters."
                  : "Issue your first digital certificate to get started."}
              </p>
              {!isFiltering && (
                <button
                  id="empty-issue-btn"
                  className="btn btn-primary"
                  onClick={() => navigate("/issue-certificate")}
                >
                  + Issue Certificate
                </button>
              )}
            </div>
          )}

          {/* Certificate rows */}
          {!loading && !error && certificates.length > 0 && (
            <div role="list" aria-label="Certificate list">
              {certificates.map((cert) => (
                <div key={cert._id} className="cert-row" role="listitem">
                  <div className="cert-row-info">
                    <div className="cert-row-name">{cert.recipientName}</div>
                    <div className="cert-row-course">{cert.courseName}</div>
                    <div className="cert-row-id">{cert.certificateId}</div>
                  </div>

                  <div className="cert-row-right">
                    {statusBadge(cert.status)}

                    <button
                      id={`view-cert-${cert.certificateId}`}
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/certificate/${cert.certificateId}`)}
                    >
                      View
                    </button>

                    {cert.status === "VALID" && (
                      <button
                        id={`revoke-cert-${cert.certificateId}`}
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRevoke(cert.certificateId)}
                        disabled={revokingId === cert.certificateId}
                      >
                        {revokingId === cert.certificateId ? (
                          <><span className="spinner" aria-hidden="true" /> Revoking…</>
                        ) : (
                          "Revoke"
                        )}
                      </button>
                    )}
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
      </div>
    </div>
  );
}

export default Dashboard;