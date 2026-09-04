const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

// Ensure required env vars are set before importing app
process.env.JWT_SECRET = "test_jwt_secret_for_integration_testing_12345";
process.env.NODE_ENV = "test";

const app = require("../server");
const User = require("../models/User");
const Certificate = require("../models/Certificate");

let mongoServer;
let server;
let baseUrl;

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Helper for making JSON HTTP requests
const req = async (method, path, body = null, token = null) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${baseUrl}${path}`, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, headers: res.headers, data };
};

// ══════════════════════════════════════════════════════════════════════════════
// 1. AUTHENTICATION & REGISTRATION TESTS
// ══════════════════════════════════════════════════════════════════════════════

test("1.1 Registration: organization role succeeds with valid data", async () => {
  const res = await req("POST", "/api/auth/register", {
    name: "Tech Academy Admin",
    email: "org1@test.com",
    password: "Password123!",
    role: "organization",
    organization: "Tech Academy",
  });

  assert.equal(res.status, 201);
  assert.equal(res.data.user.role, "organization");
  assert.equal(res.data.user.organization, "Tech Academy");
  assert.equal(res.data.user.email, "org1@test.com");
  assert.equal(res.data.user.password, undefined); // Password must never be returned
});

test("1.2 Registration: organization fails if organization name is missing", async () => {
  const res = await req("POST", "/api/auth/register", {
    name: "Nameless Org Admin",
    email: "nameless@test.com",
    password: "Password123!",
    role: "organization",
  });

  assert.equal(res.status, 400);
  assert.match(res.data.message, /Organization name is required/i);
});

test("1.3 Registration: recipient role succeeds without organization name", async () => {
  const res = await req("POST", "/api/auth/register", {
    name: "Alice Student",
    email: "alice@student.com",
    password: "Password123!",
    role: "recipient",
  });

  assert.equal(res.status, 201);
  assert.equal(res.data.user.role, "recipient");
  assert.equal(res.data.user.organization, null);
});

test("1.4 Registration: fails on duplicate email (case-insensitive)", async () => {
  const res = await req("POST", "/api/auth/register", {
    name: "Alice Duplicate",
    email: "ALICE@STUDENT.COM", // Upper case should match existing
    password: "Password123!",
    role: "recipient",
  });

  assert.equal(res.status, 409);
  assert.match(res.data.message, /already exists/i);
});

test("1.5 Registration: fails on invalid role or short password", async () => {
  const resInvalidRole = await req("POST", "/api/auth/register", {
    name: "Hacker",
    email: "hacker@test.com",
    password: "Password123!",
    role: "admin", // Users cannot self-register as admin
  });
  assert.equal(resInvalidRole.status, 400);

  const resShortPass = await req("POST", "/api/auth/register", {
    name: "Short Pass",
    email: "short@test.com",
    password: "short",
    role: "recipient",
  });
  assert.equal(resShortPass.status, 400);
});

test("1.6 Login: succeeds with correct credentials and returns JWT", async () => {
  const res = await req("POST", "/api/auth/login", {
    email: "org1@test.com",
    password: "Password123!",
  });

  assert.equal(res.status, 200);
  assert.ok(res.data.token);
  assert.equal(res.data.user.email, "org1@test.com");
  assert.equal(res.data.user.role, "organization");
});

test("1.7 Login: fails with wrong password or non-existent email", async () => {
  const resWrongPass = await req("POST", "/api/auth/login", {
    email: "org1@test.com",
    password: "WrongPassword!",
  });
  assert.equal(resWrongPass.status, 401);

  const resNotFound = await req("POST", "/api/auth/login", {
    email: "nonexistent@test.com",
    password: "Password123!",
  });
  assert.equal(resNotFound.status, 401);
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. ROLE-BASED ACCESS & PROTECTED ROUTES
// ══════════════════════════════════════════════════════════════════════════════

let orgToken;
let recipientToken;
let adminToken;
let org2Token;

test("Setup tokens for role testing", async () => {
  // Login org1
  const orgRes = await req("POST", "/api/auth/login", { email: "org1@test.com", password: "Password123!" });
  orgToken = orgRes.data.token;

  // Login recipient
  const recRes = await req("POST", "/api/auth/login", { email: "alice@student.com", password: "Password123!" });
  recipientToken = recRes.data.token;

  // Create & login org2 (for isolation testing)
  await req("POST", "/api/auth/register", {
    name: "Org Two Admin",
    email: "org2@test.com",
    password: "Password123!",
    role: "organization",
    organization: "Second Academy",
  });
  const org2Res = await req("POST", "/api/auth/login", { email: "org2@test.com", password: "Password123!" });
  org2Token = org2Res.data.token;

  // Create an admin in DB directly
  const bcrypt = require("bcryptjs");
  const adminHashedPassword = await bcrypt.hash("AdminPassword123!", 12);
  const adminUser = await User.create({
    name: "Super Admin",
    email: "admin@certvault.app",
    password: adminHashedPassword,
    role: "admin",
    isActive: true,
  });

  const adminRes = await req("POST", "/api/auth/login", { email: "admin@certvault.app", password: "AdminPassword123!" });
  adminToken = adminRes.data.token;
});

test("2.1 Unauthenticated requests to protected endpoints return 401", async () => {
  const res = await req("GET", "/api/auth/me");
  assert.equal(res.status, 401);

  const resCert = await req("GET", "/api/certificates");
  assert.equal(resCert.status, 401);
});

test("2.2 Recipient cannot issue certificates (403 Forbidden)", async () => {
  const res = await req("POST", "/api/certificates", {
    recipientName: "Bob",
    recipientEmail: "bob@student.com",
    courseName: "Illegal Course",
  }, recipientToken);

  assert.equal(res.status, 403);
});

test("2.3 Organization cannot access admin routes (403 Forbidden)", async () => {
  const res = await req("GET", "/api/admin/stats", null, orgToken);
  assert.equal(res.status, 403);
});

test("2.4 Admin can access admin routes (200 OK)", async () => {
  const res = await req("GET", "/api/admin/stats", null, adminToken);
  assert.equal(res.status, 200);
  assert.ok(res.data.stats.totalUsers >= 4);
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. CERTIFICATE LIFECYCLE & ORGANIZATION DATA ISOLATION
// ══════════════════════════════════════════════════════════════════════════════

let issuedCertId;

test("3.1 Issue certificate: succeeds with QR code, unique ID, and valid status", async () => {
  const res = await req("POST", "/api/certificates", {
    recipientName: "Alice Student",
    recipientEmail: "alice@student.com",
    courseName: "Full Stack Cloud Engineering",
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  }, orgToken);

  assert.equal(res.status, 201);
  assert.ok(res.data.certificate.certificateId.startsWith("CERT-"));
  assert.ok(res.data.certificate.qrCode.startsWith("data:image/png;base64,"));
  assert.equal(res.data.certificate.status, "VALID");
  assert.equal(res.data.certificate.organization, "Tech Academy");

  issuedCertId = res.data.certificate.certificateId;
});

test("3.2 Issue certificate: validates missing fields and invalid email format", async () => {
  const resMissing = await req("POST", "/api/certificates", {
    recipientName: "Incomplete",
  }, orgToken);
  assert.equal(resMissing.status, 400);

  const resBadEmail = await req("POST", "/api/certificates", {
    recipientName: "Bad Email",
    recipientEmail: "notanemail",
    courseName: "Intro to Web",
  }, orgToken);
  assert.equal(resBadEmail.status, 400);
  assert.match(resBadEmail.data.message, /invalid recipient email/i);
});

test("3.3 Organization isolation: Org 2 cannot retrieve Org 1's certificate details", async () => {
  const res = await req("GET", `/api/certificates/${issuedCertId}`, null, org2Token);
  assert.equal(res.status, 404);
});

test("3.4 Organization isolation: Org 2 cannot revoke Org 1's certificate", async () => {
  const res = await req("PATCH", `/api/certificates/${issuedCertId}/revoke`, null, org2Token);
  assert.equal(res.status, 404);
});

test("3.5 Issuing Org 1 can retrieve its own certificate", async () => {
  const res = await req("GET", `/api/certificates/${issuedCertId}`, null, orgToken);
  assert.equal(res.status, 200);
  assert.equal(res.data.certificate.certificateId, issuedCertId);
});

test("3.6 Recipient sees issued certificate in /certificates/my", async () => {
  const res = await req("GET", "/api/certificates/my", null, recipientToken);
  assert.equal(res.status, 200);
  assert.equal(res.data.certificates.length, 1);
  assert.equal(res.data.certificates[0].certificateId, issuedCertId);
});

test("3.7 Certificate Revocation: issuing organization can revoke certificate", async () => {
  const res = await req("PATCH", `/api/certificates/${issuedCertId}/revoke`, null, orgToken);
  assert.equal(res.status, 200);
  assert.equal(res.data.certificate.status, "REVOKED");

  // Attempting to revoke again returns 400
  const resAlreadyRevoked = await req("PATCH", `/api/certificates/${issuedCertId}/revoke`, null, orgToken);
  assert.equal(resAlreadyRevoked.status, 400);
  assert.match(resAlreadyRevoked.data.message, /already revoked/i);
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. PUBLIC VERIFICATION
// ══════════════════════════════════════════════════════════════════════════════

test("4.1 Public verification works without authentication", async () => {
  const res = await req("GET", `/api/certificates/verify/${issuedCertId}`);
  assert.equal(res.status, 200);
  assert.equal(res.data.valid, false); // Because we revoked it in test 3.7
  assert.equal(res.data.certificate.status, "REVOKED");
  assert.equal(res.data.certificate.certificateId, issuedCertId);
  // Recipient email should NOT be leaked in public verification
  assert.equal(res.data.certificate.recipientEmail, undefined);
});

test("4.2 Public verification for non-existent certificate returns 404", async () => {
  const res = await req("GET", "/api/certificates/verify/CERT-DOES-NOT-EXIST");
  assert.equal(res.status, 404);
  assert.equal(res.data.valid, false);
});

test("4.3 Public verification auto-expires certificates past their expiry date", async () => {
  // Create an expired certificate in the DB
  const expiredCert = await Certificate.create({
    certificateId: "CERT-PAST-EXPIRY-001",
    recipientName: "Past Student",
    recipientEmail: "past@student.com",
    courseName: "Historical Computing",
    organization: "Tech Academy",
    issueDate: new Date("2020-01-01"),
    expiryDate: new Date("2021-01-01"), // In the past
    status: "VALID",
    issuedBy: (await User.findOne({ email: "org1@test.com" }))._id,
  });

  const res = await req("GET", `/api/certificates/verify/${expiredCert.certificateId}`);
  assert.equal(res.status, 200);
  assert.equal(res.data.valid, false);
  assert.equal(res.data.certificate.status, "EXPIRED");
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. PROFILE & EXTENDED ORGANIZATION FIELDS
// ══════════════════════════════════════════════════════════════════════════════

test("5.1 Organization updates profile with website, description, contact details", async () => {
  const res = await req("PATCH", "/api/auth/me", {
    name: "Updated Org Director",
    organization: "Tech Academy International",
    website: "https://techacademy.org",
    description: "Leading technical certification authority.",
    contactEmail: "contact@techacademy.org",
    phone: "+1-555-0199",
  }, orgToken);

  assert.equal(res.status, 200);
  assert.equal(res.data.user.name, "Updated Org Director");
  assert.equal(res.data.user.organization, "Tech Academy International");
  assert.equal(res.data.user.website, "https://techacademy.org");
  assert.equal(res.data.user.contactEmail, "contact@techacademy.org");
  assert.equal(res.data.user.phone, "+1-555-0199");
});

test("5.2 Profile update rejects invalid contact email", async () => {
  const res = await req("PATCH", "/api/auth/me", {
    contactEmail: "not-a-valid-email",
  }, orgToken);

  assert.equal(res.status, 400);
  assert.match(res.data.message, /invalid contact email/i);
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. DEACTIVATION GUARD TESTS
// ══════════════════════════════════════════════════════════════════════════════

test("6.1 Admin deactivates organization account", async () => {
  const orgUser = await User.findOne({ email: "org2@test.com" });
  const res = await req("PATCH", `/api/admin/users/${orgUser._id}/status`, null, adminToken);

  assert.equal(res.status, 200);
  assert.equal(res.data.user.isActive, false);
});

test("6.2 Deactivated user cannot log in (403 Forbidden)", async () => {
  const res = await req("POST", "/api/auth/login", {
    email: "org2@test.com",
    password: "Password123!",
  });

  assert.equal(res.status, 403);
  assert.match(res.data.message, /deactivated/i);
});

test("6.3 Deactivated user cannot use previously issued token (403 Forbidden)", async () => {
  const res = await req("GET", "/api/auth/me", null, org2Token);

  assert.equal(res.status, 403);
  assert.match(res.data.message, /deactivated/i);
});

test("6.4 Admin cannot deactivate their own account", async () => {
  const adminUser = await User.findOne({ email: "admin@certvault.app" });
  const res = await req("PATCH", `/api/admin/users/${adminUser._id}/status`, null, adminToken);

  assert.equal(res.status, 400);
  assert.match(res.data.message, /cannot deactivate your own admin account/i);
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. PRODUCTION READINESS & HEALTH CHECKS
// ══════════════════════════════════════════════════════════════════════════════

test("7.1 Health check endpoints / and /api/ respond with 200", async () => {
  const resRoot = await req("GET", "/");
  assert.equal(resRoot.status, 200);
  assert.match(resRoot.data.message, /Digital Certificate Verification API is running/);

  const resApi = await req("GET", "/api/");
  assert.equal(resApi.status, 200);
  assert.match(resApi.data.message, /Digital Certificate Verification API is running/);
});
