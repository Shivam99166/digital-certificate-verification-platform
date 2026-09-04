import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { downloadCertificatePDF } from "../utils/downloadPdf";

function VerifyCertificate() {
  const { certificateId } = useParams();
  const navigate = useNavigate();

  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [hasVerified, setHasVerified] = useState(false);
  const [copied, setCopied]           = useState(false);

  const verifyCertificate = useCallback(async () => {
    if (!certificateId || certificateId === "demo") return;

    setLoading(true);
    setError("");
    setCertificate(null);
    setHasVerified(false);

    try {
      const response = await api.get(`/certificates/verify/${certificateId}`);
      setCertificate(response.data.certificate);
      setHasVerified(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Certificate could not be verified. It may not exist."
      );
      setHasVerified(true);
    } finally {
      setLoading(false);
    }
  }, [certificateId]);

  useEffect(() => {
    // "demo" and bare /verify redirect to the landing hub
    if (!certificateId || certificateId === "demo") {
      navigate("/verify", { replace: true });
      return;
    }
    verifyCertificate();
  }, [certificateId, navigate, verifyCertificate]);

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/verify/${certificateId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback for browsers without clipboard API
      window.prompt("Copy this verification URL:", url);
    }
  };

  const isValid   = certificate?.status === "VALID";
  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }) : "No expiry";

  return (
    <div className="verify-page">
      <div className="verify-card">
        {/* Logo */}
        <div style={{ marginBottom: "24px" }}>
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>🏅</span>
            <span style={{
              fontWeight: 800, fontSize: "15px",
              background: "var(--gradient)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>
              CertVault
            </span>
          </Link>
        </div>

        <h1 className="verify-title">Certificate Verification</h1>
        <p className="verify-subtitle">
          Verify the authenticity of a digital certificate issued via CertVault.
        </p>

        {/* Certificate ID display */}
        <div className="verify-id-box">
          <div className="verify-id-label">Certificate ID</div>
          <div className="verify-id-value">{certificateId || "—"}</div>
        </div>

        {/* Verify button */}
        <button
          id="verify-btn"
          className="btn btn-primary btn-full btn-lg"
          onClick={verifyCertificate}
          disabled={loading || !certificateId}
        >
          {loading ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Verifying…
            </>
          ) : hasVerified ? (
            "Re-verify"
          ) : (
            "Verify Certificate"
          )}
        </button>

        {/* Error (not found etc.) */}
        {hasVerified && error && (
          <div className="verify-result">
            <div className="verify-banner invalid" role="alert">
              <span className="verify-banner-icon">❌</span>
              <div>
                <div className="verify-banner-title">Verification Failed</div>
                <div className="verify-banner-sub">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Success result */}
        {certificate && (
          <div className="verify-result" role="region" aria-label="Verification result">
            <div className={`verify-banner ${isValid ? "valid" : "invalid"}`}>
              <span className="verify-banner-icon">
                {isValid ? "✅" : certificate.status === "REVOKED" ? "🚫" : "⏰"}
              </span>
              <div>
                <div className="verify-banner-title">
                  {isValid ? "Certificate is VALID" : `Certificate is ${certificate.status}`}
                </div>
                <div className="verify-banner-sub">
                  {isValid
                    ? "This certificate is authentic and has not been revoked."
                    : certificate.status === "REVOKED"
                    ? "This certificate has been revoked by the issuing organization."
                    : "This certificate has passed its expiry date."}
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="verify-details">
              <div className="verify-detail-row">
                <span className="verify-detail-label">Certificate ID</span>
                <span className="verify-detail-value" style={{ fontFamily: "monospace", fontSize: "12px" }}>
                  {certificate.certificateId}
                </span>
              </div>
              <div className="verify-detail-row">
                <span className="verify-detail-label">Recipient</span>
                <span className="verify-detail-value">{certificate.recipientName}</span>
              </div>
              <div className="verify-detail-row">
                <span className="verify-detail-label">Course / Program</span>
                <span className="verify-detail-value">{certificate.courseName}</span>
              </div>
              <div className="verify-detail-row">
                <span className="verify-detail-label">Issued by</span>
                <span className="verify-detail-value">{certificate.organization}</span>
              </div>
              <div className="verify-detail-row">
                <span className="verify-detail-label">Issue Date</span>
                <span className="verify-detail-value">{formatDate(certificate.issueDate)}</span>
              </div>
              <div className="verify-detail-row">
                <span className="verify-detail-label">Expiry Date</span>
                <span className="verify-detail-value">{formatDate(certificate.expiryDate)}</span>
              </div>
              <div className="verify-detail-row">
                <span className="verify-detail-label">Status</span>
                <span className="verify-detail-value">
                  <span className={`badge badge-${certificate.status.toLowerCase()}`}>
                    {certificate.status}
                  </span>
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="verify-actions">
              <button
                id="download-cert-pdf-btn"
                className="btn btn-primary btn-full"
                onClick={() => downloadCertificatePDF(certificate)}
              >
                ⬇ Download Certificate PDF
              </button>
              <button
                id="copy-verify-link-btn"
                className="btn btn-secondary btn-full"
                onClick={handleCopyLink}
              >
                {copied ? "✅ Link Copied!" : "🔗 Copy Verification Link"}
              </button>
            </div>
          </div>
        )}

        {/* Footer nav */}
        <div style={{ marginTop: "24px", display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
          <Link to="/verify" className="btn btn-ghost btn-sm">
            🔍 Verify Another
          </Link>
          <Link to="/" className="btn btn-ghost btn-sm">
            ← Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default VerifyCertificate;