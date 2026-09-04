const crypto = require("crypto");

const generateCertificateId = () => {
  const year = new Date().getFullYear();

  const randomPart = crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase();

  return `CERT-${year}-${randomPart}`;
};

module.exports = generateCertificateId;