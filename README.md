# RELABTeams

A multi-role collaboration platform for academic project execution, peer knowledge exchange, and professional recruitment — built as a unified MERN-stack application with nine isolated bounded contexts.

Live: [project-psi-vert-12.vercel.app](https://project-psi-vert-12.vercel.app)

---

## What This Is

Most collaboration tools solve one problem well. RELABTeams solves three in a single authenticated session: students build and ship projects as teams, exchange technical knowledge through a structured Q&A layer, and pipeline directly into recruiter hiring workflows — all within one role-governed system.

The architecture was designed with Domain-Driven Design principles from the ground up. Nine bounded contexts own their models independently. No two contexts share a database collection. Cross-context communication happens through published events, well-typed interfaces, or an Anti-Corruption Layer where necessary.

---

## Roles

| Role | What They Can Do |
|---|---|
| Student | Create projects, join teams, post doubts, apply to jobs, initiate payments |
| Recruiter | Post job listings, manage applications, shortlist candidates (requires admin verification) |
| Institution Admin | Oversee domain-level activity, moderate content within scope |
| Platform Admin | Verify recruiter accounts, enforce policy, access full audit trail |

Access is enforced at the route level via JWT-based RBAC middleware. Recruiters cannot post until `isApproved` is set by a platform admin.

---

## Architecture Overview

```
Identity & Access           — Auth source of truth. Every other context consumes User._id and role.
User Profile & Metrics      — Public presence, skills, resume, aggregated activity.
Project Collaboration       — Full project lifecycle: creation, membership, tasks, deadlines.
Recruitment                 — Job posting pipeline, application tracking, hiring decisions.
Doubts & Discussions        — Threaded Q&A with visibility scoping and moderation hooks.
Messaging & Notifications   — Channel messages, DMs, unread counts, in-app alerts.
Search & Discovery          — Read-optimized cross-context index. Never writes source state.
Payments & Billing          — Order creation, signature verification, downstream triggers.
Governance & Administration — Moderation cases, audit logs, policy enforcement.
```

Context relationships follow standard DDD mapping patterns: Open Host Service with Published Language for the identity upstream, Customer/Supplier between Payments and Collaboration, Event-Driven for notification triggers, and an Anti-Corruption Layer between Governance and Recruitment.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Redux, Vite |
| Backend | Node.js, Express |
| Database | MongoDB (per-context collection isolation) |
| Auth | JWT, bcrypt, OTP (email), TOTP (2FA) |
| File Uploads | Cloudinary |
| Deployment | Frontend — Vercel (https://project-psi-vert-12.vercel.app), Backend — Render (hosted Node server) |

---

## Domain Model at a Glance

**Aggregates (10):** UserAccount, Project, JoinRequest, Membership, Recruitment, Doubt, Messaging, Notification, Payment, Moderation

**Aggregate invariants enforced at root level** — no capacity overflow, no illegal status transitions, no duplicate membership, no unverified recruiter postings, no payment side-effects before `verified` status.

**Domain events (14):** `UserRegistered`, `UserVerified`, `ProjectCreated`, `JoinRequestApproved`, `TaskAssigned`, `JobPosted`, `JobApplied`, `ApplicationStatusChanged`, `DoubtPosted`, `ReplyPosted`, `MessageSent`, `PaymentVerified`, `RecruiterVerified`, `ModerationActionTaken`

Consistency model: strong within aggregate boundaries, eventual across context read models, idempotent handlers throughout.

---

## Getting Started

**Prerequisites:** Node.js 18+, MongoDB instance, Cloudinary account

**Frontend**

```bash
cd client
npm install
npm run dev
```

**Backend**

```bash
cd source
npm install
node server.js
```

**Environment variables required (backend)**

```
MONGO_URI=
JWT_SECRET=
JWT_EXPIRES_IN=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASS=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
CLIENT_URL=
```

---

## Key Features

**Project Collaboration**
Capacity-limited team membership with join request and invitation workflows. Task assignment with status progression (`todo → in_progress → in_review → done`). Overflow prevention enforced as an aggregate invariant.

**Recruitment Pipeline**
Full application lifecycle: `pending → under_review → shortlisted → accepted / rejected`. Recruiter account requires platform admin verification before any posting is permitted. Resume attachment captured at application time as an immutable value object.

**Doubts & Discussions**
Visibility-scoped Q&A (`public`, `project_only`, `private`). Threaded replies with accepted-answer marking. Content moderation hooks surface to the Governance context for case creation.

**Payments**
Razorpay-integrated order flow with server-side signature verification. Payment side-effects (project creation, extension) are gated strictly on `PaymentStatus.verified`. Failed orders require a new order object — no retry on stale orders.

**Search**
Cross-context aggregated index across users, projects, job postings, and discussions. Full-text with relevance scoring and faceted filters. Strictly downstream — consumes projections, never writes transactional state.

**Governance**
Immutable audit logs. Moderation cases with enforcement actions. Recruiter verification workflow. Policy rules with cross-context inspection scope.

---

## Security Model

- Passwords stored as bcrypt hashes only; never logged or returned in responses
- JWT tokens validated on every protected route; sessions rotated on privilege change
- TOTP-based 2FA available for elevated accounts
- Role checks layered: `requireAuth → requireRole → requireAdmin` middleware chain
- Recruiter posting gated on `isApproved` set by platform admin, not self-reported
- XSS sanitisation enforced on all message content at the value object layer
- Audit trail on all sensitive administrative actions; AuditLog entries are write-once

---

## Design Documentation

Full Domain-Driven Design report is included in the repository:

- Bounded context definitions and responsibilities
- Context mapping diagram with integration patterns (OHS, PL, C/S, ACL, ED)
- Entity and value object specifications per subdomain
- Cardinality ratios across the entity model
- Aggregate roots with enforced invariants
- Domain event table with producer/consumer mapping
- Role access matrix

---

## Team

| Name | Role |
|---|---|
| Siva Sampreeth | Team Lead |
| Srihesh Kothapalli | Developer |
| Eswar Ettaligala | Developer |
| Jadhav Shiva Sai Prasad | Developer |

IIIT Sri City — Web-Based Development Project.

---

## License

Academic project. Not licensed for commercial use.
