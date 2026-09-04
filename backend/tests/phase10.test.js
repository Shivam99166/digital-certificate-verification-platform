const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getCertificateIssuedEmail,
  getCertificateRevokedEmail,
} = require("../utils/emailTemplates");
const sendEmail = require("../utils/sendEmail");

test("getCertificateIssuedEmail constructs accurate email details and QR attachment", () => {
  const fakeCertificate = {
    certificateId: "CERT-ABC123XYZ",
    recipientName: "Alice Wonderland",
    recipientEmail: "alice@example.com",
    courseName: "Advanced Cryptography & Web3",
    organization: "Global Tech Academy",
    issueDate: new Date("2026-01-15T00:00:00Z"),
    expiryDate: new Date("2028-01-15T00:00:00Z"),
    status: "VALID",
    qrCode: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  };

  const verificationUrl = "http://localhost:5173/verify/CERT-ABC123XYZ";
  const dashboardUrl = "http://localhost:5173/recipient-dashboard";

  const email = getCertificateIssuedEmail({
    certificate: fakeCertificate,
    verificationUrl,
    dashboardUrl,
  });

  // Subject checks
  assert.match(email.subject, /Global Tech Academy/);
  assert.match(email.subject, /Advanced Cryptography/);

  // Plain-text checks
  assert.match(email.text, /Alice Wonderland/);
  assert.match(email.text, /CERT-ABC123XYZ/);
  assert.match(email.text, /http:\/\/localhost:5173\/verify\/CERT-ABC123XYZ/);

  // HTML content checks
  assert.match(email.html, /Alice Wonderland/);
  assert.match(email.html, /Advanced Cryptography &amp; Web3|Advanced Cryptography & Web3/);
  assert.match(email.html, /CERT-ABC123XYZ/);
  assert.match(email.html, /cid:certqrcode/);

  // QR attachment
  assert.equal(email.attachments.length, 1);
  assert.equal(email.attachments[0].cid, "certqrcode");
  assert.equal(email.attachments[0].path, fakeCertificate.qrCode);
});

test("getCertificateRevokedEmail constructs revocation notice", () => {
  const fakeCertificate = {
    certificateId: "CERT-REVOKED999",
    recipientName: "Bob Smith",
    recipientEmail: "bob@example.com",
    courseName: "Ethical Hacking",
    organization: "Security Institute",
    status: "REVOKED",
  };

  const email = getCertificateRevokedEmail({ certificate: fakeCertificate });

  assert.match(email.subject, /Revocation Notice/i);
  assert.match(email.subject, /CERT-REVOKED999/);
  assert.match(email.text, /Bob Smith/);
  assert.match(email.text, /REVOKED/);
  assert.match(email.html, /CERT-REVOKED999/);
});

test("sendEmail falls back gracefully in development when SMTP is unconfigured", async () => {
  // Ensure development fallback does not throw
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";

  const result = await sendEmail({
    to: "test@example.com",
    subject: "Test Subject",
    html: "<p>Hello</p>",
    text: "Hello",
  });

  assert.equal(result.sent, false);
  assert.equal(result.dev, true);

  process.env.NODE_ENV = prevEnv;
});
