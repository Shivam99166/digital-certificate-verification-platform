import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import IssueCertificate from "./pages/IssueCertificate";
import CertificateDetails from "./pages/CertificateDetails";
import ScanCertificate from "./pages/ScanCertificate";
import VerifyCertificate from "./pages/VerifyCertificate";
import VerifyLanding from "./pages/VerifyLanding";
import OrganizationProfile from "./pages/OrganizationProfile";
import AdminDashboard from "./pages/AdminDashboard";
import RecipientDashboard from "./pages/RecipientDashboard";

import ProtectedRoute from "./components/ProtectedRoute";

const ISSUER_ROLES = ["organization", "admin"];

function Home() {
  return (
    <main className="home-page">
      <div className="home-badge">
        <span>🔐</span> Trusted Digital Certificates
      </div>

      <h1 className="home-title">
        Issue &amp; Verify{" "}
        <span className="home-title-gradient">Digital Certificates</span>{" "}
        with Confidence
      </h1>

      <p className="home-subtitle">
        CertVault enables organizations to issue tamper-proof digital
        certificates and allows anyone to verify their authenticity instantly.
      </p>

      <div className="home-actions">
        <Link to="/login">
          <button id="home-login-btn" className="btn btn-primary btn-xl">
            Sign In
          </button>
        </Link>
        <Link to="/register">
          <button id="home-register-btn" className="btn btn-secondary btn-xl">
            Create Account
          </button>
        </Link>
        <Link to="/verify">
          <button id="home-verify-btn" className="btn btn-ghost btn-xl">
            Verify a Certificate →
          </button>
        </Link>
      </div>

      <div className="home-features">
        <div className="home-feature-card">
          <div className="home-feature-icon">🏢</div>
          <div className="home-feature-title">For Organizations</div>
          <div className="home-feature-desc">
            Issue certificates with QR codes for instant verification.
          </div>
        </div>
        <div className="home-feature-card">
          <div className="home-feature-icon">🎓</div>
          <div className="home-feature-title">For Recipients</div>
          <div className="home-feature-desc">
            Access and share your verified digital credentials anytime.
          </div>
        </div>
        <div className="home-feature-card">
          <div className="home-feature-icon">✅</div>
          <div className="home-feature-title">Instant Verification</div>
          <div className="home-feature-desc">
            Verify any certificate via ID, QR scan, or upload in seconds.
          </div>
        </div>
      </div>
    </main>
  );
}

function Unauthorized() {
  return (
    <div className="unauth-page">
      <div className="unauth-icon">🚫</div>
      <h1 className="unauth-title">Access Denied</h1>
      <p className="unauth-desc">
        You don&apos;t have permission to view this page.
        <br />
        Please log in with an account that has the required role.
      </p>
      <div style={{ display: "flex", gap: "12px" }}>
        <Link to="/">
          <button className="btn btn-secondary">← Back to Home</button>
        </Link>
        <Link to="/login">
          <button className="btn btn-primary">Sign In</button>
        </Link>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Public verification */}
        <Route path="/verify" element={<VerifyLanding />} />
        <Route path="/verify/:certificateId" element={<VerifyCertificate />} />
        <Route path="/scan" element={<ScanCertificate />} />

        {/* Utility */}
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Protected — organization / admin */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={ISSUER_ROLES}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/issue-certificate"
          element={
            <ProtectedRoute allowedRoles={ISSUER_ROLES}>
              <IssueCertificate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/certificate/:certificateId"
          element={
            <ProtectedRoute allowedRoles={ISSUER_ROLES}>
              <CertificateDetails />
            </ProtectedRoute>
          }
        />

        {/* Recipient dashboard */}
        <Route
          path="/recipient-dashboard"
          element={
            <ProtectedRoute allowedRoles={["recipient", "admin"]}>
              <RecipientDashboard />
            </ProtectedRoute>
          }
        />

        {/* Profile — any authenticated user */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <OrganizationProfile />
            </ProtectedRoute>
          }
        />

        {/* Admin — admin role only */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;