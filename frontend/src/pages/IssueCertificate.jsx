import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";
import { downloadCertificatePDF } from "../utils/downloadPdf";

function IssueCertificate() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    recipientName: "",
    recipientEmail: "",
    courseName: "",
    expiryDate: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [certificate, setCertificate] = useState(null);
  const [emailSent, setEmailSent] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setCertificate(null);
    setEmailSent(false);
    setLoading(true);

    try {
      const response = await api.post("/certificates", {
        recipientName: formData.recipientName,
        recipientEmail: formData.recipientEmail,
        courseName: formData.courseName,
        expiryDate: formData.expiryDate || null,
      });

      setCertificate(response.data.certificate);
      setEmailSent(Boolean(response.data.emailSent));
      setFormData({ recipientName: "", recipientEmail: "", courseName: "", expiryDate: "" });
    } catch (err) {
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
      setError(err.response?.data?.message || "Failed to issue certificate.");
    } finally {
      setLoading(false);
    }
  };

  const handleIssuAnother = () => {
    setCertificate(null);
    setEmailSent(false);
    setError("");
  };

  return (
    <div className="issue-page">
      <Navbar />

      <div className="issue-main">
        {/* Header */}
        <div className="page-header page-header-row">
          <div>
            <h1 className="page-title">Issue Certificate</h1>
            <p className="page-subtitle">Create a new verified digital certificate for a recipient.</p>
          </div>
          <button
            id="back-to-dashboard"
            className="btn btn-secondary"
            onClick={() => navigate("/dashboard")}
          >
            ← Dashboard
          </button>
        </div>

        {/* Form */}
        <div className="form-card">
          {error && (
            <div id="issue-error" className="alert alert-error" role="alert" style={{ marginBottom: "24px" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="recipientName">Recipient Name</label>
              <input
                id="recipientName"
                className="form-input"
                type="text"
                name="recipientName"
                placeholder="Enter recipient's full name"
                value={formData.recipientName}
                onChange={handleChange}
                required
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="recipientEmail">Recipient Email</label>
              <input
                id="recipientEmail"
                className="form-input"
                type="email"
                name="recipientEmail"
                placeholder="recipient@example.com"
                value={formData.recipientEmail}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="courseName">Course / Program Name</label>
              <input
                id="courseName"
                className="form-input"
                type="text"
                name="courseName"
                placeholder="e.g. Full Stack Web Development"
                value={formData.courseName}
                onChange={handleChange}
                required
                maxLength={200}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="expiryDate">Expiry Date (optional)</label>
              <input
                id="expiryDate"
                className="form-input"
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
                min={new Date().toISOString().split("T")[0]}
              />
              <p className="form-hint">Leave empty for a certificate that never expires.</p>
            </div>

            <button
              id="issue-cert-submit"
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Issuing Certificate…
                </>
              ) : (
                "Issue Certificate"
              )}
            </button>
          </form>
        </div>

        {/* Success result */}
        {certificate && (
          <div className="cert-result" role="region" aria-label="Issued certificate details">
            <div className="cert-result-header">
              <div className="cert-result-icon" aria-hidden="true">✅</div>
              <div>
                <div className="cert-result-title">Certificate Issued Successfully</div>
                <div className="cert-result-subtitle">
                  {emailSent
                    ? `An email notification with verification link was dispatched to ${certificate.recipientEmail}.`
                    : `Notification generated for ${certificate.recipientEmail} (logged in dev mode).`}
                </div>
              </div>
            </div>

            <div className="cert-result-body">
              <div className="cert-result-details">
                <div className="detail-row">
                  <div className="detail-label">Certificate ID</div>
                  <div className="detail-value-mono">{certificate.certificateId}</div>
                </div>
                <div className="detail-row">
                  <div className="detail-label">Recipient</div>
                  <div className="detail-value">{certificate.recipientName}</div>
                </div>
                <div className="detail-row">
                  <div className="detail-label">Recipient Email</div>
                  <div className="detail-value">{certificate.recipientEmail}</div>
                </div>
                <div className="detail-row">
                  <div className="detail-label">Email Notice</div>
                  <div className="detail-value">
                    {emailSent ? (
                      <span style={{ color: "var(--success-400)", fontWeight: 600 }}>
                        📧 Dispatched
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                        📧 Logged in dev
                      </span>
                    )}
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-label">Course</div>
                  <div className="detail-value">{certificate.courseName}</div>
                </div>
                <div className="detail-row">
                  <div className="detail-label">Status</div>
                  <div className="detail-value">
                    <span className="badge badge-valid">VALID</span>
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-label">Issue Date</div>
                  <div className="detail-value">
                    {new Date(certificate.issueDate).toLocaleDateString("en-IN", {
                      year: "numeric", month: "long", day: "numeric",
                    })}
                  </div>
                </div>
              </div>

              {certificate.qrCode && (
                <div className="qr-block">
                  <img src={certificate.qrCode} alt="Certificate QR code for verification" />
                  <div className="qr-block-label">Scan to verify</div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>
              <button
                id="download-issued-pdf"
                className="btn btn-primary"
                onClick={() => downloadCertificatePDF(certificate)}
              >
                ⬇ Download PDF
              </button>
              <button
                id="view-issued-cert"
                className="btn btn-secondary"
                onClick={() => navigate(`/certificate/${certificate.certificateId}`)}
              >
                View Certificate
              </button>
              <button
                id="issue-another-btn"
                className="btn btn-ghost"
                onClick={handleIssuAnother}
              >
                Issue Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default IssueCertificate;