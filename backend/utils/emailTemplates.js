/**
 * Email templates for CertVault notifications.
 */

/**
 * Builds the HTML and plain-text email for newly issued certificates.
 *
 * @param {object} params
 * @param {object} params.certificate
 * @param {string} params.verificationUrl
 * @param {string} [params.dashboardUrl]
 * @returns {{ subject: string, html: string, text: string, attachments: Array }}
 */
const getCertificateIssuedEmail = ({
  certificate,
  verificationUrl,
  dashboardUrl = "http://localhost:5173/recipient-dashboard",
}) => {
  const issueDateFormatted = new Date(certificate.issueDate).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const expiryDateFormatted = certificate.expiryDate
    ? new Date(certificate.expiryDate).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Lifetime (Never Expires)";

  const subject = `🎓 Your Digital Certificate from ${certificate.organization}: ${certificate.courseName}`;

  const text = `Hello ${certificate.recipientName},

Congratulations! A new verified digital certificate has been issued to you by ${certificate.organization}.

Certificate Details:
- Certificate ID: ${certificate.certificateId}
- Recipient: ${certificate.recipientName}
- Course / Program: ${certificate.courseName}
- Issuing Organization: ${certificate.organization}
- Issue Date: ${issueDateFormatted}
- Expiry Date: ${expiryDateFormatted}
- Status: VALID

You can verify and view your certificate online at:
${verificationUrl}

Access all your certificates anytime in your recipient portal:
${dashboardUrl}

Best regards,
${certificate.organization} & The CertVault Team`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b1120;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }
    table { border-collapse: collapse; }
    .email-container {
      max-width: 600px;
      margin: 30px auto;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }
    .email-header {
      background: linear-gradient(135deg, #3730a3 0%, #4f46e5 50%, #7c3aed 100%);
      padding: 32px 24px;
      text-align: center;
    }
    .badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(8px);
      color: #ffffff;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    .email-title {
      color: #ffffff;
      font-size: 24px;
      font-weight: 800;
      margin: 0 0 6px 0;
    }
    .email-subtitle {
      color: #c7d2fe;
      font-size: 14px;
      margin: 0;
    }
    .email-body {
      padding: 32px 24px;
    }
    .greeting {
      font-size: 17px;
      line-height: 1.6;
      margin-bottom: 24px;
      color: #f1f5f9;
    }
    .cert-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .detail-row {
      padding: 8px 0;
      border-bottom: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      font-size: 14px;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      color: #94a3b8;
      font-weight: 500;
    }
    .detail-value {
      color: #f8fafc;
      font-weight: 600;
      text-align: right;
    }
    .detail-mono {
      font-family: monospace;
      color: #38bdf8;
      background: #0f172a;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 13px;
    }
    .qr-section {
      text-align: center;
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 28px;
    }
    .qr-img {
      border-radius: 8px;
      background: #ffffff;
      padding: 8px;
      display: inline-block;
      max-width: 140px;
      height: auto;
    }
    .qr-hint {
      color: #94a3b8;
      font-size: 12px;
      margin-top: 10px;
    }
    .btn-container {
      text-align: center;
      margin-bottom: 28px;
    }
    .btn-primary {
      display: inline-block;
      background: #4f46e5;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 15px;
      padding: 12px 28px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
    }
    .btn-secondary {
      display: inline-block;
      background: #1e293b;
      color: #94a3b8 !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 13px;
      padding: 10px 20px;
      border-radius: 8px;
      border: 1px solid #334155;
      margin-left: 10px;
    }
    .email-footer {
      border-top: 1px solid #1e293b;
      padding: 20px 24px;
      text-align: center;
      color: #64748b;
      font-size: 12px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <div class="badge">Verified Credential</div>
      <h1 class="email-title">Certificate Issued</h1>
      <p class="email-subtitle">Presented by ${certificate.organization}</p>
    </div>

    <div class="email-body">
      <p class="greeting">
        Hello <strong>${certificate.recipientName}</strong>,<br /><br />
        Congratulations! You have successfully been awarded a verified digital certificate by <strong>${certificate.organization}</strong>.
      </p>

      <div class="cert-card">
        <table width="100%" cellpadding="6" cellspacing="0">
          <tr>
            <td class="detail-label">Certificate ID</td>
            <td class="detail-value"><span class="detail-mono">${certificate.certificateId}</span></td>
          </tr>
          <tr>
            <td class="detail-label">Program / Course</td>
            <td class="detail-value">${certificate.courseName}</td>
          </tr>
          <tr>
            <td class="detail-label">Issuing Body</td>
            <td class="detail-value">${certificate.organization}</td>
          </tr>
          <tr>
            <td class="detail-label">Issue Date</td>
            <td class="detail-value">${issueDateFormatted}</td>
          </tr>
          <tr>
            <td class="detail-label">Expiry Date</td>
            <td class="detail-value">${expiryDateFormatted}</td>
          </tr>
          <tr>
            <td class="detail-label">Status</td>
            <td class="detail-value" style="color: #10b981;">VALID ✅</td>
          </tr>
        </table>
      </div>

      ${
        certificate.qrCode
          ? `<div class="qr-section">
              <img class="qr-img" src="cid:certqrcode" alt="Verification QR code" width="130" height="130" />
              <div class="qr-hint">Scan with any camera or scanner to verify authenticity</div>
            </div>`
          : ""
      }

      <div class="btn-container">
        <a href="${verificationUrl}" class="btn-primary" target="_blank">Verify Certificate Online</a>
        <a href="${dashboardUrl}" class="btn-secondary" target="_blank">Recipient Portal</a>
      </div>
    </div>

    <div class="email-footer">
      This is an automated notification from CertVault on behalf of ${certificate.organization}.<br />
      If you did not expect this certificate, please contact ${certificate.organization}.
    </div>
  </div>
</body>
</html>`;

  const attachments = [];
  if (certificate.qrCode) {
    attachments.push({
      filename: `certificate-${certificate.certificateId}-qr.png`,
      path: certificate.qrCode,
      cid: "certqrcode",
    });
  }

  return { subject, html, text, attachments };
};

/**
 * Builds the notification email for revoked certificates.
 *
 * @param {object} params
 * @param {object} params.certificate
 * @returns {{ subject: string, html: string, text: string }}
 */
const getCertificateRevokedEmail = ({ certificate }) => {
  const subject = `⚠️ Certificate Revocation Notice: ${certificate.courseName} (${certificate.certificateId})`;

  const text = `Hello ${certificate.recipientName},

Please be informed that your certificate for "${certificate.courseName}" (ID: ${certificate.certificateId}) has been marked as REVOKED by ${certificate.organization}.

If you have questions or believe this was done in error, please reach out to ${certificate.organization} directly.

Best regards,
${certificate.organization} & The CertVault Team`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b1120;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
    }
    .container {
      max-width: 580px;
      margin: 30px auto;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 14px;
      overflow: hidden;
      padding: 28px;
    }
    .header {
      color: #ef4444;
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 16px;
    }
    .card {
      background: #1e293b;
      border-radius: 10px;
      padding: 16px;
      margin: 20px 0;
      font-size: 14px;
      line-height: 1.6;
    }
    .mono { font-family: monospace; color: #f87171; }
    .footer {
      font-size: 12px;
      color: #64748b;
      margin-top: 24px;
      border-top: 1px solid #1e293b;
      padding-top: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">⚠️ Certificate Revocation Notice</div>
    <p>Hello <strong>${certificate.recipientName}</strong>,</p>
    <p>
      This email is to notify you that the certificate issued to you by <strong>${certificate.organization}</strong> has been marked as <strong>REVOKED</strong>.
    </p>

    <div class="card">
      <div><strong>Certificate ID:</strong> <span class="mono">${certificate.certificateId}</span></div>
      <div><strong>Course / Program:</strong> ${certificate.courseName}</div>
      <div><strong>Issuing Organization:</strong> ${certificate.organization}</div>
      <div><strong>Current Status:</strong> <span style="color: #ef4444; font-weight: bold;">REVOKED</span></div>
    </div>

    <p>
      If you believe this revocation was made in error, please contact ${certificate.organization} for clarification.
    </p>

    <div class="footer">
      CertVault automated status alert on behalf of ${certificate.organization}.
    </div>
  </div>
</body>
</html>`;

  return { subject, html, text };
};

module.exports = {
  getCertificateIssuedEmail,
  getCertificateRevokedEmail,
};
