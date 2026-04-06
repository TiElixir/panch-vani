# INSTRUCTIONS.md: Project Panch-Vani

## 1. Project Vision
**Panch-Vani** is a privacy-first, verified anonymous voting platform. It utilizes a "Hub" model where users join specific organizations via a join code. It solves the "Fear of Retaliation" in communal elections by decoupling user identity from the ballot while maintaining strict 1-person-1-vote integrity via domain-verified Google Authentication.

## 2. Technical Stack
* **Frontend:** ReactJS (Vite) + TypeScript + TailwindCSS
* **Backend:** **Python (FastAPI)**
* **Database:** PostgreSQL (with SQLAlchemy ORM)
* **Authentication:** Direct Google OAuth 2.0 (via `authlib`) + FastAPI-issued JWTs (`python-jose`)
* **API Style:** RESTful with automatic Swagger UI documentation

---

## 3. Core Features & Logic

### A. Identity & The "Gatekeeper"
* **Auth:** Google OAuth 2.0 is handled entirely by the Python backend using `authlib`. After the OAuth flow, the backend issues its own signed **JWT** (via `python-jose`) that the frontend stores locally. Every protected endpoint validates this JWT. Since Google guarantees the user's email address, this is the foundation of all identity checks.
* **The Hub System:**
    * A **Hub Admin** creates a **Hub** (Organization/Group), sets its name, and configures one or more **allowed email domains** (e.g., `students.iiests.ac.in`).
    * Users can only request to join a Hub if their Google-authenticated email matches one of the Hub's allowed domains. The domain check happens server-side — no bypass is possible.
    * Users may optionally provide a **Verification ID** (e.g., Student Roll No.) at join time for the Hub Admin to cross-reference against a physical list.
* **Admin Verification:** After the domain check passes, users remain in a **"Pending"** state until the Hub Admin manually approves them. Only then can they see and cast votes.

### B. Admin Role Hierarchy
There are **two distinct admin tiers**:

1. **Platform Super Admin:**
    * Designated by email addresses listed in the server's `.env` file (`SUPER_ADMIN_EMAILS=a@x.com,b@x.com`).
    * On first login, these emails are automatically flagged `is_super_admin = True` in the `User` table.
    * Can access the **Platform Admin Panel** (`/platform-admin` route in the frontend):
        * View all Hubs across the platform.
        * Suspend or delete any Hub.
        * Promote or demote Hub Admins.
        * View platform-wide usage stats.

2. **Hub Admin:**
    * The user who creates a Hub is automatically its Hub Admin.
    * Can also be assigned by a Super Admin.
    * Can access the **Hub Admin Panel** (`/hubs/{id}/admin`):
        * View and approve/reject pending members.
        * Create, close, and delete polls within their Hub.
        * Configure the Hub's allowed email domains.

### C. The Anonymous Polling Engine (The "Double-Blind" Protocol)
To ensure absolute anonymity, the Python backend handles voting logic across two **intentionally unlinked** tables:
1. **Table: `voter_logs`** → Records `{poll_id, user_id}`. Checked to ensure the user hasn't voted yet.
2. **Table: `anonymous_votes`** → Records `{poll_id, option_index}`. No user reference.
3. **The Firewall:** The backend must never store a link between `user_id` and `option_index`. To prevent timestamp correlation, both rows are written inside a single transaction with a **randomized microsecond jitter** between the two inserts.

---

## 4. Backend Architecture (Python/FastAPI)

### API Endpoints (Planned)

#### Auth
* `GET /auth/login` — Redirects to Google consent screen.
* `GET /auth/callback` — Exchanges OAuth code, upserts `User`, issues JWT.
* `GET /auth/me` — Returns the current authenticated user's profile.

#### Hubs
* `POST /hubs` — Hub Admin creates a new Hub (sets name + allowed domains).
* `GET /hubs` — Lists all Hubs the current user is a member of.
* `POST /hubs/{id}/join` — User submits a join request (domain checked here; optional verification ID).
* `GET /hubs/{id}` — Returns Hub details + polls (approved members only).

#### Hub Admin
* `GET /hubs/{id}/admin/pending` — Hub Admin views pending members.
* `PATCH /hubs/{id}/admin/approve/{user_id}` — Hub Admin approves a member.
* `DELETE /hubs/{id}/admin/reject/{user_id}` — Hub Admin rejects a member.
* `PATCH /hubs/{id}/admin/domains` — Hub Admin updates the allowed email domain list.

#### Polls
* `POST /hubs/{id}/polls` — Hub Admin creates a new poll.
* `POST /polls/{id}/vote` — User casts an anonymous vote (Double-Blind logic).
* `GET /polls/{id}/results` — Returns aggregated tallies (only if user has voted or poll is closed).
* `PATCH /polls/{id}/close` — Hub Admin closes a poll.

#### Platform Super Admin
* `GET /superadmin/hubs` — List all Hubs on the platform.
* `DELETE /superadmin/hubs/{id}` — Delete a Hub.
* `PATCH /superadmin/users/{id}/promote` — Grant a user Hub Admin rights for a specific hub.
* `GET /superadmin/stats` — Platform-wide usage statistics.

---

## 5. Database Schema (Relational/SQLAlchemy)

