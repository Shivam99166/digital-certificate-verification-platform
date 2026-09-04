import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";
import { downloadCertificatePDF } from "../utils/downloadPdf";

function CertificateDetails() {
  const { certificateId } = useParams();
  const navigate = useNavigate();

  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCertificate = async () => {
      try {
        const response = await api.get(`/certificates/${certificateId}`);
        setCertificate(response.data.certificate);
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
        setError(err.response?.data?.message || "Certificate not found.");
      } finally {
        setLoading(false);
      }
    };
    fetchCertificate();
  }, [certificateId, navigate]);

  const statusClass = (status = "") => status.toLowerCase();

  if (loading) {
    return (
      <div className="details-page">
        <Navbar />
        <div className="details-main">
          <div className="state-center" style={{ paddingTop: "80px" }}>
            <div className="spinner spinner--lg" aria-label="Loading certificate" />
            <p style={{ color: "var(--text-secondary)", marginTop: "16px" }}>Loading certificate…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="details-page">
        <Navbar />
        <div className="details-main">
          <div className="details-actions">
            <button className="btn btn-secondary" onClick={() => navigate("/dashboard")}>
              ← Dashboard
            </button>
          </div>
          <div className="alert alert-error">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="details-page">
      <Navbar />

      <div className="details-main">
        {/* Actions bar */}
        <div className="details-actions">
          <button
            id="back-to-dashboard"
            className="btn btn-secondary"
            onClick={() => navigate("/dashboard")}
          >
            ← Dashboard
          </button>
          <button
            id="download-pdf-btn"
            className="btn btn-primary"
            onClick={() => downloadCertificatePDF(certificate)}
          >
            ⬇ Download PDF
          </button>
          <button
            id="print-cert-btn"
            className="btn btn-secondary"
            onClick={() => window.print()}
          >
            🖨 Print
          </button>
          <a
            href={`/verify/${certificate.certificateId}`}
            target="_blank"
            rel="noreferrer"
          >
            <button id="verify-link-btn" className="btn btn-ghost">
              🔍 Public Verify
            </button>
          </a>
        </div>

        {/* The certificate "document" */}
        <div className="cert-doc" role="main" aria-label="Certificate document">

          {/* Status bar at the very top */}
          <div className={`cert-doc-status-bar ${statusClass(certificate.status)}`}>
            {certificate.status === "VALID"   && "✅ This certificate is VALID"}
            {certificate.status === "REVOKED" && "🚫 This certificate has been REVOKED"}
            {certificate.status === "EXPIRED" && "⏰ This certificate has EXPIRED"}
          </div>

          {/* Header banner */}
          <div className="cert-doc-banner">
            <div className="cert-doc-org">{certificate.organization}</div>
            <div className="cert-doc-title">Certificate of Achievement</div>
            <div className="cert-doc-tagline">
              This is to certify that the following individual has successfully completed the program
            </div>
          </div>

          {/* Body */}
          <div className="cert-doc-body">
            <div className="cert-doc-present">This certificate is proudly presented to</div>

            <div className="cert-doc-recipient">{certificate.recipientName}</div>

            <div className="cert-doc-for">for successfully completing</div>

            <div className="cert-doc-course">{certificate.courseName}</div>

            {/* Metadata row */}
            <div className="cert-doc-meta">
              <div className="cert-doc-meta-item">
                <div className="cert-doc-meta-label">Certificate ID</div>
                <div className="cert-doc-meta-value" style={{ fontFamily: "monospace", fontSize: "13px" }}>
                  {certificate.certificateId}
                </div>
              </div>
              <div className="cert-doc-meta-item">
                <div className="cert-doc-meta-label">Issue Date</div>
                <div className="cert-doc-meta-value">
                  {new Date(certificate.issueDate).toLocaleDateString("en-IN", {
                    year: "numeric", month: "long", day: "numeric",
                  })}
                </div>
              </div>
              {certificate.expiryDate && (
                <div className="cert-doc-meta-item">
                  <div className="cert-doc-meta-label">Expiry Date</div>
                  <div className="cert-doc-meta-value">
                    {new Date(certificate.expiryDate).toLocaleDateString("en-IN", {
                      year: "numeric", month: "long", day: "numeric",
                    })}
                  </div>
                </div>
              )}
              <div className="cert-doc-meta-item">
                <div className="cert-doc-meta-label">Status</div>
                <div className="cert-doc-meta-value">{certificate.status}</div>
              </div>
            </div>

            {/* Footer — QR */}
            {certificate.qrCode && (
              <div className="cert-doc-footer">
                <div className="cert-doc-qr-wrap">
                  <img src={certificate.qrCode} alt="Verification QR code" />
                  <div className="cert-doc-qr-label">Scan to verify</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CertificateDetails;