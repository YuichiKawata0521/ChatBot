# Security Rollout Playbook

This document defines the recommended next steps after feature completion and production deployment.

## 1. Priority Order

1. Run and stabilize static checks (SAST/dependency/secrets/config)
2. Run dynamic checks (DAST) against production-equivalent target
3. Fix high-risk findings and document accepted risks
4. Apply limited obfuscation only where needed on frontend build artifacts

Obfuscation is intentionally not first because it does not remove vulnerabilities and can slow root-cause analysis.

## 2. What Was Added

- CI workflow: `.github/workflows/security-quality.yml`
- Backend audit command: `npm run audit:security --prefix backend`
- Frontend audit command: `npm run audit:security --prefix frontend`

The workflow now performs:

- `npm audit` for backend/frontend (high+ severity)
- `pip-audit` for `llm/requirements*.txt`
- Trivy filesystem scan (CRITICAL/HIGH)
- Optional OWASP ZAP baseline scan (manual trigger or repo variable)

## 3. How To Run

### CI automatic runs

- On pull requests to `main`/`master`
- On pushes to `main`/`master`
- Weekly schedule (Monday 02:00 UTC)

### DAST manual run

Trigger workflow `Security and Quality Checks` with `target_url` set.

Example target values:

- `https://yk-pf.com`
- `https://stg.example.com`

Alternative: set repository variable `DAST_TARGET_URL` for scheduled/automated DAST.

## 4. Gate Policy (Recommended)

Use this merge policy until risk is reduced:

- Block merge when any check finds CRITICAL/HIGH vulnerabilities.
- Allow temporary exception only with ticket + expiry date.
- Re-run pipeline after each remediation.

## 5. Obfuscation Guidance

If you still need obfuscation, keep scope minimal:

- Frontend only (never rely on it for backend protection)
- Exclude admin/debug bundles if operational visibility is needed
- Keep source maps private and access-controlled

Recommended timing:

- Start only after two consecutive clean static+dynamic scan cycles.

## 6. Next Technical Tasks

1. Add API regression tests for auth/session/role boundaries.
2. Add runtime monitoring alerts (5xx, auth failure spikes, latency p95).
3. Add backup restore drill and incident runbook update.