# Security Policy

## Supported Versions

WatchTower is a solo-maintained project. Security fixes are applied to the latest version on `main` only. Older tagged releases are not backported.

| Version | Supported |
|---------|-----------|
| 3.x (latest) | yes |
| < 3.0 | no |

## Reporting a Vulnerability

Please do not open a public GitHub issue for security vulnerabilities.

Use GitHub's private vulnerability reporting instead:
**[Report a vulnerability](../../security/advisories/new)**

Include as much detail as you can - steps to reproduce, affected component, and potential impact. I aim to respond within 7 days and will keep you updated as the issue is investigated and fixed.

## Scope

### In scope
- SMTP credential handling in the settings API
- SMTP command injection or header injection via alert inputs
- Unauthenticated access to monitor data or alert credentials via the API
- Server-Side Request Forgery (SSRF) via monitor targets
- XSS in the dashboard or embedded views
- Dependency vulnerabilities with a credible exploit path

### Out of scope
- The network WatchTower is deployed on - securing access to port 3000 is the operator's responsibility (firewall, reverse proxy with auth, VPN)
- SQLite file permissions - the host filesystem is the operator's responsibility
- `NET_RAW` capability required for ICMP - this is intentional and documented
- Denial of service via resource exhaustion on self-hosted infrastructure
- Vulnerabilities in browsers used to access the dashboard

## Deployment Notes

WatchTower has no built-in authentication. It is designed to run on a trusted internal network or behind a reverse proxy that handles access control. Exposing it directly to the public internet without additional protection is not recommended.

Alert credentials (Telegram token, SMTP password, Twilio auth token) are stored in plaintext in the SQLite database. Ensure the `data/` volume is not readable by untrusted users on the host.
