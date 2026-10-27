# Security Policy

The Operon team takes security issues seriously and appreciates responsible vulnerability disclosure.

---

## 🛡️ Supported Versions

We provide security patches for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

---

## 🚨 Reporting a Vulnerability

**Please do NOT disclose security vulnerabilities via public GitHub issues, pull requests, or public forums.**

Instead, report security vulnerabilities through one of the following channels:

1. **GitHub Private Security Advisory (Recommended)**:
   - Navigate to the **Security** tab of the repository at [https://github.com/tuquet/operon/security](https://github.com/tuquet/operon/security).
   - Click on **Report a vulnerability** to open a confidential report.

2. **Email Disclosure**:
   - Send an email to **security@tuquet.dev** with:
     - A description of the vulnerability and affected subsystem (`crates/cli`, `crates/worker`, `crates/browser`, `cloud`, or `console`).
     - Step-by-step instructions or proof-of-concept (PoC) to reproduce the issue.
     - Potential attack vectors and impact assessment.

---

## ⏱️ Response Timeline

- **Initial Response**: Within 48 hours of report receipt.
- **Triage & Reproduction**: Within 5 business days.
- **Remediation & Patch**: Timeline agreed upon based on issue severity and coordinated disclosure policy.
