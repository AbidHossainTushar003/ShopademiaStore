# ADR-002: Shared rate-limit storage

- **Status:** Proposed — no shared storage is configured
- **Date:** 2026-10-06
- **Deciders:** Owner
- **Specification clause(s):** §8.1, §8.10, §9.1

## Context

Rate limits use `express-rate-limit`'s default in-memory store. Each API process has an independent counter and loses its counters on restart. This is adequate only as a per-process control; it does not provide a cluster-wide rate limit. The active hosting topology is unknown.

## Decision

Do not add a shared rate-limit store in Phase B. Revisit a shared store only after the owner selects a hosting topology and approves the infrastructure and dependency impact. A Redis-backed store is one possible future option, not an assumed deployment capability.

## Consequences

### Positive

- No infrastructure or dependency is added before there is a measured multi-process need.
- Existing per-process rate limits remain available.

### Negative / risks

- Multiple API processes do not share limits.
- Counters reset on process restart.

## Alternatives considered

- **Redis-backed store:** shared counters across instances, but adds infrastructure, operational responsibility, and a dependency.
- **Database-backed store:** shared state, but adds write load and couples request throttling to MySQL availability.
- **In-memory store:** retained for now; simple, but process-local only.

## Security, data, and compatibility impact

- No tables, endpoints, or response shapes change.
- Existing rate limits remain process-local. Trusted proxy configuration must still be correct for client-IP identity.

## Verification

The current package already includes `express-rate-limit`; no shared-store package or service was added. Multi-instance behavior is NOT VERIFIED because no multi-process hosting topology is configured here.
