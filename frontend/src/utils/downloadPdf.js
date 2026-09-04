import jsPDF from "jspdf";

/**
 * Generates and downloads a beautiful A4 landscape PDF certificate.
 *
 * The PDF is built entirely programmatically with jsPDF (no html2canvas /
 * DOM capture) — giving crisp vector text at any resolution.
 *
 * @param {object} certificate - Certificate data object
 * @param {string} certificate.certificateId
 * @param {string} certificate.recipientName
 * @param {string} certificate.courseName
 * @param {string} certificate.organization
 * @param {string|Date} certificate.issueDate
 * @param {string|Date|null} certificate.expiryDate
 * @param {string} certificate.status  - "VALID" | "REVOKED" | "EXPIRED"
 * @param {string|null} [certificate.qrCode] - Base64 data URL (optional)
 */
export const downloadCertificatePDF = (certificate) => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const W = doc.internal.pageSize.getWidth();   // 297 mm
  const H = doc.internal.pageSize.getHeight();  // 210 mm

  // ─── Background ────────────────────────────────────────────────────────────
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, "F");

  // ─── Double border ─────────────────────────────────────────────────────────
  doc.setDrawColor(67, 56, 202);
  doc.setLineWidth(3.5);
  doc.rect(7, 7, W - 14, H - 14);
  doc.setLineWidth(0.6);
  doc.rect(11, 11, W - 22, H - 22);

  // ─── Header band ───────────────────────────────────────────────────────────
  doc.setFillColor(67, 56, 202); // indigo-700
  doc.rect(7, 7, W - 14, 54, "F");

  // Decorative circle accents (top-right & bottom-left corners of header)
  doc.setFillColor(109, 40, 217); // violet-700
  doc.circle(W - 7, 7, 28, "F");
  doc.circle(7, 61, 18, "F");

  // Organisation name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  const orgText = (certificate.organization || "CertVault").toUpperCase();
  doc.text(orgText, W / 2, 22, { align: "center", charSpace: 2.5 });

  // Title
  doc.setFontSize(28);
  doc.setFont("times", "bold");
  doc.text("Certificate of Achievement", W / 2, 43, { align: "center" });

  // Sub-tagline
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(210, 210, 255);
  doc.text(
    "This is to certify that the following individual has successfully completed the program",
    W / 2, 56, { align: "center" }
  );

  // ─── Body ──────────────────────────────────────────────────────────────────
  const bodyStartY = 74;

  // "This certificate is proudly presented to"
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.text("This certificate is proudly presented to", W / 2, bodyStartY, { align: "center" });

  // Recipient name — large, serif, bold-italic
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(36);
  doc.setFont("times", "bolditalic");
  const nameLines = doc.splitTextToSize(certificate.recipientName, W - 80);
  doc.text(nameLines, W / 2, bodyStartY + 17, { align: "center" });

  const nameBottomY = bodyStartY + 17 + (nameLines.length - 1) * 13;

  // "for successfully completing"
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("for successfully completing", W / 2, nameBottomY + 12, { align: "center" });

  // Course name — indigo, bold
  doc.setTextColor(67, 56, 202);
  doc.setFontSize(19);
  doc.setFont("helvetica", "bold");
  const courseLines = doc.splitTextToSize(certificate.courseName, W - 80);
  doc.text(courseLines, W / 2, nameBottomY + 23, { align: "center" });

  const courseBottomY = nameBottomY + 23 + (courseLines.length - 1) * 8;

  // ─── Divider ───────────────────────────────────────────────────────────────
  const divY = courseBottomY + 10;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.4);
  doc.line(30, divY, W - 30, divY);

  // ─── Metadata row ──────────────────────────────────────────────────────────
  const metaY = divY + 11;

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "N/A";

  const statusColors = {
    VALID:   [16, 185, 129],
    REVOKED: [239, 68, 68],
    EXPIRED: [245, 158, 11],
  };

  const metaItems = [
    { label: "CERTIFICATE ID", value: certificate.certificateId, x: 60, mono: true },
    {
      label: "ISSUE DATE",
      value: formatDate(certificate.issueDate),
      x: certificate.qrCode ? W / 2 - 20 : W / 2,
    },
    {
      label: "EXPIRY DATE",
      value: certificate.expiryDate ? formatDate(certificate.expiryDate) : "No Expiry",
      x: certificate.qrCode ? W - 80 : W - 60,
    },
  ];

  metaItems.forEach(({ label, value, x, mono }) => {
    // Label
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text(label, x, metaY, { align: "center", charSpace: 1.5 });

    // Value
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(mono ? 9 : 10);
    doc.setFont(mono ? "courier" : "helvetica", "bold");
    doc.text(String(value), x, metaY + 7, { align: "center" });
  });

  // Status badge (pill)
  const [sr, sg, sb] = statusColors[certificate.status] || [67, 56, 202];
  const badgeX = certificate.qrCode ? W - 40 : W - 28;
  doc.setFillColor(sr, sg, sb);
  doc.roundedRect(badgeX - 14, metaY - 4.5, 28, 9, 2.5, 2.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(certificate.status, badgeX, metaY + 1.5, { align: "center" });

  // ─── QR Code (if available) ────────────────────────────────────────────────
  if (certificate.qrCode) {
    try {
      // QR is stored as data URL ("data:image/png;base64,...") — jsPDF accepts it directly
      doc.addImage(certificate.qrCode, "PNG", W - 60, divY - 8, 30, 30);
      doc.setTextColor(156, 163, 175);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.text("Scan to verify", W - 45, divY + 23, { align: "center" });
    } catch {
      // QR rendering failure is non-critical
    }
  }

  // ─── Verification URL footer ────────────────────────────────────────────────
  doc.setTextColor(180, 180, 180);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  const verifyUrl = `${window.location.origin}/verify/${certificate.certificateId}`;
  doc.text(`Verify this certificate at: ${verifyUrl}`, W / 2, H - 13, { align: "center" });

  // ─── Save ──────────────────────────────────────────────────────────────────
  doc.save(`CertVault-${certificate.certificateId}.pdf`);
};
