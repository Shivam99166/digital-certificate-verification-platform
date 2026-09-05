# Digital Certificate Verification Platform

A full-stack digital certificate issuance and verification platform that enables organizations to issue secure certificates and allows anyone to verify their authenticity instantly using a unique Certificate ID or QR code.

## 🌐 Live Demo

[🚀 **Visit Live Website**](https://digital-certificate-verification-pl.vercel.app/)



## 🚀 Overview

Traditional certificate verification is often manual, time-consuming, and vulnerable to fake or modified certificates.

This platform provides a centralized digital solution where:

- Organizations can issue and manage certificates.
- Recipients can access and manage their certificates.
- Anyone can publicly verify a certificate without creating an account.
- QR codes provide fast certificate verification.
- Certificates can be revoked or automatically marked as expired.
- Role-based access control protects organization, recipient, and admin functionality.

## ✨ Features

### 🔐 Authentication & Authorization

- User registration and login
- JWT-based authentication
- Secure password hashing using bcrypt
- Role-based access control
- Organization, recipient, and admin roles
- Protected frontend routes
- Account activation/deactivation

### 🏢 Organization Dashboard

Organizations can:

- Issue digital certificates
- Generate unique certificate IDs
- Generate QR codes automatically
- View issued certificates
- Search and filter certificates
- Track certificate status
- Revoke certificates with a reason
- Download certificate files
- Manage organization profile

### 🎓 Recipient Dashboard

Recipients can:

- View their certificates
- Access certificate details
- Download certificates
- Verify certificates
- Use QR-based verification

### 🔎 Public Certificate Verification

Anyone can verify a certificate without logging in.

Verification supports:

- Certificate ID verification
- QR code scanning
- QR image upload
- Valid certificates
- Revoked certificates
- Expired certificates
- Invalid/non-existent certificates

### 📊 Certificate Lifecycle

Each certificate follows a controlled lifecycle:

```text
Issued
   ↓
VALID
   ↓
 ┌───────────────┐
 ↓               ↓
REVOKED        EXPIRED
🛠️ Tech Stack
Frontend->
React.js
Vite
React Router
HTML5
CSS
JavaScript
html5-qrcode
Backend->
Node.js
Express.js
JWT Authentication
bcrypt
QRCode
REST API
Database
MongoDB
MongoDB Atlas
Mongoose
Development & Deployment
Git
GitHub
Vercel — Frontend
Render — Backend
🏗️ Project Structure
digital-certificate/
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── tests/
│   ├── .env
│   ├── .gitignore
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── ...
│   ├── package.json
│   └── ...
│
├── .gitignore
└── README.md

🔒 Security

The application implements several security measures:

JWT-based authentication
bcrypt password hashing
Role-based authorization
Protected API endpoints
Protected frontend routes
Organization-level data isolation
Input validation
CORS configuration
Production-safe error responses
Environment-based secret management

🎯 Problem Solved

The platform addresses common problems with traditional certificates:

Traditional Approach	This Platform
Manual verification	Instant online verification
Easy to manipulate PDFs	Tamper-evident verification
No centralized record	Centralized certificate records
Slow HR verification	QR/ID-based verification
Difficult revocation	Digital certificate revocation
No expiration tracking	Automatic expiration status
Manual certificate management	Digital dashboard
🔮 Future Improvements

Potential future enhancements include:

Bulk certificate issuance through CSV
Email certificate delivery
Custom certificate templates
Organization branding
Certificate analytics
Public organization verification profiles
API integrations with LMS/ERP systems
Custom domains
Audit logs
Advanced fraud detection
Multi-language support
Cloud storage for certificate files
