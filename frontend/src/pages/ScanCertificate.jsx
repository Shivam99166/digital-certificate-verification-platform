import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import jsQR from "jsqr";

function ScanCertificate() {
  const navigate = useNavigate();
  const scannerRef    = useRef(null);
  const fileInputRef  = useRef(null);

  const [cameraError, setCameraError]   = useState("");
  const [scanning, setScanning]         = useState(false);
  const [stopped, setStopped]           = useState(false);
  const [fileError, setFileError]       = useState("");
  const [fileProcessing, setFileProcessing] = useState(false);

  // ── QR decode handler (shared by camera + file) ───────────────────────────
  const handleDecodedText = useCallback((decodedText, source) => {
    if (source === "camera") {
      setScanning(false);
      setStopped(true);
    }

    const raw = decodedText.trim();

    // Case 1: Full URL e.g. https://certvault.app/verify/CERT-2026-XXXX
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

    // Case 2: Bare certificate ID
    if (raw.startsWith("CERT-") || raw.match(/^[A-Z0-9-]{6,}$/)) {
      navigate(`/verify/${raw}`);
      return;
    }

    const msg = `QR code content not recognized as a CertVault certificate: "${raw.slice(0, 60)}"`;
    if (source === "camera") setCameraError(msg);
    else setFileError(msg);
  }, [navigate]);

  // ── Camera scanner ────────────────────────────────────────────────────────
  useEffect(() => {
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    const startScanner = async () => {
      try {
        setScanning(true);
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            scanner.stop().catch(() => {}).finally(() => {
              handleDecodedText(decodedText, "camera");
            });
          },
          () => {
            // Continuous frame errors are suppressed
          }
        );
      } catch (err) {
        console.warn("Camera start error:", err);
        setCameraError(
          "Unable to access camera. Please allow camera permission and try again."
        );
        setScanning(false);
      }
    };

    startScanner();

    return () => {
      if (scanner.isScanning) scanner.stop().catch(() => {});
    };
  }, [handleDecodedText]);

  // ── File upload: jsQR ─────────────────────────────────────────────────────
  const handleFileUpload = (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFileError("Please select an image file (JPG, PNG, WebP).");
      return;
    }

    setFileError("");
    setFileProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
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
            handleDecodedText(code.data, "file");
          } else {
            setFileError(
              "No QR code found in the image. Ensure the QR code is clearly visible and not blurry."
            );
          }
        } catch {
          setFileError("Failed to process the image. Please try a different file.");
        } finally {
          setFileProcessing(false);
        }
      };
      img.onerror = () => {
        setFileError("Cannot read this image.");
        setFileProcessing(false);
      };
      img.src = e.target.result;
    };
    reader.onerror = () => {
      setFileError("Failed to read file.");
      setFileProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="scanner-page">
      <div className="scanner-card">
        {/* Logo */}
        <div style={{ marginBottom: "20px" }}>
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "18px" }}>🏅</span>
            <span style={{
              fontWeight: 800, fontSize: "14px",
              background: "var(--gradient)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>
              CertVault
            </span>
          </Link>
        </div>

        <h1 className="scanner-title">Scan Certificate QR</h1>
        <p className="scanner-subtitle">
          Point your camera at the QR code on a certificate to verify it instantly.
        </p>

        {/* Camera viewfinder */}
        <div id="qr-reader" aria-label="QR code scanner viewfinder" />

        {scanning && !stopped && (
          <p className="scanner-status">📷 Point camera at the QR code…</p>
        )}
        {stopped && !cameraError && (
          <p className="scanner-status" style={{ color: "var(--success-light)" }}>
            ✅ QR code detected! Redirecting…
          </p>
        )}
        {cameraError && (
          <div className="alert alert-error" role="alert" style={{ marginTop: "16px" }}>
            <strong>Camera Error</strong>
            <p style={{ marginTop: "4px", opacity: 0.9 }}>{cameraError}</p>
          </div>
        )}

        {/* ── Image upload fallback ────────────────────────────────────── */}
        <div className="scan-file-fallback">
          <div className="scan-file-divider">
            <span>or upload an image</span>
          </div>

          <label
            htmlFor="scan-file-input"
            className="btn btn-secondary btn-sm btn-full"
            style={{ cursor: "pointer", textAlign: "center" }}
          >
            {fileProcessing ? (
              <><span className="spinner" aria-hidden="true" /> Scanning…</>
            ) : (
              "📁 Upload Certificate Image"
            )}
          </label>
          <input
            ref={fileInputRef}
            id="scan-file-input"
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => handleFileUpload(e.target.files?.[0])}
          />

          {fileError && (
            <div className="alert alert-error" role="alert" style={{ marginTop: "10px" }}>
              {fileError}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/verify" className="btn btn-secondary btn-sm">
            🔍 Verify by ID
          </Link>
          <Link to="/" className="btn btn-ghost btn-sm">
            ← Home
          </Link>
          {cameraError && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => window.location.reload()}
            >
              Retry Camera
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ScanCertificate;