### `User`
* `id`: UUID (Primary Key)
* `google_sub`: String (Unique — Google's stable `sub` claim)
* `email`: String (Unique)
* `name`: String
* `avatar_url`: String (optional)
* `is_super_admin`: Boolean (default `False`; set to `True` on login if email is in `SUPER_ADMIN_EMAILS`)

### `Hub`
* `id`: UUID (Primary Key)
* `name`: String
* `description`: String (optional)
* `admin_id`: ForeignKey(User.id)
* `invite_code`: String (Unique, auto-generated)
* `allowed_domains`: JSON/List of Strings (e.g., `["students.iiests.ac.in", "staff.iiests.ac.in"]`)

### `Membership`
* `hub_id`: ForeignKey(Hub.id)
* `user_id`: ForeignKey(User.id)
* `status`: Enum (`"pending"`, `"approved"`, `"rejected"`)
* `verification_id`: String (optional, provided at join time for admin cross-reference)
* `joined_at`: DateTime

### `Poll`
* `id`: UUID
* `hub_id`: ForeignKey(Hub.id)
* `created_by`: ForeignKey(User.id)
* `question`: String
* `options`: JSON/List of Strings
* `is_active`: Boolean
* `created_at`: DateTime
* `closed_at`: DateTime (optional)

### `VoterLog`
* `poll_id`: ForeignKey(Poll.id)
* `user_id`: ForeignKey(User.id)
* *(Composite Primary Key on `poll_id + user_id`)*

### `AnonymousVote`
* `poll_id`: ForeignKey(Poll.id)
* `option_index`: Integer

---

## 6. Email Domain Verification Logic

The domain check is **the first gate** before any manual approval:

```
User attempts to join Hub H
  → Extract domain from user.email  (e.g., "students.iiests.ac.in")
  → Check if domain ∈ H.allowed_domains
    → NO  → 403 Forbidden ("Your email domain is not allowed in this Hub")
    → YES → Create Membership(status="pending")
             → Hub Admin receives notification of pending member
             → Admin approves → status="approved" → user can vote
```

This means:
- Different Hubs can serve completely different institutions.
- A hostels hub uses `@hostel.iiests.ac.in`, a staff hub uses `@staff.iiests.ac.in`, etc.
- Changing the allowed domains on a Hub does **not** revoke already-approved members.

---

## 7. Implementation Roadmap

1. **Phase 1: Python Scaffolding.** Setup FastAPI, SQLAlchemy, and all models. Implement Google OAuth 2.0 flow (`/auth/login`, `/auth/callback`) and JWT issuance. Seed Super Admin from `.env`.
2. **Phase 2: The Gatekeeper Logic.** Build Hub creation with domain allowlist. Implement the join-request flow with domain validation. Build Hub Admin approval/rejection endpoints.
3. **Phase 3: The Ballot Box.** Develop the `/vote` endpoint with the Double-Blind protocol. Implement results gating.
4. **Phase 4: Platform Super Admin.** Build `/superadmin` endpoints and protect them with an `is_super_admin` dependency.
5. **Phase 5: Frontend Integration.** Build the React UI. Implement all pages: Login, Dashboard, Hub, Poll, Hub Admin Panel, Platform Admin Panel.
6. **Phase 6: Polish.** Framer Motion animations, responsive layout, error states, loading skeletons.

---

## 8. Development Principles
* **Readability:** Use Pythonic naming conventions and clear Pydantic schemas.
* **Anonymity First:** The backend is the "Source of Truth" for anonymity — client can never influence the Double-Blind logic.
* **Generic Usage:** All language uses "Hub" and "Member" so the platform works for hostels, offices, clubs, or universities.
* **Domain Isolation:** Hubs are completely siloed — members of Hub A cannot see anything about Hub B.

---

## 9. 🎨 Theme & Design System

This project follows a **Modern Tech** aesthetic—prioritizing high contrast, clean typography, and accessible interactive elements.

### A. Color Palette (Tailwind Configuration)
* **Base Background:** `#000000` (`bg-black`) - Absolute black for a premium, high-contrast feel.
* **Surface/Cards:** `#0F172A` (`bg-slate-900`) - Deep slate to provide subtle depth against the black background.
* **Primary Accent:** `#6366F1` (`bg-indigo-500`) - Electric Indigo for all primary actions and "Vote" buttons.
* **Secondary Text:** `#94A3B8` (`text-slate-400`) - Muted gray for timestamps and metadata.
* **Success State:** `#10B981` (`text-emerald-500`) - For "Verified" status and "Vote Cast" confirmations.
* **Warning/Danger:** `#EF4444` (`text-red-500`) - For rejections and destructive actions.

### B. Layout & Geometry
* **Navigation:** **Top-Bar Focused.** A fixed header with `backdrop-blur-md` for a modern "glassmorphism" effect.
* **Corner Radius:** **"Cloud" Style.**
    * Main Cards/Hubs: `rounded-2xl` (16px) for a soft, friendly, and professional look.
    * Buttons/Inputs: `rounded-xl` (12px) for a modern, tactile feel.
* **Shadows:** Minimalist. Use `shadow-sm` for idle states and a subtle indigo glow (`hover:shadow-indigo-500/20`) on hover.

### C. Data Visualization (Minimalist)
* **Result Bars:** Use high-legibility, thin horizontal progress bars (`h-1.5`) with rounded caps.
* **Interactions:** Implement "Staggered Fade-ins" using Framer Motion so poll options appear sequentially.
* **Responsiveness:** Auto-adaptive scaling to ensure the `max-w-2xl` content container looks centered and crisp on mobile devices.