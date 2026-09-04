import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import jsQR from "jsqr";

function VerifyLanding() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [tab, setTab]                   = useState("id");
  const [certId, setCertId]             = useState("");
  const [processing, setProcessing]     = useState(false);
  const [uploadError, setUploadError]   = useState("");
  const [uploadPreview, setUploadPreview] = useState(null);
  const [dragging, setDragging]         = useState(false);

  // ── Tab 1: By ID ──────────────────────────────────────────────────────────
  const handleVerifyById = (e) => {
    e.preventDefault();
    const id = certId.trim();
    if (!id) return;
    navigate(`/verify/${id}`);
  };

  // ── Tab 2: Image Upload ───────────────────────────────────────────────────
  const processImage = (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image file (JPG, PNG, WebP, etc.).");
      return;
    }

    setUploadError("");
    setProcessing(true);
    setUploadPreview(null);

    const reader = new FileReader();

    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setUploadPreview(dataUrl);

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width  = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imgData.data, imgData.width, imgData.height);

          if (code?.data) {
            const raw = code.data.trim();
            // Try parsing as URL first
            try {
              const url = new URL(raw);
              const match = url.pathname.match(/\/verify\/(.+)/);
              if (match?.[1]) {
                navigate(`/verify/${match[1]}`);
                return;
              }
            } catch {
              // Not a URL
            }
            // Fallback: treat the QR data itself as the cert ID
            if (raw.startsWith("CERT-") || raw.match(/^[A-Z0-9-]{6,}$/)) {
              navigate(`/verify/${raw}`);
              return;
            }
            setUploadError(`QR code found but format not recognized: "${raw.slice(0, 60)}"`);
          } else {
            setUploadError(
              "No QR code found. Make sure the QR code on the certificate is clearly visible and the image is not blurry."
            );
          }
        } catch {
          setUploadError("Failed to process the image. Please try a different file.");
        } finally {
          setProcessing(false);
        }
      };

      img.onerror = () => {
        setUploadError("Could not read this image. Please try a different file.");
        setProcessing(false);
      };

      img.src = dataUrl;
    };

    reader.onerror = () => {
      setUploadError("Failed to read the file. Please try again.");
      setProcessing(false);
    };

    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processImage(e.dataTransfer.files?.[0]);
  };

  const resetUpload = () => {
    setUploadPreview(null);
    setUploadError("");
    setProcessing(false);
  };

  return (
    <div className="verify-page">
      <div className="verify-card" style={{ maxWidth: "540px" }}>

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

        <h1 className="verify-title">Verify a Certificate</h1>
        <p className="verify-subtitle">
          Confirm the authenticity of any certificate issued through CertVault — three ways.
        </p>

        {/* Tabs */}
        <div className="tab-bar" style={{ marginBottom: "28px" }}>
          <button
            id="verify-tab-id"
            className={`tab-btn ${tab === "id" ? "active" : ""}`}
            onClick={() => { setTab("id"); resetUpload(); }}
          >
            🔢 By ID
          </button>
          <button
            id="verify-tab-upload"
            className={`tab-btn ${tab === "upload" ? "active" : ""}`}
            onClick={() => { setTab("upload"); resetUpload(); }}
          >
            📁 Upload Image
          </button>
          <button
            id="verify-tab-scan"
            className={`tab-btn ${tab === "scan" ? "active" : ""}`}
            onClick={() => setTab("scan")}
          >
            📷 Scan QR
          </button>
        </div>

        {/* ── TAB: Enter ID ──────────────────────────────────────────────── */}
        {tab === "id" && (
          <form onSubmit={handleVerifyById} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="manual-cert-id">Certificate ID</label>
              <input
                id="manual-cert-id"
                className="form-input"
                type="text"
                placeholder="e.g. CERT-2026-XXXXXXXX"
                value={certId}
                onChange={(e) => setCertId(e.target.value)}
                autoFocus
                autoComplete="off"
                spellCheck={false}
              />
              <p className="form-hint">
                The Certificate ID is printed on the certificate document and included in the recipient&rsquo;s email.
              </p>
            </div>
            <button
              id="verify-by-id-btn"
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={!certId.trim()}
            >
              Verify Certificate →
            </button>
          </form>
        )}

        {/* ── TAB: Upload Image ──────────────────────────────────────────── */}
        {tab === "upload" && (
          <div>
            {/* Drop zone */}
            <div
              className={`upload-zone${dragging ? " upload-zone--drag" : ""}`}
              role="button"
              tabIndex={0}
              aria-label="Upload certificate image"
              onClick={() => !uploadPreview && fileInputRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && !uploadPreview && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              {uploadPreview ? (
                <img
                  src={uploadPreview}
                  alt="Uploaded certificate preview"
                  className="upload-preview-img"
                />
              ) : (
                <>
                  <div className="upload-zone-icon">
                    {dragging ? "📥" : "📁"}
                  </div>
                  <div className="upload-zone-title">
                    {dragging ? "Drop to scan" : "Drop certificate image here"}
                  </div>
                  <div className="upload-zone-sub">or click to browse · JPG, PNG, WebP</div>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              id="cert-image-file-input"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => processImage(e.target.files?.[0])}
            />

            {/* Status */}
            {processing && (
              <div className="upload-status">
                <span className="spinner" aria-hidden="true" />
                Scanning image for QR code…
              </div>
            )}

            {uploadError && (
              <div className="alert alert-error" style={{ marginTop: "12px" }} role="alert">
                {uploadError}
              </div>
            )}

            {uploadPreview && !processing && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginTop: "12px" }}
                onClick={resetUpload}
              >
                ✕ Remove &amp; try another
              </button>
            )}

            <p className="form-hint" style={{ marginTop: "14px" }}>
              Upload a photo or screenshot of the certificate. The QR code will be automatically extracted and verified.
            </p>
          </div>
        )}

        {/* ── TAB: Scan QR ───────────────────────────────────────────────── */}
        {tab === "scan" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "56px", marginBottom: "16px", lineHeight: 1 }}>📷</div>
            <p style={{ fontSize: "15px", color: "var(--text-secondary)", marginBottom: "24px", lineHeight: 1.6 }}>
              Use your device camera to scan the QR code on a physical or digital certificate for instant verification.
            </p>
            <Link to="/scan">
              <button id="open-camera-scanner-btn" className="btn btn-primary btn-lg">
                Open Camera Scanner
              </button>
            </Link>
            <p className="form-hint" style={{ marginTop: "16px" }}>
              Requires camera permission. Works best on mobile devices pointing at a printed certificate.
            </p>
          </div>
        )}

        {/* Back to home */}
        <div style={{ marginTop: "32px", textAlign: "center" }}>
          <Link to="/" className="btn btn-ghost btn-sm">← Back to Home</Link>
        </div>
      </div>
    </div>
  );
}

export default VerifyLanding;
