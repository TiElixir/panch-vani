# Panch-Vani

**Panch-Vani** is a privacy-first, full-stack voting platform engineered specifically to deliver cryptographically verifiable yet fully anonymous polling. It implements a robust **Double-Blind** voting engine that permanently severs the tie between a voter's identity and their cast ballot.

## 🌟 Key Features

*   **Double-Blind Anonymity:** Employs a strict physical separation in the backend database (`VoterLog` vs `AnonymousVote`) utilizing randomized microsecond transaction jitters. The system can prove *that* you voted, but it is architecturally impossible to prove *what* you voted for.
*   **Domain-Gated Hubs:** Restrict access to designated organizations or colleges. Hubs can mandate strictly allowed email domains (e.g., `@students.iiests.ac.in`) to keep outsiders out.
*   **Multi-Tier Admin System:**
    *   **Platform Super Admin ("God Mode"):** Global oversight with abilities to view platform statistics and delete violating Hubs.
    *   **Hub Admin:** Manage individual Hub domains, approve/reject pending student join requests, control poll lifecycles, and view the anonymous Voter Ledger.
*   **Direct Google OAuth 2.0:** Secure and simplified user onboarding leveraging direct Google OAuth handshake without relying on third-party aggregators like Firebase.
*   **Poll Expiry:** Set custom time limitations on polls (e.g., 24 hours, 48 hours) to ensure decisions carry momentum.
*   **"Modern Tech" Aesthetic:** A breathtaking Frontend UI built with an absolute black canvas (`#000`), deep slate surfaces, vibrant electric indigo accents, glassmorphism components, and fluid layout animations powered by Framer Motion.

## 🛠️ Technology Stack

*   **Backend:** Python 3.13, FastAPI, SQLAlchemy, SQLite (Development) / PostgreSQL (Production).
*   **Auth:** Direct implementation using `authlib` and `python-jose` for JWT session issuance.
*   **Frontend:** React 18, Vite, TypeScript.
*   **Styling & Motion:** Vanilla CSS, Tailwind CSS (Custom Tokens), Framer Motion, Lucide-React.

## 🚀 Local Development Setup

### 1. Database & Backend Configuration

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Set up your environment variables by copying `.env.example`:
```bash
cp .env.example .env
```
*Note: Make sure to fill in your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` via the Google Cloud Platform Console. Add `http://localhost:8000/auth/callback` to your authorized redirect URIs.*

Launch the API server:
```bash
uvicorn main:app --reload
```

### 2. Frontend Configuration

Open a new terminal session:
```bash
cd frontend
npm install
npm run dev
```

Your system map will be successfully bridged:
*   Frontend UI: `http://localhost:5173`
*   Backend API: `http://localhost:8000`
*   API Swagger Documentation: `http://localhost:8000/docs`

## 🛡️ Architecture Note: The Voter Ledger
Panch-Vani offers an Admin View **"Voter Ledger"** per poll. This is a crucial security feature that lists the names and emails of everyone who submitted a ballot in a specific poll. Due to the Double-Blind implementation, it is structurally impossible—even for the Super Admin with direct DB access—to trace these ledger names back to the underlying vote selections. 

---
*Built with privacy and cryptographic anonymity at its core.*
